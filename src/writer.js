"use strict";

// Import
// ========

var _ = require("underscore");
var util = require("substance-util");
var Document = require("./document");
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

  // Merge with previous node
  // --------
  //
  // FIX: currently assumes there are only text nodes!

  this.__mergeWithPrevious = function() {
    var sel = this.selection;
    var node = this.selection.getNodes()[0];
    var nodeOffset = sel.start[0];

    // TODO: Use convenience API one implemented
    // var prevNode = sel.find('left', node);
    var prevNode = this.getPreviousNode();
    var doc = this.__document;

    if (!prevNode) return;

    var prevText = prevNode.content;
    var txt = node.content;

    var annotations = this.annotator.copy({start: sel.start, end: [nodeOffset, node.content.length]});

    // 1. Delete original node from graph
    doc.delete(node.id);

    // ... and view
    doc.update(["content", "nodes"], ["-", nodeOffset]);

    // 2. Update previous node and append text
    doc.update([prevNode.id, "content"], [prevNode.content.length, txt]);

    // transform all annotations so that they reflect the stitching
    this.annotator.paste(annotations, prevNode.id, prevText.length);

    this.selection.set({
      start: [nodeOffset-1, prevText.length],
      end: [nodeOffset-1, prevText.length]
    });
  };

  // Delete content at a given range
  // ------------
  // 
  // General implementation for character deletion that
  // might span accross multiple nodes or just affects a single node
  // Used internally by Writer.delete

  this.__deleteRange = function(sel) {
    var doc = this.__document.startSimulation(),
        startChar = sel.startChar(),
        endChar = sel.endChar(),
        nodes = sel.getNodes();
    sel = new Selection(doc, sel); // Fresh selection that refers to the simulated doc

    if (nodes.length > 1) {

      // Selection spans across multiple nodes
      // --------
      var trailingText;

      _.each(nodes, function(node, index) {
        // only consider textish nodes for now
        if (node.content) {
          if (index === 0) {
            trailingText = node.content.slice(startChar);
            // Remove trailing text from first node at the beginning of the selection
            doc.update([node.id, "content"], [startChar, -trailingText.length]);
          } else if (index === nodes.length-1) {
            // Last node of selection
            trailingText = node.content.slice(endChar);

            // Look back to first node
            var firstNode = nodes[0];

            // remove preceding text from last node until the end of the selection
            doc.update([firstNode.id, "content"], [firstNode.content.length, trailingText]);

            // Delete last node of selection (remove from view and delete node)
            var pos = doc.getPosition('content', node.id);
            doc.update(["content", "nodes"], ["-", pos]);
            doc.delete(node.id);
          } else {
            // Delete node from document (remove from view and delete node)
            doc.update(["content", "nodes"], ["-", doc.getPosition('content', node.id)]);
            doc.delete(node.id);
          }
        }
      }, this);      
    } else {

      // Selection happened within a single node
      // --------

      var node = nodes[0];
      var text = node.content.slice(startChar, endChar);
      doc.update([node.id, "content"], [startChar, -text.length]);
    }

    // Commit the changes we just made
    doc.save();

    // Update the original selection
    this.selection.setCursor([sel.startNode(), sel.startChar()]);
  };


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

  this.getPreviousNode = function() {
    var sel = this.selection;
    var nodeOffset = sel.start[0];
    var view = this.get('content').nodes;

    if (nodeOffset === 0) return null;
    return this.get(view[nodeOffset-1]);
  };


  // Based on selection get successor node, if available
  // --------
  //

  this.getNextNode = function() {
    var sel = this.selection;
    var nodeOffset = sel.end[0];
    var view = this.get('content').nodes;

    if (nodeOffset > view.length) return null;
    return this.get(view[nodeOffset+1]);
  };

  // Did it work?
  // Maybe this should go into the document module?

  this.__deleteNode = function(nodeId) {
    var doc = this.__document;
    // Delete node from document (remove from view and delete node)
    doc.update(["content", "nodes"], ["-", doc.getPosition('content', nodeId)]);
    doc.delete(nodeId);
  };

  // Deleting only the image, nothing else
  // --------
  // 

  this.__deleteImage = function(nodeId) {
    var doc = this.__document;

    var pos = doc.getPosition('content', nodeId);
    if (pos > 0) {
      // Put cursor at last position of preceding node
      var pred = doc.getPredecessor('content', nodeId);
      var cursorPos = [pos-1, pred.content.length];
    } else {
      var succ = doc.getSuccessor('content', nodeId);
      if (succ) {
        // Put cursor at first position of successing node
        var cursorPos = [pos+1, 0];
      } else {
        throw new Error('Tricky thing with cursors and empty docs...');
      }
    }

    this.__deleteNode(nodeId);

    // TODO: make dynamic
    this.selection.setCursor(cursorPos);
  };

  // Delete current selection
  // --------
  //

  this.delete = function() {
    var sel = this.selection;

    // Single cursor stuff
    // =========

    var node = sel.getNodes()[0];

    // Image Business
    // --------

    // Case: Collapsed cursor is at right edge of the image
    // Desired behavior -> delete the image and put cursor to last position
    // of preceding element

    if (sel.isCollapsed() && sel.startChar() === 1 && node.type === "image") {
      console.log('deleting image here.');
      this.__deleteImage(node.id);
      return;
    }

    if (!sel.hasMultipleNodes() && sel.startChar() === 0 && sel.endChar() === 1 && node.type === "image") {
      return this.__deleteImage(node.id);
    }


    // Single cursor: remove preceding char
    // --------
    // 
    

    if (sel.isCollapsed() && sel.startChar()>0) {
      this.__deleteRange({
        start: [sel.startNode(), sel.startChar() - 1],
        end: sel.start
      });
    }

    // Single cursor: merge with previous node
    // --------
    // 

    if (sel.isCollapsed() && sel.startChar() === 0) {
      this.__mergeWithPrevious();
    }



    // Default behavior
    // --------
    // 

    this.__deleteRange(sel);
  };

  // Copy current selection
  // --------
  //

  this.copy = function() {
    // Convenience vars
    var sel = this.selection;
    var startOffset = sel.start[1];
    var endOffset = sel.end[1];
    var nodes = sel.getNodes();

    var content = new Document({id: "clipboard"});

    // keep a mapping of ids to be able to map extracted annotations
    // to the newly created nodes
    var idMap = {};
    var nodeId;

    if (nodes.length > 1) {
      // Remove trailing stuff
      _.each(nodes, function(node, index) {
        // only consider textish nodes for now
        if (node.content) {
          if (index === 0) {
            var trailingText = node.content.slice(startOffset);

            // Add trailing text to clipboard
            nodeId = util.uuid();
            content.create({
              id: nodeId,
              type: "text",
              content: trailingText
            });
            // and the clipboards content view
            content.update(["content", "nodes"], ["+", index, nodeId]);

            idMap[node.id] = nodeId;
          } else if (index === nodes.length-1) {
            // Last node of selection
            var text = node.content.slice(0, endOffset);

            // Add selected text from last node to clipboard
            nodeId = util.uuid();
            content.create({
              id: nodeId,
              type: "text",
              content: text
            });
            content.update(["content", "nodes"], ["+", index, nodeId]);

            idMap[node.id] = nodeId;
          } else {
            nodeId = util.uuid();
            // Insert node in clipboard document
            content.create(_.extend(_.clone(node), {id: nodeId}));
            // ... and view
            content.update(["content", "nodes"], ["+", index, nodeId]);

            idMap[node.id] = nodeId;
          }
        }
      }, this);
    } else {
      var node = nodes[0];
      var text = node.content.slice(startOffset, endOffset);

      nodeId = util.uuid();
      content.create({
        id: nodeId,
        type: "text",
        content: text
      });
      content.update(["content", "nodes"], ["+", 0, nodeId]);

      idMap[node.id] = nodeId;
    }

    // get a copy of annotations within the selection
    // and bind them to the newly created nodes using the previously stored id map.
    var annotations = this.annotator.copy(sel);
    for (var i = 0; i < annotations.length; i++) {
      var annotation = annotations[i];
      annotation.node = idMap[annotation.node];
      content.create(annotation);
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

            var annotations = content.find("annotations", node.id);
            this.annotator.paste(annotations, referenceNode.id, startOffset);

          } else if (index === nodes.length-1) {
            // Skip last node of the clipboard document
            // TODO why?
          } else {
            // Create a copy of the 
            doc.create(node);
            doc.update(["content", "nodes"], ["+", startNode+index, node.id]);
            var annotations = content.find("annotations", node.id);
            this.annotator.paste(annotations);
          }
        }
      }, this);
    } else {
      // Only one node to insert
      var node = nodes[0];
      doc.update([referenceNode.id, "content"], [startOffset, node.content]);

      var annotations = content.find("annotations", node.id);
      this.annotator.paste(annotations, referenceNode.id, startOffset);

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

    // Remove the selection
    // TODO: implement

    // Remove trailing stuff
    var nodePos = this.selection.start[0];
    var cursorPos = this.selection.start[1];
    var trailingText = node.content.slice(cursorPos);

    var annotations = this.annotator.copy({start: [nodePos, cursorPos], end: [nodePos, node.content.length]});

    if (trailingText.length > 0) {
      var r = [cursorPos, -trailingText.length];

      doc.update([node.id, "content"], r);
    }

    // Insert new node for trailingText
    if (trailingText.length > 0) {
      var newId = "text_"+util.uuid();
      doc.create({
        id: newId,
        type: "text",
        content: trailingText
      });
      doc.update(["content", "nodes"], ["+", nodePos+1, newId]);

      this.annotator.paste(annotations, newId);
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
  // TODO: move into annotator?

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
