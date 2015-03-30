'use strict';

var Substance = require('substance');
var Node = require('./node');

var Annotation = function dmAnnotation( data ) {
  Node.call(this, data);
};

Annotation.Prototype = function() {
  this.canSplit = function() {
    return this.constructor.static.canSplit;
  };
};

Substance.inherit( Annotation, Node );

Annotation.static.name = "annotation";

Annotation.static.schema = {
  path: ['array', 'string'],
  range: ['array', 'number']
};

Annotation.static.canSplit = true;

module.exports = Annotation;
