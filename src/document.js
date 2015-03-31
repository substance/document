'use strict';

var Substance = require('substance');
var AnnotationIndex = require('./annotation-index');
var DocumentListeners = require('./document-listeners');
var DocumentHistory = require('./document-history');
var Data = require('substance-data/versioned');
var ChangeMap = require('./change-map');

function Document( schema, seed ) {
  Substance.EventEmitter.call(this);

  this.schema = schema;
  this.data = new Data({
    seed: seed,
    nodeFactory: Substance.bind(this.__createNode, this)
  });

  this.indexes = {};

  this.annotationIndex = new AnnotationIndex(this);
  this.indexes['annotations'] = this.annotationIndex;

  this.data.on('operation:applied', Substance.bind(this.onOperationApplied, this));

  this.isTransacting = false;
  this.transactionChanges = null;

  this.history = new DocumentHistory(this);
}

Document.Prototype = function() {

  this.getSchema = function() {
    return this.schema;
  };

  this.get = function(path) {
    return this.data.get(path);
  };

  this.getNodes = function() {
    return this.data.nodes;
  };

  this.addIndex = function(name, index) {
    if (this.indexes[name]) {
      console.error('Index with name %s already exists.', name);
    }
    index.setDocument(this);
    index.initialize();
    this.indexes[name] = index;
    return index;
  };

  this.getAnnotations = function(path, start, end) {
    var sStart = start;
    var sEnd = end;
    var annotations = this.annotationIndex.get(path);
    var result = [];
    // Filter the annotations by the given char range
    if (start) {
      // Note: this treats all annotations as if they were inclusive (left+right)
      // TODO: maybe we should apply the same rules as for Transformations?
      Substance.each(annotations, function(a) {
        var aStart = a.range[0];
        var aEnd = a.range[1];
        var overlap = (aEnd >= sStart);
        // Note: it is allowed to omit the end part
        if (sEnd) {
          overlap &= (aStart <= sEnd);
        }
        if (overlap) {
          result.push(this.get(a.id));
        }
      }, this);
    } else {
      Substance.each(annotations, function(anno) {
        result.push(this.get(anno.id));
      }, this);
    }
    return result;
  };

  this.__createNode = function(nodeData) {
    if (nodeData instanceof Node) {
      return nodeData;
    }
    var node = this.schema.createNode(nodeData.type, nodeData);
    node.attach(this);
    return node;
  };

  this.create = function(node) {
    node = this.data.create(node);
    return node;
  };

  this.delete = function(nodeOrId) {
    var node, id;
    if (Substance.isString(nodeOrId)) {
      id = nodeOrId;
      node = this.graph.get(id);
    } else if (nodeOrId instanceof Node) {
      node = nodeOrId;
      id = node.id;
    } else {
      throw new Error('Illegal argument');
    }
    if (!node) {
      console.error("Unknown node '%s'", id);
    }
    this.data.delete(id);
    node.setDocument(null);
  };

  this.set = function(path, value) {
    this.data.set(path, value);
  };

  this.update = function(path, diff) {
    this.data.update(path, diff);
  };

  this.startTransaction = function() {
    if (this.isTransacting) {
      throw new Error('Nested transactions are not supported yet.');
    }
    this.isTransacting = true;
    this.transactionChanges = new ChangeMap();
    this.history.setRecoveryPoint();
  };

  this.cancelTransaction = function() {
    if (!this.isTransacting) {
      throw new Error('Not in a transaction.');
    }
    this.history.restoreLastRecoveryPoint();
    this.isTransacting = false;
  };

  this.finishTransaction = function() {
    if (!this.isTransacting) {
      throw new Error('Not in a transaction.');
    }
    // TODO: notify external listeners
    this.isTransacting = false;
    this.history.setRecoveryPoint();

    transactionChanges.traverse(function(path, ops) {
      this.emit('transaction', path, ops);
    }, this);
  };

  this.toJSON = function() {
    return {
      schema: [this.schema.name, this.schema.version],
      nodes: this.nodes
    };
  };

  this.onOperationApplied = function(op) {
    if (this.isTransacting) {
      // record the change for the transaction summary event later
      this.transactionChanges.update(op);
    }
    this.emit('operation', op);
  };

};

Substance.inherit(Document, Substance.EventEmitter);

module.exports = Document;
