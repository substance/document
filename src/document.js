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
var Graph = Data.OperationalGraph;
var COWGraph = Data.OperationalGraph.COWGraph;
var Operator = require("substance-operator");
var Container = require("./container");
var AnnotationIndex = require('./annotation_index');

// Module
// ========

var DocumentError = errors.define("DocumentError");

// Document
// --------
//
// A generic model for representing and transforming digital documents

var Document = function(options) {

  this.graph = new Graph(options.schema, options);

  // Temporary store for file data
  // Used by File Nodes for storing file contents either as blobs or strings
  this.fileData = {};

  this.annotationIndex = new AnnotationIndex(this);
  this.graph.indexes['annotations'] = this.annotationIndex;

  // Index for supplements
  this.addIndex("files", {
    types: ["file"]
  });

  this.listenTo(this.graph, 'operation:applied', this.onGraphOperation);
  this.listenTo(this.graph, 'graph:changed', this.onGraphUpdate);
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

    // Note: we switch to 'container' as 'view' is confusing in presence of Application.View
    // TODO: remove 'view'... make sure to have migrations in place
    "container": {
      "properties": {
        "nodes": ["array", "content"]
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

  _.extend(this, util.Events);

  this.onGraphOperation = function(op) {
    console.log('Document.onGraphOperation', op);
    // TODO: try to get rid of as many low-level listeners as possible
    //  and use graph:update instead
    this.trigger('operation:applied', op, this);
  };

  this.onGraphUpdate = function(changes) {
    console.log('Document.onGraphUpdate', arguments);
    this.trigger('graph:changed', changes);
  };

  this.getIndex = function(name) {
    return this.graph.indexes[name];
  };

  // Delegates to Graph.get but wraps the result in the particular node constructor
  // --------
  //

  this.get = function(path) {
    var node = this.graph.get(path);

    if (!node) return node;

    // Wrap all nodes in an appropriate Node instance
    var nodeSpec = this.nodeTypes[node.type];
    var NodeType = (nodeSpec !== undefined) ? nodeSpec.Model : null;
    if (NodeType && !(node instanceof NodeType)) {
      node = new NodeType(node, this);
      this.graph.nodes[node.id] = node;
    }

    // wrap containers (~views) into Container instances
    // TODO: get rid of the 'view' type... it is misleading in presence of Application.Views.
    if ((node.type === "view" || node.type === "container") && !(node instanceof Container)) {
      node = new Container(this, node.id);
      this.graph.nodes[node.id] = node;
    }

    return node;
  };

  this.resolve = function() {
    return this.graph.resolve.apply(this.graph, arguments);
  };

  this.contains = function() {
    return this.graph.contains.apply(this.graph, arguments);
  };

  this.create = function() {
    return this.graph.create.apply(this.graph, arguments);
  };

  this.delete = function() {
    return this.graph.delete.apply(this.graph, arguments);
  };

  this.set = function() {
    return this.graph.set.apply(this.graph, arguments);
  };

  this.update = function() {
    return this.graph.update.apply(this.graph, arguments);
  };

  this.apply = function() {
    return this.graph.apply.apply(this.graph, arguments);
  };

  this.addIndex = function() {
    return this.graph.addIndex.apply(this.graph, arguments);
  };

  this.getSchema = function() {
    return this.graph.schema;
  };

  this.getNodes = function() {
    return this.graph.nodes;
  };

  // Serialize to JSON
  // --------
  //
  // The command is converted into a sequence of graph commands

  this.toJSON = function() {
    var res = this.graph.toJSON();
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

  // HACK: it is not desired to have the comments managed along with the editorially document updates
  // We need an approach with multiple Chronicles instead.
  this.comment = function(comment) {
    var id = util.uuid();
    comment.id = id;
    comment.type = "comment";
    var op = Operator.ObjectOperation.Create([comment.id], comment);
    return this.graph.__apply__(op);
  };

  this.annotate = function(anno, data) {
    anno.id = anno.type + "_" + util.uuid();
    _.extend(anno, data);
    this.create(anno);
  };

  // Adds nodes to a view
  // --------
  //

  this.show = function(viewId, nodes, target) {
    if (target === undefined) target = -1;

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
      if (this.graph.nodes[nodeId] === undefined) {
        throw new DocumentError("Invalid node id: " + nodeId);
      }
      ops.push(Operator.ArrayOperation.Insert(target + idx, nodeId));
    }

    if (ops.length > 0) {
      var update = Operator.ObjectOperation.Update([viewId, "nodes"], Operator.ArrayOperation.Compound(ops));
      return this.apply(update);
    }
  };

  // Start transaction
  // --------
  //
  this.startTransaction = function() {
    var doc = Object.create(this);
    // shadow the original event listeners
    doc._events =  {};

    doc.graph = new COWGraph(this.graph);
    doc.graph.indexes = {};
    doc.original = this;
    doc.transacting = true;

    // TODO: create a COW version of necessary/all? indexes
    doc.annotationIndex = this.annotationIndex.cowIndex(doc);
    doc.graph.indexes['annotations'] = doc.annotationIndex;

    return doc;
  };

  this.save = function() {
    // this method makes only sense for transactional surfaces
    if (!this.transacting) return;

    var original = this.original;

    // HACK: write back all binaries that have been created on the simulation doc
    // we do that before we apply the operations so that listeners can access the
    // data
    // TODO: when the composer is feature complete we need to refactor the
    // transaction stuff
    _.each(this.fileData, function(data, key) {
      original.fileData[key] = data;
    });

    var ops = this.graph.ops;
    // if nothing has been changed just return
    if (!ops || ops.length === 0) return;
    ops = Operator.Helpers.flatten(ops);
    var compound = Operator.ObjectOperation.Compound(ops);
    original.apply(compound);
  };

  this.fromSnapshot = function(data, options) {
    return Document.fromSnapshot(data, options);
  };

  this.newInstance = function() {
    return new Document({ "schema": this.schema });
  };

  this.uuid = function(type) {
    return type + "_" + util.uuid();
  };
};

Document.prototype = new Document.Prototype();

Object.defineProperties(Document.prototype, {
  indexes: {
    get: function() {
      return this.graph.indexes;
    }
  },
  nodes: {
    get: function() {
      return this.graph.nodes;
    }
  },
  schema: {
    get: function() {
      return this.graph.schema;
    }
  }
});

Document.fromSnapshot = function(data, options) {
  options = options || {};
  options.seed = data;
  return new Document(options);
};


Document.DocumentError = DocumentError;

// Export
// ========

module.exports = Document;
