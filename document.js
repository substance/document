// Substance.Document 0.4.0
// (c) 2010-2013 Michael Aufreiter
// Substance.Document may be freely distributed under the MIT license.
// For all details and documentation:
// http://interior.substance.io/modules/document.html

(function(root) {

// Import
// ========

var _,
    util,
    errors,
    Chronicle,
    ot,
    Data;

if (typeof exports !== 'undefined') {
  _    = require('underscore');
  ot   = require('./lib/operation');
  util   = require('./lib/util/util');
  errors   = require('./lib/util/errors');
  Chronicle = require('./lib/chronicle/chronicle');
  ot = require('./lib/chronicle/lib/ot/index');
  Data = require('./lib/data/data');
} else {
  _ = root._;
  ot = root.ot;
  util = root.Substance.util;
  errors   = root.Substance.errors;
  Chronicle = root.Substance.Chronicle;
  ot = Chronicle.ot;
  Data = root.Substance.Data;
}


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
        "docId": "string",
        "creator": "string",
        "title": "string",
        "abstract": "string"
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
      docId: options.id,
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

Document.__prototype__ = function() {

  var __super__ = util.prototype(this);
  var converter = new Converter();

  var updateAnnotations = function(node, property, change) {
    // We need to update the range of affected annotations.

    var annotations = this.find("annotations", node.id);
    annotations = _.filter(annotations, function(a) {
      return a.property === property;
    });
    for (var idx = 0; idx < annotations.length; idx++) {
      ot.TextOperation.Range.transform(annotations[idx].range, change);
    }
  };

  // Executes a document manipulation command.
  // --------
  // The command is converted into a sequence of graph commands

  this.exec = function(command) {

    // convert the command into a Data.Graph compatible command
    command = new Data.Command(command, Document.COMMANDS);
    var graphCommand = command;

    if (converter[command.type]) {
      graphCommand = converter[command.type](this, command);
      if (_.isArray(graphCommand)) {
        graphCommand = Data.Graph.Compound(this, graphCommand);
      }
    }
    // Note: Data.Graph converts everything into ObjectOperations
    // We will pass this also back to the caller.
    var op = __super__.exec.call(this, graphCommand);

    var cmds = (graphCommand.type === Data.Graph.COMPOUND) ? graphCommand.ops : [graphCommand];
    _.each(cmds, function(c) {
      if (c.type === "update") {
        var node = this.get(c.path[0]);
        var property = c.path[1];
        var change = c.args;
        updateAnnotations.call(this, node, property, change);
      }
    }, this);

    // TODO: maybe we could add events to Data.Graph?
    this.trigger('command:executed', command);

    return op;
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
      return ot.ArrayOperation.Delete(index, view[index]);
    });

    return Data.Graph.Update(path, ot.ArrayOperation.Compound(ops));
  };

  // Position nodes in document
  // --------
  //
  // ["position", {"nodes": ["t1", "t2"], "target": -1}]
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
        ops.push(ot.ArrayOperation.Delete(idx, id));
        l--;
      }
    }

    // target index can be given as negative number (as known from python/ruby)
    var target = Math.min(command.args.target, l);
    if (target<0) target = Math.max(0, l+target+1);

    for (idx = 0; idx < nodes.length; idx++) {
      ops.push(ot.ArrayOperation.Insert(target + idx, nodes[idx]));
    }

    var compound = ot.ArrayOperation.Compound(ops);

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
      update = ot.TextOperation.fromOT(val, command.args);
    }
    else if (valueType === 'array') {
      update = command.args;
    }
    else if (valueType === 'object') {
      update = ot.ObjectOperation.Extend(val, command.args);
    }
    else {
      throw new Error("Unsupported type for update: " + valueType);
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
    if (command.path.length !== 2) throw new Error("Invalid target: " + command.path);

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
    if (command.path.length !== 1) throw new Error("Invalid target: " + command.path);

    var comment = _.extend({}, command.args);
    comment.node = command.path[0];
    comment.type = comment.type || 'comment';

    return Data.Graph.Create(comment);
  };
};
Document.__prototype__.prototype = Data.Graph.prototype;
Document.prototype = new Document.__prototype__();
// Add convenience accessors for builtin document attributes
Object.defineProperties(Document.prototype, {
  id: {
    get: function () {
      return this.get("document").docId;
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
  views: {
    get: function () {
      return this.get("document").views;
    }
  }
});

// AnnotatedText
// --------
//
// Ties together a text node with its annotations
// Interface defined by Substance.Surface

var AnnotatedText = function(doc, path) {
  this.doc = doc;
  this.path = path;
  this.property = doc.resolve(path);
  this.resetCache();
};

AnnotatedText.__prototype__ = function() {

  this.setAnnotation = function(annotation) {
    this.cache.annotations[annotation.id] = annotation;
    this.commit();
  };

  this.getAnnotation = function(id) {
    return this.cache.annotations[id] || this.doc.get(id);
  };

  this.deleteAnnotation = function(id) {
    delete this.cache.annotations[id];
    this.cache.deleted_annotations.push(id);
  };

  this.setContent = function(content) {
    this.cache.content = content;
  };

  this.getContent = function() {
    if (this.cache.content !== null) return this.cache.content;
    return this.property.get();
  };

  // Transform Hook
  // --------
  //

  this.each = function(fn) {
    var annos = this.doc.find('annotations', this.property.node.id);
    _.each(this.cache.annotations, fn);

    _.each(annos, function(a) {
      if (!this.cache.annotations[a.id] && !_.include(this.cache.deleted_annotations, a.id)) fn(a, a.id);
    }, this);
  };

  // Transform Hook
  // --------
  //
  // triggered implicitly by Surface.insert|deleteTransformer)

  this.transformAnnotation = function(a, op, expand) {
    if (this.cache.annotations[a.id]) {
      a = this.cache.annotations[a.id];
    } else {
      a = util.deepclone(a);
    }
    ot.TextOperation.Range.transform(a.range, op, expand);
    this.cache.annotations[a.id] = a;
  };

  this.resetCache = function() {
    this.cache = {
      annotations: {},
      content: null,
      deleted_annotations: []
    };
  };

  // Commit changes
  // --------
  //

  this.commit = function() {

    // 1. Insert Annotations
    var newAnnotations = [];
    var updatedAnnotations = [];
    _.each(this.cache.annotations, function(a) {
      var oa = this.doc.get(a.id);
      if (!oa) newAnnotations.push(a);
      else if (a.type !== oa.type) updatedAnnotations.push(a);
    }, this);

    var cmds = [];

    _.each(newAnnotations, function(a) {
      a.node = this.property.node.id;
      cmds.push(Document.Create(a));
    }, this);

    // Text diff computation
    if (this.cache.content !== null) {
      var delta = _.extractOperation(this.property.get(), this.cache.content);
      cmds.push(Data.Graph.Update(this.path, ot.TextOperation.fromOT(delta)));
    }

    _.each(cmds, function(c) {
      this.doc.exec(c);
    }, this);
    this.resetCache();
  };
};
AnnotatedText.prototype = new AnnotatedText.__prototype__();

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


// Add event support
_.extend(Document.prototype, util.Events);

Document.SCHEMA = SCHEMA;
Document.AnnotatedText = AnnotatedText;

// Export
// ========

if (typeof exports !== 'undefined') {
  module.exports = Document;
} else {
  root.Substance.Document = Document;
}

})(this);
