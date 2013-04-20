(function() {

var root = this;
if (typeof exports !== 'undefined') {
  var _    = require('underscore');
  var ot   = require('operational-transformation');
} else {
  var _ = root._;
  var ot = root.ot;
}


// UUID
// -----------------

/*!
Math.uuid.js (v1.4)
http://www.broofa.com
mailto:robert@broofa.com

Copyright (c) 2010 Robert Kieffer
Dual licensed under the MIT and GPL licenses.
*/

Math.uuid = function (prefix, len) {
  var chars = '0123456789abcdefghijklmnopqrstuvwxyz'.split(''),
      uuid = [],
      radix = 16,
      len = len || 32;

  if (len) {
    // Compact form
    for (var i = 0; i < len; i++) uuid[i] = chars[0 | Math.random()*radix];
  } else {
    // rfc4122, version 4 form
    var r;

    // rfc4122 requires these characters
    uuid[8] = uuid[13] = uuid[18] = uuid[23] = '-';
    uuid[14] = '4';

    // Fill in random data.  At i==19 set the high bits of clock sequence as
    // per rfc4122, sec. 4.1.5
    for (var i = 0; i < 36; i++) {
      if (!uuid[i]) {
        r = 0 | Math.random()*16;
        uuid[i] = chars[(i == 19) ? (r & 0x3) | 0x8 : r];
      }
    }
  }
  return (prefix ? prefix : "") + uuid.join('');
};


// _.Events
// -----------------
// TODO: Move to Substance.util

// Regular expression used to split event strings
var eventSplitter = /\s+/;

// A module that can be mixed in to *any object* in order to provide it with
// custom events. You may bind with `on` or remove with `off` callback functions
// to an event; trigger`-ing an event fires all callbacks in succession.
//
//     var object = {};
//     _.extend(object, Backbone.Events);
//     object.on('expand', function(){ alert('expanded'); });
//     object.trigger('expand');
//
_.Events = {

  // Bind one or more space separated events, `events`, to a `callback`
  // function. Passing `"all"` will bind the callback to all events fired.
  on: function(events, callback, context) {

    var calls, event, node, tail, list;
    if (!callback) return this;
    events = events.split(eventSplitter);
    calls = this._callbacks || (this._callbacks = {});

    // Create an immutable callback list, allowing traversal during
    // modification.  The tail is an empty object that will always be used
    // as the next node.
    while (event = events.shift()) {
      list = calls[event];
      node = list ? list.tail : {};
      node.next = tail = {};
      node.context = context;
      node.callback = callback;
      calls[event] = {tail: tail, next: list ? list.next : node};
    }
    
    return this;
  },

  // Remove one or many callbacks. If `context` is null, removes all callbacks
  // with that function. If `callback` is null, removes all callbacks for the
  // event. If `events` is null, removes all bound callbacks for all events.
  off: function(events, callback, context) {
    var event, calls, node, tail, cb, ctx;

    // No events, or removing *all* events.
    if (!(calls = this._callbacks)) return;
    if (!(events || callback || context)) {
      delete this._callbacks;
      return this;
    }

    // Loop through the listed events and contexts, splicing them out of the
    // linked list of callbacks if appropriate.
    events = events ? events.split(eventSplitter) : _.keys(calls);
    while (event = events.shift()) {
      node = calls[event];
      delete calls[event];
      if (!node || !(callback || context)) continue;
      // Create a new list, omitting the indicated callbacks.
      tail = node.tail;
      while ((node = node.next) !== tail) {
        cb = node.callback;
        ctx = node.context;
        if ((callback && cb !== callback) || (context && ctx !== context)) {
          this.on(event, cb, ctx);
        }
      }
    }
    return this;
  },

  // Trigger one or many events, firing all bound callbacks. Callbacks are
  // passed the same arguments as `trigger` is, apart from the event name
  // (unless you're listening on `"all"`, which will cause your callback to
  // receive the true name of the event as the first argument).
  trigger: function(events) {
    var event, node, calls, tail, args, all, rest;
    if (!(calls = this._callbacks)) return this;
    all = calls.all;
    events = events.split(eventSplitter);
    rest = Array.prototype.slice.call(arguments, 1);

    // For each event, walk through the linked list of callbacks twice,
    // first to trigger the event, then to trigger any `"all"` callbacks.
    while (event = events.shift()) {
      if (node = calls[event]) {
        tail = node.tail;
        while ((node = node.next) !== tail) {
          node.callback.apply(node.context || this, rest);
        }
      }
      if (node = all) {
        tail = node.tail;
        args = [event].concat(rest);
        while ((node = node.next) !== tail) {
          node.callback.apply(node.context || this, args);
        }
      }
    }
    return this;
  }
};

// Aliases for backwards compatibility.
_.Events.bind   = _.Events.on;
_.Events.unbind = _.Events.off;


// Default Substance Schema

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
        "content": "string"
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

  // Get type chain
  function getTypes(typeId) {
    var type = self.schema.types[typeId];
    if (type.parent) {
      return [type.parent, typeId];
    } else {
      return [typeId];
    }
  }

  // Methods for document manipulation
  // --------

  var methods = {
    set: function(doc, options) {
      _.each(options, function(val, key) {
        if (_.isArray(val)) {
          doc.properties[key] = ot.TextOperation.fromJSON(val).apply(doc.properties[key] || "");
        } else {
          doc.properties[key] = val;
        }
      });
    },

    insert: function(doc, options) {
      var id = options.id ? options.id : Math.uuid();

      var that = this;
      if (doc.nodes[id]) throw('id ' +options.id+ ' already exists.');

      // Construct a new document node
      var newNode = _.clone(options.data);

      _.extend(newNode, {
        id: id,
        type: options.type
      });

      // Insert element to provided list at given pos
      function insertAt(list, nodeId, pos) {
        var nodes = doc.lists[list];
        nodes.splice(pos, 0, nodeId);
      }

      // TODO: validate against schema
      // validate(newNode);

      // Register new node
      doc.nodes[newNode.id] = newNode;

      this.addToIndex(newNode);

      var types = getTypes(options.type);

      // Only register content nodes
      if (_.include(types, "content")) {
        if (options.target === "front") {
          var pos = 0;
        } else if (!options.target || options.target === "back") {
          var pos = doc.lists["content"].length;
        } else {
          var pos = doc.lists["content"].indexOf(options.target)+1;
        }
        insertAt("content", id, pos);
      }
    },

    update: function(doc, options) {
      var node = doc.nodes[options.id];

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
      this.updateIndex(node, oldNode);
    },

    move: function(doc, options) {
      var nodes = doc.lists["content"];

      // TODO: Rather manipulate array directly?
      nodes = doc.lists["content"] = _.difference(nodes, options.nodes);

      if (options.target === "front") var pos = 0;
      else if (options.target === "back") var pos = nodes.length;
      else var pos = nodes.indexOf(options.target)+1;

      nodes.splice.apply(nodes, [pos, 0].concat(options.nodes));
    },

    delete: function(doc, options) {
      doc.lists["content"] = _.difference(doc.lists["content"], options.nodes);
      _.each(options.nodes, function(nodeId) {
        self.removeFromIndex(doc.nodes[nodeId]);
        delete doc.nodes[nodeId];
      });
    }
  };


  // Public Interface
  // --------

  // TODO: error handling
  // Allow both refs and sha's to be passed
  this.checkout = function(ref) {
    var sha;
    if (this.model.refs[ref]) {
      sha = this.getRef(ref);
    } else {
      if (this.model.commits[ref]) {
        sha = ref;
      } else {
        sha = null;
      }
    }

    this.reset();
    _.each(this.commits(sha), function(op) {
      this.apply(op.op, {silent: true});
    }, this);
    this.head = sha;
  };

  // Serialize as JSON
  this.toJSON = function() {
    return _.extend({
      id: this.id,
      meta: this.meta
    }, this.model);
  };

  // For a given node return the position in the document
  this.position = function(nodeId) {
    var elements = this.content.lists["content"];
    return elements.indexOf(nodeId);
  };

  this.getSuccessor = function(nodeId) {
    var elements = this.content.lists["content"];
    var index = elements.indexOf(nodeId);
    var successor = index >= 0 ? elements[index+1] : null;
    return successor;
  };

  this.getPredecessor = function(nodeId) {
    var elements = this.content.lists["content"];
    var index = elements.indexOf(nodeId);
    var pred = index >= 0 ? elements[index-1] : null;
    return pred;
  };

  // Get property value
  this.get = function(property) {
    return this.content.properties[property];
  };

  this.reset = function() {
    // Reset content
    this.content = {
      properties: {},
      nodes: {},
      // annotations: {},
      // comments: {},
      lists: {
        "content": []
      },
      // Those are build dynamically
      indexes: {
        "comments": {},
        "annotations": {}
      },
    };
  };

  // List commits 
  // --------

  this.commits = function(ref, ref2) {
    // Current commit (=head)
    var commit = this.getRef(ref) || ref;
    var commit2 = this.getRef(ref2) || ref2;
    var skip = false;
    
    if (commit === commit2) return [];
    var op = this.model.commits[commit];

    if (!op) return [];
    op.sha = commit;

    var commits = [op];
    var prev = op;

    while (!skip && (op = this.model.commits[op.parent])) {
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

  // Get sha the given ref points to
  // --------
  
  this.getRef = function(ref) {
    return this.model.refs[ref];
  };

  // Go back in document history
  // --------

  this.undo = function() {
    var ref = this.getRef(this.head) || this.head;
    var commit = this.model.commits[ref];

    if (commit && commit.parent) {
      this.checkout(commit.parent);
      this.setRef('master', commit.parent);
    } else {
      // No more commits available
      this.reset();
      this.head = null;
      this.setRef('master', null);
    }
  };

  // If there are any undone commits
  // --------

  this.redo = function() {
    var commits = this.commits('tail');
    var that = this;
    
    // Find the right commit
    var commit = _.find(commits, function(c){ return c.parent === that.head; });

    if (commit) {
      this.checkout(commit.sha);
      this.setRef('master', commit.sha);
    }
  };

  // List all content elements
  // --------

  this.each = function(fn, ctx) {
    _.each(this.content.lists["content"], function(n, index) {
      var node = self.content.nodes[n];
      fn.call(ctx || this, node, index);
    });
  };

  // Find data nodes based on index
  // --------

  this.find = function(index, scope) {
    var indexes = this.content.indexes;
    var nodes = this.content.nodes;

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

    // console.log('applying op...', operation);
    
    // TODO: this might slow things down, it's for debug purposes
    // var prevState = JSON.parse(JSON.stringify(this.content));

    methods[operation[0]].call(this, this.content, operation[1]);

    // This is a checker for state verification
    // verifyState(this.content, operation, prevState);

    if (!options.silent) {
      var commit = this.commit(operation);
      this.head = commit.sha; // head points to new sha

      // First trigger commit applied, which stores it
      this.trigger('commit:applied', commit);
    }
  };

  // Access registered refs
  // --------

  this.getRef = function(ref) {
    return this.model.refs[ref];
  };

  // Add node to index
  // --------

  this.addToIndex = function(node) {

    function add(index) {
      var indexSpec = self.schema.indexes[index];
      var indexes = self.content.indexes;

      var idx = indexes[index];
      if (!_.include(getTypes(node.type), indexSpec.type)) return;

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
      var indexes = self.content.indexes;

      var scopes = indexes[index];

      if (!_.include(getTypes(node.type), indexSpec.type)) return;

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
      var indexes = self.content.indexes;

      var scopes = indexes[index];

      // Remove when source
      if (scopes[node.id]) {
        delete scopes[node.id];
        // console.log('removed when source', node.id);
      }

      if (!_.include(getTypes(node.type), indexSpec.type)) return;

      // Remove when target
      var prop = indexSpec.properties[0];

      var nodes = scopes[node[prop]];
      if (nodes) {
        scopes[node[prop]] = _.without(nodes, node.id); 
        // console.log('removed '+node.id+' from index');        
      }
    }

    _.each(self.schema.indexes, function(index, key) {
      remove(key);
    });
  };

  // Rebuild all indexes for fast lookup based on schema.indexes spec
  // --------
  
  this.buildIndexes =  function() {
    this.content.indexes = {};
    var that = this;
    _.each(this.content.nodes, function(node) {
      _.each(that.schema.indexes, function(index, key) {
        that.addToIndex(key, node);
      });
    });
  };

  // Set ref to a particular commit
  // --------
  
  this.setRef = function(ref, sha, silent) {
    this.model.refs[ref] = sha;
    if (!silent) this.trigger('ref:updated', ref, sha);
  };
  
  // Create a commit for given operation
  // --------

  this.commit = function(op) {
    var commit = {
      op: op,
      sha: Math.uuid(),
      parent: this.head
    };

    this.model.commits[commit.sha] = commit;
    this.setRef('master', commit.sha, true);
    this.setRef('tail', commit.sha, true);
    return commit;
  };

  // Initialization
  // --------

  var defaults = {
    refs: {},
    commits: {}
  };

  
  // Set public properties
  this.id = doc.id;

  this.meta = doc.meta || {};
  this.model = _.extend(defaults, doc);

  this.schema = schema || SCHEMA;

  // Get type chain
  this.getTypes = getTypes;

  // Checkout master branch
  this.checkout('master');
};

_.extend(Document.prototype, _.Events);

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