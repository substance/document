"use strict";

var Substance = require('substance');
var PathAdapter = Substance.PathAdapter;
var Annotation = require('./annotation');

var AbstractIndex = function(options) {
  this.documentModel = null;
  this.index = new PathAdapter();

  this.select = options.select || function() { return true; };
  this.getKey = options.getKey || function(node) { return node.type; };
};

AbstractIndex.Prototype = function() {

  this.get = function(path) {
    return this.index.get(path) || {};
  };

  /* Index updates */

  this.initialize = function() {
    Substance.each(this.documentModel.getNodes(), function(node) {
      if (this.select(node)) {
        this.create(node);
      }
    }, this);
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
    var oldKey = this.getKey(node, oldValue);
    this.delete(oldKey, node);
    var newKey = this.getKey(node);
    this.create(newKey, node);
  };
};

Substance.initClass( AbstractIndex );

module.exports = AbstractIndex;
