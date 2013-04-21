// Substance.Document 0.3.0
// (c) 2010-2013 Michael Aufreiter
// Substance.Document may be freely distributed under the MIT license.
// For all details and documentation:
// http://interior.substance.io/modules/document.html

(function() {

var root = this;
if (typeof exports !== 'undefined') {
  var _    = require('underscore');
  var ot   = require('operational-transformation');
  var util   = require('./lib/util/util');
} else {
  var _ = root._;
  var ot = root.ot;
  var util = root.Substance.util;
}

// Default Document Schema
// --------

var SCHEMA = {
  // List keeping
  "lists": {
    // Stores order for content nodes
    "content": {
      "types": ["node"]
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
      "parent": "node",
      "properties": {
        "content": "string"
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


// Document
// --------
// 
// A generic model for representing and transforming digital documents

var Document = function(doc, schema) {
  
  var self = this;

  // Private Methods
  // --------



  // Methods for document manipulation
  // --------

  var methods = {
    set: function(options) {
      _.each(options, function(val, key) {
        if (_.isArray(val)) {
          self.properties[key] = ot.TextOperation.fromJSON(val).apply(self.properties[key] || "");
        } else {
          self.properties[key] = val;
        }
      });
    },

    insert: function(options) {
      var id = options.id ? options.id : util.uuid();

      if (self.nodes[id]) throw('id ' +options.id+ ' already exists.');

      // Construct a new document node
      var newNode = _.clone(options.data);

      _.extend(newNode, {
        id: id,
        type: options.type
      });

      // Insert element to provided list at given pos
      function insertAt(list, nodeId, pos) {
        var nodes = self.lists[list];
        nodes.splice(pos, 0, nodeId);
      }

      // TODO: validate against schema
      // validate(newNode);

      // Register new node
      self.nodes[newNode.id] = newNode;

      self.addToIndex(newNode);

      var types = self.getTypes(options.type);

      // Only register content nodes
      if (_.include(types, "content")) {
        if (options.target === "front") {
          var pos = 0;
        } else if (!options.target || options.target === "back") {
          var pos = self.lists["content"].length;
        } else {
          var pos = self.lists["content"].indexOf(options.target)+1;
        }
        insertAt("content", id, pos);
      }
    },

    update: function(options) {
      var node = self.nodes[options.id];

      if (!node) throw('node ' +options.id+ ' not found.');

      var oldNode = JSON.parse(JSON.stringify(node)); // deep copy
      var options = _.clone(options.data);

      delete options.id;

      _.each(options, function(val, prop) {
        // TODO: additionally check on schema if property is designated as string
        var type = self.schema.types[node.type];
        if (!type) throw Error("Type not found: ", node.type);
        var propType = type.properties[prop];
        if (!propType) throw Error("Missing property definition for: "+node.type+"."+ prop);

        if (propType === "string" && _.isArray(val)) {
          node[prop] = ot.TextOperation.fromJSON(val).apply(node[prop]);
        } else {
          node[prop] = val;
        }
      });
      self.updateIndex(node, oldNode);
    },

    move: function(options) {
      var nodes = self.lists["content"];

      // TODO: Rather manipulate array directly?
      nodes = self.lists["content"] = _.difference(nodes, options.nodes);

      if (options.target === "front") var pos = 0;
      else if (options.target === "back") var pos = nodes.length;
      else var pos = nodes.indexOf(options.target)+1;

      nodes.splice.apply(nodes, [pos, 0].concat(options.nodes));
    },

    delete: function(options) {
      self.lists["content"] = _.difference(self.lists["content"], options.nodes);
      _.each(options.nodes, function(nodeId) {
        self.removeFromIndex(self.nodes[nodeId]);
        delete self.nodes[nodeId];
      });
    }
  };


  // Public Interface
  // --------

  // TODO: proper error handling

  // Get type chain
  this.getTypes = function(typeId) {
    var type = self.schema.types[typeId];
    if (type.parent) {
      return [type.parent, typeId];
    } else {
      return [typeId];
    }
  }

  // Allow both refs and sha's to be passed
  this.checkout = function(branch, ref) {
    var sha;
    if (this.refs[branch] && this.refs[branch][ref]) {
      sha = this.getRef(ref);
    } else {
      if (this.commits[ref]) {
        sha = ref;
      } else {
        sha = null;
      }
    }

    this.reset();
    _.each(this.getCommits(sha), function(op) {
      this.apply(op.op, {silent: true});
    }, this);
    this.head = sha;
  };

  // Serialize as JSON
  this.toJSON = function() {
    return {
      properties: this.properties,
      meta: this.meta,
      id: this.id,
      nodes: this.nodes,
      lists: this.lists
    };
  };


  // Export operation history
  this.export = function() {
    return {
      id: this.id,
      meta: this.meta,
      refs: this.refs,
      commits: this.commits
    }
  };

  // For a given node return the position in the document
  this.position = function(nodeId) {
    var elements = this.lists["content"];
    return elements.indexOf(nodeId);
  };

  this.getSuccessor = function(nodeId) {
    var elements = this.lists["content"];
    var index = elements.indexOf(nodeId);
    var successor = index >= 0 ? elements[index+1] : null;
    return successor;
  };

  this.getPredecessor = function(nodeId) {
    var elements = this.lists["content"];
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
    this.lists = {"content": []};
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
  
  this.setRef = function(branch, ref, sha, silent) {
    // When called without branch
    if (arguments.length === 3) {
      branch = 'master';
      ref = branch;
      sha = ref;
      silent = sha;
    }
    this.refs[branch][ref] = sha;
    if (!silent) this.trigger('ref:updated', ref, sha);
  };

  // Get sha the given ref points to
  // --------
  
  this.getRef = function(branch, ref) {
    if (arguments.length === 1) {
      ref = branch;
      branch = 'master';
    }

    return this.refs[branch][ref];
  };

  // Go back in document history
  // --------

  this.undo = function() {
    var headRef = this.getRef(this.head) || this.head;
    var commit = this.commits[headRef];

    if (commit && commit.parent) {
      this.checkout(commit.parent);
      this.setRef('master', 'head', commit.parent);
    } else {
      // No more commits available
      this.reset();
      this.head = null;
      this.setRef('master', 'head', null);
    }
  };

  // If there are any undone commits
  // --------

  this.redo = function() {
    var commits = this.getCommits('last');
    var that = this;
    
    // Find the right commit
    var commit = _.find(commits, function(c){ return c.parent === that.head; });

    if (commit) {
      this.checkout(commit.sha);
      this.setRef('master', 'head', commit.sha);
    }
  };

  // List all content elements
  // --------

  this.each = function(fn, ctx) {
    _.each(this.lists["content"], function(n, index) {
      var node = self.nodes[n];
      fn.call(ctx || this, node, index);
    });
  };

  // Find data nodes based on index
  // --------

  this.find = function(index, scope) {
    var indexes = this.indexes;
    var nodes = this.nodes;

    if (!indexes[index]) return []; // throw index-not-found error instead?
    if (!indexes[index][scope]) return [];
    return _.map(indexes[index][scope], function(n) {
      return nodes[n];
    });
  };


  // Apply a given operation on the current document state
  // --------
  // 
  // TODO: reactivate the state checker

  this.apply = function(operation, options) {
    options = options ? options : {};

    // TODO: this might slow things down, it's for debug purposes
    // var prevState = JSON.parse(JSON.stringify(this.content));

    methods[operation[0]].call(this, operation[1]);

    // This is a checker for state verification
    // verifyState(this.content, operation, prevState);

    if (!options.silent) {
      var commit = this.commit(operation);
      this.head = commit.sha; // head points to new sha

      // First trigger commit applied, which stores it
      this.trigger('commit:applied', commit);
    }
  };

  // Add node to index
  // --------

  this.addToIndex = function(node) {

    function add(index) {
      var indexSpec = self.schema.indexes[index];
      var indexes = self.indexes;

      var idx = indexes[index];
      if (!_.include(self.getTypes(node.type), indexSpec.type)) return;

      // Create index if it doesn't exist
      if (!idx) idx = indexes[index] = {};

      var prop = indexSpec.properties[0];

      if (!idx[node[prop]]) {
        idx[node[prop]] = [node.id];
      } else {
        idx[node[prop]].push(node.id);
      }
    }

    _.each(self.schema.indexes, function(index, key) {
      add(key);
    });
  };

  // TODO: Prettify -> Code duplication alert
  this.updateIndex = function(node, prevNode) {

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
      var prop = indexSpec.properties[0];

      if (!scopes[node[prop]]) {
        scopes[node[prop]] = [node.id];
      } else {
        scopes[node[prop]].push(node.id);
      }
    }

    _.each(self.schema.indexes, function(index, key) {
      update(key);
    });
  };

  // Silently remove node from index
  // --------

  this.removeFromIndex = function(node) {

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

    _.each(self.schema.indexes, function(index, key) {
      remove(key);
    });
  };

  // Rebuild all indexes for fast lookup based on schema.indexes spec
  // --------
  
  this.buildIndexes =  function() {
    this.indexes = {};
    var that = this;
    _.each(this.nodes, function(node) {
      _.each(that.schema.indexes, function(index, key) {
        that.addToIndex(key, node);
      });
    });
  };


  
  // Create a commit for given operation
  // --------
  // 
  // op: A Substance document operation as JSON

  this.commit = function(op) {
    var commit = {
      op: op,
      sha: util.uuid(),
      parent: this.head
    };

    this.commits[commit.sha] = commit;
    this.setRef('master', 'head', commit.sha, true);
    this.setRef('master', 'last', commit.sha, true);
    return commit;
  };

  // Initialization
  // --------

  var defaults = {
    refs: {
      "master" : {"head" : ""}
    },
    commits: {}
  };
  
  // Set public properties
  this.id = doc.id;
  this.meta = doc.meta || {};

  this.refs = doc.refs || {"master" : {"head" : ""}};
  this.commits = doc.commits || {};

  this.schema = schema || SCHEMA;

  // Checkout master branch
  this.checkout('master', 'head');
};

_.extend(Document.prototype, util.Events);

// Export Module
// --------

if (typeof exports === 'undefined') {
  if (!root.Substance) root.Substance = {};
  root.Substance.Document = Document;
} else {
  module.exports = {
    Document: Document
  };
}

}).call(this);