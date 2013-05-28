// Substance.Document 0.4.0
// (c) 2010-2013 Michael Aufreiter
// Substance.Document may be freely distributed under the MIT license.
// For all details and documentation:
// http://interior.substance.io/modules/document.html

(function(root) {

// Import
// ========

var _, ot, util;

if (typeof exports !== 'undefined') {
  _    = require('underscore');
  ot   = require('./lib/operation');
  // Should be require('substance-util') in the future
  util   = require('./lib/util/util');
} else {
  _ = root._;
  ot = root.ot;
  util = root.Substance.util;
}

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
var FRONT = "front";
var BACK = "back";
var SILENT = "silent";

// Document
// --------
//
// A generic model for representing and transforming digital documents

var Document = function(doc, schema) {
  this.__id__ = this.__id__ || util.uuid();

  // Set public properties
  this.id = doc.id;
  this.meta = doc.meta || {};

  this.refs = doc.refs || {"master" : {"head" : ""}};
  this.commits = doc.commits || {};

  this.schema = schema || SCHEMA;

  // Checkout head
  this.checkout('head');
};

Document.Constants = {
  CONTENT: CONTENT,
  FRONT: FRONT,
  BACK: BACK,
  SILENT: SILENT
};

Document.__prototype__ = function() {

  // Private Methods
  // --------

  // Methods for document manipulation
  // --------

  // Note: these methods are called on the Document instance
  var methods = {
    set: function(options) {
      _.each(options, function(val, key) {
        if (_.isArray(val)) {
          this.properties[key] = ot.TextOperation.fromJSON(val).apply(this.properties[key] || "");
        } else {
          this.properties[key] = val;
        }
      }, this);
    },

    insert: function(options) {
      var id = options.id ? options.id : util.uuid();

      if (this.nodes[id]) throw('id ' +options.id+ ' already exists.');

      // Construct a new document node
      var newNode = _.clone(options.data);

      _.extend(newNode, {
        id: id,
        type: options.type
      });

      // Insert element to provided list at given pos
      var self = this;
      function insertAt(view, nodeId, pos) {
        var nodes = self.views[view];
        nodes.splice(pos, 0, nodeId);
      }

      // TODO: validate against schema
      // validate(newNode);

      // Register new node
      this.nodes[newNode.id] = newNode;
      this.addToIndex(newNode);

      if (options.target) {
        var view = _.isArray(options.target) ? options.target[0] : CONTENT;
        var target = _.isArray(options.target) ? options.target[1] : options.target;
        var pos;
        if (target === FRONT) {
          pos = 0;
        } else if (!target || target === BACK) {
          pos = this.views[view].length;
        } else {
          pos = this.views[view].indexOf(target)+1;
        }
        insertAt(view, id, pos);
      }
    },

    update: function(options) {
      var node = this.nodes[options.id];

      if (!node) throw('node ' +options.id+ ' not found.');

      var oldNode = JSON.parse(JSON.stringify(node)); // deep copy
      options = _.clone(options.data);

      delete options.id;

      _.each(options, function(val, prop) {
        // TODO: additionally check on schema if property is designated as string
        var type = this.schema.types[node.type];
        if (!type) throw Error("Type not found: ", node.type);
        var propType = type.properties[prop];
        if (!propType) throw Error("Missing property definition for: "+node.type+"."+ prop);

        if (propType === "string" && _.isArray(val)) {
          node[prop] = ot.TextOperation.fromJSON(val).apply(node[prop]);
        } else {
          node[prop] = val;
        }
      }, this);
      this.updateIndex(node, oldNode);
    },

    move: function(options) {
      var nodes = this.views[CONTENT];

      // TODO: Rather manipulate array directly?
      nodes = this.views[CONTENT] = _.difference(nodes, options.nodes);

      var pos;
      if (options.target === FRONT) {
        pos = 0;
      } else if (options.target === BACK) {
        pos = nodes.length;
      } else {
        pos = nodes.indexOf(options.target)+1;
      }
      nodes.splice.apply(nodes, [pos, 0].concat(options.nodes));
    },

    delete: function(options) {
      this.views[CONTENT] = _.difference(this.views[CONTENT], options.nodes);
      _.each(options.nodes, function(nodeId) {
        this.removeFromIndex(this.nodes[nodeId]);
        delete this.nodes[nodeId];
      }, this);
    }
  };

  // Public Interface
  // --------

  // TODO: proper error handling

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

  // Allow both refs and sha's to be passed
  this.checkout = function(ref) {
    var sha;
    if (this.refs['master'] && this.refs['master'][ref]) {
      sha = this.getRef(ref);
    } else {
      if (this.commits[ref]) {
        sha = ref;
      } else {
        sha = null;
      }
    }

    this.reset();
    _.each(this.getCommits(sha), function(commit) {
      this.apply(commit.op, {silent: true, "no-commit": true});
      this.properties.updated_at = commit.date;
    }, this);
    this.head = sha;
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

  // Export operation history
  this.export = function() {
    return {
      id: this.id,
      meta: this.meta,
      refs: this.refs,
      commits: this.commits
    };
  };

  // For a given node return the position in the document
  this.position = function(nodeId) {
    var elements = this.views[CONTENT];
    return elements.indexOf(nodeId);
  };

  this.getSuccessor = function(nodeId) {
    var elements = this.views[CONTENT];
    var index = elements.indexOf(nodeId);
    var successor = index >= 0 ? elements[index+1] : null;
    return successor;
  };

  this.getPredecessor = function(nodeId) {
    var elements = this.views[CONTENT];
    var index = elements.indexOf(nodeId);
    var pred = index >= 0 ? elements[index-1] : null;
    return pred;
  };

  // Get property value
  this.get = function(property) {
    return this.properties[property];
  };

  this.reset = function() {
    // Reset content
    this.properties = {};
    this.nodes = {};

    // Init views
    this.views = {};
    _.each(this.schema.views, function(view, key) {
     this.views[key] = [];
    }, this);

    this.indexes = {
      "comments": {},
      "annotations": {}
    };
  };

  // List commits
  // --------

  this.getCommits = function(ref, ref2) {
    // Current commit (=head)
    var commit = this.getRef(ref) || ref;
    var commit2 = this.getRef(ref2) || ref2;
    var skip = false;

    if (commit === commit2) return [];
    var op = this.commits[commit];

    if (!op) return [];
    op.sha = commit;

    var commits = [op];
    var prev = op;

    while (!skip && (op = this.commits[op.parent])) {
      if (commit2 && op.sha === commit2) {
        skip = true;
      } else {
        op.sha = prev.parent;
        commits.push(op);
        prev = op;
      }
    }

    return commits.reverse();
  };


  // Set ref to a particular commit
  // --------

  this.setRef = function(ref, sha, silent) {
    if (!this.refs['master']) this.refs['master'] = {};
    this.refs['master'][ref] = sha;
    if (!silent) this.trigger('ref:updated', ref, sha);
  };

  // Get sha the given ref points to
  // --------

  this.getRef = function(ref) {
    return (this.refs['master']) ? this.refs['master'][ref] : null;
  };

  // Go back in document history
  // --------

  this.undo = function() {
    var headRef = this.getRef(this.head) || this.head;
    var commit = this.commits[headRef];

    if (commit && commit.parent) {
      this.checkout(commit.parent);
      this.setRef('head', commit.parent);
    } else {
      // No more commits available
      this.reset();
      this.head = null;
      this.setRef('head', null);
    }
  };

  // If there are any undone commits
  // --------

  this.redo = function() {
    var commits = this.getCommits('last');
    var that = this;

    // Find the right commit
    var commit = _.find(commits, function(c) {
      return c.parent === that.head;
    });

    if (commit) {
      this.checkout(commit.sha);
      this.setRef('head', commit.sha);
    }
  };

  // View Traversal
  // --------

  this.traverse = function(view) {
    return _.map(this.views[view], function(node) {
      return this.nodes[node];
    }, this);
  };

  // List all content elements
  // --------

  this.each = function(fn, ctx) {
    _.each(this.views[CONTENT], function(n, index) {
      var node = this.nodes[n];
      fn.call(ctx || this, node, index);
    }, this);
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


  // Apply a given operation on the current document state
  // --------
  //
  // TODO: reactivate the state checker

  this.apply = function(operation, options) {
    var commit;

    options = options ? options : {};
    methods[operation[0]].call(this, operation[1]);

    // Note: Substance.Session calls this only with 'silent' set, i.e., applying the commit but not triggering.
    if (!options['no-commit']) {
      commit = this.commit(operation);
      this.head = commit.sha; // head points to new sha
    }

    if(!options[SILENT]) {
      this.trigger('commit:applied', commit);
    }

    return commit;
  };

  // Add node to index
  // --------

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

  // Rebuild all indexes for fast lookup based on schema.indexes spec
  // --------

  this.buildIndexes =  function() {
    this.indexes = {};
    _.each(this.nodes, function(node) {
      _.each(this.schema.indexes, function(index, key) {
        this.addToIndex(key, node);
      }, this);
    }, this);
  };

  // Create a commit for given operation
  // --------
  //
  // op: A Substance document operation as JSON

  this.commit = function(op) {
    var commit = {
      op: op,
      sha: util.uuid(),
      parent: this.head,
      date: new Date()
    };
    this.commits[commit.sha] = commit;
    this.setRef('head', commit.sha, true);
    this.setRef('last', commit.sha, true);
    return commit;
  };
};

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
