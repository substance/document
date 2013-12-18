"use strict";

var _ = require("underscore");
var util = require("substance-util");

// Deprecated: it turned out that editing the document can not be done in the control/model domain
// but must be done in the view/control domain. Thus, the document editing stuff is now part of Substance.Surface.
// This will be removed soon.
var DocumentController = function() {
};

DocumentController.Prototype = function() {

  _.extend(this, util.Events.Listener);

  // Document Facette
  // --------

  this.get = function(id) {
    return this.__document.get(id);
  };

  this.getNodes = function(idsOnly) {
    return this.container.getNodes(idsOnly);
  };

  // Given a node id, get position in the document
  // --------
  //

  this.getPosition = function(id, flat) {
    return this.container.getPosition(id, flat);
  };

  this.getNodeFromPosition = function(nodePos) {
    return this.container.getNodeFromPosition(nodePos);
  };

  // See Annotator
  // --------
  //

  this.getAnnotations = function(selection) {
    return this.annotator.getAnnotations(selection);
  };

};

DocumentController.prototype = new DocumentController.Prototype();

// Property accessors for convenient access of primary properties
Object.defineProperties(DocumentController.prototype, {
  id: {
    get: function() {
      return this.__document.id;
    },
    set: function() { throw "immutable property"; }
  },
  nodeTypes: {
    get: function() {
      return this.__document.nodeTypes;
    },
    set: function() { throw "immutable property"; }
  },
  title: {
    get: function() {
      return this.__document.get('document').title;
    },
    set: function() { throw "immutable property"; }
  },
  updated_at: {
    get: function() {
      return this.__document.get('document').updated_at;
    },
    set: function() { throw "immutable property"; }
  },
  creator: {
    get: function() {
      return this.__document.get('document').creator;
    },
    set: function() { throw "immutable property"; }
  }
});

module.exports = DocumentController;
