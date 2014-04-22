"use strict";

function NodeSelection(node, nodeComponents, ranges) {
  this.node = node;
  this.nodeComponents = nodeComponents;
  this.ranges = ranges;
}

NodeSelection.Prototype = function() {

  // Note: this checks if a node is fully selected via a heuristic:
  // if the selection has enough components to cover the full node and the first and last components
  // are fully selected, then the node is considered as fully selected.
  this.isFull = function() {
    if (this.ranges.length === this.nodeComponents.length &&
      this.ranges[0].isFull() && this.ranges[this.ranges.length-1].isFull()) {
      return true;
    }
    return false;
  };

  this.isPartial = function() {
    return !this.isFull();
  };

};
NodeSelection.prototype = new NodeSelection.Prototype();

module.exports = NodeSelection;
