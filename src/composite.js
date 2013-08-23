var DocumentNode = require("./node");

var Composite = function(node, doc) {
  DocumentNode.call(this, node, doc);
};

Composite.Prototype = function() {

  // Provides the ids of all referenced sub-nodes.
  // -------
  //

  this.getNodes = function() {
    throw new Error("Composite.getNodes() is abstract.");
  };

  // Tells if this composite is can be changed with respect to its children
  // --------
  //

  this.isMutable = function() {
    return false;
  };

  // Inserts reference(s) at the given position
  // --------
  //

  this.insertChild = function(/*doc, pos, nodeId*/) {
    throw new Error("This composite is immutable.");
  };

  // Removes a reference from this composite.
  // --------

  this.deleteChild = function(/*doc, nodeId*/) {
    throw new Error("This composite is immutable.");
  };

};

Composite.Prototype.prototype = DocumentNode.prototype;
Composite.prototype = new Composite.Prototype();

module.exports = Composite;
