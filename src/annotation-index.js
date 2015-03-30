"use strict";

var Substance = require('substance');
var PathAdapter = Substance.PathAdapter;
var Annotation = require('./annotation');

var AnnotationIndex = function(documentModel) {
  this.documentModel = documentModel;
  this.byPath = new PathAdapter();
  this.byType = new PathAdapter();

  this.initialize();
};

AnnotationIndex.Prototype = function() {

  this.get = function(path) {
    return this.byPath.get(path) || {};
  };

  /* Index updates */

  this.initialize = function() {
    Substance.each(this.documentModel.getNodes(), function(node) {
      if (this._select(node)) {
        this.create(node);
      }
    }, this);
  };

  this._select = function(node) {
    return this.documentModel.getSchema().isAnnotationType(node.type);
  };

  // TODO: is it possible to get the affected node with the operation?
  this.onDocumentChange = function(change) {
    change.apply(this);
  };

  this.create = function(anno) {
    this.byType.set([anno.type, anno.id], anno);
    this.byPath.set(anno.path.concat([anno.id]), anno);
  };

  this.delete = function(anno) {
    this.byType.delete([anno.type, anno.id]);
    this.byPath.delete(anno.path.concat([anno.id]));
  };

  this.update = function(anno, property, value, oldValue) {
    if (property === "path") {
      this.delete({ id: anno.id, type: anno.type, path: oldValue });
      this.create(anno);
    }
  };
};

Substance.initClass( AnnotationIndex );

module.exports = AnnotationIndex;
