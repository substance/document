"use strict";

// Substance.Node
// -----------------

var SubstanceNode = function() {

};

// Substance.Node.Transformer
// -----------------
//
// Manipulation interface for all node types
// This behavior can overriden by the concrete node types

var NodeTransformer = function(document, node) {
  // Usually you get passed in a simulation here
  this.document = document;
  this.node = node;
};


NodeTransformer.Prototype = function() {

  // Delete node
  // --------
  // 
  // Delete node from document and removes it from the content view

  this.deleteNode = function() {
    this.document.update(["content", "nodes"], ["-", this.document.getPosition('content', this.node.id)]);
    return this.document.delete(this.node.id);
  };

  // Deletes a given range from the node's content
  // --------
  // 
  // Merging must be done from outisde in a separate step

  this.deleteRange = function(range) {
    var doc = this.document;
    var nodeId = this.node.id;

    // Maybe move this outside?
    if (range.isEnclosed()) {
      this.deleteNode();
    } else {
      doc.update([nodeId, "content"], [range.start, -range.length()]);
    }
  };
};

NodeTransformer.prototype = new NodeTransformer.Prototype();
SubstanceNode.Transformer = NodeTransformer;

module.exports = SubstanceNode;
