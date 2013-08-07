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

var Annotator = function(doc, options) {
  options = options || {};

  this.document = doc;

  // register for co-transformations to keep annotations up2date.
  this.document.on("operation:applied", this.handleOperation, this);

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
    },
    "strong": {
      left: Annotator.isOnNodeStart,
    }
  };

  this.splittable = ["emphasis", "strong"];
  this._annotationIndex = {};

  this.withTransformation = options.withTransformation;

  this.createIndex();
};

Annotator.Prototype = function() {

  // Annotation index
  // --------

  var _resolve = function(path) {
    var index = this._annotationIndex;
    for (var i = 0; i < path.length; i++) {
      var id = path[i];
      index[id] = index[id] || {_annotations: {} };
      index = index[id];
    }
    return index;
  };

  var _findAnnotations = function(index) {
    var result = _.extend({}, index._annotations);

    _.each(index, function(child, name) {
      if (name !== "_annotations") {
        _.extend(result, _findAnnotations(child));
      }
    });

    return result;
  };

  var _getAnnotations = function(path, recurse) {
    var index = _resolve.call(this, path);

    var result;

    if (recurse) {
      result = _findAnnotations(index);
    } else {
      result = index._annotations;
    }

    return result;
  };

  var _addAnnotationToIndex = function(annotation) {
    var index = _resolve.call(this, annotation.path);
    index._annotations[annotation.id] = annotation;
  };

  var _removeAnnotationFromIndex = function(annotation) {
    var index = _resolve.call(this, annotation.path);
    delete index._annotations[annotation.id];
  };

  var _getRanges = function(self, sel) {
    var nodes = new Selection(self.document, sel).getNodes();
    var ranges = {};

    for (var i = 0; i < nodes.length; i++) {
      var node = nodes[i];
      var range = [0,null];

      // in the first node search only in the trailing part
      if (i === 0) {
        range[0] = sel.startChar();
      }

      // in the last node search only in the leading part
      if (i === nodes.length-1) {
        range[1] = sel.endChar();
      }

      ranges[node.id] = range;
    }

    return ranges;
  };

  this.createIndex = function() {
    var schema = this.document.schema;
    var nodes = this.document.nodes;

    _.each(nodes, function(annotation) {
      var baseType = schema.baseType(annotation.type);
      if (baseType === 'annotation') {
        _addAnnotationToIndex.call(this, annotation);
      }
    }, this);
  };


  // Creates a new annotation
  // --------
  //

  var _create = function(self, path, type, range) {
    var annotation = {
      "id": util.uuid(),
      "type": type,
      "path": path,
      "range": range
    };
    return self.create(annotation);
  };

  // Deletes an annotation
  // --------
  //
  var _delete = function(self, annotation) {
    self.document.delete(annotation.id);
  };

  var _update = function(self, annotation, newRange) {
    self.document.apply(Operator.ObjectOperation.Set([annotation.id, "range"], annotation.range, newRange));
  };

  // TODO: extract range overlap checking logic into a dedicated Range class
  var _filterByNodeAndRange = function(nodeId, range) {
    // HACK: using "content" - we should somehow generalize this...
    var annotations = _getAnnotations.call(this, [nodeId, "content"]);

    if (range) {
      var sStart = range[0];
      var sEnd = range[1];

      var filtered = {};

      // Note: this treats all annotations as if they were inclusive (left+right)
      // TODO: maybe we should apply the same rules as for Transformations?
      _.each(annotations, function(a) {
        var aStart = a.range[0];
        var aEnd = a.range[1];

        var overlap = (aEnd >= sStart);

        // Note: it is allowed to give only omit the end part
        if (sEnd) {
          overlap &= aStart <= sEnd;
        }

        if (overlap) {
          filtered[a.id] = a;
        }
      });

      annotations = filtered;
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
        _create(self, annotation.path, annotation.type, tailRange);

      } else {
        _delete(self, annotation);
      }
    }
  };

  // Takes care of updating annotations whenever an graph operation is applied.
  // --------
  // Triggers new events dedicated to annotation changes.
  this.handleOperation = function(op) {

    // TODO: it would be great to have some API to retrieve reflection information for an object operation.

    var typeChain, annotations, annotation;

    if (op.type === "delete" || op.type === "create") {

      typeChain = this.document.schema.typeChain(op.val.type);

      // handle creation or deletion of annotations
      if (typeChain.indexOf("annotation") >= 0) {
        annotation = op.val;

        if (op.type === "delete") {
          _removeAnnotationFromIndex.call(this, annotation);

        } else if (op.type === "create") {
          // get the real instance from the document
          annotation = this.document.get(annotation.id);
          _addAnnotationToIndex.call(this, annotation);
        }

        this.triggerLater("annotation:changed", op.type, annotation);
      }
      // handle deletion of other nodes, i.e., remove associated annotations
      else if (op.type === "delete") {
        annotations = _getAnnotations.call(this, op.path, true);
        _.each(annotations, function(a) {
          _delete(this, a);
        }, this);
      }
    }

    else if (op.type === "update" || op.type === "set") {

      var node = this.document.get(op.path[0]);

      // FIXME: due to the use of Compunds and the rather late fired property change events
      // it happens, that there arrive atomic operations with the original node being deleted already
      // or should we tolerate this?
      if (node === undefined) {
        return;
      }

      typeChain = this.document.schema.typeChain(node.type);

      if (typeChain.indexOf("annotation") >= 0) {
        // for now we only are interested range updates
        if (op.path[1] !== "range") return;

        this.triggerLater("annotation:changed", "update", node);

      } 

      // It turns out that it is not enough to co-transform annotations.
      // E.g., when text gets deleted and the operation is undone
      // the annotation could not be reconstructed.
      // So we have to trigger annotation updates explicitely
      else if (this.withTransformation) {
        this.transform(op);
      }
    }
  };

  this.create = function(annotation) {
    this.document.create(annotation);
    return annotation;
  };

  // Updates all annotations according to a given operation.
  // --------
  //
  // The provided operation is an ObjectOperation which has been applied
  // to the document already.

  // TODO: this needs to be rethought.
  // On the one hand, we need explicit changes to be able to undo e.g. deletions.
  // OTOH, such co-transforms would then be applied twice... i.e., during simulation
  // co-transformation but when applying the simulation we would not want to have them anymore.
  // Also not when redoing changes (as they would be contained in the change).

  var _transform = function(op, annotation) {
        // only apply the transformation on annotations with the same property
    // Note: currently we only have annotations on the `content` property of nodes
    if (!_.isEqual(annotation.path, op.path)) return;

    if (op.type === "update") {
      // Note: these are implicit transformations, i.e., not triggered via annotation controls
      var expandLeft = false;
      var expandRight = false;

      var expandSpec = this.expansion[annotation.type];
      if (expandSpec) {
        if (expandSpec.left) expandLeft =  expandSpec.left(annotation);
        if (expandSpec.right) expandRight = expandSpec.right(annotation);
      }

      var newRange = util.clone(annotation.range);
      var changed = Operator.TextOperation.Range.transform(newRange, op.diff, expandLeft, expandRight);
      if (changed) {
        if (newRange[0] === newRange[1]) {
          _delete(this, annotation);
        } else {
          this.document.set([annotation.id, "range"], newRange);            
        }
      }
    }
    // if somebody has reset the property we must delete the annotation
    else if (op.type === "delete" || op.type === "set") {
      _delete(this, annotation);
    }
  };

  this.transform = function(op) {
    var annotations = _getAnnotations.call(this, op.path);
    _.each(annotations, function(a) {
      _transform.call(this, op, a);
    }, this);
  };

  this.paste = function(annotations, newNodeId, offset) {

    for (var i = 0; i < annotations.length; i++) {
      var annotation = annotations[i];
      if (newNodeId !== undefined) {
        annotation.path = _.clone(annotation.path);
        annotation.path[0] = newNodeId;
      }
      if (offset !== undefined) {
        annotation.range[0] += offset;
        annotation.range[1] += offset;
      }
      this.create(annotation);
    }
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

    _.each(annotations, function(annotation) {

      // TODO: determine if an annotation would be split by the given selection.
      var range = ranges[annotation.path[0]];
      var isPartial = (range[0] > annotation.range[0] || range[1] < annotation.range[1]);

      var newAnnotation;
      if (isPartial) {
        // for the others create a new fragment (depending on type) and truncate the original
        if (this.isSplittable(annotation.type)) {
          newAnnotation = util.clone(annotation);
          // make the range relative to the selection
          newAnnotation.id = util.uuid();
          newAnnotation.range = [Math.max(0, annotation.range[0] - range[0]), annotation.range[1] - range[0]];
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

    }, this);

    return result;
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

    var annotations = {};

    if (options.node) {
      annotations = _filterByNodeAndRange.call(this, options.node, options.range);
    }

    else if (options.selection) {

      var sel = options.selection;
      var ranges = sel.getRanges();

      for (var i = 0; i < ranges.length; i++) {
        // Note: pushing an array and do flattening afterwards
        var range = ranges[i];
        _.extend(annotations, _filterByNodeAndRange.call(this, range.node.id, [range.start, range.end]));
      }

    } else {
      _.each(doc.nodes, function(node) {
        var baseType = doc.schema.baseType(node.type);
        if(baseType === 'annotation') {
          annotations[node.id] = node;
        }
      });
    }

    if (options.filter) {
      var filtered = {};
      _.each(annotations, function(a) {
        if(options.filter(a)) {
          filtered[a.id] = a;
        }
      });
      annotations = filtered;
    }

    return annotations;
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

  this.annotate = function(selection, type) {
    var sel = selection.range();
    var node = selection.cursor.node;

    if (sel.start[0] !== sel.end[0]) throw new DocumentError('Multi-node annotations are not supported.');

    var range = [sel.start[1], sel.end[1]];
    var annotations = this.getAnnotations({node: node.id, range: range});

    if (selection.isCollapsed()) {
      // Note: creating annotations without selection is not supported yet
      // TODO: discuss

      // toggle annotations of same type
      _.each(annotations, function(a) {
        if (a.type === type) {
          _delete(this, a);
        }
      }, this);

    } else {

      // truncate all existing annotations of the same type (or group)
      var toggled = false;
      _.each(annotations, function(a) {
        if (this.isExclusive(type, a.type)) {
          _truncate(this, a, range);
          if (type === a.type) toggled = true;
        }
      }, this);

      // create a new annotation
      if (!toggled) {
        return _create(this, [node.id, "content"], type, range);
      }
    }
  };
};

Annotator.Prototype.prototype = util.Events;
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
