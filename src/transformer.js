var _ = require("underscore");

// Registered node types
// --------

var nodeTypes = {
  "paragraph": require('substance-nodes/paragraph'),
  "heading": require('substance-nodes/heading'),
  "image": require('substance-nodes/image')
};

// Substance.Document.Transformer
// -----------------
//
// Manipulation interface for all node types
// This behavior can overriden by the concrete node types

var Transformer = function() {
  // Usually you get passed in a simulation here
  // this.document = document;
};

Transformer.Prototype = function() {

  // Merges two text nodes
  // --------
  //
  // Takes the content of 

  // this.mergeNodes = function(doc, source, target) {
  //   // if (source.)
  // };

  // Deletes a given selection from the document
  // --------
  // 

  this.deleteSelection = function(doc, sel) {
    // var doc = this.document;

    _.each(sel.getRanges(), function(range) {

      // var NodeType = 'substance-nodes/'+range.node.type;
      var ContentNodeTransformer = nodeTypes[range.node.type].Transformer;
      var t = new ContentNodeTransformer(doc, range.node);

      // Attempt to delete range
      

      // console.log('isFull', range.isFull());
      // console.log('isRightBound', range.isRightBound());
      // console.log('isLeftBound', range.isLeftBound());
    });
    
  };
};

Transformer.prototype = new Transformer.Prototype();
module.exports = Transformer;