"use strict";

var _ = require("underscore");
var util = require("substance-util");
var Fragmenter = util.Fragmenter;

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
  this.propertyToHtml = function(htmlDocument, propertyName, options) {
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
    var property = this.document.resolve(path);
    var type = property.baseType;
    if (type === "string") {
      this.annotatedTextToHtml(htmlDocument, el, property);
    } else {
      throw new Error('Only "string" properties are currently supported');
    }
    return el;
  };

  this.annotatedTextToHtml = function(htmlDocument, el, prop) {
    var text = prop.get();
    var annotations = this.document.indexes['annotations'].get(prop.path);
    // this splits the text and annotations into smaller pieces
    // which is necessary to generate proper HTML.
    var annotator = new Fragmenter();
    annotator.onText = function(el, text) {
      var textNode = htmlDocument.createTextNode(text);
      el.appendChild(textNode);
    };
    annotator.onEnter = function(entry, parentEl) {
      // TODO: take that specification from the annotation class
      // var anno = entry.node;
      var elementType = 'span';
      var annotationEl = htmlDocument.createElement(elementType);
      parentEl.appendChild(annotationEl);
      return annotationEl;
    };
    annotator.start(el, text, annotations);
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
    };
    if (!readonly) {
      spec["set"] = function(val) {
        this.properties[name] = val;
        return this;
      };
    }
    Object.defineProperty(NodePrototype, name, spec);
  });
};

Node.defineProperties(Node.prototype, ["id", "type"]);

module.exports = Node;
