"use strict";

var _ = require('underscore');
var Operator = require('substance-operator');
var Data = require('substance-data');
var PathObject = Data.PathObject;
var COWPathObject = Data.COWPathObject;

var AnnotationIndex = function(documentModel) {
  this.documentModel = documentModel;
  this.byPath = new PathObject();
  this.byType = new PathObject();
  this.initialize();
};

AnnotationIndex.Prototype = function() {

  this.get = function(path) {
    return this.byPath.get(path) || {};
  };

  /* Index updates */

  this.initialize = function() {
    _.each(this.documentModel.getNodes(), function(node) {
      if (this._select(node)) {
        this.create(node);
      }
    }, this);
  };

  // TODO: is it possible to get the affected node with the operation?
  this.onGraphChange = function(op) {
    var node = this._getNodeFromOp(op);
    if (this._select(node)) {
      Operator.Helpers.cotransform(this.documentModel, this, op);
    }
  };

  this._getNodeFromOp = function(op) {
    var node;
    switch (op.type) {
      case "create":
      case "delete":
        node = op.val;
        break;
      case "set":
      case "update":
        node = this.documentModel.get(op.path[0]);
        break;
      default:
        node = this.documentModel.get(op.path[0]);
    }
    return node;
  };

  this._select = function(node) {
    return this.documentModel.getSchema().isInstanceOf(node.type, "annotation");
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

  /* Copy on write implementation (used for transactions) */
  this.cowIndex = function(cowDocument) {
    var cow = Object.create(this);
    cow.documentModel = cowDocument;
    cow.byType = new COWPathObject(this.byType.data);
    cow.byPath = new COWPathObject(this.byPath.data);
    var __get__ = cow.get;
    cow.get = function(path) {
      var result = __get__.call(this, path);
      if (result.__COW__ === undefined) return result;

      var cowResult = result;
      result = {};
      for(var key in cowResult) {
        if (key === '__COW__' || key === 'toJSON') continue;
        if (cowResult[key]) result[key] = cowResult[key];
      }
      return result;
    };

    return cow;
  };
};
AnnotationIndex.prototype = new AnnotationIndex.Prototype()
AnnotationIndex.prototype.constructor = AnnotationIndex;

module.exports = AnnotationIndex;
