"use strict";

// Import
// ========

var _ = require("underscore");
var util = require("substance-util");
var Document = require("./document");
var Selection = require("./selection");
var DocumentError = Document.DocumentError;
var Operator = require("substance-operator");

// Module
// ========

// A class that manages a document's annotations.
// --------
//

var Annotator = function(doc, selection) {
  var self = this;

  this.document = doc;
  // this.selection = selection;

  this._updates = [];

  // register for co-transformations to keep annotations up2date.
  this.document.propertyChanges().bind(function(op) {
    self.transform(op);
  }, {path: ["*", "content"]});

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

  // Creates a new annotation
  // --------
  //

  var _create = function(self, nodeId, property, type, range) {
    var annotation = {
      "id": util.uuid(),
      "node": nodeId,
      "property": property,
      "type": type,
      "range": range
    };
    return self.create(annotation);
  };

  this.create = function(annotation) {
    this.document.create(annotation);
    this._updates.push([annotation]);
    return annotation;
  };

  // Deletes an annotation
  // --------
  //

  var _delete = function(self, annotation) {
    self.document.delete(annotation.id);
    self._updates.push([{node: annotation.node, type: annotation.type}, annotation.range]);
  };

  var _update = function(self, annotation, newRange) {
    var oldRange = [annotation.range[0], annotation.range[1]];
    self.document.apply(Operator.ObjectOperation.Set([annotation.id, "range"], annotation.range, newRange));
    self._updates.push([self.document.get(annotation.id), oldRange]);
  };

  // Updates all annotations according to a given operation.
  // --------
  //
  // The provided operation is an ObjectOperation which has been applied
  // to the document already.

  this.transform = function(op, annotations) {
    var nodeId = op.path[0];
    var property = op.path[1];

    annotations = annotations || this.document.find("annotations", nodeId);

    var idx, a;
    for (idx = 0; idx < annotations.length; idx++) {

      a = annotations[idx];
      var oldRange = [a.range[0], a.range[1]];

      // only apply the transformation on annotations with the same property
      // Note: currently we only have annotations on the `content` property of nodes
      if (a.property !== property) continue;

      if (op.type === "update") {
        // Note: these are implicit transformations, i.e., not triggered via annotation controls
        var expandLeft = false;
        var expandRight = false;

        if (this.expansion[a.type]) {
          expandLeft = this.expansion[a.type].left(a);
          expandRight = this.expansion[a.type].right(a);
        }

        var changed = Operator.TextOperation.Range.transform(a.range, op.diff, expandLeft, expandRight);
        if (changed) {
          if (a.range[0] === a.range[1]) {
            _delete(this, a);
          } else {
            // TODO: should we trigger events on the annotator?
            // for now, we leave it as it was before
            this._updates.push([a, oldRange]);
          }
        }
      }
      // if somebody has reset the property we must delete the annotation
      else if (op.type === "delete" || op.type === "set") {
        _delete(this, a);
      }

    }
  };

  this.paste = function(annotations, newNodeId, offset) {

    for (var i = 0; i < annotations.length; i++) {
      var annotation = annotations[i];
      if (newNodeId !== undefined) {
        annotation.node = newNodeId;
      }
      if (offset !== undefined) {
        annotation.range[0] += offset;
        annotation.range[1] += offset;
      }
      this.create(annotation);
    }
    this.propagateChanges();
  };

  var _getRanges = function(self, sel) {
    var nodes = new Selection(self.document, sel).getNodes();
    var ranges = {};

    for (var i = 0; i < nodes.length; i++) {
      var node = nodes[i];
      var range = [0,null];

      // in the first node search only in the trailing part
      if (i === 0) {
        range[0] = sel.start[1];
      }

      // in the last node search only in the leading part
      if (i === nodes.length-1) {
        range[1] = sel.end[1];
      }

      ranges[node.id] = range;
    }

    return ranges;
  };

  // Copy annotations in the given selection.
  // --------
  // This is the pendant to the writer's copy method.
  // Partially selected annotations may not get copied depending on the
  // annotation type, for others, new annotation fragments would be created.

  this.copy = function(sel) {
    sel = new Selection(this.document, sel);
    var ranges = _getRanges(this, sel);

    // get all affected annotations
    var annotations = this.getAnnotations({selection: sel});
    var result = [];

    for (var i = 0; i < annotations.length; i++) {
      var annotation = annotations[i];

      // TODO: determine if an annotation would be split by the given selection.
      var range = ranges[annotation.node];
      var isPartial = (range[0] > annotation.range[0] || range[1] < annotation.range[1]);

      var newAnnotation;
      if (isPartial) {
        // for the others create a new fragment (depending on type) and truncate the original
        if (this.isSplittable(annotation.type)) {
          newAnnotation = util.clone(annotation);
          // make the range relative to the selection
          newAnnotation.id = util.uuid();
          newAnnotation.range = [range[0] - range[0], range[1] - range[0]];
          result.push(newAnnotation);
        }
      } else {
        // add totally included ones
        // TODO: need more control over uuid generation
        newAnnotation = util.clone(annotation);          
        newAnnotation.id = util.uuid();
        newAnnotation.range = [newAnnotation.range[0] - range[0], newAnnotation.range[1] - range[0]];
        result.push(newAnnotation);
      }
    }

    return result;
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
    options = options || {};
    var doc = this.document;

    var annotations;
    var range, node;

    if (options.node) {
      annotations = _filterByNodeAndRange(doc, options.node, options.range);
    } else if (options.selection) {

      var sel = options.selection;
      var nodes = sel.getNodes(sel);

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

      annotations = Array.prototype.concat.apply([], annotations);
    } else {
      annotations = _.select(doc.nodes, function(node) {
        var baseType = doc.schema.baseType(node.type);
        return baseType === 'annotation';
      });
    }

    if (options.filter) {
      annotations = _.select(annotations, options.filter);
    }

    return annotations;
  };

  // Truncates an existing annotation
  // --------
  // Deletes an annotation that has a collapsed range after truncation.
  // If the annotation is splittable and the given range is an inner segment,
  // the first will be truncated and a second one will be created to annotate the tail.
  // If the annotation is not splittable it will be deleted.

  var _truncate = function(self, annotation, range) {
    var s1 = annotation.range[0];
    var s2 = range[0];
    var e1 = annotation.range[1];
    var e2 = range[1];

    var newRange;

    // truncate all = delete
    if (s1 >= s2 && e1 <= e2) {
      _delete(self, annotation);

    // truncate the head
    } else if (s1 >= s2  && e1 > e2) {
      newRange = [e2, e1];
      _update(self, annotation, newRange);
    }

    // truncate the tail
    else if (s1 < s2 && e1 <= e2) {
      newRange = [s1, s2];
      _update(self, annotation, newRange);
    }
    // from the middle: split or delete
    else {
      if (self.isSplittable(annotation.type)) {
        newRange = [s1, s2];
        _update(self, annotation, newRange);

        var tailRange = [e2, e1];
        _create(self, annotation.node, annotation.property, annotation.type, tailRange);

      } else {
        _delete(self, annotation);
      }
    }
  };

  // Returns true if two annotation types are mutually exclusive
  // ---------
  // Currently there is a built-in mechanism which considers two annotations
  // exclusive if they belong to the same group.
  //

  this.isExclusive = function(type1, type2) {
    return this.group[type1] === this.group[type2];
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

  this.annotate = function(sel, type) {
    var range = [sel.start[1], sel.end[1]];

    if (sel.start[0] !== sel.end[0]) throw new DocumentError('Multi-node annotations are not supported.');
    var node = sel.getNodes()[0];

    var filter = {node: node.id, range: range};
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
      var toggled = false;
      for (i = 0; i < annotations.length; i++) {
        annotation = annotations[i];
        if (this.isExclusive(type, annotation.type)) {
          _truncate(this, annotation, range);
          if (type === annotation.type) toggled = true;
        }
      }

      // create a new annotation
      if (!toggled) {
        return _create(this, node.id, "content", type, range);
      }
    }
  };

  this.propagateChanges = function() {
    while (this._updates.length > 0) {
      var update = this._updates.shift();
      this.document.trigger("annotation:changed", update[0], update[1]);
    }
  };
};

Annotator.prototype = new Annotator.Prototype();

Annotator.isOnNodeStart = function(a) {
  return a.range[0] === 0;
};

Annotator.isTrue = function() {
  return true;
};

// TODO: define behaviour on split and merge of nodes

// Export
// ========

module.exports = Annotator;
