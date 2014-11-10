"use strict";

var _ = require('underscore');
var Annotator = require("./annotator");
var Selection = require("./selection");
var MultiNodeAnnotations = require('./multi_node_annotations');

// DocumentSession
// ========
// A document session bundles
// - `document`: a Document instance,
// - `container`: a Container instance which manages a specific document view node
// - `annotator`: an Annotator instance which provides an API to manage annotations
// - `selection`: a Selection instance which represents a current selection state
//
// Note: as the Container is the most complex instance (e.g., it depends on a SurfaceProvider)
// you have to create it and pass it as an argument to create a session.
//
var DocumentSession = function(container) {
  this.document = container.document;
  this.container = container;
  this.annotator = new Annotator(this.document);
  this.selection = new Selection(this.container);
  this.multiNodeAnnotations = new MultiNodeAnnotations(this.document, this.container);
};

DocumentSession.Prototype = function() {

  // TODO: this is used *very* often and is implemented *very* naive.
  // There's a great potential for optimization here
  this.startSimulation = function() {
    var doc = this.document.startSimulation();
    var annotator = new Annotator(doc);
    var container = this.container.createContainer(doc);
    var sel = new Selection(container, this.selection);
    var multiNodeAnnotations = new MultiNodeAnnotations(doc, container);
    // Note: we save the old and new selection along with
    // the operation created by the simulation
    var data = {};
    if (!sel.isNull()) {
      data["before"] = {
        "container": this.container.name,
        "sel": sel.toJSON()
      };
    }
    return {
      document: doc,
      view: container.name,
      selection: sel,
      annotator: annotator,
      container: container,
      multiNodeAnnotations: multiNodeAnnotations,
      dispose: function() {
        // TODO: remove... nothing to dispose...
      },
      save: function() {
        data["after"] = {
          "container": this.container.name,
          "sel": sel.toJSON()
        };
        doc.save(data);
        this.dispose();
      }
    };
  };

  this.dispose = function(){
    // TODO: remove... nothing to dispose...
  };

  // EXPERIMENTAL: multi node annotations

  this.getAnnotations = function(propertyPath, options) {
    options = options || {};
    var result = {};
    var singleNodeAnnos, multiNodeAnnoFragments;
    singleNodeAnnos = this.document.getIndex('annotations').get(propertyPath);
    _.extend(result, singleNodeAnnos);
    if (options.all) {
      multiNodeAnnoFragments = this.multiNodeAnnotations.getFragmentsForComponent(propertyPath);
      _.extend(result, multiNodeAnnoFragments);
    }
    return result;
  };

};
DocumentSession.prototype = new DocumentSession.Prototype();

Object.defineProperties(DocumentSession.prototype, {
  "view": {
    get: function() {
      return this.container.name;
    },
    set: function() {
      throw new Error("Immutable.");
    }
  }
});

module.exports = DocumentSession;
