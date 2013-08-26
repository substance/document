"use strict";

var _ = require("underscore");

// Substance.Node
// -----------------

var Node = function(node, document) {
  this.document = document;
  this.properties = node;
};

// Type definition
// --------
//

Node.type = {
  "parent": "content",
  "properties": {
  }
};

// Define node behavior
// --------
// These properties define the default behavior of a node, e.g., used when manipulating the document.
// Sub-types override these settings
// Note: it is quite experimental, and we will consolidate them soon.

Node.properties = {
  abstract: true,
  immutable: true,
  mergeableWith: [],
  preventEmpty: true,
  allowedAnnotations: []
};

Node.Prototype = function() {

  this.toJSON = function() {
    return _.clone(this.properties);
  };

  // Provides the number of characters contained by this node.
  // --------
  // We use characters as a general concept, i.e., they do not
  // necessarily map to real characters.
  // Basically it is used for navigation and positioning.

  this.getLength = function() {
    throw new Error("Node.getLength() is abstract.");
  };

  // Provides how a cursor would change by an operation
  // --------
  //

  this.getChangePosition = function(op) {
    throw new Error("Node.getCharPosition() is abstract.");
  };

  // Provides an operation that can be used to insert
  // text at the given position.
  // --------
  //

  this.insertOperation = function(charPos, text) {
    throw new Error("Node.insertOperation() is abstract.");
  };

  // Provides an operation that can be used to delete a given range.
  // --------
  //

  this.deleteOperation = function(startChar, endChar) {
    throw new Error("Node.deleteOperation() is abstract.");
  };

  this.canJoin = function(other) {
    return false;
  };

  this.join = function(other) {
    throw new Error("Node.join() is abstract.");
  };

  this.getAnnotations = function() {
    return this.document.getIndex("annotations").get(this.properties.id);
  };
};

Node.prototype = new Node.Prototype();
Node.prototype.constructor = Node;

Node.defineProperties = function(NodePrototype, properties, readonly) {
  _.each(properties, function(name) {
    var spec = {
      get: function() {
        return this.properties[name];
      }
    }
    if (!readonly) {
      spec["set"] = function(val) {
        this.properties[name] = val;
        return this;
      }
    }
    Object.defineProperty(NodePrototype, name, spec);
  });
};

Node.defineProperties(Node.prototype, ["id", "type"]);

module.exports = Node;
