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
        "caption": "string"
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
    Data.Graph.Create({
      id: "document",
      type: "document",
      guid: options.id, // external global document id
      creator: options.creator,
      created_at: options.created_at,
      views: ["content", "figures", "publications"],
      title: "",
      abstract: ""
    }),
    Data.Graph.Create({
      id: "content",
      type: "view",
      nodes: [],
    }),
    Data.Graph.Create({
      id: "figures",
      type: "view",
      nodes: [],
    }),
    Data.Graph.Create({
      id: "publications",
      type: "view",
      nodes: [],
    })
  ];
};

// forward declaration
var Converter;

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
  options.seed = [];
  var doc = new Document(options);

  _.each(data.nodes, function(n) {
    doc.create(n);
  });

  return doc;
};

Document.Prototype = function() {
  var __super__ = util.prototype(this);
  var converter = new Converter();

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


  // Make a new selection on the document
  // --------
  //

  // this.select = function(range) {
  //   this.selection = new Document.Range(this, range);
  //   this.trigger('selection:changed', this.selection);
  //   return this.selection;
  // };


  // Executes a document manipulation command.
  // --------
  //
  // The command is converted into a sequence of graph commands

  this.apply = function(command) {

    var graphCommand = command;

    // normalize commands given in array notation
    if(_.isArray(command)) {
      command = new Data.Command(command, Document.COMMANDS);
    }

    if (converter[command.type]) {
      graphCommand = converter[command.type](this, command);
      if (_.isArray(graphCommand)) {
        graphCommand = Data.Graph.Compound(this, graphCommand);
      }
    }

    // Note: Data.Graph converts everything into ObjectOperations
    // We will pass this also back to the caller.
    var op = __super__.apply.call(this, graphCommand);

    var ops = (op.type === Operator.Compound.TYPE) ? op.ops : [op];
    _.each(ops, function(c) {
      if (c.type === "update") {
        var node = this.get(c.path[0]);
        var property = c.path[1];
        var diff = c.diff;
        updateAnnotations.call(this, node, property, diff);
      }
    }, this);

    this.trigger('command:executed', command);
    return op;
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
};

// Command Converter
// ========
//
// Turns document commands into Data.Graph commands

Converter = function() {

  // Delete nodes from document
  // --------
  //
  // ["delete", {nodes: ["h1", "t1"]}]

  this.delete = function(graph, command) {
    var nodes = command.args.nodes;

    var commands = [];
    _.each(nodes, function(n) {
      commands.push(Data.Graph.Delete({id: n}));
    }, this);

    _.each(graph.get('document').views, function(view) {
      var match = _.intersection(graph.get(view).nodes, nodes);
      commands.push(this.hide(graph, {
        "path": [view],
        args: {nodes: match}
      }));
    }, this);
    return commands;
  };

  // Hide elements from provided view
  // --------
  //
  // ["hide", {"nodes": ["t1", "t2"]}]
  //

  this.hide = function(graph, command) {
    var path = command.path.concat(["nodes"]);
    var view = graph.resolve(path).get();
    var nodes = command.args.nodes;

    var indices = [];
    _.each(nodes, function(n) {
      var i = view.indexOf(n);
      if (i>=0) indices.push(i);
    }, this);

    indices = indices.sort().reverse();

    var ops = _.map(indices, function(index) {
      return Operator.ArrayOperation.Delete(index, view[index]);
    });

    return Data.Graph.Update(path, Operator.ArrayOperation.Compound(ops));
  };

  // Position nodes in document
  // --------
  //
  // ["position", "content", {"nodes": ["t1", "t2"], "target": -1}]
  //

  // TODO: we could use Graph.set which computes a rather minimal set of ArrayOps
  //       to get rid of the ArrayOperation dependency here
  this.position = function(graph, command) {
    var path = command.path.concat(["nodes"]);
    var view = graph.resolve(path).get();
    var nodes = command.args.nodes;
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
    var target = Math.min(command.args.target, l);
    if (target<0) target = Math.max(0, l+target+1);

    for (idx = 0; idx < nodes.length; idx++) {
      ops.push(Operator.ArrayOperation.Insert(target + idx, nodes[idx]));
    }

    var compound = Operator.ArrayOperation.Compound(ops);

    // TODO: We pack multiple array commands into a compound

    return Data.Graph.Update(path, compound);
  };


  // Update incrementally
  // --------
  //

  // TODO: if we would integrate the convenience mechanisms for update and set into
  // Data.Graph, we could get rid of the OT dependencies here.

  this.update = function(graph, command) {
    var property = graph.resolve(command.path);
    var val = property.get();
    var valueType = property.baseType;

    var update;

    if (valueType === 'string') {
      update = Operator.TextOperation.fromOT(val, command.args);
    }
    else if (valueType === 'array') {
      update = command.args;
    }
    else if (valueType === 'object') {
      update = Operator.ObjectOperation.Extend(val, command.args);
    }
    else {
      throw new DocumentError("Unsupported type for update: " + valueType);
    }
    return Data.Graph.Update(command.path, update);
  };


  // Annotate document
  // --------
  //
  // `command.path` defines the referenced content node and property
  // ["annotate", "t1", "content", {"id": "a1",  type": "idea"}]

  this.annotate = function(graph, command) {
    // TODO: check if source exists, otherwise reject annotation
    if (command.path.length !== 2) throw new DocumentError("Invalid target: " + command.path);

    var annotation = _.extend({}, command.args, {
      node: command.path[0],
      property: command.path[1]
    });

    return Data.Graph.Create(annotation);
  };


  // Comment
  // --------
  //
  // `command.path` holds the node id, where the comment should stick on

  this.comment = function(graph, command) {
    // Delegates to graph.create method
    // TODO: check if source exists, otherwise reject annotation

    // keep track of annotation
    if (command.path.length !== 1) throw new DocumentError("Invalid target: " + command.path);

    var comment = _.extend({}, command.args);
    comment.node = command.path[0];
    comment.type = comment.type || 'comment';

    return Data.Graph.Create(comment);
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





// Command Factories
// --------

Document.Create = function(node) {
  return Data.Graph.Create(node);
};

Document.Delete = function(nodes) {
  return ["delete", {nodes: nodes}];
};


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
