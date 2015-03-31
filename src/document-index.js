"use strict";

var Substance = require('substance');
var PathAdapter = Substance.PathAdapter;

var Index = function() {
  this.documentModel = null;
  this.index = new PathAdapter();
};

Index.Prototype = function() {

  this.setDocument = function(doc) {
    this.documentModel = doc;
  };

  this.initialize = function() {
    Substance.each(this.documentModel.getNodes(), function(node) {
      if (this.select(node)) {
        this.create(node);
      }
    }, this);
  };

  this.property = "id";

  this.select = function(node) {
    if(!this.type) {
      return true;
    } else {
      return node.isInstanceOf(this.type);
    }
  },

  this.get = function(path) {
    return this.index.get(path) || {};
  };

  // TODO: is it possible to get the affected node with the operation?
  this.onDocumentChange = function(change) {
    // TODO: make sure this is only called for changes that create/delete indexed or update the propery value
    change.apply(this);
  };

  this.create = function(node) {
    var values = node[this.property]; 
    if (!Substance.isArray(values)) {
      values = [values];
    }
    Substance.each(values, function(value) {
      this.index.set([value, node.id], node);
    }, this);
  };

  this.delete = function(node) {
    var values = node[this.property]; 
    if (!Substance.isArray(values)) {
      values = [values];
    }
    Substance.each(values, function(value) {
      this.index.delete([value, node.id]);
    }, this);
  };

  this.update = function(node, property, value, oldValue) {
    var values = oldValue; 
    if (!Substance.isArray(values)) {
      values = [values];
    }
    Substance.each(values, function(value) {
      this.index.delete([value, node.id]);
    }, this);
    values = value;
    if (!Substance.isArray(values)) {
      values = [values];
    }
    Substance.each(values, function(value) {
      this.index.set([value, node.id]);
    }, this);
  };
};

Substance.initClass( Index );

Index.create = function(prototype) {
  return Substance.extend(new Index(), prototype);
};

module.exports = Index;
