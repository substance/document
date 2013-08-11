"use strict";

var _ = require("underscore");
var util = require("substance-util");
var Operator = require('substance-operator');
var Selection = require("./selection");
var Annotator = require("./annotator");
var Clipboard = require("./clipboard");
var Transformer = require('./transformer');

// Document.Writer
// -----------------
//
// Provides means for editing a Substance.Document. It introduces a Selection API
// in order to move a cursor through the document, support copy and paste, etc.
//
// Note: it is quite intentional not to expose the full Substance.Document interface
//       to force us to explicitely take care of model adaptations.
//
// Example usage:
//
//     var doc = new Substance.Document();
//     var editor = new Substance.Document.Writer(doc);
//     var editor.insert("Hello World");

var Writer = function(document, options) {
  options = options || {};
  this.view = options.view || 'content';

  this.__document = document;

  this.chronicle = document.chronicle;
  this.annotator = new Annotator(document);

  // Document.Transformer
  // Contains higher level operations to transform (change) a document
  this.transformer = new Transformer(document);

  this.selection = new Selection(this.__document, null);
  this.clipboard = new Clipboard();

  this.listenTo(document, 'operation:applied', this.updateSelection);
};

Writer.Prototype = function() {

  // Document Facette
  // --------

  this.getNodes = function(idsOnly) {
    if (idsOnly) return this.__document.get([this.view, "nodes"]);
    else return this.__document.query([this.view, "nodes"]);
  };

  // Given a node id, get position in the document
  // --------
  //

  this.getPosition = function(id) {
    return this.__document.getPosition(this.view, id);
  };

  this.getNodeFromPosition = function(nodePos) {
    return this.__document.getNodeFromPosition(this.view, nodePos);
  };

  // See Annotator
  // --------
  //

  this.getAnnotations = function(options) {
    options = options || {};
    options.view = this.view;
    return this.annotator.getAnnotations(options);
  };

  var _delete = function(doc, direction) {

    var sel = new Selection(doc, this.selection);
    var transformer = this.transformer;
    var view = this.view;

    // Remove character (backspace behavior)
    // --------
    //

    function removeChar(direction) {
      sel.expand(direction, 'char');
      transformer.deleteSelection(doc, sel);
      sel.collapse("cursor");
    }

    // Attempt merge
    // --------
    //

    function attemptMerge(direction, select) {
      var node = sel.getRanges()[0].node;
      var sourceNode;
      var targetNode;
      var insertionPos;

      if (direction === "left") {
        sourceNode = node;
        targetNode = sel.getPredecessor();
        if (!targetNode) return;
        insertionPos = targetNode.content.length;
      } else {
        sourceNode = sel.getSuccessor();
        if (!sourceNode) return;
        targetNode = node;
      }

      var merged = transformer.mergeNodes(doc, sourceNode, targetNode);

      if (merged) {
        // Consider this API instead?
        // sel.setCursor([targetNode.id, insertionPos]);
        if (direction === "left") {
          sel.set([doc.getPosition(view, targetNode.id), insertionPos]);
        }
      } else if(select) {
        sel.selectNode(targetNode.id);
      }
    }

    // Regular deletion
    // --------
    //

    function deleteSelection() {
      transformer.deleteSelection(doc, sel);
      sel.collapse("left");
    }

    if (sel.isCollapsed()) {
      var cursor = sel.cursor;
      if (cursor.isLeftBound() && direction === "left") {
        attemptMerge('left', true);
      } else if (cursor.isRightBound() && direction =="right") {
        attemptMerge('right', true);
      } else {
        removeChar(direction);
      }
    } else {
      var shouldMerge = sel.hasMultipleNodes();
      deleteSelection(direction);
      if (shouldMerge) attemptMerge("right", false);
    }

    return sel;
  };

  // Delete current selection
  // --------
  //

  this.delete = function(direction) {
    var doc = this.startSimulation();

    var sel = _delete.call(this, doc, direction);

    // commit changes
    doc.save();

    // important to set this at last, as doc.save() will trigger implicit selection
    // changes
    this.selection.set(sel);
  };

  // Copy current selection
  // --------
  //

  this.copy = function() {
    // Delegate
    var content = this.transformer.copy(this.__document, this.selection);
    this.clipboard.setContent(content);
  };


  // Cut current selection from document
  // --------
  //
  // Returns cutted content as a new Substance.Document

  this.cut = function() {
    this.copy();
    this.delete();
  };

  // Paste content from clipboard at current position
  // --------
  //

  this.paste = function() {
    var doc = this.startSimulation();

    var sel;

    if (!this.selection.isCollapsed()) {
      sel = _delete.call(this, doc);
      this.selection.set(sel);
    }

    sel = sel || new Selection(doc, this.selection);
    this.transformer.paste(doc, this.clipboard.getContent(), sel);

    doc.save();
  };

  // Split
  // --------
  //

  this.modifyNode = function(type, data) {

    var doc = this.startSimulation();

    if (!this.selection.isCollapsed()) {
      _delete.call(this, doc);
    }

    var sel = new Selection(doc, this.selection);
    var cursor = sel.cursor;

    if (cursor.node.type === "constructor") {
      var charPos = cursor.charPos;
      var targetType = cursor.node.content[charPos].type;

      console.log('targetType', targetType);
      if (targetType) {
        this.transformer.morphNode(doc, sel, targetType, data);
      }
    } else {

      this.transformer.insertNode(doc, sel, type, data);
    }

    // Commit
    doc.save();
    this.selection.set(sel);
  };


  // Based on current selection, insert new node
  // --------
  //

  this.insertNode = function(type, data) {
    var doc = this.startSimulation();
    var sel = new Selection(doc, this.selection);

    // Remove selected text and get a cursor
    if (!sel.isCollapsed()) this.transformer.deleteSelection(doc, sel);

    this.transformer.insertNode(doc, sel, type, data);

    // Commit
    doc.save();
    this.selection.set(sel);
  };

  // Creates an annotation based on the current position
  // --------
  //

  this.annotate = function(type, data) {
    return this.annotator.annotate(this.selection, type, data);
  };


  this.startSimulation = function() {
    var doc = this.__document.startSimulation();
    new Annotator(doc, {withTransformation: true});
    return doc;
  };

  // Inserts text at the current position
  // --------
  //

  this.write = function(text) {
    if (this.selection.isNull()) {
      console.log("Can not write, as no position has been selected.");
      return;
    }

    if (!this.selection.isCollapsed()) {
      this.delete();
    }

    var node = this.selection.getNodes()[0];
    var nodePos = this.selection.start[0];
    var charPos = this.selection.start[1];

    // TODO: future. This only works for text nodes....
    var doc = this.startSimulation();
    doc.update([node.id, this.view], [charPos, text]);
    doc.save();
  };

  // Delegate getter
  this.get = function() {
    return this.__document.get.apply(this.__document, arguments);
  };

  this.undo = function() {
    this.chronicle.rewind();
  };

  this.redo = function() {
    this.chronicle.forward();
  };

  this.updateSelection = function(op) {

    if (op.type === "update" || op.type === "set") {
      var nodePos = -1;
      var charPos = -1;

      // handle Show/Hide of nodes
      if (op.path[0] === this.view && op.path[1] === "nodes") {
        var lastChange = Operator.Helpers.last(op.diff);
        if (lastChange.isMove()) {
          nodePos = lastChange.target;
        } else {
          nodePos = lastChange.pos;
        }
        charPos = 0;
      }

      // delegate node updates to the Node implementation
      else {
        var node = this.__document.get(op.path[0]);
        nodePos = this.getPosition(node.id);
        if (node.getUpdatedCharPos !== undefined) {
          charPos = node.getUpdatedCharPos(op);
        }
      }

      if (nodePos >= 0 && charPos >= 0) {
        this.selection.set([nodePos, charPos]);
      }
    }
  };
};

// Inherit the prototype of Substance.Document which extends util.Events
Writer.prototype = _.extend(new Writer.Prototype(), util.Events.Listener);

// Property accessors for convenient access of primary properties
Object.defineProperties(Writer.prototype, {
  id: {
    get: function() {
      return this.__document.id;
    },
    set: function() { throw "immutable property"; }
  },
  title: {
    get: function() {
      return this.__document.get('document').title;
    },
    set: function() { throw "immutable property"; }
  },
  updated_at: {
    get: function() {
      return this.__document.get('document').updated_at;
    },
    set: function() { throw "immutable property"; }
  },
  creator: {
    get: function() {
      return this.__document.get('document').creator;
    },
    set: function() { throw "immutable property"; }
  }
});

module.exports = Writer;
