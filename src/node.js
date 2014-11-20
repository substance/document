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

  this.getAnnotations = function() {
    return this.document.getIndex("annotations").get(this.properties.id);
  };

  // Built-in HTML conversion
  // ------------------------

  var NO_OPTIONS = {};

  this.toHtml = function(htmlDocument, options) {
    options = options || NO_OPTIONS;
    var el = htmlDocument.createElement(options.elementType || 'div');
    el.setAttribute('data-id', this.id);
    return el;
  };

  // helpers for html conversion
  this.propertyToHtml = function(propertyName, options) {
    options = options || NO_OPTIONS;
    var el = htmlDocument.createElement(options.elementType || 'span');
    var path;
    if (_.isArray(propertyName)) {
      path = propertyName;
      el.setAttribute('data-property', path.join('.'));
    } else {
      path = [this.id, propertyName];
      el.setAttribute('data-property', propertyName);
    }
    var property = this.document.get(path);
    var annotations = this.document.indexes['annotations'].get(path);
    // TODO render as annotated text instead of plain text
    el.textContent = property.get();
  };

};

Node.prototype = new Node.Prototype();
Node.prototype.constructor = Node;

Node.defineProperties = function(NodeClassOrNodePrototype, properties, readonly) {
  var NodePrototype = NodeClassOrNodePrototype;

  if (arguments.length === 1) {
    var NodeClass = NodeClassOrNodePrototype;
    NodePrototype = NodeClass.prototype;
    if (!NodePrototype || !NodeClass.type) {
      throw new Error("Illegal argument: expected NodeClass");
    }
    properties = Object.keys(NodeClass.type.properties);
  }

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
