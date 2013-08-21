var DocumentNode = require("./node");

var Composite = function(node, doc) {
  DocumentNode.call(this, node, doc);
};

Composite.Prototype = function() {
  this.getNodes = function() {
    throw new Error("Composite.getNodes() is abstract.");
  };
};
Composite.Prototype.prototype = DocumentNode.prototype;
Composite.prototype = new Composite.Prototype();

module.exports = Composite;
