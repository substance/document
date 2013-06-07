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
    ArrayOperation;

if (typeof exports !== 'undefined') {
  _    = require('underscore');
  ot   = require('./lib/operation');
  // Should be require('substance-util') in the future
  util   = require('./lib/util/util');
  errors   = require('./lib/util/errors');
  Chronicle = require('./lib/chronicle/chronicle');
} else {
  _ = root._;
  ot = root.ot;
  util = root.Substance.util;
  errors   = root.Substance.errors;
  Chronicle = root.Substance.Chronicle;
}

ArrayOperation = Chronicle.OT.ArrayOperation;

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

// Constants
// --------

var CONTENT = "content";

// Document
// --------
//
// A generic model for representing and transforming digital documents

var Document = function(doc, schema) {
  // Set public properties
  this.id = doc.id;
  this.meta = doc.meta || {};

  this.schema = schema || SCHEMA;

  this.chronicle = Chronicle.create();
  this.chronicle.manage(this);

  // TODO: Should be chronicle.open(Chronicle.ROOT.id);
  this.reset();
};


Document.__prototype__ = function() {

  // Document API
  // --------
  //

  this.position = function(view, nodeId) {
    var elements = this.views[view];
    return elements.indexOf(nodeId);
  };

  // Find data nodes based on index
  // --------

  this.find = function(index, scope) {
    var indexes = this.indexes;
    var nodes = this.nodes;

    function wrap(nodeIds) {
      return _.map(nodeIds, function(n) {
        return nodes[n];
      });
    }

    if (!indexes[index]) return []; // throw index-not-found error instead?
    if (_.isArray(indexes[index])) return wrap(indexes[index]);
    if (!indexes[index][scope]) return [];

    return wrap(indexes[index][scope]);
  };

  // Get type chain
  this.getTypes = function(typeId) {
    var type = this.schema.types[typeId];
    if (type.parent) {
      return [type.parent, typeId];
    } else {
      return [typeId];
    }
  };

  // Get properties for a given type (based on type chain)
  this.getProperties = function(typeId) {
    var properties = {};
    var types = this.getTypes(typeId);
    _.each(types, function(type) {
      type = this.schema.types[type];
      _.extend(properties, type.properties);
    }, this);
    return properties;
  };

  // Serialize as JSON
  this.toJSON = function(includeIndexes) {
    var result = {
      properties: this.properties,
      meta: this.meta,
      id: this.id,
      nodes: this.nodes,
      views: this.views
    };
    if (includeIndexes) result.indexes = this.indexes;
    return result;
  };

  // Iterate like a champion
  this.each = function(fn, ctx) {
    _.each(this.views[CONTENT], function(n, index) {
      var node = this.nodes[n];
      fn.call(ctx || this, node, index);
    }, this);
  };

  // Add node to index

  this.addToIndex = function(node) {

    var self = this;
    function add(index) {
      var indexSpec = self.schema.indexes[index];
      var indexes = self.indexes;

      var idx = indexes[index];
      if (!_.include(self.getTypes(node.type), indexSpec.type)) return;

      // Create index if it doesn't exist
      var prop = indexSpec.properties[0];
      if (prop) {
        if (!idx) idx = indexes[index] = {};
        if (!node[prop]) return; // skip falsy values
        // Scoped by one property
        if (!idx[node[prop]]) {
          idx[node[prop]] = [node.id];
        } else {
          idx[node[prop]].push(node.id);
        }
      } else {
        // Flat indexes
        if (!idx) idx = indexes[index] = [];
        idx.push(node.id);
      }
    }

    _.each(this.schema.indexes, function(index, key) {
      add(key);
    });
  };

  // Silently remove node from index
  // --------

  this.removeFromIndex = function(node) {

    var self = this;
    function remove(index) {
      var indexSpec = self.schema.indexes[index];
      var indexes = self.indexes;
      var scopes = indexes[index];

      // Remove when source
      if (scopes[node.id]) {
        delete scopes[node.id];
      }

      if (!_.include(self.getTypes(node.type), indexSpec.type)) return;

      // Remove when target
      var prop = indexSpec.properties[0];

      var nodes = scopes[node[prop]];
      if (nodes) {
        scopes[node[prop]] = _.without(nodes, node.id);
      }
    }

    _.each(this.schema.indexes, function(index, key) {
      remove(key);
    });
  };

  // TODO: Prettify -> Code duplication alert
  this.updateIndex = function(node, prevNode) {

    var self = this;
    function update(index) {
      var indexSpec = self.schema.indexes[index];
      var indexes = self.indexes;

      var scopes = indexes[index];

      if (!_.include(self.getTypes(node.type), indexSpec.type)) return;

      // Remove when target
      var prop = indexSpec.properties[0];

      var nodes = scopes[prevNode[prop]];
      if (nodes) {
        scopes[prevNode[prop]] = _.without(nodes, prevNode.id);
      }

      // Create index if it doesn't exist
      if (!scopes) scopes = indexes[index] = {};
      prop = indexSpec.properties[0];

      if (!scopes[node[prop]]) {
        scopes[node[prop]] = [node.id];
      } else {
        scopes[node[prop]].push(node.id);
      }
    }

    _.each(this.schema.indexes, function(index, key) {
      update(key);
    });
  };

  // Helper to get uniformized options from a document command body.
  // --------

  function extractCommandOptions(body) {
    if (!body.target) return {};

    if (!_.isArray(body.target)) {
      body.target = ["content", body.target];
    }

    var view = body.target[0];
    var target = body.target[1];
    var pos;

    if (target === 'back') {
      pos = this.views[view].length;
    } else if (target === 'front') {
      pos = 0;
    } else {
      pos = this.views[view].indexOf(target)+1;
    }
    return {
      pos: pos,
      view: view,
      target: target
    };
  }

  // Executes a document manipulation command.
  // --------
  // The command is converted into a change
  // which is applied (see apply()) and recorded by the chronicle.

  this.exec = function(cmd) {

    var op = cmd[0];
    var body = cmd[1];

    var node, change, options, i;

    if (op === 'insert') {
      options = extractCommandOptions.call(this, body);

      node = util.deepclone(body.data);
      _.extend(node, {
        id: body.id,
        type: body.type
      });

      change = {
        command: 'insert',
        data: {
          node: node
        }
      };

      if (options.view) {
        change.data.view = options.view;
        change.data.op = ["+", options.pos, body.id];
      }

      this.apply(change);
      this.chronicle.record(change);

    } else if (op === 'delete') {

      // Note: document operations allow to delete multiple nodes
      // at once. Such a compound is transformed into multiple atomic operations.
      for (i = 0; i < body.nodes.length; i++) {
        var id = body.nodes[i];
        node = this.nodes[id];

        change = {
          command: 'delete',
          data: {
            node: util.deepclone(node)
          }
        };

        // add view specific operations data
        // assuming that a node can only be in exactly one view
        for (var name in this.views) {
          var pos = this.views[name].indexOf(id);
          if (pos >= 0) {
            change.data.view = name;
            change.data.op = [ArrayOperation.DEL, pos, id];
            break;
          }
        }

        console.log("Executing delete: change = ", change);

        this.apply(change);
        this.chronicle.record(change);
      }

    } else if (op === 'move') {
      options = extractCommandOptions.call(this, body);

      // Note: document operations allow to move multiple nodes
      // at once. Such a compound is transformed into multiple atomic operations
      // which need to be generated in reverse order so that we the same insert position can be used.

      for (i = body.nodes.length-1; i >= 0; i--) {
        var n = body.nodes[i];
        change = {
          command: 'move',
          data: {
            view: options.view,
            op: [">>", this.position(options.view, n), this.position(options.view, body.target[1])]
          }
        };
        this.apply(change);
        this.chronicle.record(change);
      }

    }

  };

  // Chronicle.Versioned API
  // --------
  //
  // Specification:
  //
  //    change = {
  //      command: <command>
  //      data: <command-specific-data>
  //    }
  //
  // 'insert', 'delete':  inserts / deletes a node
  //
  //    {
  //      command: 'insert' | 'delete',
  //      data: {
  //        node: <document-node>,
  //        view: <view>,           (optional)
  //        op: <array-operation>   (if view is given)
  //      }
  //    }
  //
  //  > Note: it is necessary to store the current node data into the delete command for invertibility.
  //
  // 'move':  Moves a node
  //
  //    {
  //      command: 'move',
  //      data: {
  //        op: <array-operation>,
  //        view: <view>
  //    }
  //

  this.apply = function(change) {
    var command = change.command;
    var data = change.data;

    var op, node, view;

    if (command === 'insert') {
      // Construct a new document node
      node = util.deepclone(data.node);
      this.nodes[node.id] = node;
      this.addToIndex(node);
      if (data.view) {
        view = this.views[data.view];
        op = ArrayOperation.fromJSON(data.op);
        op.apply(view);
      }

    } else if (command ==='delete') {
      node = data.node;
      this.removeFromIndex(node);
      delete this.nodes[node.id];
      if (data.view) {
        view = this.views[data.view];
        op = ArrayOperation.fromJSON(data.op);
        op.apply(view);
      }
    } else if (command === 'move') {
      view = this.views[data.view];
      op = ArrayOperation.fromJSON(data.op);
      op.apply(view);
    }
  };

  this.invert = function(change) {
    var command = change.command;
    var data = change.data;

    var inverted;

    if (command === 'insert' || command === 'delete') {
      inverted = util.deepclone(change);
      inverted.command = (command === 'insert') ? 'delete' : 'insert';
      if (data.view) {
        inverted.data.view = data.view;
        inverted.data.op = ArrayOperation.fromJSON(data.op).invert().toJSON();
      }
    } else if (command === 'move') {
      inverted = JSON.parse(JSON.stringify(change));
      inverted.data.op = ArrayOperation.fromJSON(change.data.op).invert().toJSON();
    }

    return inverted;
  };

  // Transforms two sibling changes.
  // --------
  //
  // This is the `transform` operator provided by Operational Transformation.
  //
  //       / - a            / - a - b' \
  //      o          ~ >   o             p
  //       \ - b            \ - b - a' /
  //
  // I.e., the result of applying `a - b'` must lead to the same result as
  // applying `b - a'`.
  //
  // > From a GIT point of view this related to rebasing.

  this.transform = function(a, b) {
    throw new errors.SubstanceError("Not implemented.");
  };

  // Resets the versioned object to a clean state.
  // --------
  //

  this.reset = function() {
    this.state = Chronicle.Index.ROOT.id;

    console.log('resetting the shit out of it');
    // // Reset content
    this.properties = {};
    this.nodes = {};

    // Init views
    this.views = {};
    _.each(this.schema.views, function(view, key) {
     this.views[key] = [];
    }, this);

    // TODO: derive from schema
    this.indexes = {
      "comments": {},
      "annotations": {}
    };
  };

};

Document.__prototype__.prototype = Chronicle.Versioned.prototype;
Document.prototype = new Document.__prototype__();

// add event support
_.extend(Document.prototype, util.Events);


// Document.Constants = {
//   CONTENT: CONTENT,
//   FRONT: FRONT,
//   BACK: BACK,
//   SILENT: SILENT
// };

// Document.__prototype__ = function() {

//   // Private Methods
//   // --------

//   // Methods for document manipulation
//   // --------

//   // Note: these methods are called on the Document instance
//   var methods = {
//     set: function(options) {
//       _.each(options, function(val, key) {
//         if (_.isArray(val)) {
//           this.properties[key] = ot.TextOperation.fromJSON(val).apply(this.properties[key] || "");
//         } else {
//           this.properties[key] = val;
//         }
//       }, this);
//     },

//     insert: function(options) {
//       var id = options.id ? options.id : util.uuid();

//       if (this.nodes[id]) throw('id ' +options.id+ ' already exists.');

//       // Construct a new document node
//       var newNode = _.clone(options.data);

//       _.extend(newNode, {
//         id: id,
//         type: options.type
//       });

//       // Insert element to provided list at given pos
//       var self = this;
//       function insertAt(view, nodeId, pos) {
//         var nodes = self.views[view];
//         nodes.splice(pos, 0, nodeId);
//       }

//       // TODO: validate against schema
//       // validate(newNode);

//       // Register new node
//       this.nodes[newNode.id] = newNode;
//       this.addToIndex(newNode);

//       if (options.target) {
//         var view = _.isArray(options.target) ? options.target[0] : CONTENT;
//         var target = _.isArray(options.target) ? options.target[1] : options.target;
//         var pos;
//         if (target === FRONT) {
//           pos = 0;
//         } else if (!target || target === BACK) {
//           pos = this.views[view].length;
//         } else {
//           pos = this.views[view].indexOf(target)+1;
//         }
//         insertAt(view, id, pos);
//       }
//     },

//     update: function(options) {
//       var node = this.nodes[options.id];

//       if (!node) throw('node ' +options.id+ ' not found.');

//       var oldNode = JSON.parse(JSON.stringify(node)); // deep copy
//       options = _.clone(options.data);

//       delete options.id;

//       _.each(options, function(val, prop) {
//         // TODO: additionally check on schema if property is designated as string
//         var type = this.schema.types[node.type];
//         if (!type) throw Error("Type not found: ", node.type);
//         var propType = type.properties[prop];
//         if (!propType) throw Error("Missing property definition for: "+node.type+"."+ prop);

//         if (propType === "string" && _.isArray(val)) {
//           node[prop] = ot.TextOperation.fromJSON(val).apply(node[prop]);
//         } else {
//           node[prop] = val;
//         }
//       }, this);
//       this.updateIndex(node, oldNode);
//     },

//     move: function(options) {
//       var nodes = this.views[CONTENT];

//       // TODO: Rather manipulate array directly?
//       nodes = this.views[CONTENT] = _.difference(nodes, options.nodes);

//       var pos;
//       if (options.target === FRONT) {
//         pos = 0;
//       } else if (options.target === BACK) {
//         pos = nodes.length;
//       } else {
//         pos = nodes.indexOf(options.target)+1;
//       }
//       nodes.splice.apply(nodes, [pos, 0].concat(options.nodes));
//     },

//     delete: function(options) {
//       this.views[CONTENT] = _.difference(this.views[CONTENT], options.nodes);
//       _.each(options.nodes, function(nodeId) {
//         this.removeFromIndex(this.nodes[nodeId]);
//         delete this.nodes[nodeId];
//       }, this);
//     }
//   };

//   // Public Interface
//   // --------

//   // TODO: proper error handling


  // For a given node return the position in the document
  // this.position = function(view, nodeId) {
  //   var elements = this.views[view];
  //   return elements.indexOf(nodeId);
  // };

//   this.getSuccessor = function(nodeId) {
//     var elements = this.views[CONTENT];
//     var index = elements.indexOf(nodeId);
//     var successor = index >= 0 ? elements[index+1] : null;
//     return successor;
//   };

//   this.getPredecessor = function(nodeId) {
//     var elements = this.views[CONTENT];
//     var index = elements.indexOf(nodeId);
//     var pred = index >= 0 ? elements[index-1] : null;
//     return pred;
//   };

//   // Get property value
//   this.get = function(property) {
//     return this.properties[property];
//   };

//   this.reset = function() {
//     // Reset content
//     this.properties = {};
//     this.nodes = {};

//     // Init views
//     this.views = {};
//     _.each(this.schema.views, function(view, key) {
//      this.views[key] = [];
//     }, this);

//     this.indexes = {
//       "comments": {},
//       "annotations": {}
//     };
//   };

//   // View Traversal
//   // --------

//   this.traverse = function(view) {
//     return _.map(this.views[view], function(node) {
//       return this.nodes[node];
//     }, this);
//   };

//   // List all content elements
//   // --------

//   this.each = function(fn, ctx) {
//     _.each(this.views[CONTENT], function(n, index) {
//       var node = this.nodes[n];
//       fn.call(ctx || this, node, index);
//     }, this);
//   };

//   // Find data nodes based on index
//   // --------

//   this.find = function(index, scope) {
//     var indexes = this.indexes;
//     var nodes = this.nodes;

//     function wrap(nodeIds) {
//       return _.map(nodeIds, function(n) {
//         return nodes[n];
//       });
//     }

//     if (!indexes[index]) return []; // throw index-not-found error instead?
//     if (_.isArray(indexes[index])) return wrap(indexes[index]);
//     if (!indexes[index][scope]) return [];

//     return wrap(indexes[index][scope]);
//   };


//   // Apply a given operation on the current document state
//   // --------
//   //
//   // TODO: reactivate the state checker

//   this.apply = function(operation, silent) {
//     var commit;

//     methods[operation[0]].call(this, operation[1]);

//     if(!silent) {
//       this.trigger('operation:applied', commit);
//     }
//   };

//   // Add node to index
//   // --------

//   this.addToIndex = function(node) {

//     var self = this;
//     function add(index) {
//       var indexSpec = self.schema.indexes[index];
//       var indexes = self.indexes;

//       var idx = indexes[index];
//       if (!_.include(self.getTypes(node.type), indexSpec.type)) return;

//       // Create index if it doesn't exist
//       var prop = indexSpec.properties[0];
//       if (prop) {
//         if (!idx) idx = indexes[index] = {};
//         if (!node[prop]) return; // skip falsy values
//         // Scoped by one property
//         if (!idx[node[prop]]) {
//           idx[node[prop]] = [node.id];
//         } else {
//           idx[node[prop]].push(node.id);
//         }
//       } else {
//         // Flat indexes
//         if (!idx) idx = indexes[index] = [];
//         idx.push(node.id);
//       }
//     }

//     _.each(this.schema.indexes, function(index, key) {
//       add(key);
//     });
//   };

//   // TODO: Prettify -> Code duplication alert
//   this.updateIndex = function(node, prevNode) {

//     var self = this;
//     function update(index) {
//       var indexSpec = self.schema.indexes[index];
//       var indexes = self.indexes;

//       var scopes = indexes[index];

//       if (!_.include(self.getTypes(node.type), indexSpec.type)) return;

//       // Remove when target
//       var prop = indexSpec.properties[0];

//       var nodes = scopes[prevNode[prop]];
//       if (nodes) {
//         scopes[prevNode[prop]] = _.without(nodes, prevNode.id);
//       }

//       // Create index if it doesn't exist
//       if (!scopes) scopes = indexes[index] = {};
//       prop = indexSpec.properties[0];

//       if (!scopes[node[prop]]) {
//         scopes[node[prop]] = [node.id];
//       } else {
//         scopes[node[prop]].push(node.id);
//       }
//     }

//     _.each(this.schema.indexes, function(index, key) {
//       update(key);
//     });
//   };

//   // Silently remove node from index
//   // --------

//   this.removeFromIndex = function(node) {

//     var self = this;
//     function remove(index) {
//       var indexSpec = self.schema.indexes[index];
//       var indexes = self.indexes;
//       var scopes = indexes[index];

//       // Remove when source
//       if (scopes[node.id]) {
//         delete scopes[node.id];
//       }

//       if (!_.include(self.getTypes(node.type), indexSpec.type)) return;

//       // Remove when target
//       var prop = indexSpec.properties[0];

//       var nodes = scopes[node[prop]];
//       if (nodes) {
//         scopes[node[prop]] = _.without(nodes, node.id);
//       }
//     }

//     _.each(this.schema.indexes, function(index, key) {
//       remove(key);
//     });
//   };

//   // Rebuild all indexes for fast lookup based on schema.indexes spec
//   // --------

//   this.buildIndexes =  function() {
//     this.indexes = {};
//     _.each(this.nodes, function(node) {
//       _.each(this.schema.indexes, function(index, key) {
//         this.addToIndex(key, node);
//       }, this);
//     }, this);
//   };
// };

// Document.prototype = new Document.__prototype__();

// // add event support
// _.extend(Document.prototype, util.Events);

// Export
// ========

if (typeof exports !== 'undefined') {
  module.exports = Document;
} else {
  root.Substance.Document = Document;
}

})(this);
