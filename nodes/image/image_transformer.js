var NodeTransformer = require('../../src/node').Transformer;

// Substance.Image.Transformer
// -----------------
//
// Manipulation interface for all node types
// This behavior can overriden by the concrete node types

var ImageTransformer = function(document, node) {
  NodeTransformer.call(this, document, node);
};

ImageTransformer.behaviors = {
  deletion: {
    preventEmpty: false,
    attemptMerge: true
  },
  isText: false
};

ImageTransformer.Prototype = function() {

};

ImageTransformer.Prototype.prototype = NodeTransformer.prototype;
ImageTransformer.prototype = new ImageTransformer.Prototype();

module.exports = ImageTransformer;