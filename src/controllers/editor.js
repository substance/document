(function(root) {

var Substance = root.Substance;
var util = Substance.util;
var _ = root._;
var Data = root.Substance.Data;
var Library = root.Substance.Library;
var Document = Substance.Document;
var Operator = Substance.Operator;
var Selection = Document.Selection;


// Document.Editor
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
//     var editor = new Substance.Document.Editor(doc);
//     var editor.insert('Hello World');

var Editor = function(document) {
  this.__document = document;
  this.selection = new Selection(this.__document, null);
};


Editor.Prototype = function() {

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
    ops.push(Data.Graph.Delete(_.clone(node)));

    // ... and view
    ops.push(Data.Graph.Update(["content", "nodes"], Operator.ArrayOperation.Delete(nodeOffset, node.id)));

    // 2. Update previous node and append text
    ops.push(Data.Graph.Update([prevNode.id, "content"], Operator.TextOperation.Insert(prevNode.content.length, txt)));
    
    doc.apply(Data.Graph.Compound(doc, ops));
  
    this.selection.set({
      start: [nodeOffset-1, prevText.length],
      end: [nodeOffset-1, prevText.length]
    });
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
    var nodes = this.selection.getNodes();
    var doc = this.__document;


    var ops = []; // operations transforming the original doc

    if (nodes.length > 1) {
      // Remove trailing stuff
      _.each(nodes, function(node, index) {
        // only consider textish nodes for now
        if (node.content) {
          if (index === 0) {
            var trailingText = node.content.slice(startOffset);
            var r = [startOffset, -trailingText.length];
            // remove trailing text from first node at the beginning of the selection
            ops.push(Data.Graph.Update([node.id, "content"], Operator.TextOperation.fromOT(node.content, r)));
          } else if (index === nodes.length-1) {
            // Last node of selection
            var text = node.content.slice(0, endOffset);
            var r = [-text.length];

            // remove preceding text from last node until the end of the selection
            ops.push(Data.Graph.Update([node.id, "content"], Operator.TextOperation.fromOT(node.content, r)));
          } else {
            // Delete node from document
            ops.push(Data.Graph.Delete(_.clone(node)));
            var pos = doc.get('content').nodes.indexOf(node.id);
            // ... and from view
            ops.push(Data.Graph.Update(["content", "nodes"], Operator.ArrayOperation.Delete(pos, node.id)));
          }
        }
      }, this);
    } else {
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
      ops.push(Data.Graph.Update([node.id, "content"], Operator.TextOperation.fromOT(node.content, r)));
    }

    doc.apply(Data.Graph.Compound(doc, ops));

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

    var clipboard = new Document({id: "clipboard"});

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
            clipboard.apply(Data.Graph.Create({
              id: nodeId,
              type: "text",
              content: trailingText
            }));
            // and the clipboards content view
            clipboard.apply(Data.Graph.Update(["content", "nodes"], Operator.ArrayOperation.Insert(index, nodeId)));
          } else if (index === nodes.length-1) {
            // Last node of selection
            var text = node.content.slice(0, endOffset);
            var r = [-text.length];

            // Add selected text from last node to clipboard
            var nodeId = util.uuid();
            clipboard.apply(Data.Graph.Create({
              id: nodeId,
              type: "text",
              content: text
            }));
            clipboard.apply(Data.Graph.Update(["content", "nodes"], Operator.ArrayOperation.Insert(index, nodeId)));
          } else {
            var nodeId = util.uuid();
            // Insert node in clipboard document
            clipboard.apply(Data.Graph.Create(_.extend(_.clone(node), {id: nodeId})));
            // ... and view
            clipboard.apply(Data.Graph.Update(["content", "nodes"], Operator.ArrayOperation.Insert(index, nodeId)));
          }
        }
      }, this);
    } else {
      var node = nodes[0];
      var text = node.content.slice(startOffset, endOffset);

      var nodeId = util.uuid();
      clipboard.apply(Data.Graph.Create({
        id: nodeId,
        type: "text",
        content: text
      }));
      clipboard.apply(Data.Graph.Update(["content", "nodes"], Operator.ArrayOperation.Insert(0, nodeId)));
    }

    return clipboard;
  };


  // Cut current selection from document
  // --------
  //
  // Returns cutted content as a new Substance.Document

  this.cut = function() {
    var content = this.copy();
    this.delete();
    return content;
  };


  // Paste content from clipboard at current position
  // --------
  // 

  this.paste = function(content) {

    // First off, delete the selection
    if (!this.selection.isCollapsed()) this.delete();

    if (!content) return;

    // After delete selection we can be sure
    // that the collection is collapsed
    var startNode = this.selection.start[0];
    var startOffset = this.selection.start[1];

    // This is where the pasting stuff starts
    var referenceNode = this.selection.getNodes()[0];

    // Nodes from the clipboard to insert
    var nodes = content.query(["content", "nodes"]);
    var ops = []; // operations transforming the original doc

    if (nodes.length > 0) {
      // Remove trailing stuff
      _.each(nodes, function(node, index) {
        // only consider textish nodes for now
        if (node.content) {
          if (index === 0) {
            var trailingText = referenceNode.content.slice(startOffset);
            var r = [startOffset, -trailingText.length, node.content];

            // remove trailing text from first node at the beginning of the selection
            ops.push(Data.Graph.Update([referenceNode.id, "content"], Operator.TextOperation.fromOT(referenceNode.content, r)));

            // Move the trailing text into a new node
            var nodeId = util.uuid();
            ops.push(Data.Graph.Create({
              id: nodeId,
              type: "text",
              content: _.last(nodes).content + trailingText
            }));

            // and the clipboards content view
            ops.push(Data.Graph.Update(["content", "nodes"], Operator.ArrayOperation.Insert(startNode+index+1, nodeId)));
          } else if (index === nodes.length-1) {
            // Skip
          } else {
            ops.push(Data.Graph.Create(node));
            ops.push(Data.Graph.Update(["content", "nodes"], Operator.ArrayOperation.Insert(startNode+index, node.id)));
          }
        }
      }, this);
    } else {
      ops.push(Data.Graph.Update([referenceNode.id, "content"], Operator.TextOperation.Insert(startOffset, node.content)));
    }

    this.apply(Data.Graph.Compound(this, ops));
  };


  // Based on current selection, insert new node
  // --------
  //
  // TODO: move to controller?

  this.insertNode = function(type) {
    if (!this.selection.isCollapsed()) {
      throw new Error('Not yet implemented for actual ranges');
    }

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

      ops.push(Data.Graph.Update([node.id, "content"], Operator.TextOperation.fromOT(node.content, r)));
    }

    var id1 = type+"_"+util.uuid();
    var id2 = "text_"+util.uuid();

    // Insert new node for trailingText
    if (trailingText.length > 0) {
      ops.push(Data.Graph.Create({
        id: id2,
        type: "text",
        content: trailingText
      }));
      ops.push(Data.Graph.Update(["content", "nodes"], Operator.ArrayOperation.Insert(nodePos+1, id2)));
    }

    // Execute all steps at once
    this.__document.apply(Data.Graph.Compound(this.__document, ops));

    this.selection.set({
      start: [nodePos+1, 0],
      end: [nodePos+1, 0]
    });

    return this;
  };

  // inserts text at the current position
  // --------
  // 

  this.write = function(text) {
    if (this.selection.isNull()) {
      console.log("Can not write, as no position has been selected.")
      return;
    }

    if (!this.selection.isCollapsed()) {
      this.delete();
    }

    var node = this.selection.getNodes()[0];
    var nodeIdx = this.selection.start[0];
    var pos = this.selection.start[1];

    // TODO: future. This only works for text nodes....
    var cmd = Data.Graph.Update([node.id, "content"], [pos, text]);
    this.__document.apply(cmd);
  
    this.selection.set({
      start: [nodeIdx, pos+text.length],
      end: [nodeIdx, pos+text.length]
    });
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
Editor.prototype = new Editor.Prototype();

// Property accessors for convenient access of primary properties
Object.defineProperties(Editor.prototype, {
  id: {
    get: function() {
      return this.__document.id;
    },
    set: function() { throw "immutable property"}
  },
  title: {
    get: function() {
      return this.__document.get('document').title;
    },
    set: function() { throw "immutable property"}
  },
  updated_at: {
    get: function() {
      return this.__document.get('document').updated_at;
    },
    set: function() { throw "immutable property"}
  },
  creator: {
    get: function() {
      return this.__document.get('document').creator;
    },
    set: function() { throw "immutable property"}
  }
});

Document.Editor = Editor;

})(this);
