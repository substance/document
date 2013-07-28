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

  this.getAnnotations = function(filter) {
    return this.annotator.getAnnotations(filter);
  };


  // Delete current selection
  // --------
  //

  this.delete = function() {
    var doc = this.__document.startSimulation();
    var sel = new Selection(doc, this.selection);

    if (sel.isCollapsed() && sel.startChar()>0) {

      // Remove previous char (backspace behavior)
      // --------
      // 

      sel.expand('left', 'char');
      this.transformer.deleteSelection(doc, sel);
      sel.setCursor(sel.start);
    } else if (sel.isCollapsed() && sel.startChar() === 0) {
      
      // Attempt merge
      // --------
      // 

      var sourceNode = sel.getRanges()[0].node;
      var targetNode = sel.getPredecessor();

      var insertionPos = targetNode.content.length;
      if (this.transformer.mergeNodes(doc, sourceNode, targetNode)) {
        // Consider this API instead?
        // sel.setCursor([targetNode.id, insertionPos]);
        sel.setCursor([doc.getPosition('content', targetNode.id), insertionPos]);
      } else {
        // Attempt to select the previous node
        // E.g. if cursor is preceded by an image
        sel.selectNode(targetNode.id);
      }
    } else {
      // Regular deletion
      // --------
      // 

      this.transformer.deleteSelection(doc, sel); 
      sel.setCursor(sel.start);
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

  // Based on current selection, insert new node
  // --------
  //

  this.insertNode = function(type, options) {
    var doc = this.__document.startSimulation();
    var sel = new Selection(doc, this.selection);

    // Remove selected text and get a cursor
    if (!sel.isCollapsed()) this.transformer.deleteSelection(doc, sel);

    this.transformer.insertNode(doc, sel, type, options);

    // Commit
    doc.save();
    this.selection.set(sel);
  };

  // Creates an annotation based on the current position
  // --------
  //

  this.annotate = function(type) {
    var annotation = this.annotator.annotate(this.selection, type);
    this.annotator.propagateChanges();
    return annotation;
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

    // need to call thas explicitely as the annotator does not dispatch
    // this automatically to have the changes to the node in place first
    this.annotator.propagateChanges();
  };


  // Note: as there are events of different types it is quite messy currently.
  // We should consider defining controller specific events here
  // and do event mapping properly

  // For Substance.Events on document
  this.on = function() {
    this.__document.on.apply(this.__document, arguments);
  };

  // Delegate getter
  this.get = function() {
    return this.__document.get.apply(this.__document, arguments);
  };

  // For property change events on document.nodes.content.nodes
  this.onViewChange = function(arrayAdapter) {
    this.__document.propertyChanges().bind(arrayAdapter, {path: ["content", "nodes"]});
  };

  // For property change events on document.nodes.*.content (string properties)
  // TODO: we probably need to be more specific here later
  // for now the Surface is only interested in changes on content of text-nodes.
  this.onTextNodeChange = function(handler, context) {
    this.__document.propertyChanges().bind(handler, {path: ["*", "content"]}, context);
  };

  this.onPropertyChange = function(handler, context) {
    this.__document.propertyChanges().bind(handler, {}, context);
  };

  // a generic unbinder
  this.unbind = function(name, handler) {
    if (arguments.length === 1) {
      handler = name;
      this.__document.propertyChanges().unbind(handler);
    } else {
      this.__document.unbind(name, handler);
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
