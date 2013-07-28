var SubstanceNode = require('./node');
var NodeTransformer = SubstanceNode.Transformer;

// Substance.Text
// -----------------
//

var Text = function() {

};

Text.prototype = SubstanceNode.prototype;


// Substance.Text.Transformer
// -----------------
//
// Manipulation interface shared by all textish types (paragraphs, headings)
// This behavior can overriden by the concrete node types

var TextTransformer = function(document, node) {
  NodeTransformer.call(this, document, node);
};

TextTransformer.Prototype = function() {
  
};

TextTransformer.Prototype.prototype = NodeTransformer.prototype;
TextTransformer.prototype = new TextTransformer.Prototype();

Text.Transformer = TextTransformer;

module.exports = Text;