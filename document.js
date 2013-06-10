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


// Implementation
// ========

// Default Document Schema
// --------

var SCHEMA = {
  "views": {
    // Stores order for content nodes
    "content": {
    }
  },

  // static indexes
  "indexes": {
    // all comments are now indexed by node association
    "comments": {
      "type": "comment",
      "properties": ["node"]
    },
    // All comments are now indexed by node
    "annotations": {
      "type": "annotation", // alternatively [type1, type2]
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
        "views": "array"
      }
    },

    "view": {
      "properties": {
        "nodes": "array"
      }
    },

    "code": {
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
      // TODO: this has been duplicate
      // "parent": "node",
      "properties": {
        "content": "string",
        "level": "number"
      },
      "parent": "content"
    },
    // Annotations
    "annotation": {
      "properties": {
        "node": "node",
        "pos": "object"
      }
    },
    "strong": {
      "properties": {
        "node": "string", // should be type:node
        "pos": "object"
      },
      "parent": "annotation"
    },
    "emphasis": {
      "properties": {
        "node": "string", // should be type:node
        "pos": "object"
      },
      "parent": "annotation"
    },
    "inline-code": {
      "parent": "annotation",
      "properties": {
        "node": "string", // should be type:node
        "pos": "object"
      }
    },
    "link": {
      "parent": "annotation",
      "properties": {
        "node": "string", // should be type:node
        "pos": "object",
        "url": "string"
      }
    },
    "idea": {
      "parent": "annotation",
      "properties": {
        "node": "string", // should be type:node
        "pos": "object",
        "url": "string"
      }
    },
    "error": {
      "parent": "annotation",
      "properties": {
        "node": "string", // should be type:node
        "pos": "object",
        "url": "string",
      }
    },
    "question": {
      "parent": "annotation",
      "properties": {
        "node": "string", // should be type:node
        "pos": "object",
        "url": "string"
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
    var target = (view.length + command.args.target) % view.length;

    var nodes = command.args.nodes;
    var ops = [];
    var res = [];
    var i;

    for (i=nodes.length-1; i>=0; i--) {
      var n = nodes[i];
      var idx = view.indexOf(n);
      if (idx>=0) {
        ops.push(new ArrayOperation([">>", idx, target]));
      } else {
        ops.push(new ArrayOperation(["+", target, n]));
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

    function convertStringOp(val, op) {
      var cops = []; // transformed ops
      var i = 0, j=0;
      _.each(op, function(el) {
        if (_.isString(el)) { // insert chars
          cops.push(["+", j, el]);
          j += el.length;
        } else if (el<0) { // delete n chars
          var offset = Math.abs(el);
          cops.push(["-", j, val.slice(i, i+offset)]);
          i += offset;
        } else { // skip n chars
          i += el;
          j += el;
        }
      });
      return cops;
    }

    function convertArrayOp(val, op) {

    }
    
    _.each(command.args, function(op, key) {
      var node = graph.resolve(command.path);
      var ops = convertStringOp(node[key], op);

      _.each(ops, function(op) {
        res.push({
          "op": "update",
          "path": command.path.concat(key),
          args: op
        });
      });
    });

    console.log('transformed commands', res);
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
  // The command is converted into a change
  // which is applied (see apply()) and recorded by the chronicle.

  this.exec = function(command) {
    console.log("Executing command: ", command);
    // convert the command into a Data.Graph compatible command
    command = new Data.Graph.Command(command);
    if (converter[command.op]) {
      var item = this.resolve(command.path); // call context?
      command = converter[command.op](this, command, item);
    } else {
      command = command.toJSON(); // needed?
    }

    console.log('converted cmd', command);

    var commands = _.isArray(command) ? command : [command];
    _.each(commands, function(c) {
      __super__.exec.call(this, c);  
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
