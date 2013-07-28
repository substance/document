var TextTransformer = require('../../src/text').Transformer;

// Substance.Heading.Transformer
// -----------------
//
// Manipulation interface for all node types
// This behavior can overriden by the concrete node types

var HeadingTransformer = function(document, node) {
  TextTransformer.call(this, document, node);
};



HeadingTransformer.Prototype = function() {
  
};

HeadingTransformer.Prototype.prototype = TextTransformer.prototype;
HeadingTransformer.prototype = new HeadingTransformer.Prototype();

module.exports = HeadingTransformer;