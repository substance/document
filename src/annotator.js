"use strict";

// Import
// ========

var _ = require("underscore");
var util = require("substance-util");
var Document = require("./document");
var Operator = require("substance-operator");

// Module
// ========

// A class that manages a document's annotations.
// --------
//

var Annotator;

function _getBehavior(doc) {
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
}

Annotator = function(doc, options) {
  options = options || {};

  this.document = doc;
  this.behavior = _getBehavior(doc);

  // register for co-transformations to keep annotations up2date.
  this.document.on("operation:applied", this.handleOperation, this);

  // defines groups of annotations that will be mutually exclusive
  this.groups = this.behavior.groups;
  this.expansion = this.behavior.expansion;
  this.split = this.behavior.split;

  this._index = Annotator.createIndex(doc);

  this.withTransformation = options.withTransformation;
};

Annotator.Prototype = function() {

  // Creates a new annotation
  // --------
  //


  // var _update = function(self, annotation, newRange) {
  //   self.document.apply(Operator.ObjectOperation.Set([annotation.id, "range"], annotation.range, newRange));
  // };

  // Deletes an annotation
  // --------
  //
  var _delete = function(self, annotation) {
    self.document.delete(annotation.id);
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
        this.triggerLater("annotation:changed", op.type, annotation);
      }
      // handle deletion of other nodes, i.e., remove associated annotations
      else if (op.type === "delete") {
        annotations = this._index.get(op.path);
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
    var annotations = this._index.get(op.path);
    _.each(annotations, function(a) {
      _transform.call(this, op, a);
    }, this);
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

  // Copy annotations in the given selection.
  // --------
  // This is the pendant to the writer's copy method.
  // Partially selected annotations may not get copied depending on the
  // annotation type, for others, new annotation fragments would be created.

  this.copy = function(/*selection*/) {
    throw new Error("FIXME: this must be updated considering the other API changes.");

    // var ranges = _getRanges(this, selection);

    // // get all affected annotations
    // var annotations = this.getAnnotations({selection: selection});
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

  // Retrieve annotations
  // --------
  // The selection can be filtered via
  //
  // - node + range : a node id and (optionally) a given range (only if node is given)
  // - selection: a selection of type `{start: [nodePos, charPos], end: [nodePos, charPos]}`
  // - filter: a custom filter of type `function(annotation) -> boolean`
  //

  // var _filterAnnotations = function(filter, annotations) {
  //   var filtered = [];
  //   _.each(annotations, function(a) {
  //     if(filter(a)) {
  //       filtered.push(a);
  //     }
  //   });
  //   return filtered;
  // };

  var __isOverlap = function(anno, range) {
    var sStart = range.start;
    var sEnd = range.end;
    var aStart = anno.range[0];
    var aEnd = anno.range[1];

    var overlap = (aEnd >= sStart);

    // Note: it is allowed to give only omit the end part
    if (_.isNumber(sEnd)) {
      overlap &= (aStart <= sEnd);
    }

    return overlap;
  };

  var _filterByRange = function(range) {

    var result = [];
    var component = range.component;

    var annotations;
    if (component.type === "node") {
      var node = component.node;
      annotations = this._index.get(node.id);
    }
    else if (component.type === "property") {
      annotations = this._index.get(component.propertyPath);
    }
    else if (component.type === "custom") {
      annotations = this._index.get(component.path);
    }
    else {
      console.error("FIXME");
    }

    _.each(annotations, function(a) {
      if (__isOverlap(a, range)) {
        result.push(a);
      }
    });

    return result;
  };

  this.getAnnotationsForNode = function(nodeId) {
    return this._index.get(nodeId);
  };

  // TODO: we could do a minor optimization, as it happens that the same query is performed multiple times
  // -- which is ok as those are different peers.
  this.getAnnotations = function(sel) {
    if (!(sel instanceof Document.Selection)) {
      throw new Error("API has changed: now getAnnotations() takes only a selection.");
    }

    var annotations = [];

    var ranges = sel.getRanges();

    for (var i = 0; i < ranges.length; i++) {
      var range = ranges[i];
      var annos = _filterByRange.call(this, range);
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
    return this.groups[type1] === this.groups[type2];
  };

  // Tell if an annotation can be split or should be truncated only.
  // --------
  //
  // E.g. when cutting a selection or inserting a new node existing annotations
  // may be affected. In some cases (e.g., `emphasis` or `strong`) it is wanted
  // that a new annotation of the same type is created for the cut fragment.

  this.isSplittable = function(type) {
    return this.split.indexOf(type) >= 0;
  };

  this.dispose = function() {
    this.stopListening();
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

// Creates a shared index for annotations on a given document.
// --------
//

Annotator.createIndex = function(doc) {
  if (doc.indexes["annotations"] === undefined) {
    var options = {
      types: ["annotation"],
      property: "path"
    };
    var index = doc.addIndex("annotations", options);
    index.ENABLE_LOGGING = true;
    doc.indexes["annotations"] = index;
  }
  return doc.indexes["annotations"];
};

// TODO:
Annotator.defaultBehavior = {
  groups: {
    "emphasis": "style",
    "strong": "style",
    "link": "style",
    "remark": "marker",
    "idea": "marker",
    "error": "marker"
  },
  expansion: {
    "emphasis": {
      left: Annotator.isOnNodeStart,
    },
    "strong": {
      left: Annotator.isOnNodeStart,
    }
  },
  split: ["emphasis", "strong"],
  levels: {
    idea: 1,
    remark: 1,
    error: 1,
    comment: 1,
    link: 1,
    strong: 2,
    emphasis: 2,
    code: 2,
    subscript: 2,
    superscript: 2,
    underline: 2,
    cross_reference: 1,
    figure_reference: 1,
    person_reference: 1,
    citation_reference: 1
  }
};

// LEGACY: I moved this to util as it is useful in different contexts:
// currently Annotations, Markdown-Converter.
Annotator.Fragmenter = require("substance-util").Fragmenter;

// Export
// ========

module.exports = Annotator;
