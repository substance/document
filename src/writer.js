"use strict";

// Import
// ========

var _ = require("underscore");
var util = require("substance-util");
var Data = require("substance-data");
var Document = require("./document");
var Operator = require("substance-operator");
var Selection = require("./selection");
var Annotator = require("./annotator");
var Clipboard = require("./clipboard");

// Module
// ========

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

  this.selection = new Selection(this.__document, null);
  this.annotator = new Annotator(this);
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

  // Based on selection get predecessor node, if available
  // --------
  //
  // FIXME: currently assumes there are only text nodes!
  // TODO: use Selection.find('left', 'node') instead

  this.getPreviousNode = function() {
    var sel = this.selection;
    var node = this.selection.getNodes()[0];
    var nodeOffset = sel.start[0];
    var view = this.get('content').nodes;

    if (nodeOffset === 0) return null;
    return this.get(view[nodeOffset-1]);
  };


  // Based on selection get successor node, if available
  // --------
  //
  // FIXME: currently assumes there are only text nodes!
  // TODO: use Selection.find('right', 'node') instead

  this.getNextNode = function() {
    var sel = this.selection;
    var node = this.selection.getNodes()[0];
    var nodeOffset = sel.end[0];
    var view = this.get('content').nodes;

    if (nodeOffset > view.length) return null;
    return this.get(view[nodeOffset+1]);
  };

  // Merge with previous node
  // --------
  //
  // FIX: currently assumes there are only text nodes!

  this.mergeWithPrevious = function() {
    var sel = this.selection;
    var node = this.selection.getNodes()[0];
    var nodeOffset = sel.start[0];

    // TODO: Use convenience API one implemented
    // var prevNode = sel.find('left', node);
    var prevNode = this.getPreviousNode();
    var doc = this.__document;
    var ops = [];

    if (!prevNode) return;

    var prevText = prevNode.content;
    var txt = node.content;

    // 1. Delete original node from graph
    doc.delete(node.id);

    // ... and view
    doc.update(["content", "nodes"], ["-", nodeOffset]);

    // 2. Update previous node and append text
    doc.update([prevNode.id, "content"], [prevNode.content.length, txt]);

    this.selection.set({
      start: [nodeOffset-1, prevText.length],
      end: [nodeOffset-1, prevText.length]
    });
  };


  // Takes a selection and deletes it
  // Used internally by Writer.delete
  // 

  this.deleteRange = function(sel) {

  };

  // Delete current selection
  // --------
  //

  this.delete = function() {
    // Convenience vars
    var startNode = this.selection.start[0];
    var startOffset = this.selection.start[1];
    var endNode = this.selection.end[0];
    var endOffset = this.selection.end[1];
    // var nodes = this.selection.getNodes();
    var doc = this.__document;

    // Create a simulation
    // Will be provided by Document.createSimulation later on
    var simulation = doc.startSimulation();

    // Use nodes from the simulated doc
    var nodes = [];

    _.each(this.selection.getNodes(), function(n) {
      nodes.push(simulation.get(n.id));
    });

    if (nodes.length > 1) {
      // Remove trailing stuff
      _.each(nodes, function(node, index) {
        // only consider textish nodes for now
        if (node.content) {
          if (index === 0) {
            var trailingText = node.content.slice(startOffset);
            var r = [startOffset, -trailingText.length];

            // Remove trailing text from first node at the beginning of the selection
            simulation.update([node.id, "content"], r);

          } else if (index === nodes.length-1) {

            // Last node of selection
            var trailingText = node.content.slice(endOffset);

            // Look back to prev node
            var firstNode = nodes[0];
            var r = [firstNode.content.length, trailingText];

            // remove preceding text from last node until the end of the selection
            // 
            simulation.update([firstNode.id, "content"], r);
            
            // Delete last node of selection
            simulation.delete(node.id);

          } else {
            // Delete node from document
            simulation.delete(node.id);

            // ... and from view
            var pos = doc.get('content').nodes.indexOf(node.id);

            simulation.update(["content", "nodes"], ["-", pos]);
          }
        }
      }, this);
    } else {
      // throw new Error('disabled for now');
      // leave as is for now ...
      var node = nodes[0];
      // Backspace behavior (delete one char before current cursor position)
      if (startOffset === endOffset) {
        if (startOffset>0) {
          startOffset -= 1;
        } else {
          // Merge with previous text node if possible
          return this.mergeWithPrevious();
        }
      }

      var text = node.content.slice(startOffset, endOffset);
      var r = [startOffset, -text.length];

      // remove trailing text from first node at the beginning of the selection
      simulation.update([node.id, "content"], r);
    }

    // apply the simulated changes to the doc
    simulation.save();

    this.selection.set({
      start: [startNode, startOffset],
      end: [startNode, startOffset]
    });
  };

  // Copy current selection
  // --------
  //

  this.copy = function() {
    // Convenience vars
    var startNode = this.selection.start[0];
    var startOffset = this.selection.start[1];
    var endNode = this.selection.end[0];
    var endOffset = this.selection.end[1];
    var nodes = this.selection.getNodes();

    var content = new Document({id: "clipboard"});

    if (nodes.length > 1) {
      // Remove trailing stuff
      _.each(nodes, function(node, index) {
        // only consider textish nodes for now
        if (node.content) {
          if (index === 0) {
            var trailingText = node.content.slice(startOffset);
            var r = [startOffset, -trailingText.length];

            // Add trailing text to clipboard
            var nodeId = util.uuid();
            content.create({
              id: nodeId,
              type: "text",
              content: trailingText
            });
            // and the clipboards content view
            content.update(["content", "nodes"], ["+", index, nodeId]);
          } else if (index === nodes.length-1) {
            // Last node of selection
            var text = node.content.slice(0, endOffset);
            var r = [-text.length];

            // Add selected text from last node to clipboard
            var nodeId = util.uuid();
            content.create({
              id: nodeId,
              type: "text",
              content: text
            });
            content.update(["content", "nodes"], ["+", index, nodeId]);
          } else {
            var nodeId = util.uuid();
            // Insert node in clipboard document
            content.create(_.extend(_.clone(node), {id: nodeId}));
            // ... and view
            content.update(["content", "nodes"], ["+", index, nodeId]);
          }
        }
      }, this);
    } else {
      var node = nodes[0];
      var text = node.content.slice(startOffset, endOffset);

      var nodeId = util.uuid();
      content.create({
        id: nodeId,
        type: "text",
        content: text
      });
      content.update(["content", "nodes"], ["+", 0, nodeId]);
    }

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
    var content = this.clipboard.getContent();

    // First off, delete the selection
    if (!this.selection.isCollapsed()) this.delete();

    if (!content) return;
    var doc = this.__document;

    // After delete selection we can be sure
    // that the collection is collapsed
    var startNode = this.selection.start[0];
    var startOffset = this.selection.start[1];

    // This is where the pasting stuff starts
    var referenceNode = this.selection.getNodes()[0];

    // Nodes from the clipboard to insert
    var nodes = content.query(["content", "nodes"]);
    var ops = []; // operations transforming the original doc

    var sel = this.selection;
    var newSel;

    if (nodes.length > 1) {
      // Remove trailing stuff
      _.each(nodes, function(node, index) {
        // only consider textish nodes for now
        if (node.content) {
          if (index === 0) {
            var trailingText = referenceNode.content.slice(startOffset);
            var r = [startOffset, -trailingText.length, node.content];

            // remove trailing text from first node at the beginning of the selection
            doc.update([referenceNode.id, "content"], r);

            // Move the trailing text into a new node
            var nodeId = util.uuid();
            doc.create({
              id: nodeId,
              type: "text",
              content: _.last(nodes).content + trailingText
            });

            // and the clipboards content view
            doc.update(["content", "nodes"], ["+", startNode+index+1, nodeId]);
          } else if (index === nodes.length-1) {
            // Skip last node of the clipboard document
          } else {
            // Create a copy of the 
            doc.create(node);
            doc.update(["content", "nodes"], ["+", startNode+index, node.id]);
          }
        }
      }, this);
    } else {
      // Only one node to insert
      var node = nodes[0];
      doc.update([referenceNode.id, "content"], [startOffset, node.content]);
      // Move selection to the end of the pasted content
      newSel = {
        start: [sel.start[0], sel.start[1]+node.content.length],
        end: [sel.start[0], sel.start[1]+node.content.length]
      };
    }

    if (newSel) sel.set(newSel);
  };

  // Based on current selection, insert new node
  // --------
  //
  // TODO: move to controller?

  this.insertNode = function(type) {
    if (!this.selection.isCollapsed()) {
      this.delete();
    }
    var doc = this.__document;
    var nodes = this.selection.getNodes();
    var node = nodes[0];

    var ops = [];

    // Remove the selection
    // TODO: implement

    // Remove trailing stuff
    var nodePos = this.selection.start[0];
    var cursorPos = this.selection.start[1];
    var trailingText = node.content.slice(cursorPos);

    if (trailingText.length > 0) {
      var r = [cursorPos, -trailingText.length];

      doc.update([node.id, "content"], r);
    }

    var id1 = type+"_"+util.uuid();
    var id2 = "text_"+util.uuid();

    // Insert new node for trailingText
    if (trailingText.length > 0) {
      doc.create({
        id: id2,
        type: "text",
        content: trailingText
      });
      doc.update(["content", "nodes"], ["+", nodePos+1, id2]);
    }

    this.selection.set({
      start: [nodePos+1, 0],
      end: [nodePos+1, 0]
    });

    return this;
  };

  // Creates an annotation based on the current position
  // --------
  //

  this.annotate = function(type) {
    var annotation = this.annotator.annotate(type);
    this.annotator.propagateChanges();
    return annotation;
  };


  // Get annotations
  // ---------------
  // 
  // For the given range, get all matching annotations
  // Step one: make it work for single-node selections
  // TODO: consider inclusive / non-inclusive option

  this.getAnnotations = function(node, range, aTypes) {
    var doc = this.__document;
    if (!node) {
      return _.select(doc.nodes, function(node) {
        var baseType = doc.schema.baseType(node.type);
        return baseType === 'annotation';
      });
    }

    var annotations = doc.find('annotations', node);
    if (!range) return annotations;

    var sStart = range[0];
    var sEnd = range[1];
    var res = [];
    _.each(annotations, function(a) {
      var aStart = a.range[0];
      var aEnd = a.range[1];
      
      // if(types[a.type] && types[a.type].inclusive === false) {
      //   // its a non inclusive annotation
      //   // so intersects doesnt include the prev and last chars
      //   var intersects = (aStart + 1) <= sEnd && (aEnd - 1) >= sStart;
      // } else {

      // Assumes all annotations are inclusive for the time being
      var intersects = aStart <= sEnd && aEnd >= sStart;
      // }

      // Intersects and satisfies type filter
      if (intersects && (aTypes ? _.include(aTypes, a.type) : true)) {
        res.push(a);
      }
    });

    return res;

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
  this.onTextNodeChange = function(handler) {
    this.__document.propertyChanges().bind(handler, {path: ["*", "content"]});
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
