"use strict";

var _ = require('underscore');
var util = require('substance-util');

// Multi-Node annotations live in the scope of a specific container (as only there the range makes sense)
var MultiNodeAnnotations = function(document, container) {
  this.document = document;
  this.container = container;
  this.annotations = {};
  this.fragments = {};

  // add this to the indexes so that it gets updated on graph changes
  this.document.indexes['multi_node_annotations_'+container.name] = this;
  this.initialize();
};

MultiNodeAnnotations.Prototype = function() {

  this.select = function(n) {
    return this.document.schema.isInstanceOf(n.type, "multi_node_annotation") && n.container === this.container.name;
  };

  this.initialize = function() {
    _.each(this.document.nodes, function(n) {
      this.create(n);
    }, this);
  };

  this.getFragmentsForComponent = function(compPath) {
    var result = {};
    _.each(this.annotations, function(anno) {
      _.each(this.fragments[anno.id], function(fragment) {
        if (_.isEqual(fragment.path, compPath)) {
          result[anno.id] = fragment;
        }
      });
    }, this);
    return result;
  };

  this.onGraphChange = function(op) {
    this.document.cotransform(this, op);
  };

  // Graph co-transformation adapter interface

  this.create = function(node) {
    if (!this.select(node)) return;
    this.annotations[node.id] = node;
    this._extractFragments(node);
  };

  this._extractFragments = function(node) {
    var startComp = this.container.lookup(node.start.path);
    var endComp = this.container.lookup(node.end.path);
    var fragments = [];
    for (var i = startComp.pos; i <= endComp.pos; i++) {
      var comp = this.container.getComponent(i);
      var s = 0;
      var e = comp.getLength();
      if (i === startComp.pos) {
        s = node.start.charPos;
      }
      if (i === endComp.pos) {
        e = node.end.charPos;
      }
      var frag = {
        type: "annotation_fragment",
        id: util.uuid(),
        annotation: node.id,
        path: comp.path,
        range: [s, e]
      };
      fragments.push(frag);
    }
    this.fragments[node.id] = fragments;
  };

  this.delete = function(node) {
    if (!this.select(node)) return;
    delete this.annotations[node.id];
    delete this.fragments[node.id];
  };

  this.update = function(node) {
    if (!this.select(node)) return;
    this._extractFragments(node);
  };

};

MultiNodeAnnotations.prototype = new MultiNodeAnnotations.Prototype();

module.exports = MultiNodeAnnotations;
