"use strict";

var _ = require("underscore");
var util = require("substance-util");
var Document = require("./document");
var Operator = require("substance-operator");

var _getConfig;

// A class that provides helpers to manage a document's annotations.
// --------
//
// Note: the provided document is used to retrieve the annotation behavior and to initialize an annotation index.
//
var Annotator = function(doc) {
  this.config = _getConfig(doc);
  doc.addIndex("annotations", {types: ["annotation"], property: "path"});
  this.document = doc;
};

Annotator.Prototype = function() {

  // Updates all annotations according to a given operation.
  // --------
  //
  // The provided operation is an ObjectOperation which has been applied already or should be applied afterwards.
  //
  // Depending on the operation's `path` and the impact on an annotations range
  // there are the following cases:
  // 1. op='update', path==a.path: update the range following the rules given in the configuration
  // 2. op='delete', path[0]==a.path[0]: the annotation gets deleted
  // 3. op='set', path==a.path: the annotation gets deleted as the referenced property has been reset
  //
  this.update = function(op) {
    var index = this.document.getIndex("annotations");
    var annotations = index.get(op.path);
    _.each(annotations, function(a) {
      _update(this, a, op);
    }, this);
  };

  // Copy annotations in the given selection.
  // --------
  // This is the pendant to the writer's copy method.
  // Partially selected annotations may not get copied depending on the
  // annotation type, for others, new annotation fragments would be created.

  this.copy = function(/*selection*/) {
    throw new Error("FIXME: this must be updated considering the other API changes.");

    // var ranges = _getRanges(this, selection);

    // // get all affected annotations
    // var annotations = this.getAnnotations(session, selection);
    // var result = [];

    // _.each(annotations, function(annotation) {

    //   // TODO: determine if an annotation would be split by the given selection.
    //   var range = ranges[annotation.path[0]];
    //   var isPartial = (range[0] > annotation.range[0] || range[1] < annotation.range[1]);

    //   var newAnnotation;
    //   if (isPartial) {
    //     // for the others create a new fragment (depending on type) and truncate the original
    //     if (this.isSplittable(annotation.type)) {
    //       newAnnotation = util.clone(annotation);
    //       // make the range relative to the selection
    //       newAnnotation.id = util.uuid();
    //       newAnnotation.range = [Math.max(0, annotation.range[0] - range[0]), annotation.range[1] - range[0]];
    //       result.push(newAnnotation);
    //     }
    //   } else {
    //     // add totally included ones
    //     // TODO: need more control over uuid generation
    //     newAnnotation = util.clone(annotation);
    //     newAnnotation.id = util.uuid();
    //     newAnnotation.range = [newAnnotation.range[0] - range[0], newAnnotation.range[1] - range[0]];
    //     result.push(newAnnotation);
    //   }

    // }, this);

    // return result;
  };

  this.paste = function(/*annotations, newNodeId, offset*/) {
    throw new Error("FIXME: this must be updated considering the other API changes.");
    // for (var i = 0; i < annotations.length; i++) {
    //   var annotation = annotations[i];
    //   if (newNodeId !== undefined) {
    //     annotation.path = _.clone(annotation.path);
    //     annotation.path[0] = newNodeId;
    //   }
    //   if (offset !== undefined) {
    //     annotation.range[0] += offset;
    //     annotation.range[1] += offset;
    //   }
    //   this.create(annotation);
    // }
  };

  // A helper to implement an editor which can breaks or joins nodes.
  // --------
  // TODO: this seems to be very tailored to text nodes. Refactor this when needed.
  //
  this.transferAnnotations = function(node, charPos, newNode, offset) {
    offset = offset || 0;

    var annotations = _nodeAnnotationsByRange(this, node, {start: charPos});
    _.each(annotations, function(annotation) {
    //   var range = ranges[annotation.path[0]];
      var isInside = (charPos > annotation.range[0] || charPos[1] < annotation.range[1]);
      var newRange;

      // 1. if the cursor is inside an annotation it gets either split or truncated
      if (isInside) {
        // create a new annotation fragment if the annotation is splittable
        if (this.isSplittable(annotation.type)) {
          var splitAnnotation = util.clone(annotation);
          splitAnnotation.range = [offset, offset + annotation.range[1] - charPos];
          splitAnnotation.id = util.uuid();
          this.document.create(splitAnnotation);
        }
        // in either cases truncate the first part
        newRange =_.clone(annotation.range);
        newRange[1] = charPos;

        // if the fragment has a zero range now, delete it
        if (newRange[1] === newRange[0]) {
          this.document.delete(annotation.id);
        }
        // ... otherwise update the range
        else {
          this.document.set([annotation.id, "range"], newRange);
        }
      }

      // 2. if the cursor is before an annotation then simply transfer the annotation to the new node
      else {
        // Note: we are preserving the annotation so that anything which is connected to the annotation
        // remains valid.
        var newPath = _.clone(annotation.path);
        newPath[0] = newNode.id;
        this.document.set([annotation.id, "path"], newPath);
        newRange = [offset + annotation.range[0] - charPos, offset + annotation.range[1] - charPos];
        this.document.set([annotation.id, "range"], newRange);
      }
    }, this);
  };

  this.getAnnotationsForNode = function(nodeId) {
    return this.index.get(nodeId);
  };

  // Provides all annotations that correspond to a given selection.
  // --------
  // TODO: we could do a minor optimization, as it happens that the same query is performed multiple times.
  //
  this.getAnnotations = function(sel) {
    if (!(sel instanceof Document.Selection)) {
      throw new Error("API has changed: now getAnnotations() takes only a selection.");
    }

    var annotations = [];
    var ranges = sel.getRanges();
    for (var i = 0; i < ranges.length; i++) {
      var range = ranges[i];
      var annos = _annotationsByRange(this, this.document, range);
      annotations = annotations.concat(annos);
    }
    // console.log("Annotator.getAnnotations():", sel, annotations);
    return annotations;
  };

  // Returns true if two annotation types are mutually exclusive
  // ---------
  // Currently there is a built-in mechanism which considers two annotations
  // exclusive if they belong to the same group.
  //
  this.isExclusive = function(type1, type2) {
    return this.config.groups[type1] === this.config.groups[type2];
  };

  // Tell if an annotation can be split or should be truncated only.
  // --------
  //
  // E.g. when cutting a selection or inserting a new node existing annotations
  // may be affected. In some cases (e.g., `emphasis` or `strong`) it is wanted
  // that a new annotation of the same type is created for the cut fragment.
  //
  this.isSplittable = function(type) {
    return this.config.split.indexOf(type) >= 0;
  };


  // Updates a single annotation according to a given operation.
  // --------
  //
  var _update = function(self, annotation, op) {
    // only apply the transformation on annotations with the same property
    // Note: currently we only have annotations on the `content` property of nodes
    if (!_.isEqual(annotation.path, op.path)) return;

    if (op.type === "update") {
      // Note: these are implicit transformations, i.e., not triggered via annotation controls
      var expandLeft = false;
      var expandRight = false;

      var expandSpec = self.config.expansion[annotation.type];
      if (expandSpec) {
        if (expandSpec.left) expandLeft =  expandSpec.left(annotation);
        if (expandSpec.right) expandRight = expandSpec.right(annotation);
      }

      var newRange = util.clone(annotation.range);
      var changed = Operator.TextOperation.Range.transform(newRange, op.diff, expandLeft, expandRight);
      if (changed) {
        if (newRange[0] === newRange[1]) {
          self.document.delete(annotation.id);
        } else {
          self.document.set([annotation.id, "range"], newRange);
        }
      }
    }
    // if somebody has reset the property we must delete the annotation
    else if (op.type === "delete" || op.type === "set") {
      self.document.delete(annotation.id);
    }
  };

  // Checks if an annotation overlaps with a given range
  // --------
  //
  var __isOverlap = function(self, anno, range) {
    var sStart = range.start;
    var sEnd = range.end;
    var aStart = anno.range[0];
    var aEnd = anno.range[1];

    var expandLeft = false;
    var expandRight = false;
    var expandSpec = self.config.expansion[anno.type];
    if (expandSpec) {
      if (expandSpec.left) expandLeft =  expandSpec.left(anno);
      if (expandSpec.right) expandRight = expandSpec.right(anno);
    }

    var overlap;
    if (expandRight) {
      overlap = (aEnd >= sStart);
    } else {
      overlap = (aEnd > sStart);
    }

    // Note: it is allowed to leave range.end undefined
    if (_.isNumber(sEnd)) {
      if (expandLeft) {
        overlap &= (aStart <= sEnd);
      } else {
        overlap &= (aStart < sEnd);
      }
    }

    return overlap;
  };

  var _annotationsByRange = function(self, doc, range) {
    var result = [];
    var component = range.component;
    var annotations;
    var index = doc.getIndex("annotations");

    if (component.type === "node") {
      var node = component.node;
      annotations = index.get(node.id);
    }
    else if (component.type === "property") {
      annotations = index.get(component.propertyPath);
    }
    else if (component.type === "custom") {
      annotations = index.get(component.path);
    }
    else {
      console.error("FIXME");
    }
    _.each(annotations, function(a) {
      if (__isOverlap(self, a, range)) {
        result.push(a);
      }
    });
    return result;
  };

  var _nodeAnnotationsByRange = function(self, node, range) {
    var result = [];
    var index = self.document.getIndex("annotations");
    var annotations = index.get(node.id);
    _.each(annotations, function(a) {
      if (__isOverlap(self, a, range)) {
        result.push(a);
      }
    });
    return result;
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

// A helper to decide whether a graph operation affects annotations of a given node
// --------
// E.g., this is used by node views to detect annotation changes and to update the view accordingly.
//

var _isInstanceOf = function(doc, node, type) {
  var schema = doc.getSchema();
  return schema.isInstanceOf(node.type, type);
};


Annotator.changesAnnotations = function(doc, op, path) {
  var anno;
  if (op.type === "delete") {
    anno = op.val;
  } else {
    anno = doc.get(op.path[0]);
  }
  var result = false;

  if (_isInstanceOf(doc, anno, "annotation")) {
    // any annotation operation with appropriate path
    if (_.isEqual(path, anno.path)) {
      result = true;
    }
    // ... or those who are changing the path to that
    else if (op.type === "set" && op.path[1] === "path" && (_.isEqual(path, op.original)|| _.isEqual(path, op.val))) {
      result = true;
    }
  }

  return result;
};


_getConfig = function(doc) {
  // Note: this is rather experimental
  // It is important to inverse the control over the annotation behavior,
  // i.e., which annotations exist and how they should be handled
  // This approach makes use of the static context of a Document implementation (e.g., Substance.Article)
  // For this to work you need to have:
  // - the `constructor` property set on the class
  // - a static property `annotationBehavior` specifying the behavior
  //   according to `Annotator.defaultBehavior`
  if (doc.constructor && doc.constructor.annotationBehavior) {
    return doc.constructor.annotationBehavior;
  } else {
    throw new Error("No Annotation behavior specified.");
  }
};

module.exports = Annotator;
