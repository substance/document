if (typeof exports !== 'undefined') {
  var Data = require ('./lib/data'),
      _    = require('underscore');
}

// Document
// --------
// 
// A generic model for representing and transforming digital documents

var Document = function(document, schema) {
  var that = this;

  this.id = document.id;

  // Initialize document
  this.nodes = new Data.Graph(schema);
  this.nodes.merge(document.nodes);

  this.head = this.nodes.get(document.head);
  this.tail = this.nodes.get(document.tail);

  this.rev = document.rev;

  this.selections = {};
  this.users = {};

  // Operations History
  this.operations = [];

  function checkRev(rev) {
    return that.rev === rev;
  }

  // Node API
  // --------

  this.node = {

    // Process update command
    update: function(options) {
      that.nodes.get(options.node).set(options.properties);
      that.trigger('node:update', options.node);
    },

    // Update selection
    select: function(options) {
      if (that.users[options.user].selection) {
        _.each(that.users[options.user].selection, function(node) {
          delete that.selections[node];
        });
      }

      that.users[options.user].selection = options.nodes;
      _.each(options.nodes, function(node) {
        that.selections[node] = options.user;
      });

      that.trigger('node:select', that.selections);
    },

    // Insert a new node
    insert: function(options) {
      if (checkRev(options.rev)) {
        
        var node = that.nodes.set(_.extend({
          "type": ["/type/node", "/type/"+options.type],
          _id: ["", options.type, options.rev].join('/'),
          prev: that.tail._id
        }, options.attributes));
        that.tail.set({next: node._id});
        that.tail = node;
        if (node) {
          that.rev += 1;
          that.trigger('node:insert', node);
          return node;
        }
      }
      return null;
    },

    // Move selected nodes
    move: function(options) {
      if (checkRev(options.rev)) {
        var f = that.get(_.first(options.nodes)), // first node of selection
            l = that.get(_.last(options.nodes)), // last node of selection
            t = that.get(options.target), // target node
            fp = f.get('prev'), // first-previous
            ln = l.get('next'), // last-next
            tn = t.get('next'); // target-next

        t.set({
          next: f._id,
          prev: t.get('prev') === l ? (fp ? fp._id : null)
                                    : (t.get('prev') ? t.get('prev')._id : null)
        });

        if (fp) {
          fp.set({next: ln ? ln._id : null});
        } else {
          // dealing with the first node
          that.head = t;
          console.log('dealing with the first elem');
        }
        
        // First node of the selection is now preceded by the target node
        f.set({prev: t._id});

        if (ln) ln.set({prev: fp ? fp._id : null});

        l.set({next: tn ? tn._id : null});

        if (tn) {
          tn.set({prev: l._id});
        } else {
          // Special case: target is tail node  
          that.tail = l;
        }
          
        that.trigger('node:move', options);
        that.rev += 1;
      }
    },

    // Delete node by id
    delete: function(node) {

    }
  };


  // Patch API
  // --------

  this.patch = {

  };

  // Comment API
  // --------

  this.comment = {

  };

  // User API
  // --------

  this.user = {
    enter: function(user) {
      this.users[user.id] = { id: user.id, username: user.username, color: user.color || "red"};
    },

    leave: function(id) {
      delete this.users[id];
    }
  };


  // Document API
  // --------

  // Iterate over all nodes
  this.each = function(fn, ctx) {
    var current = this.head;
    var index = 0;

    fn.call(ctx || this, current, current._id, index);
    while (current = current.get('next')) {
      index += 1;
      fn.call(ctx || this, current, current._id, index);
    }
  };

  this.logOperation = function(op) {
    this.operations.push(op);
  };

  this.execute = function(op, silent) {
    var command = op.command.split(':');
    this[command[0]][command[1]](op.params);
    if (!silent) this.trigger('operation:executed');
    this.logOperation(op);
  };

  // Get a specific node
  this.get = function(id) {
    return this.nodes.get(id);
  };

  // Serialize document state to JSON
  this.toJSON = function() {
    return {
      id: this.id,
      operations: this.operations,
      nodes: this.nodes.toJSON(),
      head: this.head._id,
      tail: this.tail._id
    }
  };
};


// Create a new (empty) document
// --------

Document.create = function(schema) {
  var doc = {
    "id": Data.uuid(),
    "created_at": "2012-04-10T15:17:28.946Z",
    "updated_at": "2012-04-10T15:17:28.946Z",
    "head": "/cover/1",
    "tail": "/text/3",
    "rev": 3,
    "nodes": {
      "/cover/1": {
        "type": ["/type/node", "/type/cover"],
        "title": "A new document",
        "abstract": "The Substance Composer is flexible editing component to be used by applications such as Substance.io for collaborative content composition.",
        "next": "/section/2",
        "prev": null
      },
      "/section/2": {
        "type": ["/type/node", "/type/section"],
        "name": "Plugins",
        "prev": "/cover/1",
        "next": "/text/3"
      },
      "/text/3": {
        "type": ["/type/node", "/type/text"],
        "content": "Enter some text.",
        "prev": "/section/2",
        "next": null
      }
    }
  };
  return new Document(doc, schema);
};

_.extend(Document.prototype, _.Events);

// Export for browser
if (typeof exports !== 'undefined') {
  module.exports = Document;
} else {
  sc.models.Document = Document;  
}
