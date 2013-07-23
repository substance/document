"use strict";

// Import
// ========

var _ = require("underscore");
//var util = require("substance-util");
//var Data = require("substance-data");
var Document = require("./document");
var DocumentError = Document.DocumentError;
//var Operator = require("substance-operator");

// Module
// ========

// A class that manages a document's annotations.
// --------
//

var Annotator = function(writer) {
  // TODO: register for co-transformations to keep annotations up2date.

  this.writer = writer;

  // defines groups of annotations that will be mutually exclusive
  this.group = {
    "emphasis": "style",
    "strong": "style",
    "link": "style",
    "question": "marker",
    "idea": "marker",
    "error": "marker"
  };

  this.expansion = {
    "emphasis": {
      left: Annotator.isOnNodeStart,
      right: Annotator.isTrue
    },
    "strong": {
      left: Annotator.isOnNodeStart,
      right: Annotator.isTrue
    }
  };

  this.splittable = ["emphasis", "strong"];
};

Annotator.Prototype = function() {

  // Updates all annotations according to a given operation.
  // --------
  //

  this.transform = function(op) {
    // TextOperation: updated ranges according to the specific annotations' behavior
    // ObjectOperation: if a node is deleted remove all associated annotations.
    throw new Error("Not implemented yet.");
  };

  // Cut annotations in the given selection.
  // --------
  // This is the pendant to the writer's cut method.
  // Partially selected annotations get truncated and depending on the
  // annotation type new annotation fragments are created which are returned.

  this.cut = function(sel) {

    // get all affected annotations
    var annotations = this.getAnnotations({selection: sel});
    var result = [];

    for (var i = 0; i < annotations.length; i++) {
      var annotation = annotations[i];

      // TODO: determine if an annotation would be split by the given selection.
      var needSplit = false;
      if (true) throw new Error("Not implemented yet.");

      if (needSplit) {
        // for the others create a new fragment (depending on type) and truncate the original
        if (this.isSplittable(annotation.type)) {

          // TODO: create new annotation
          var newAnnotation = null;
          if (true) throw new Error("Not implemented yet.");

          annotations.push(newAnnotation);
        }
      } else {
        // add totally included ones
        annotations.push(annotation);
      }
    }

    return annotations;
  };


  // TODO: extract range overlap checking logic into a dedicated Range class
  var _filterByNodeAndRange = function(doc, nodeId, range) {
    var annotations = doc.find('annotations', nodeId);

    if (range) {
      var sStart = range[0];
      var sEnd = range[1];

      // Note: this treats all annotations as if they were inclusive (left+right)
      // TODO: maybe we should apply the same rules as for Transformations?
      annotations = _.select(annotations, function(a) {
        var aStart = a.range[0];
        var aEnd = a.range[1];

        var overlap = (aEnd >= sStart);

        // Note: it is allowed to give only omit the end part
        if (sEnd) {
          overlap &= aStart <= sEnd;
        }

        return overlap;
      });
    }

    return annotations;
  };

  // Retrieve annotations
  // --------
  // The selection can be filtered via
  //
  // - node + range : a node id and (optionally) a given range (only if node is given)
  // - selection: a selection of type `{start: [nodePos, charPos], end: [nodePos, charPos]}`
  // - filter: a custom filter of type `function(annotation) -> boolean`
  //

  this.getAnnotations = function(options) {
    var doc = this.writer.__document;

    var annotations;
    var range, node;

    if (arguments.length === 0) {
      annotations = _.select(doc.nodes, function(node) {
        var baseType = doc.schema.baseType(node.type);
        return baseType === 'annotation';
      });
    } else if (options.node) {
      annotations = _filterByNodeAndRange(doc, options.node, options.range);

    } else if (options.selection) {

      var sel = options.selection;
      var nodes = this.writer.selection.getNodes(sel);

      annotations = [];

      for (var i = 0; i < nodes.length; i++) {
        node = nodes[i];
        range = [0,null];

        // in the first node search only in the trailing part
        if (i === 0) {
          range[0] = sel.start[1];
        }

        // in the last node search only in the leading part
        if (i === nodes.length-1) {
          range[1] = sel.end[1];
        }

        annotations.push(_filterByNodeAndRange(doc, node.id, range));
      }

      annotations = Array.prototype.concat.apply(null, annotations);
    }

    if (options.filter) {
      annotations = _.select(annotations, options.filter);
    }

    return annotations;
  };

  // Creates a new annotation
  // --------
  //

  var _create = function(self, range, type) {
    throw new Error("Not implemented yet.");
  };

  // Deletes an annotation
  // --------
  //

  var _delete = function(self, annotation) {
    throw new Error("Not implemented yet.");
  };

  // Truncates an existing annotation
  // --------
  // Deletes an annotation that has a collapsed range after truncation.
  //

  var _truncate = function(self, annotation, range) {
    throw new Error("Not implemented yet.");
  };

  // Returns true if two annotation types are mutually exclusive
  // ---------
  // Currently there is a built-in mechanism which considers two annotations
  // exclusive if they belong to the same group.
  //

  this.isExclusive = function(type1, type2) {
    return this.groups[type1] === this.groups[type2];
  };

  // Tell if an annotation can be split or should be truncated only.
  // --------
  // E.g. when cutting a selection or inserting a new node existing annotations
  // may be affected. In some cases (e.g., `emphasis` or `strong`)it is wanted that a new annotation of the same
  // type is created for the cut fragment.
  //
  this.isSplittable = function(type) {
    return this.splittable.indexOf(type) >= 0;
  };

  // Creates an annotation for the current selection of given type
  // --------
  // This action may involve more complex co-actions:
  //
  // - toggle delete one or more annotations
  // - truncate one or more annotations

  this.annotate = function(type) {
    var sel = this.writer.selection;
    var range = [sel.start[1], sel.end[1]];

    if (sel.start[0] !== sel.end[0]) throw new DocumentError('Multi-node annotations are not supported.');

    var filter = {range: range};
    var annotations = this.getAnnotations(filter);

    var i, annotation;

    if (sel.isCollapsed()) {
      // Note: creating annotations without selection is not supported yet
      // TODO: discuss

      // toggle annotations of same type
      for (i = 0; i < annotations.length; i++) {
        annotation = annotations[i];
        if (annotation.type === type) {
          _delete(this, annotation);
        }
      }

    } else {

      // truncate all existing annotations of the same type (or group)
      for (i = 0; i < annotations.length; i++) {
        annotation = annotations[i];
        if (this.isExclusive(type, annotation.type)) {
          _truncate(this, annotation, sel);
        }
      }

      // create a new annotation
      _create(this, type, range);
    }
  };

};

Annotator.prototype = new Annotator.Prototype();

Annotator.isOnNodeStart = function(a) {
  return a.range.start[1] === 0;
};

Annotator.isTrue = function() {
  return true;
};

// TODO: define behaviour on split and merge of nodes

// Export
// ========

module.exports = Annotator;
