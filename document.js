if (typeof exports !== 'undefined') {
  _    = require('underscore');
}

// Util
// --------

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


// Session
// --------
// 
// Representing a document editing session

var Session = function(doc, options) {
  var that = this;
  that.users = options.users || {};
  that.doc = doc;

  // this.enter = function(user) {
  //   that.users[user.id] = { id: user.id, username: user.username, color: user.color || "red"};
  // };

  // this.leave = function(id) {
  //   delete that.users[id];
  // };

  // Update selection
  // this.select = function(options) {
  //   if (that.users[options.user].selection) {
  //     that.users[options.user].selection.forEach(function(node) {
  //       delete that.selections[node];
  //     });
  //   }

  //   that.users[options.user].selection = options.nodes;
  //   options.nodes.forEach(function(node) {
  //     that.selections[node] = options.user;
  //   });
  // };
};



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

    var op = this.model.commits[commit];
    var operations = [op];

    while (op = this.model.commits[op.parent]) {
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
    var method = operation.op[0].split(':');
    Document.methods[method[0]][method[1]](this.content, operation.op[1]);
    if (!silent) this.commit(operation);
  },
  
  // Create a commit for a certain operation
  commit: function(op) {
    var sha = Math.uuid();
    // console.log('committing... parent=', this.head, this.getRef(this.head));
    this.model.commits[sha] = {
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
      return mergedDoc.model.commits[sha];
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


// Build (rebuild) a document, based on a stream of operations
// --------

Document.methods = { node: {}, document: {}};


// Node manipulation interface
// --------

Document.methods.node = {

  insert: function(doc, options) {
    var id = options.id ? options.id : Math.uuid();

    // Construct a new document node
    var newNode = {
      id: id,
      properties: _.clone(options.properties),
      type: options.type
    };

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
    // that.nodes.get(options.node).set(options.properties);
    // that.trigger('node:update', options.node);
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

    // doc.trigger('node:move', options);
  },

  delete: function(doc, node) {
    console.log('deleting... NOT YET IMPLEMENTED');
  }
};

// Export Module
// --------

Document.Session = Session;

if (typeof exports !== 'undefined') {
  module.exports = Document;
} else {
  sc.models.Document = Document;  
}