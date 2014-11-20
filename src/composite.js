"use strict";

var DocumentNode = require("./node");

var Composite = function(node, doc) {
  DocumentNode.call(this, node, doc);
};

// Type definition
// -----------------
//

Composite.type = {
  "id": "composite",
  "parent": "content",
  "properties": {
  }
};

Composite.Prototype = function() {

  this.isComposite = true;

  this.__super__ = DocumentNode.prototype;

  this.getLength = function() {
    throw new Error("Composite.getLength() is abstract.");
  };

  // Provides the ids of all referenced sub-nodes.
  // -------
  //

  this.getChildrenIds = function() {
    throw new Error("Composite.getChildrenIds() is abstract.");
  };

  this.toHtml = function(htmlDocument, options) {
    var el = this.__super__.toHtml.call(this, htmlDocument, options);
    var childrenEls = this.childrenToHtml(htmlDocument);
    for (var i = 0; i < childrenEls.length; i++) {
      this.el.appendChild(childrenEls[i]);
    }
    return el;
  };

  this.childrenToHtml = function(htmlDocument) {
    var childrenEls = [];
    var childrenIds = this.getChildrenIds();
    for (var i = 0; i < childrenIds.length; i++) {
      var childId = childrenIds[i];
      var child = this.document.get(childId);
      childrenEls.push(child.toHtml(htmlDocument));
    }
    return childrenEls;
  };

  // Only for legacy reasons
  this.getNodes = function() {
    console.error("Deprecated. Use this.getChildrenIds() instead.");
    return this.getChildrenIds();
  };

};

Composite.Prototype.prototype = DocumentNode.prototype;
Composite.prototype = new Composite.Prototype();

module.exports = Composite;
