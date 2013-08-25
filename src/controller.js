"use strict";

var _ = require("underscore");
var util = require("substance-util");
var Operator = require('substance-operator');
var Selection = require("./selection");
var Annotator = require("./annotator");
var Clipboard = require("./clipboard");
var Container = require('./container');

// Document.Controller
// -----------------
//
// Provides means for editing and viewing a Substance.Document. It introduces
// a Selection API in order to move a cursor through the document, support
// copy and paste, etc.
//
// Note: it is quite intentional not to expose the full Substance.Document interface
//       to force us to explicitely take care of model adaptations.
//
// Example usage:
//
//     var doc = new Substance.Document();
//     var editor = new Substance.Document.Controller(doc);
//     var editor.insert("Hello World");

var Controller = function(document, options) {
  options = options || {};
  this.view = options.view || 'content';

  this.__document = document;

  this.chronicle = document.chronicle;
  this.annotator = new Annotator(document);

  this.container = document.get(this.view);
  this.selection = new Selection(this.container);
  this.clipboard = new Clipboard();

  // TODO: this needs serious re-thinking...
  // On the one hand, we wan be able to set the cursor after undo or redo.
  // OTOH, we do not want to update the selection on each micro operation.
  // Probably, the best would be to do that explicitely in all cases (also undo/redo)...
  // this.listenTo(document, 'operation:applied', this.updateSelection);
};

Controller.Prototype = function() {

  // Document Facette
  // --------

  this.getNodes = function(idsOnly) {
    return this.container.getNodes(idsOnly);
  };

  this.getContainer = function() {
    return this.container;
  };

  // Given a node id, get position in the document
  // --------
  //

  this.getPosition = function(id, flat) {
    return this.container.getPosition(id, flat);
  };

  this.getNodeFromPosition = function(nodePos) {
    return this.container.getNodeFromPosition(nodePos);
  };

  // See Annotator
  // --------
  //

  this.getAnnotations = function(options) {
    options = options || {};
    options.view = this.view;
    return this.annotator.getAnnotations(options);
  };

  // Delete current selection
  // --------
  //

  this.delete = function(direction) {

    var session = this.startManipulation();
    // var doc = session.doc;
    var sel = session.sel;
    var container = sel.container;

    if (sel.isNull()) return;

    if (sel.isCollapsed()) {
      sel.expand(direction, "char");
    }

    session.deleteSelection();
    session.save();

    if (container.getLength() === 0) {
      this.selection.clear();
    } else {
      sel.collapse("left");
      this.selection.set(sel);
    }

  };

  // Copy current selection
  // --------
  //

  this.copy = function() {
    console.log("I am sorry. Currently disabled.");
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
    console.log("I am sorry. Currently disabled.");
  };

  // Split
  // --------
  //

  this.modifyNode = function(type, data) {
    console.log("I am sorry. Currently disabled.");
  };


  // Based on current selection, insert new node
  // --------
  //

  this.insertNode = function(type, data) {
    console.log("I am sorry. Currently disabled.");
  };

  // Creates an annotation based on the current position
  // --------
  //

  this.annotate = function(type, data) {
    return this.annotator.annotate(this.selection, type, data);
  };


  this.startManipulation = function() {
    var doc = this.__document.startSimulation();
    new Annotator(doc, {withTransformation: true});
    var sel = new Selection(doc.get(this.view), this.selection);
    return new Controller.ManipulationSession(doc, sel);
  };

  // Inserts text at the current position
  // --------
  //

  this.write = function(text) {
    if (this.selection.isNull()) {
      console.log("Can not write, as no position has been selected.");
      return;
    }

    var session = this.startManipulation();
    var doc = session.doc;
    var sel = session.sel;

    if (!sel.isCollapsed()) {
      session.deleteSelection();
    }

    var node = sel.getNodes()[0];
    var nodePos = sel.start[0];
    var charPos = sel.start[1];

    // TODO: future. This only works for text nodes....

    var update = node.insertOperation(charPos, text);
    if (update) doc.apply(update);

    session.save();
    this.selection.set([nodePos, charPos+text.length]);
  };

  // Delegate getter
  this.get = function() {
    return this.__document.get.apply(this.__document, arguments);
  };

  this.on = function() {
    return this.__document.on.apply(this.__document, arguments);
  };

  this.off = function() {
    return this.__document.off.apply(this.__document, arguments);
  };

  this.undo = function() {
    var op = this.chronicle.rewind();
    this.updateSelection(op);
  };

  this.redo = function() {
    var op = this.chronicle.forward();
    this.updateSelection(op);
  };

  this.updateSelection = function(op) {
    if (!op) return;

    var view = this.view;
    var doc = this.__document;
    var container = this.container;

    // TODO: define when and how to react on operations
    function getUpdatedPostion(op) {
      if (op.type !== "update" && op.type !== "set") return;

      var nodePos = -1;
      var charPos = -1;

      // handle changes to the view of nodes
      if (op.path[0] === view && op.path[1] === "nodes") {
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
        var node = doc.get(op.path[0]);
        // TODO: fixme. This does not work with deletions.
        if (!node) return;

        nodePos = container.getPosition(node.id);
        if (node.getUpdatedCharPos !== undefined) {
          charPos = node.getUpdatedCharPos(op);
        }
      }

      return [nodePos, charPos];
    }

    var pos = null;
    var tmp;
    if (op.type === "compound") {
      Operator.Helpers.each(op, function(_op) {
        tmp = getUpdatedPostion(_op);
        if (tmp && tmp[0] >= 0 && tmp[1] >= 0) {
          pos = tmp;
        }
      });
    } else {
      tmp = getUpdatedPostion(op);
      if (tmp && tmp[0] >= 0 && tmp[1] >= 0) {
        pos = tmp;
      }
    }

    if (pos) {
      this.selection.set(pos);
    }
  };

};

// Inherit the prototype of Substance.Document which extends util.Events
Controller.prototype = _.extend(new Controller.Prototype(), util.Events.Listener);

// Property accessors for convenient access of primary properties
Object.defineProperties(Controller.prototype, {
  id: {
    get: function() {
      return this.__document.id;
    },
    set: function() { throw "immutable property"; }
  },
  nodeTypes: {
    get: function() {
      return this.__document.nodeTypes;
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

var ManipulationSession = function(doc, sel) {
  this.doc = doc;
  this.sel = sel;
  this.container = sel.container;
  this.view = this.container.__view;
};

ManipulationSession.Prototype = function() {

  this.save = function() {
    this.doc.save();
  };

  // Joins two succeeding nodes
  // --------
  //

  this.join = function(id1, id2) {
    // TODO: check if node2 is successor of node1

    var doc = this.doc;
    var container = this.container;

    var node1 = doc.get(id1);
    var node2 = doc.get(id2);

    var parentId1 = container.getParent(id1);
    var parentId2 = container.getParent(id2);
    var parent1 = (parentId1) ? doc.get(parentId1) : null;
    var parent2 = (parentId2) ? doc.get(parentId2) : null;

    // Note: assuming that mutable composites allow joins (e.g., lists), others do not (e.g., figures)
    if (!node1.canJoin(node2) || (parent1 && !parent1.isMutable())) {
      return false;
    }

    node1.join(doc, node2);
    this.deleteNode(node2.id);

    // Join composites if this is allowed
    // Note: this is experimental...
    //  currently, this is only used with two succeeding lists
    if (parent1 && parent2 &&
      parent1.id !== parent2.id && parent1.canJoin(parent2)) {

      var children1 = parent1.getNodes();
      var children2 = parent2.getNodes();
      var pos = children1.indexOf(id1) + 1;

      // only join if we are at the end of the first composite
      if (pos === children1.length) {
        this.deleteNode(parent2.id);
        for (var i = 0; i < children2.length; i++) {
          parent1.insertChild(doc, pos+i, children2[i]);
        }
      }
    }

    return true;
  };

  // Deletes a node with given id and also takes care of removing it from its parent.
  // --------
  //

  this.deleteNode = function(nodeId) {
    var doc = this.doc;
    var parentId = this.container.getParent(nodeId);
    var parent = (parentId) ? doc.get(parentId) : null;

    if (!parentId) {
      doc.hide(this.view, nodeId);
      doc.delete(nodeId);
    }
    else {
      parent.deleteChild(doc, nodeId);
      if (parent.getLength() === 0) {
        this.deleteNode(parent.id);
      }
    }
  };

  this.deleteSelection = function() {

    var self = this;
    var doc = this.doc;
    var sel = this.sel;
    var container = sel.container;
    var ranges = sel.getRanges();
    var tryJoin = (ranges.length > 1 && !ranges[0].isFull() && !_.last(ranges).isFull());

    // Note: this implementation is unfortunately not so easy...
    // Have chosen a recursion approach to achieve an efficient
    // opportunistic top-down deletion algorithm.
    // It is top-down by that it starts deletion from the top-most
    // node that is fully selected.
    // For efficiency, using a 'visited' map to keep track which nodes have been processed already.

    var i = 0;
    var rangeMap = {};
    for (i = 0; i < ranges.length; i++) {
      rangeMap[ranges[i].node.id] = ranges[i];
    }

    var visited = {};

    // Deletes all children nodes and then removes the given composite itself.
    //
    // Note: this gets only called for the top-most composite which are fully selected.
    //
    function deleteComposite(composite) {
      var queue = _.clone(composite.getNodes());
      self.deleteNode(composite.id);
      while(queue.length > 0) {
        var id = queue.shift();
        doc.delete(id);
        visited[id] = true;
      }
      visited[composite.id] = true;
    }

    // Recursive call that finds the top-most fully selected composite
    //

    function processComposite(node) {
      if (visited[node.id] === undefined) {

        var first = container.firstChild(node);
        var firstRange = rangeMap[first.id];
        var last = container.lastChild(node);
        var lastRange = rangeMap[last.id];

        // If the first and the last range is full then this node is selected fully
        // In that case we check the parent recursively
        // and eventually delete nodes

        if (firstRange && lastRange && firstRange.isFull() && lastRange.isFull()) {
          var parentId = container.getParent(node.id);
          if (parentId) {
            processComposite(doc.get(parentId));
          }
          if (!visited[parentId]) {
            deleteComposite(node);
          }
        } else {
          visited[node.id] = false;
        }
      }
      return visited[node.id];
    }


    for (i = 0; i < ranges.length; i++) {
      var r = ranges[i];
      var node = r.node;
      if (visited[node.id]) continue;

      if (r.isFull()) {
        // If there is a parent composite node,
        // do the top-down deletion
        var parentId = container.getParent(node.id);
        if (parentId) {
          processComposite(doc.get(parentId));
        }
        // otherwise, or if the parent was not fully selected
        // delete the node regularly
        if (!visited[parentId]) {
          this.deleteNode(node.id);
        }
      }
      // for partial deletions ask the node for an (incremental) operation
      else {
        var op = r.node.deleteOperation(r.start, r.end);
        if (op) doc.apply(op);
      }
    }

    // TODO: Maybe we want to return whether the join has been rejected or not
    if (tryJoin) {
      this.join(ranges[0].node.id, ranges[ranges.length-1].node.id);
    }
  };
};

ManipulationSession.prototype = new ManipulationSession.Prototype();

Controller.ManipulationSession = ManipulationSession;

module.exports = Controller;
