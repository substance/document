(function(root) {

var Substance = root.Substance;
var util = Substance.util;
var _ = root._;
var Data = root.Substance.Data;
var Library = root.Substance.Library;
var Document = Substance.Document;


// Substance.DocumentController
// -----------------
//
// A facette that aggregates functionality from a document, the library, and from client.
//
// Note: it is quite intentional not to expose the full Substance.Document interface
//       to force us to explicitely take care of model adaptations.

var DocumentController = function(document, library, client) {
  var self = this;

  this.__document = document;
  this.__client = client;
  this.__library = library;
};

DocumentController.Prototype = function() {


  // Document Facette
  // --------

  this.getNodes = function(idsOnly) {
    if (idsOnly) return this.__document.get(["content", "nodes"]);
    else return this.__document.query(["content", "nodes"]);
  };

  this.getPosition = function(id) {
    return this.__document.getPosition('content', id);
  };


  // Get node from position in contnet view
  // --------
  //

  this.getNodeFromPosition = function(pos) {
    var doc = this.__document;
    var view = doc.get('content').nodes;
    return doc.get(view[pos]);
  };

  this.select = function() {
    this.__document.select.apply(this.__document, arguments);
  };

  this.delete = function() {
    this.__document.delete();
  };

  this.write = function(str) {
    this.__document.write(str);
  };

  this.insertNode = function(type) {
    this.__document.insertNode(type);
  };


  // Move cursor to next pos(character)
  // --------
  // 
  // 1) Collapsed selection (single cursor)
  //    a) When cursor is at end position
  //       -> move to first pos of next paragraph (if there is any)
  //    b) Increment char offset by one
  //    
  // 2) Multi-chars selected
  //    -> Collapse selection at last pos of selection

  this.next = function() {
    var doc = this.__document;
    var sel = this.__document.selection;
    if (sel.isNull()) return; // skip if there's no active selection

    // Move single cursor to next position
    if (sel.isCollapsed()) {
      var node = sel.getNodes()[0];
      if (sel.start[1]>=node.content.length) {
        // Case: 1a
        var view = this.__document.get('content').nodes;
        var nodeOffset = sel.start[0];
        if (nodeOffset < view.length -1) {
          // Jump first char of next paragraph
          doc.select({
            start: [nodeOffset+1, 0],
            end: [nodeOffset+1, 0]
          });
        } else {
          // do nothing, since we are at the end of the doc
        }
      } else {
        // Case 1b:
        doc.select({
          start: [sel.start[0], sel.start[1]+1],
          end: [sel.start[0], sel.start[1]+1]
        });
      }
    } else {
      // Case 2: When multiple chars are selected, move to last pos
      doc.select({
        start: [sel.end[0], sel.end[1]],
        end: [sel.end[0], sel.end[1]]
      });
    }
  };

  // Move cursor to previous position(character)
  // --------
  // 
  // 1) Collapsed selection (single cursor)
  //    a) When cursor is at start position
  //       -> move after last char of prev paragraph (if there is any)
  //    b) Decrement char offset by one
  //    
  // 2) Multi-chars selected
  //    -> Collapse selection at first pos of selection

  this.previous = function() {
    var doc = this.__document;
    var sel = this.__document.selection;

    if (sel.isNull()) return; // skip if there's no active selection
    // Move single cursor to next position
    if (sel.isCollapsed()) {
      if (sel.start[1]<=0) {
        var view = this.__document.get('content').nodes;
        var nodeOffset = sel.start[0];
        if (nodeOffset > 0) {
          var prevNode = this.getNodeFromPosition(nodeOffset-1);
          var lastPos = prevNode.content.length;
          // Jump to last char of prev paragraph
          doc.select({
            start: [nodeOffset-1, lastPos],
            end: [nodeOffset-1, lastPos]
          });
        } else {
          // do nothing, since we are at the end of the doc
        }
      } else {
        doc.select({
          start: [sel.start[0], sel.start[1]-1],
          end: [sel.start[0], sel.start[1]-1]
        });
      }
    } else {
      // When multiple chars are selected, move to last pos
      doc.select({
        start: [sel.start[0], sel.start[1]],
        end: [sel.start[0], sel.start[1]]
      });
    }
  };


  // Note: as there are events of different types it is quite messy currently.
  // We should consider defining controller specific events here
  // and do event mapping properly

  // for Substance.Events on document
  this.on = function() {
    this.__document.on.apply(this.__document, arguments);
  };

  // Delegate getter
  this.get = function() {
    return this.__document.get.apply(this.__document, arguments);
  };

  // for property change events on document.nodes.content.nodes
  this.onViewChange = function(arrayAdapter) {
    this.__document.propertyChanges().bind(arrayAdapter, {path: ["content", "nodes"]});
  };

  // for property change events on document.nodes.*.content (string properties)
  // TODO: we probably need to be more specific here later
  // for now the Surface is only interested in changes on content of text-nodes.
  this.onTextNodeChange = function(handler) {
    this.__document.propertyChanges().bind(handler, {path: ["*", "content"]});
  };

  // a generic unbinder
  this.unbind = function(name, handler) {
    if (arguments.length === 1) {
      handler = name;
      this.__document.propertyChanges().unbind(handler);
    } else {
      this.__document.unbind(name, handler);
    }
  };


  // Publication Facette
  // --------

  this.createPublication = function(network, cb) {
    throw new Error('Not implemented');
    this.__client.createPublication(this.id, network, function(err) {
      throw new Error('Not implemented');
    });
  };

  this.deletePublication = function(pubId, cb) {
    var that = this;
    this.__client.deletePublication(pubId, function(err) {
      if (err) return cb(err);
      that.__library.delete([that.id, "publications"], pubId);
      cb(null);
    });
  };

  this.createVersion = function(cb) {
    // Now create version on the server
    this.__client.createVersion(doc.id, data, function(err) {
      // TODO: update version information in library
      throw new Error('Not implemented');
      return cb(err);
    });
  };

  // Unpublish document
  this.unpublish = function(cb) {
    var doc = this.__document;
    this.__client.unpublish(doc.id, function(err) {
      // TODO: update version information in library
      return cb(err);
    });
  };

  // Collaboration Facette
  // --------

  // Create new collaborator on the server
  // --------
  //
  // Collaborator also gets registered in the library (document entry)

  this.createCollaborator = function(collaborator, cb) {
    var that = this;

    this.__client.createCollaborator(this.id, collaborator, function(err) {
      if (err) return cb(err);
      // Update document entry in library
      that.__library.exec(["push", that.id, "collaborators", collaborator]);
      cb(null);
    });
  };

  // Delete collaborator on the server
  // --------
  //
  // Collaborator also gets removed from the document entry in the library

  this.deleteCollaborator = function(collaborator, cb) {
    var that = this;
    this.__client.deleteCollaborator(collaborator, function(err) {
      if (err) return cb(err);
      that.__library.delete([that.id, "collaborators"], collaborator);
      cb(null);
    });
  };
};

// Inherit the prototype of Substance.Document which extends util.Events
DocumentController.prototype = new DocumentController.Prototype();

// Property accessors for convenient access of primary properties
Object.defineProperties(DocumentController.prototype, {
  id: {
    get: function() {
      return this.__document.id;
    },
    set: function() { throw "immutable property"}
  },
  title: {
    get: function() {
      return this.__document.title;
    },
    set: function() { throw "immutable property"}
  },
  updated_at: {
    get: function() {
      return this.__document.updated_at;
    },
    set: function() { throw "immutable property"}
  },
  creator: {
    get: function() {
      return this.__library.query([this.__document.id, "creator"]);
    },
    set: function() { throw "immutable property"}
  },
  selection: {
    get: function() {
      return this.__document.selection;
    },
    set: function() { throw "immutable property"}
  }
});

Substance.DocumentController = DocumentController;

})(this);
