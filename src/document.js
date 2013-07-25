"use strict";
// Substance.Document 0.5.0
// (c) 2010-2013 Michael Aufreiter
// Substance.Document may be freely distributed under the MIT license.
// For all details and documentation:
// http://interior.substance.io/modules/document.html

// Import
// ========

var _ = require("underscore");
var util = require("substance-util");
var errors = util.errors;
var Data = require("substance-data");
var Operator = require("substance-operator");

// Module
// ========

var DocumentError = errors.define("DocumentError");

// Default Document Schema
// --------

var SCHEMA = {
  // Static indexes
  "indexes": {
    // all comments are now indexed by node association
    "comments": {
      "type": "comment",
      "properties": ["node"]
    },
    // All annotations are now indexed by node
    "annotations": {
      "type": "annotation",
      "properties": ["node"]
    }
  },

  "types": {
    // Specific type for substance documents, holding all content elements
    "content": {
      "properties": {
      }
    },

    "text": {
      "parent": "content",
      "properties": {
        "content": "string"
      }
    },

    "document": {
      "properties": {
        "views": ["array", "view"],
        "guid": "string",
        "creator": "string",
        "title": "string",
        "abstract": "string",
        "keywords": ["array", "string"]
      }
    },

    "view": {
      "properties": {
        "nodes": ["array", "content"]
      }
    },

    "codeblock": {
      "parent": "content",
      "properties": {
        "content": "string"
      }
    },

    "image": {
      "parent": "content",
      "properties": {
        "large": "string",
        "medium": "string",
        "caption": "string",
        "content": "string" // TODO: remove
      }
    },

    "heading": {
      "parent": "content",
      "properties": {
        "content": "string",
        "level": "number"
      }
    },

    // Annotations
    "annotation": {
      "properties": {
        "node": "content",
        "property": "string",
        "range": "object"
      }
    },

    "strong": {
      "parent": "annotation",
      "properties": {
      }
    },

    "emphasis": {
      "properties": {
      },
      "parent": "annotation"
    },

    "code": {
      "parent": "annotation",
      "properties": {
      }
    },

    "link": {
      "parent": "annotation",
      "properties": {
        "url": "string"
      }
    },

    "idea": {
      "parent": "annotation",
      "properties": {
      }
    },

    "error": {
      "parent": "annotation",
      "properties": {
      }
    },

    "question": {
      "parent": "annotation",
      "properties": {
      }
    },

    // Comments
    "comment": {
      "properties": {
        "content": "string",
        "created_at": "string", // should be date
        "creator": "string", // should be date
        "node": "node" // references either a content node or annotation
      }
    }
  }
};

// Seed Data
// ========
//
// Some pre-defined nodes that are required for each document
// `document` stores all meta-information about the document
// `content` is the main view

// Provides an initial state by a set of nodes.
// --------
// These commands change will not be versioned.
// Every document's history must be applicable on this.
var SEED = function(options) {
  return [
    Operator.ObjectOperation.Create(["document"], {
      id: "document",
      type: "document",
      guid: options.id, // external global document id
      creator: options.creator,
      created_at: options.created_at,
      views: ["content", "figures", "publications"],
      title: "",
      abstract: ""
    }),
    Operator.ObjectOperation.Create(["content"], {
      id: "content",
      type: "view",
      nodes: [],
    }),
    Operator.ObjectOperation.Create(["figures"], {
      id: "figures",
      type: "view",
      nodes: [],
    }),
    Operator.ObjectOperation.Create(["publications"], {
      id: "publications",
      type: "view",
      nodes: [],
    })
  ];
};

// Document
// --------
//
// A generic model for representing and transforming digital documents

var Document = function(options) {
  options.seed = options.seed || SEED(options);
  Data.Graph.call(this, options.schema || SCHEMA, options);
};


// Factory method
// --------
//
// TODO: Ensure the snapshot doesn't get chronicled

Document.fromSnapshot = function(data, options) {
  options = options || {};
  options.seed = [];
  var doc = new Document(options);

  _.each(data.nodes, function(n) {
    doc.create(n);
  });

  return doc;
};

Document.Prototype = function() {

  var __super__ = util.prototype(this);

  var updateAnnotations = function(node, property, change) {
    // We need to update the range of affected annotations.

    var annotations = this.find("annotations", node.id);
    annotations = _.filter(annotations, function(a) {
      return a.property === property;
    });
    for (var idx = 0; idx < annotations.length; idx++) {
      var a = annotations[idx];
      var changed = Operator.TextOperation.Range.transform(a.range, change);
      // TODO: here we could check if the range is collapsed and remove the annotation.
      if (changed) this.trigger("annotation:changed", a);
    }
  };

  // Get node position for a given view and node id
  // --------
  //

  this.getPosition = function(view, id) {
    return this.get(view).nodes.indexOf(id);
  };

  // Serialize to JSON
  // --------
  //
  // The command is converted into a sequence of graph commands

  this.toJSON = function() {
    var res = __super__.toJSON.call(this);
    res.id = this.id;
    return res;
  };

  // Hide elements from provided view
  // --------
  //

  this.hide = function(viewId, nodes) {
    var view = this.get(viewId).nodes;

    var indices = [];
    _.each(nodes, function(n) {
      var i = view.indexOf(n);
      if (i>=0) indices.push(i);
    }, this);

    indices = indices.sort().reverse();

    var ops = _.map(indices, function(index) {
      return Operator.ArrayOperation.Delete(index, view[index]);
    });

    var op = Operator.ObjectOperation.Update([viewId, "nodes"], Operator.ArrayOperation.Compound(ops));

    return this.apply(op);
  };


  // Position nodes in document
  // --------
  //

  this.position = function(viewId, nodes, target) {
    var view = this.get(viewId).nodes;
    var ops = [];
    var idx;

    // Create a sequence of atomic array operations that
    // are bundled into a Compound operation
    // 1. Remove elements (from right to left)
    // 2. Insert at the very position

    // the sequence contains selected nodes in the order they
    // occurr in the view
    var seq = _.intersection(view, nodes);
    var l = view.length;

    while(seq.length > 0) {
      var id = seq.pop();
      idx = view.indexOf(id);
      if (idx >= 0) {
        ops.push(Operator.ArrayOperation.Delete(idx, id));
        l--;
      }
    }

    // target index can be given as negative number (as known from python/ruby)
    target = Math.min(target, l);
    if (target<0) target = Math.max(0, l+target+1);

    for (idx = 0; idx < nodes.length; idx++) {
      ops.push(Operator.ArrayOperation.Insert(target + idx, nodes[idx]));
    }

    var update = Operator.ObjectOperation.Update([viewId, "nodes"], Operator.ArrayOperation.Compound(ops));
    return this.apply(update);
  };

  // Annotate document
  // --------
  //
  // `path` defines the referenced content node and property

  this.annotate = function(path, annotation) {
    // TODO: check if source exists, otherwise reject annotation
    if (path.length !== 2) throw new DocumentError("Invalid target: " + path);

    // TODO: generalize the path stuff
    annotation = util.clone(annotation);
    annotation.node = path[0];
    annotation.property = path[1];

    return this.create(annotation);
  };


  // Comment
  // --------
  //
  // `command.path` holds the node id, where the comment should stick on

  this.comment = function(nodeId, comment) {

    comment = util.clone(comment);
    comment.node = nodeId;
    comment.type = comment.type || 'comment';

    return this.create(comment);
  };

  this.startSimulation = function() {
    // TODO: this should be implemented in a more cleaner and efficient way.
    // Though, for now and sake of simplicity done by creating a copy
    var self = this;
    var simulation = Document.fromSnapshot(this.toJSON());
    var ops = [];

    var __apply__ = simulation.apply;

    simulation.apply = function(op) {
      op = __apply__.call(simulation, op);
      ops.push(op);
      return op;
    };

    simulation.save = function() {
      for (var i = 0; i < ops.length; i++) {
        self.apply(ops[i]);
      }
      console.log("Saved simulated ops", self);
    };

    return simulation;
  };
};

Document.Prototype.prototype = Data.Graph.prototype;
Document.prototype = new Document.Prototype();

// Add event support
_.extend(Document.prototype, util.Events);

// Add convenience accessors for builtin document attributes
Object.defineProperties(Document.prototype, {
  id: {
    get: function () {
      return this.get("document").guid;
    },
    set: function() {
      throw "doc.id is immutable";
    }
  },
  creator: {
    get: function () {
      return this.get("document").creator;
    }
  },
  created_at: {
    get: function () {
      return this.get("document").created_at;
    }
  },
  title: {
    get: function () {
      return this.get("document").title;
    }
  },
  abstract: {
    get: function () {
      return this.get("document").abstract;
    }
  },
  keywords: {
    get: function () {
      // Note: returing a copy to avoid inadvertent changes
      return this.get("document").keywords.slice(0);
    }
  },
  views: {
    get: function () {
      // Note: returing a copy to avoid inadvertent changes
      return this.get("document").views.slice(0);
    }
  },
});


Document.COMMANDS = _.extend({}, Data.COMMANDS, {
  "position": {
    "types": ["array"],
    "arguments": 1
  },
  "hide": {
    "types": ["array"],
    "arguments": 1
  },
  "delete": {
    "types": ["graph"],
    "arguments": 1
  },
  "annotate": {
    "types": ["content"],
    "arguments": 1
  },
  "comment": {
    "types": ["content", "annotation"],
    "arguments": 1
  }
});


Document.SCHEMA = SCHEMA;
Document.DocumentError = DocumentError;


// Export
// ========

module.exports = Document;
