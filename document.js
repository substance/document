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
// Not yet functional

var Session = function(document, options) {
  var that = this;
  that.users = options.users || {};

  this.enter = function(user) {
    that.users[user.id] = { id: user.id, username: user.username, color: user.color || "red"};
  };

  this.leave = function(id) {
    delete that.users[id];
  };

  // Update selection
  this.select = function(options) {
    if (that.users[options.user].selection) {
      that.users[options.user].selection.forEach(function(node) {
        delete that.selections[node];
      });
    }

    that.users[options.user].selection = options.nodes;
    options.nodes.forEach(function(node) {
      that.selections[node] = options.user;
    });
  };
};


// Patch
// --------
// 
// A patch contains an operation that can be applied on a particular document

var Patch = function(document) {
  // TODO: implement
};


// Operation
// --------
// 
// An Operation that can be applied on a document

var Operation = function(operation) {
  this.operation = operation;

  // Apply operation on a given document
  this.apply = function(document) {
    console.log('applying', operation);
    _.each(this.operation.methods, function(cmd) {
      Document.apply(document, cmd[0], cmd[1]);
    });
  };
};


// Document
// --------
// 
// A generic model for representing and transforming digital documents

var Document = {};

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


// Build (rebuild) a document, based on a stream of operations
// --------

Document.build = function(document, operations) {
  _.each(operations, function(op) {
    var operation = new Operation(op);
    operation.apply(that);
  });
};


// Build (rebuild) a document, based on a stream of operations
// --------


Document.methods = { node: {}, document: {}};


// Node interface

Document.methods.node = {
  insert: function(doc, options) {
    var id = options.id ? options.id : Math.uuid();

    // Construct a new document node
    doc.nodes[id] = _.extend(_.clone(options), {
      id: id,
      prev: doc.tail ? doc.tail : null,
      next: null,
    });

    // Update document pointers
    if (!doc.head) {
      doc.head = id;
    } else {
      doc.head.next = id;
    }
    doc.tail = id;
    // TODO: validate against schema
  },

  update: function(doc, options) {
    // that.nodes.get(options.node).set(options.properties);
    // that.trigger('node:update', options.node);
  },


  move: function(doc, options) {
    // TODO: make it work on new datastructue

    // if (checkRev(options.rev)) {
    //   var f = that.get(_.first(options.nodes)), // first node of selection
    //       l = that.get(_.last(options.nodes)), // last node of selection
    //       t = that.get(options.target), // target node
    //       fp = f.get('prev'), // first-previous
    //       ln = l.get('next'), // last-next
    //       tn = t.get('next'); // target-next

    //   t.set({
    //     next: f._id,
    //     prev: t.get('prev') === l ? (fp ? fp._id : null)
    //                               : (t.get('prev') ? t.get('prev')._id : null)
    //   });

    //   if (fp) {
    //     fp.set({next: ln ? ln._id : null});
    //   } else {
    //     // dealing with the first node
    //     that.head = t;
    //     console.log('dealing with the first elem');
    //   }
      
    //   // First node of the selection is now preceded by the target node
    //   f.set({prev: t._id});

    //   if (ln) ln.set({prev: fp ? fp._id : null});
    //   l.set({next: tn ? tn._id : null});

    //   if (tn) {
    //     tn.set({prev: l._id});
    //   } else {
    //     // Special case: target is tail node  
    //     that.tail = l;
    //   }

    //   that.trigger('node:move', options);
    //   that.rev += 1;
    // }
  },

  delete: function(doc, node) {

  }
};


// Transform document, given an operation or operation sequence
// --------

Document.update = function(document, operation) {
  // console.log('updating teh doc');
  var op = new Operation(operation);
  op.apply(document);
};


// Apply a method on a given document
// --------
// 
// Document.apply(doc, 'node:insert', { type: "section", name: "Hello World"});

Document.apply = function(doc, method, params) {
  var method = method.split(':');
  Document.methods[method[0]][method[1]](doc, params);
  doc.rev += 1;
  return doc.rev;
};


// List all nodes in a document
// --------

Document.list = function(doc, fn, ctx) {
  function node(id) {
    return doc.nodes[id];
  }

  var current = node(doc.head);
  var index = 0;

  fn.call(ctx || doc, current, index);

  while (current = node(current.next)) {
    index += 1;
    fn.call(ctx || doc, current, index);
  }
};

_.extend(Document.prototype, _.Events);


// Export Module
// --------

Document.Patch = Patch;
Document.Operation = Operation;
Document.Session = Session;

if (typeof exports !== 'undefined') {
  module.exports = Document;
} else {
  sc.models.Document = Document;  
}
