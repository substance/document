"use strict";

var Substance = require('substance');
var PathAdapter = Substance.PathAdapter;
var Annotation = require('./annotation');

var AbstractIndex = function() {
  this.documentModel = null;
  this.index = new PathAdapter();
};

AbstractIndex.Prototype = function() {

  this.setDocument = function(doc) {
    this.documentModel = doc;
  };

  this.initialize = function() {
    Substance.each(this.documentModel.getNodes(), function(node) {
      if (this.select(node)) {
        var key = this.getKey(node);
        this.create(key, node);
      }
    }, this);
  };

  this.select = function() {
    return true;
  };

  this.getKey = function(node) {
    return node.id;
  };

  this.get = function(path) {
    return this.index.get(path) || {};
  };

  // TODO: is it possible to get the affected node with the operation?
  this.onDocumentChange = function(change) {
    change.apply(this);
  };

  this.create = function(key, node) {
    this.index.set(key, node);
  };

  this.delete = function(key) {
    this.index.delete(key);
  };

  this.update = function(node, property, value, oldValue) {
    var oldKey = oldValue;
    this.delete(oldKey, node);
    var newKey = this.getKey(node);
    this.create(newKey, node);
  };
};

Substance.initClass( AbstractIndex );

AbstractIndex.extend = function(prototype) {
  return Substance.extend(new AbstractIndex(), prototype);
};

module.exports = AbstractIndex;
