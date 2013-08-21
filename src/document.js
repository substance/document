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
var Chronicle = require("substance-chronicle");

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

    // wrap the node into a rich object
    // and replace the instance stored in the graph
    var NodeType = this.nodeTypes[node.type];
    if (NodeType && !(node instanceof NodeType)) {
      node = new NodeType(node, {
        get: this.get.bind(this),
        on: this.on.bind(this),
        off: this.off.bind(this)
      });
      this.nodes[node.id] = node;
    }

    return node;
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
    var view = this.get(viewId);

    if (!view) {
      throw new DocumentError("Invalid view id: "+ viewId);
    }

    if (_.isString(nodes)) {
      nodes = [nodes];
    }

    var indexes = [];
    _.each(nodes, function(n) {
      var i = view.nodes.indexOf(n);
      if (i>=0) indexes.push(i);
    }, this);

    if (indexes.length === 0) return;

    indexes = indexes.sort().reverse();
    indexes = _.uniq(indexes);

    var ops = _.map(indexes, function(index) {
      return Operator.ArrayOperation.Delete(index, view.nodes[index]);
    });

    var op = Operator.ObjectOperation.Update([viewId, "nodes"], Operator.ArrayOperation.Compound(ops));

    return this.apply(op);
  };

  // Adds nodes to a view
  // --------
  //

  this.show = function(viewId, nodes, target) {
    if (arguments.length !== 3) {
      throw new DocumentError("Invalid arguments: expecting (viewId, nodes, target)");
    }

    var view = this.get(viewId);
    if (!view) {
      throw new DocumentError("Invalid view id: " + viewId);
    }

    if (_.isString(nodes)) {
      nodes = [nodes];
    }

    var l = view.nodes.length;

    // target index can be given as negative number (as known from python/ruby)
    target = Math.min(target, l);
    if (target<0) target = Math.max(0, l+target+1);

    var ops = [];
    for (var idx = 0; idx < nodes.length; idx++) {
      var nodeId = nodes[idx];
      if (this.nodes[nodeId] === undefined) {
        throw new DocumentError("Invalid node id: " + nodeId);
      }
      ops.push(Operator.ArrayOperation.Insert(target + idx, nodeId));
    }

    if (ops.length > 0) {
      var update = Operator.ObjectOperation.Update([viewId, "nodes"], Operator.ArrayOperation.Compound(ops));
      return this.apply(update);
    }
  };

  // Start simulation, which conforms to a transaction (think databases)
  // --------
  //

// Deactivated this as it does not work and breaks everything
/*
  this.startSimulation = function() {

    var parent = this;

    var doc = _.extend({}, this);
    doc._events = [];
    doc.objectAdapter = new Data.Graph.ObjectAdapter(doc);

    // remember the original state
    var initialState = this.chronicle.getState();

    // create a temporary chronicle index
    doc.chronicle = _.extend({}, this.chronicle);
    doc.chronicle.manage(new Data.Graph.ChronicleAdapter(doc));
    doc.chronicle.index = new Chronicle.TmpIndex(this.chronicle.index);

    // inject a recording apply method
    var ops = [];
    var __apply__ = this.apply;
    doc.apply = function(op) {
      op = __apply__.call(this, op);
      ops.push(op);
      return op;
    };

    doc.save = function() {
      var _ops = [];
      for (var i = 0; i < ops.length; i++) {
        if (ops[i].type !== "compound") {
          _ops.push(ops[i]);
        } else {
          _ops = _ops.concat(ops[i].ops);
        }
      }
      var compound = Operator.ObjectOperation.Compound(_ops);
      this.chronicle.reset(initialState);

      parent.apply(compound);
    };

    return doc;
  };
*/

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

      if (_ops.length === 0) {
        // nothing has been recorded
        return;
      }

      var compound = Operator.ObjectOperation.Compound(_ops);
      self.apply(compound);
      // console.log("Saved simulated ops", self);
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
