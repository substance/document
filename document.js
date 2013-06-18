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


// Implementation
// ========

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
    // All comments are now indexed by node
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
        "views": ["array", "views"]
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
        "node": "node"
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

var SEED = [
  ["create", {
      "id": "document",
      "type": "document",
      "views": ["content", "figures", "publications"]
    }
  ],
  ["create", {
      "id": "content",
      "type": "view",
      "nodes": []
    }
  ],
  ["create", {
      "id": "figures",
      "type": "view",
      "nodes": []
    }
  ],
  ["create", {
      "id": "publications",
      "type": "view",
      "nodes": []
    }
  ]
];


// Command Converter
// ========
//
// Turns document command into Data.Graph commands

var Converter = function() {

  // Delete nodes from document
  // --------
  //
  // ["delete", {nodes: ["h1", "t1"]}]

  this.delete = function(graph, command) {
    return _.map(command.args.nodes, function(n) {
      return Data.Graph.Delete({id: n});
    });
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
    var view = graph.resolve(path).slice(0);
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
    var target = (l === 0) ? 0 : (l + command.args.target) % l;
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
  //  Data.Graph, we could get rid of the OT dependencies here.

  this.update = function(graph, command) {
    var propertyBaseType = graph.propertyBaseType(graph.get(command.path[0]), command.path[1]);
    var val = graph.resolve(command.path);

    var update;

    // String
    if (propertyBaseType === 'string') {
      update = ot.TextOperation.fromOT(val, command.args);
    }

    // Array
    else if (propertyBaseType === 'array') {
      throw new Error("Not yet implemented for arrays");
    }

    // Object
    else if (propertyBaseType === 'object') {
      update = ot.ObjectOperation.Extend(val, command.args);
    }

    // Other
    else {
      throw new Error("Unsupported type for update: " + propertyBaseType);
    }

    return Data.Graph.Update(command.path, update);
  };

  // Set property values
  // --------
  //
  // Unlike update you can set values directly
  // ["set", "h1", "content", "Hello Welt"] // string update
  // ["set", "a1", "pos", ["a", "b", "c"]] // array update (not yet implemented)

  this.set = function(graph, command) {

    if (!command.args) { // for string updates
      command.args = command.path.pop();
    }

    var propertyBaseType = graph.propertyBaseType(graph.get(command.path[0]), command.path[1]);
    var result;

    var val, newVal, update;

    val = graph.resolve(command.path);
    newVal = command.args;

    // String
    if (propertyBaseType === 'string') {
      update = ot.TextOperation.fromOT(val, [-val.length, newVal]);
    }
    // Array
    else if (propertyBaseType === 'array') {
      update = ot.ArrayOperation.Update(val, newVal);
    }
    // Object
    else if (propertyBaseType === 'object') {
      // TODO: for that we need to delete all keys and create the new ones
      //  or a more intelligent solution (i.e. diff)
      throw new Error("Not yet implemented for objects");
    }
    // Other
    else {
      // treating any other type via string operation
      val = val.toString();
      newVal = newVal.toString();
      update = ot.TextOperation.fromOT(val, [-val.length, newVal]);
    }

    result = Data.Graph.Update(command.path, update);
    return result;
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


// Document
// --------
//
// A generic model for representing and transforming digital documents

var Document = function(doc, schema) {
  Data.Graph.call(this, schema || SCHEMA);
  // Set public properties
  this.id = doc.id;

  // TODO: shift into a dedicated facility
  this.meta = {};

  this.reset();
};

Document.__prototype__ = function() {

  var __super__ = util.prototype(this);
  var converter = new Converter();

  // Resets the versioned object to a clean state.
  // --------
  //

  this.reset = function() {
    // Seed graph
    _.each(SEED, function(cmd) {
      this.exec(cmd);
    }, this);
  };

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
    console.log("Executing command: ", command);
    var graphCommand;
    // convert the command into a Data.Graph compatible command
    command = new Data.Command(command);
    if (converter[command.op]) {
      graphCommand = converter[command.op](this, command);
    } else {
      graphCommand = command;
    }

    // console.log('converted cmd', command);
    var commands = _.isArray(graphCommand) ? graphCommand : [graphCommand];

    _.each(commands, function(c) {

      __super__.exec.call(this, c);

      if (c.op === "update") {
        var node = this.get(c.path[0]);
        var property = c.path[1];
        var change = c.args;
        updateAnnotations.call(this, node, property, change);
      }
    }, this);
    this.trigger('command:executed', command);
  };
};


// Document.__prototype__.prototype = Chronicle.Versioned.prototype;
Document.__prototype__.prototype = Data.Graph.prototype;
Document.prototype = new Document.__prototype__();

// add event support
_.extend(Document.prototype, util.Events);

// Export
// ========

if (typeof exports !== 'undefined') {
  module.exports = Document;
} else {
  root.Substance.Document = Document;
}

})(this);
