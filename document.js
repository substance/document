// Substance.Document 0.4.0
// (c) 2010-2013 Michael Aufreiter
// Substance.Document may be freely distributed under the MIT license.
// For all details and documentation:
// http://interior.substance.io/modules/document.html

(function(root) {

// Import
// ========

var _,
    ot,
    util,
    errors,
    Chronicle,
    ArrayOperation,
    TextOperation,
    Data;

if (typeof exports !== 'undefined') {
  _    = require('underscore');
  ot   = require('./lib/operation');
  util   = require('./lib/util/util');
  errors   = require('./lib/util/errors');
  Chronicle = require('./lib/chronicle/chronicle');
  Data = require('./lib/data/data');
} else {
  _ = root._;
  ot = root.ot;
  util = root.Substance.util;
  errors   = root.Substance.errors;
  Chronicle = root.Substance.Chronicle;
  Data = root.Substance.Data;
}

ArrayOperation = Chronicle.OT.ArrayOperation;
TextOperation = Chronicle.OT.TextOperation;


function convertStringOp(val, op) {
  var cops = []; // transformed ops
  var i = 0, j=0;
  _.each(op, function(el) {
    if (_.isString(el)) { // insert chars
      cops.push(TextOperation.Insert(j, el));
      j += el.length;
    } else if (el<0) { // delete n chars
      var offset = Math.abs(el);
      cops.push(TextOperation.Delete(j, val.slice(i, i+offset)));
      i += offset;
    } else { // skip n chars
      i += el;
      j += el;
    }
  });
  return cops;
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
        "pos": ["array", "number"]
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

var Converter = function(graph) {

  // Position nodes in document
  // --------
  //
  // ["position", {"nodes": ["t1", "t2"], "target": -1}]

  this.position = function(graph, command) {
    var path = command.path.concat(["nodes"]);
    var view = graph.resolve(path);

    var target = view.length > 0 ? (view.length + command.args.target) % view.length
                                 : 0;

    var nodes = command.args.nodes;
    var ops = [];
    var res = [];
    var i;

    for (i=0; i<nodes.length; i++) {
      var n = nodes[i];
      var idx = view.indexOf(n);
      if (idx >= 0) {
        ops.push(ArrayOperation.Move(idx, target));
      } else {
        ops.push(ArrayOperation.Insert(target, n));
      }
    }

    ops = ArrayOperation.chain(ops);
    _.each(ops, function(op) {
      res.push({
        op: "update",
        path: path,
        args: op.toJSON()
      });
    });

    return res;
  };

  // Delete nodes from document
  // --------
  //
  // ["delete", {nodes: ["h1", "t1"]}]

  this.delete = function(graph, command) {
    return _.map(command.args.nodes, function(n) {
      return {
        "op": "delete",
        "path": [],
        "args": {id: n}
      };
    });
  };

  // Update incrementally
  // --------
  //
  // ["update", "h1", {
  //   "content": ["abc", 4, -1],
  //   "children": [4, "a", -2]
  // }]
  // ["+", 0, "abc"]
  // ["-", 7, "x"]

  // ["+", 0, "abc"]
  // ["-", 4, "adfx"]  -> ["+", 4, "adfx"]

  this.update = function(graph, command) {
    var res = [];



    function convertArrayOp(val, op) {

    }

    var val = graph.resolve(command.path);
    var ops = convertStringOp(val, command.args);

    _.each(ops, function(op) {
      res.push({
        "op": "update",
        "path": command.path,
        args: op
      });
    });

    return res;
  };

  // Set property values
  // --------
  //
  // Unlike update you can reset values directly
  // ["update", "h1", {
  //   "content": ["abc"]
  // }]

  this.set = function(graph, command) {
    return _.map(command.args.nodes, function(n) {
      return {
        "op": "update",
        "path": [],
        "args": {id: n}
      };
    });
  };

  // Annotate document
  // --------
  //
  // `command.path` defines the referenced content node and property

  this.annotate = function(graph, command) {
    // TODO: check if source exists, otherwise reject annotation
    if (command.path.length !== 2) throw new Error("Invalid target: " + command.path);

    command.args.node = command.path[0];
    command.args.property = command.path[1];
    return {
      "op": "create",
      "path": [],
      "args": command.args
    }
  };


  // Comment
  // --------
  //
  // `command.path` holds the node id, where the comment should stick on

  this.comment = function(graph, command) {
    // Delegates to graph.create method
    // TODO: check if source exists, otherwise reject annotation

    // keep track of annotation
    console.log('ANNOTATING', command.path);

    if (command.path.length !== 1) throw new Error("Invalid target: " + this.path);
    command.args.node = command.path[0];
    if (!command.args.type) command.args.type = 'comment';

    return {
      "op": "create",
      "path": [],
      "args": command.args
    }
  }
};


// Document
// --------
//
// A generic model for representing and transforming digital documents

var Document = function(doc, schema) {
  Data.Graph.call(this, schema);

  // Set public properties
  this.id = doc.id;

  this.schema = schema || SCHEMA;
  this.reset();

  // Text Op for each annotation
  this.annotationOps = {};
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

  // Executes a document manipulation command.
  // --------
  // The command is converted into a sequence of graph commands

  this.exec = function(command) {
    console.log("Executing command: ", command);
    var graphCommand;
    // convert the command into a Data.Graph compatible command
    command = new Data.Graph.Command(command);
    if (converter[command.op]) {
      graphCommand = converter[command.op](this, command);
    } else {
      graphCommand = command.toJSON(); // needed?
    }

    // console.log('converted cmd', command);
    var commands = _.isArray(graphCommand) ? graphCommand : [graphCommand];
    _.each(commands, function(c) {
      __super__.exec.call(this, c);

      console.log('=============', command.op, command);

      // Smart updating of annotations, when text ops are applied
      if (command.op === "annotate") {
        // track se annotation
        // c.args.id
        // extract string from pos
        console.log('new annotation arrived', command.args.id);

        // The text the annotation refers to
        var text = this.resolve(command.path);

        // console.log('pos', command.args.pos);
        var pos = command.args.pos;
        var annotatedText = text.substr(pos[0], pos[1]);

        // Store the op for reference (later)
        this.annotationOps[c.args.id] = TextOperation.Insert(pos[0], annotatedText);
        // console.log('THE OP', this.annotationOps[c.args.id]);

      } else if (command.op === "update") {
        // var tops = TextOperation.transform(this.annoationops[c.args.id];
        // this.annotationops[c.args.id] tops[0]
        var node = this.get(command.path[0]);
        var property = command.path[1];
        var change = command.args;

        // _.each(command.args, function(change, property) {
        // console.log('annotations for ', node.id, property);

        // Get all annotations for a given property
        var annotations = _.filter(this.find("annotations", node.id), function(a) {
          return a.property === property;
        });

        _.each(annotations, function(a) {
          var aop = this.annotationOps[a.id];

          console.log('before', aop);
          console.log('change', change);

          // console.log('OLDSTYLE CHANGE', graphCommand.);

          var tops = [null, aop];
          _.each(commands, function(c) {
            // console.log('MEH', );
            tops = TextOperation.transform(TextOperation.fromJSON(c.args), tops[1]);
            console.log('tops', tops);

            // console.log('tops', tops);
            // this.annotationops[a.id] = tops[1];
          });

          this.annotationOps[a.id] = tops[1];

          console.log("XXX", this.annotationOps[a.id]);
          // Update annotation object in memory
          aop = this.annotationOps[a.id];
          a.pos = [aop.pos, aop.str.length];


          // var tops = TextOperation.transform(this.annoationops[a.id], change);
          // Tranformed textop
          // var taop

          console.log('after', this.annotationOps[a.id]);

        }, this);

        console.log('annots', annotations);

        // }, this);

        // Get all annotations for the updated text bla
        // this.annotationOps =
        // var target
        console.log('now update annotations that stick on the text node', node);
      }
    }, this);
  }
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
