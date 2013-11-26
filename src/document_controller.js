"use strict";

var _ = require("underscore");
var util = require("substance-util");
var Operator = require('substance-operator');
var Selection = require("./selection");
var Annotator = require("./annotator");
var Clipboard = require("./clipboard");
var Composite = require('./composite');

// Document.DocumentController
// -----------------
//
// Provides means for editing and viewing a Substance.Document. It introduces
// a Selection API in order to move a cursor through the document, support
// copy and paste, etc.
//
// Note: it is quite intentional not to expose the full Substance.Document interface
//       to force us to explicitely take care of model adaptations.
//
// Example usage:
//
//     var doc = new Substance.Document();
//     var editor = new Substance.Document.DocumentController(doc);
//     var editor.insert("Hello World");

// TODO: this would deserve some refactoring. In general there are two kind of APIs here:
//  1. document manipulation (general) as a facette on Data.Graph
//  2. Editing facilities: delete, copy'n'paste etc.

var DocumentController = function(document, options) {
  options = options || {};

  this.__document = document;
  this.view = options.view || 'content';

  this.container = document.get(this.view);
  this.selection = new Selection(this.container);
  this.annotator = new Annotator(document);
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

  this.getAnnotations = function(options) {
    options = options || {};
    options.view = this.view;
    return this.annotator.getAnnotations(options);
  };

  this.startManipulation = function() {
    var doc = this.__document.startSimulation();
    var annotator = new Annotator(doc, {withTransformation: true});
    var sel = new Selection(doc.get(this.view), this.selection);
    return {
      doc: doc,
      view: this.view,
      sel: sel,
      annotator: annotator,
      save: function() { doc.save(); }
    };
  };

  // Updates the selection considering a given operation
  // -------
  // This is used to set the selection when applying operations that are not triggered by the user interface,
  // e.g., when rolling back or forth with the Chronicle.
  // EXPERIMENTAL

  var _updateSelection = function(op) {

    // TODO: this needs a different approach.
    // With compounds, the atomic operation do not directly represent a natural behaviour
    // I.e., the last operation applied does not represent the position which is
    // desired for updating the cursor
    // Probably, we need to handle that behavior rather manually knowing
    // about possible compound types...
    // Maybe we could use the `alias` field of compound operations to leave helpful information...
    // However, we post-pone this task as it is rather cosmetic

    if (!op) return;

    var view = this.view;
    var doc = this.__document;
    var container = this.container;

    function getUpdatedPostion(op) {

      // We need the last update which is relevant to positioning...
      // 1. Update of the content of leaf nodes: ask node for an updated position
      // 2. Update of a reference in a composite node:
      // TODO: fixme. This does not work with deletions.

      // changes to views or containers are always updates or sets
      // as they are properties
      if (op.type !== "update" && op.type !== "set") return;

      // handle changes to the view of nodes
      var node = doc.get(op.path[0]);

      if (!node) {
        console.log("Hmmm... this.should not happen, though.");
        return;
      }

      var nodePos = -1;
      var charPos = -1;

      if (node instanceof Composite) {
        // TODO: there is no good concept yet
      } else if (node.getChangePosition) {
        nodePos = container.getPosition(node.id);
        charPos = node.getChangePosition(op);
      }

      if (nodePos >= 0 && charPos >= 0) {
        return [nodePos, charPos];
      }
    }


    // TODO: actually, this is not yet an appropriate approach to update the cursor position
    // for compounds.
    Operator.Helpers.each(op, function(_op) {
      var pos = getUpdatedPostion(_op);
      if (pos) {
        this.selection.set(pos);
        // breaking the iteration
        return false;
      }
    }, this, "reverse");

  };

  this.undo = function() {
    if (!this.__document.chronicle) return;

    var op = this.__document.chronicle.rewind();
    _updateSelection.call(this, op);
  };

  this.redo = function() {
    if (!this.__document.chronicle) return;

    var op = this.__document.chronicle.forward();
    _updateSelection.call(this, op);
  };

  this.dispose = function() {
    this.annotator.dispose();
  };

  // HACK: it is not desired to have the comments managed along with the editorially document updates
  // We need an approach with multiple Chronicles instead.
  this.createComment = function(comment) {
    var id = util.uuid();
    comment.id = id;
    comment.type = "comment";
    var op = Operator.ObjectOperation.Create([comment.id], comment);
    return this.__document.__apply__(op);
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
