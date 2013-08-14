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

  // Provides how a cursor would change by the a operation
  // --------
  //

  this.getUpdatedCharPos = function(op) {
    throw new Error("Node.getCharPosition() is abstract.");
  };

  // Provides an delete operation for a given range.
  // --------
  //

  this.deleteOperation = function(startChar, endChar) {
    throw new Error("Node.deleteOperation() is abstract.");
  };

};

Node.prototype = new Node.Prototype();
Node.prototype.constructor = Node;

Object.defineProperties(Node.prototype, {
  id: {
    get: function () {
      return this.properties.id;
    }
  },
  type: {
    get: function () {
      return this.properties.type;
    }
  },
  length: {
    enumerable: false,
    get: function () {
      return this.getLength();
    }
  }
});

module.exports = Node;
