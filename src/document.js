"use strict";

// Substance.Document 0.5.0
// (c) 2010-2013 Michael Aufreiter
// Substance.Document may be freely distributed under the MIT license.
// For all details and documentation:
// http://interior.substance.io/modules/document.html


// Import
// ========

var _ = require("underscore");
var util = require("substance-util");
var errors = util.errors;
var Data = require("substance-data");
var Operator = require("substance-operator");

// Module
// ========

var DocumentError = errors.define("DocumentError");


// Document
// --------
//
// A generic model for representing and transforming digital documents

var Document = function(options) {
  Data.Graph.call(this, options.schema, options);
};

// Default Document Schema
// --------

Document.schema = {
  // Static indexes
  "indexes": {
  },

  "types": {
    // Specific type for substance documents, holding all content elements
    "content": {
      "properties": {
      }
    },

    "view": {
      "properties": {
        "nodes": ["array", "content"]
      }
    }
  }
};




Document.Prototype = function() {

  var __super__ = util.prototype(this);

  // Get predecessor node for a given view and node id
  // --------
  //

  this.getPredecessor = function(view, id) {
    var pos = this.getPosition(view, id);
    if (pos === 0) return null;
    return this.getNodeFromPosition(view, pos-1);
  };

  // Get successor node for a given view and node id
  // --------
  //

  this.getSuccessor = function(view, id) {
    var pos = this.getPosition(view, id);
    if (pos === view.length - 1) return null;
    return this.getNodeFromPosition(view, pos+1);
  };


  // Returns true if given view and node pos has a successor
  // --------
  //

  this.hasSuccessor = function(view, nodePos) {
    var view = this.get(view).nodes;
    return nodePos < view.length - 1;
  };

  // Returns true if given view and node pos has a predecessor
  // --------
  //

  this.hasPredecessor = function(view, nodePos) {
    return nodePos > 0;
  };

  // Get successor node for a given view and node id
  // --------
  //

  this.getSuccessor = function(view, id) {
    var pos = this.getPosition(view, id);
    // if (pos === view.length - 1) return null;
    return this.getNodeFromPosition(view, pos+1);
  };


  // Get node position for a given view and node id
  // --------
  //

  this.getPosition = function(view, id) {
    return this.get(view).nodes.indexOf(id);
  };

  this.create = function(node) {
    __super__.create.call(this, node);
    return this.get(node.id);
  };

  // Delegates to Graph.get but wraps the result in the particular node constructor
  // --------
  //

  this.get = function(path) {
    var node = __super__.get.call(this, path);
    if (!node) return node;
    var NodeType = this.nodeTypes[node.type];
    return NodeType ? new NodeType(node) : node;
  };

  // Get node object from a given view and position
  // --------
  //

  this.getNodeFromPosition = function(view, pos) {
    var nodeId = this.get(view).nodes[pos];
    return nodeId ? this.get(nodeId) : null;
  };

  // Serialize to JSON
  // --------
  //
  // The command is converted into a sequence of graph commands

  this.toJSON = function() {
    var res = __super__.toJSON.call(this);
    res.id = this.id;
    return res;
  };

  // Hide elements from provided view
  // --------
  //

  this.hide = function(viewId, nodes) {
    var view = this.get(viewId).nodes;

    var indices = [];
    _.each(nodes, function(n) {
      var i = view.indexOf(n);
      if (i>=0) indices.push(i);
    }, this);

    indices = indices.sort().reverse();

    var ops = _.map(indices, function(index) {
      return Operator.ArrayOperation.Delete(index, view[index]);
    });

    var op = Operator.ObjectOperation.Update([viewId, "nodes"], Operator.ArrayOperation.Compound(ops));

    return this.apply(op);
  };


  // Position nodes in document
  // --------
  //

  this.position = function(viewId, nodes, target) {
    var view = this.get(viewId).nodes;
    var ops = [];
    var idx;

    // Create a sequence of atomic array operations that
    // are bundled into a Compound operation
    // 1. Remove elements (from right to left)
    // 2. Insert at the very position

    // the sequence contains selected nodes in the order they
    // occurr in the view
    var seq = _.intersection(view, nodes);
    var l = view.length;

    while(seq.length > 0) {
      var id = seq.pop();
      idx = view.indexOf(id);
      if (idx >= 0) {
        ops.push(Operator.ArrayOperation.Delete(idx, id));
        l--;
      }
    }

    // target index can be given as negative number (as known from python/ruby)
    target = Math.min(target, l);
    if (target<0) target = Math.max(0, l+target+1);

    for (idx = 0; idx < nodes.length; idx++) {
      ops.push(Operator.ArrayOperation.Insert(target + idx, nodes[idx]));
    }

    var update = Operator.ObjectOperation.Update([viewId, "nodes"], Operator.ArrayOperation.Compound(ops));
    return this.apply(update);
  };


  // Start simulation, which conforms to a transaction (think databases)
  // --------
  //

  this.startSimulation = function() {
    // TODO: this should be implemented in a more cleaner and efficient way.
    // Though, for now and sake of simplicity done by creating a copy
    var self = this;
    var simulation = this.fromSnapshot(this.toJSON());
    var ops = [];

    var __apply__ = simulation.apply;

    simulation.apply = function(op) {
      op = __apply__.call(simulation, op);
      ops.push(op);
      return op;
    };

    simulation.save = function() {
      var _ops = [];
      for (var i = 0; i < ops.length; i++) {
        if (ops[i].type !== "compound") {
          _ops.push(ops[i]);
        } else {
          _ops = _ops.concat(ops[i].ops);
        }
      }
      var compound = Operator.ObjectOperation.Compound(_ops);
      self.apply(compound);
      console.log("Saved simulated ops", self);
    };

    return simulation;
  };

  this.fromSnapshot = function(data, options) {
    return Document.fromSnapshot(data, options);
  };

};

Document.Prototype.prototype = Data.Graph.prototype;
Document.prototype = new Document.Prototype();

// Add event support
_.extend(Document.prototype, util.Events);


Document.fromSnapshot = function(data, options) {
  options = options || {};
  options.seed = data;
  return new Document(options);
};

Document.DocumentError = DocumentError;

// Export
// ========

module.exports = Document;
