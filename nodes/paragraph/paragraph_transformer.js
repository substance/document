"use strict";

var TextTransformer = require('../../src/text').Transformer;

// Substance.TextTransformer
// -----------------
//
// Manipulation interface for all node types
// This behavior can overriden by the concrete node types

var ParagraphTransformer = function(document, node) {
  TextTransformer.call(this, document, node)
};


ParagraphTransformer.Prototype = function() {

};

ParagraphTransformer.Prototype.prototype = TextTransformer.prototype;
ParagraphTransformer.prototype = new ParagraphTransformer.Prototype();

module.exports = ParagraphTransformer;