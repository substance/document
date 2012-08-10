if (typeof exports !== 'undefined') {
  var _    = require('underscore');
  var ot   = require('operational-transformation');
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

Math.uuid = function (prefix) {
  var chars = '0123456789abcdefghijklmnopqrstuvwxyz'.split(''),
      uuid = [],
      radix = 16,
      len = 32;

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
// 
// Creates a TextOperation based on an array-based serialization

function createTextOperation(ops) {
  var operation = new ot.Operation(0)

  function map(method) {
    if (method === "ret") return "retain";
    if (method === "del") return "delete";
    if (method === "ins") return "insert";
  }

  _.each(ops, function(op) {
    operation[map(op[0])](op[1]);
  });
  return operation;
};


// _.Events
// -----------------

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



// Document
// --------
// 
// A generic model for representing and transforming digital documents

var Document = function(doc, schema) {
  this.model = doc;
  this.schema = schema;
  this.content = {
    properties: {},
    nodes: {},
  };

  this.callbacks = {
    "operation:applied": function() {}
  };

  // Store ops for redo
  this.undoneOperations = [];
};

 _.extend(Document.prototype, _.Events, {

  // TODO: error handling
  checkout: function(ref) {
    var that = this;
    // var commit =  || ref;

    // Current commit (=head)
    var commit = this.getRef(ref);
    if (!commit) return false;
    this.head = ref;

    var op = this.model.operations[commit];
    var operations = [op];

    while (op = this.model.operations[op.parent]) {
      operations.push(op);
    }

    operations.reverse();

    _.each(operations, function(op) {
      that.apply(op, true);
    });
  },

  // Get sha the current head points to
  getRef: function(ref) {
    return this.model.refs[ref];
  },

  // Go back in document history
  // --------

  undo: function() {
    // TODO: implement
  },

  // If there are any undone operations
  // --------

  redo: function() {
    // TODO: implement
  },

  // List all nodes in a document
  // --------

  list: function(fn, ctx) {
    var doc = this.content;
    function node(id) {
      return doc.nodes[id];
    }

    if (!doc.head) return;
    var current = node(doc.head);
    var index = 0;

    fn.call(ctx || doc, current, index);

    while (current = node(current.next)) {
      index += 1;
      fn.call(ctx || doc, current, index);
    }
  },

  toJSON: function() {
    return this.content;
  },

  merge: function(ref) {
    Document.merges["fast-forward"](this, ref);
  },

  // Apply a given operation on the current document state
  apply: function(operation, silent) {
    // var method = operation.op[0].split(':');
    Document.methods[operation.op[0]](this.content, operation.op[1]);
    if (!silent) {
      this.commit(operation);
      this.trigger('operation:applied', operation);
    }
  },
  
  // Create a commit for a certain operation
  commit: function(op) {
    var sha = Math.uuid();
    this.model.operations[sha] = {
      op: op.op,
      user: op.user,
      parent: this.getRef(this.head)
    };
    this.model.refs[this.head] = sha;
  }
});

// Create a new (empty) document
// --------

Document.create = function(schema) {
  var doc = {
    "id": Math.uuid(),
    "created_at": "2012-04-10T15:17:28.946Z",
    "updated_at": "2012-04-10T15:17:28.946Z",
    "nodes": {},
    "properties": {},
    "rev": 0,
  };
  return doc;
};


// Merge Strategies
// --------

Document.merges = {

  // Teh good old fast-forward merge
  "fast-forward": function(doc, ref) {
    // For the merge, operate on a temporary doc
    var mergedDoc = new Document(doc.model);
    var sha = mergedDoc.getRef(ref);
    
    // Checkout master
    mergedDoc.checkout('master');

    function commit(sha) {
      return mergedDoc.model.operations[sha];
    }

    // Find operations between ref and master
    var operations = [];

    while (sha && sha !== mergedDoc.getRef('master')) {
      var c = commit(sha);
      operations.push(c);
      sha = c.parent;
    }

    operations.reverse();

    // Apply those guys
    _.each(operations, function(op) {
      mergedDoc.apply(op);
    });
    
    doc.model = mergedDoc.model;
    doc.checkout('master');
    return true;
  }
};


// Node manipulation interface
// --------

Document.methods = {

  insert: function(doc, options) {
    var id = options.id ? options.id : Math.uuid();

    // Construct a new document node
    var newNode = _.extend(options.properties, {
      id: id,
      type: options.type
    });

    // TODO: validate against schema
    // validate(newNode);

    // Register new node
    doc.nodes[newNode.id] = newNode;

    // Insert position
    if (options.target === "front") {
      // This goes to the front
      var headNode = doc.nodes[doc.head];

      if (headNode) {
        newNode.next = headNode.id;
        headNode.prev = newNode.id;
      }
      newNode.prev = null;
      doc.head = newNode.id;

    } else if (!options.target || options.target === "back") {
      // This goes to the back
      var tailNode = doc.nodes[doc.tail];

      if (tailNode) {
        tailNode.next = newNode.id;  
        newNode.prev = tailNode.id;  
      } else { // Empty doc
        doc.head = newNode.id;
        newNode.prev = null;
      }
      newNode.next = null;
      doc.tail = newNode.id;
    } else {
      // This goes after the target node
      var targetNode = doc.nodes[options.target];
      newNode.prev = targetNode.id;
      newNode.next = targetNode.next;
      targetNode.next = newNode.id;

      // Update tail reference if necessary
      if (targetNode.id === doc.tail) doc.tail = newNode.id;
    }
  },

  update: function(doc, options) {
    var node = doc.nodes[options.id];
    if (node.type === "text") {
      // Use OT delta updates for text nodes
      node.content = createTextOperation(options.delta).apply(node.content);
    } else {
      delete options.id;
      _.extend(node, options);
    }
  },

  move: function(doc, options) {
    var f  = doc.nodes[_.first(options.nodes)], // first node of selection
        l  = doc.nodes[_.last(options.nodes)], // last node of selection
        t  = doc.nodes[options.target], // target node
        fp = doc.nodes[f.prev], // first-previous
        ln = doc.nodes[l.next], // last-next
        tn = doc.nodes[t.next]; // target-next

    t.next = f.id;
    t.prev = t.prev === l.id ? (fp ? fp.id : null)
                             : (t.prev ? t.prev : null)

    if (fp) {
      fp.next = ln ? ln.id : null;
    } else { // dealing with the first node
      doc.head = ln.id; // why we had this before? doc.head = t.id;
    }

    // First node of the selection is now preceded by the target node
    f.prev = t.id;

    // Set some pointers
    if (ln) ln.prev = fp ? pf.id : null;

    // Pointers, everywhere.
    l.next = tn ? tn.id : null;

    if (tn) {
      tn.prev = l.id;
    } else { // Special case: target is tail node  
      doc.tail = l.id;
    }
  },

  delete: function(doc, node) {
    console.log('deleting... NOT YET IMPLEMENTED');
  }
};


// Export Module
// --------

if (typeof exports !== 'undefined') {
  module.exports = Document;
} else {
  sc.models.Document = Document;  
}