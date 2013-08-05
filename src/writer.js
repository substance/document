"use strict";

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

var Writer = function(document) {
  this.__document = document;

  this.chronicle = document.chronicle;

  this.annotator = new Annotator(document);

  // Document.Transformer
  // Contains higher level operations to transform (change) a document
  this.transformer = new Transformer(document);

  this.selection = new Selection(this.__document, null);
  this.clipboard = new Clipboard();
};


Writer.Prototype = function() {

  // Document Facette
  // --------

  this.getNodes = function(idsOnly) {
    if (idsOnly) return this.__document.get(["content", "nodes"]);
    else return this.__document.query(["content", "nodes"]);
  };

  // Given a node id, get position in the document
  // --------
  //

  this.getPosition = function(id) {
    return this.__document.getPosition('content', id);
  };

  // See Annotator
  // --------
  //

  this.getAnnotations = function(options) {
    return this.annotator.getAnnotations(options);
  };

  // Delete current selection
  // --------
  //

  this.delete = function(direction) {
    var that = this;
    var doc = this.__document.startSimulation();
    var sel = new Selection(doc, this.selection);

    // Remove character (backspace behavior)
    // --------
    //

    function removeChar(direction) {
      sel.expand(direction, 'char');
      that.transformer.deleteSelection(doc, sel);
      sel.collapse("left");
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
        // Cusor stays at current position
        // insertionPos = node.content.length;
      }

      var merged = that.transformer.mergeNodes(doc, sourceNode, targetNode);

      if (merged) {
        // Consider this API instead?
        // sel.setCursor([targetNode.id, insertionPos]);
        if (direction === "left") {
          sel.setCursor([doc.getPosition('content', targetNode.id), insertionPos]);
        }
      } else if(select) {
        sel.selectNode(targetNode.id);
      }

    }

    // Regular deletion
    // --------
    //

    function deleteSelection(direction) {
      that.transformer.deleteSelection(doc, sel);
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

    // Commit changes
    // --------

    doc.save();
    this.selection.set(sel);
  };

  // Copy current selection
  // --------
  //

  this.copy = function() {
    if (true) throw new Error('Soon.');
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
    if (true) throw new Error('Soon.');
    var doc = this.__document.startSimulation();
    var sel = new Selection(doc, this.selection);
    this.transformer.paste(doc, this.clipboard.getContent(), sel);
    doc.save();
  };

  // Really?
  // --------
  //

  this.insertImage = function(data) {
    var doc = this.__document.startSimulation();
    var sel = new Selection(doc, this.selection);
    var cursor = sel.cursor;
    if (!sel.isCollapsed()) return;

    this.transformer.morphNode(doc, sel, 'image', data);

    // Commit
    doc.save();
    this.selection.set(sel);
  };

  // Split
  // --------
  //

  this.modifyNode = function(type, data) {
    var doc = this.__document.startSimulation();
    var sel = new Selection(doc, this.selection);
    var cursor = sel.cursor;
    if (!sel.isCollapsed()) return;

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
    var doc = this.__document.startSimulation();
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

  this.annotate = function(type) {
    return this.annotator.annotate(this.selection, type);
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
    var nodeIdx = this.selection.start[0];
    var pos = this.selection.start[1];

    // TODO: future. This only works for text nodes....
    this.__document.update([node.id, "content"], [pos, text]);

    this.selection.set({
      start: [nodeIdx, pos+text.length],
      end: [nodeIdx, pos+text.length]
    });

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

  // Bind event handlers
  // --------
  // Note: we are not providing a generic util.Events interface here
  // but instead delegate the registration to appropriate sub-components
  //
  // - 'selection:changed' (): the selection is changed by the user ()
  // - 'view:changed' (): a node has been added or removed from the view
  // - 'textnode:changed' (): the content property of a textnode has been adapted
  // - 'annotation:changed' (mode, annotation): an annotation has been created, deleted, or updated
  this.on = function(message, handler, context) {
    if (message === "selection:changed") {
      this.selection.on("selection:changed", handler, context);
    } else if (message === "view:changed") {
      this.__document.propertyChanges().bind(handler, {path: ["content", "nodes"]});
    } else if (message === "textnode:changed") {
      this.__document.propertyChanges().bind(handler, {path: ["*", "content"]}, context);
    } else if (message === "annotation:changed") {
      this.annotator.on("annotation:changed", handler, context);
    } else {
      throw new Error("Unsupported event: " + message);
    }
  };

  this.off = function(message, handler, context) {
    if (message === "selection:changed") {
      this.selection.off("selection:changed", handler, context);
    } else if (message === "view:changed") {
      this.__document.propertyChanges().unbind(handler);
    } else if (message === "textnode:changed") {
      this.__document.propertyChanges().unbind(handler);
    } else if (message === "annotation:changed") {
      this.annotator.off("annotation:changed", handler, context);
    } else {
      throw new Error("Unsupported event: " + message);
    }
  };

};

// Inherit the prototype of Substance.Document which extends util.Events
Writer.prototype = new Writer.Prototype();

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
