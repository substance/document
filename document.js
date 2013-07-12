// Substance.Document 0.4.0
// (c) 2010-2013 Michael Aufreiter
// Substance.Document may be freely distributed under the MIT license.
// For all details and documentation:
// http://interior.substance.io/modules/document.html

(function(root) {

// Import
// ========

var _,
    util,
    errors,
    Chronicle,
    Operator,
    Data;

if (typeof exports !== 'undefined') {
  _    = require('underscore');
  util   = require('substance-util');
  errors   = require('substance-util/errors');
  Chronicle = require('substance-chronicle');
  Operator = require('substance-operator');
  Data = require('substance-data');
} else {
  _ = root._;
  util = root.Substance.util;
  errors   = root.Substance.errors;
  Chronicle = root.Substance.Chronicle;
  Operator = root.Substance.Operator;
  Data = root.Substance.Data;
}

// Default Document Schema
// --------

var SCHEMA = {
  // Static indexes
  "indexes": {
    // all comments are now indexed by node association
    "comments": {
      "type": "comment",
      "properties": ["node"]
    },
    // All annotations are now indexed by node
    "annotations": {
      "type": "annotation",
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
        "views": ["array", "view"],
        "guid": "string",
        "creator": "string",
        "title": "string",
        "abstract": "string",
        "keywords": ["array", "string"]
      }
    },

    "view": {
      "properties": {
        "nodes": ["array", "content"]
      }
    },

    "codeblock": {
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
      "parent": "content",
      "properties": {
        "content": "string",
        "level": "number"
      }
    },

    // Annotations
    "annotation": {
      "properties": {
        "node": "content",
        "property": "string",
        "range": "object"
      }
    },

    "strong": {
      "parent": "annotation",
      "properties": {
      }
    },

    "emphasis": {
      "properties": {
      },
      "parent": "annotation"
    },

    "code": {
      "parent": "annotation",
      "properties": {
      }
    },

    "link": {
      "parent": "annotation",
      "properties": {
        "url": "string"
      }
    },

    "idea": {
      "parent": "annotation",
      "properties": {
      }
    },

    "error": {
      "parent": "annotation",
      "properties": {
      }
    },

    "question": {
      "parent": "annotation",
      "properties": {
      }
    },

    // Comments
    "comment": {
      "properties": {
        "content": "string",
        "created_at": "string", // should be date
        "creator": "string", // should be date
        "node": "node" // references either a content node or annotation
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

// Provides an initial state by a set of nodes.
// --------
// These commands change will not be versioned.
// Every document's history must be applicable on this.
var SEED = function(options) {
  return [
    Data.Graph.Create({
      id: "document",
      type: "document",
      guid: options.id, // external global document id
      creator: options.creator,
      created_at: options.created_at,
      views: ["content", "figures", "publications"],
      title: "",
      abstract: ""
    }),
    Data.Graph.Create({
      id: "content",
      type: "view",
      nodes: [],
    }),
    Data.Graph.Create({
      id: "figures",
      type: "view",
      nodes: [],
    }),
    Data.Graph.Create({
      id: "publications",
      type: "view",
      nodes: [],
    })
  ];
};

// forward declaration
var Converter;

// Document
// --------
//
// A generic model for representing and transforming digital documents

var Document = function(options) {
  options.seed = options.seed || SEED(options);
  Data.Graph.call(this, options.schema || SCHEMA, options);
  this.selection = new Document.Range(this, null);
};

Document.__prototype__ = function() {
  var __super__ = util.prototype(this);
  var converter = new Converter();

  var updateAnnotations = function(node, property, change) {
    // We need to update the range of affected annotations.

    var annotations = this.find("annotations", node.id);
    annotations = _.filter(annotations, function(a) {
      return a.property === property;
    });
    for (var idx = 0; idx < annotations.length; idx++) {
      Operator.TextOperation.Range.transform(annotations[idx].range, change);
    }
  };


  // Get node position for a given view and node id
  // --------
  //

  this.getPosition = function(view, id) {
    return this.get(view).nodes.indexOf(id);
  };

  // Make a new selection on the document
  // --------
  //

  this.select = function(range) {
    this.selection = new Document.Range(this, range);
    this.trigger('selection:changed', this.selection);
    return this.selection;
  };

  // Cut current selection from document
  // --------
  //
  // Returns cutted content as a new Substance.Document

  this.cut = function() {
    var content = this.copy();
    this.delete();
    return content;
  };

  // Based on current selection, insert new node
  // --------
  //

  this.insertNode = function(type) {

    if (!this.selection.isCollapsed()) {
      throw new Error('Not yet implemented for actual ranges');
    }

    var nodes = this.selection.getNodes();
    var node = nodes[0];

    var ops = [];

    // Remove the selection
    // TODO: implement

    // Remove trailing stuff
    var nodePos = this.selection.start[0];
    var cursorPos = this.selection.start[1];
    var trailingText = node.content.slice(cursorPos);

    if (trailingText.length > 0) {
      var r = [cursorPos, -trailingText.length];
      ops.push(Data.Graph.Update([node.id, "content"], Operator.TextOperation.fromOT(node.content, r)));
    }

    var id1 = type+"_"+util.uuid();
    var id2 = "text_"+util.uuid();

    // Insert new node for trailingText
    if (trailingText.length > 0) {
      ops.push(Data.Graph.Create({
        id: id2,
        type: "text",
        content: trailingText
      }));
      ops.push(Data.Graph.Update(["content", "nodes"], Operator.ArrayOperation.Insert(nodePos+1, id2)));
    }

    // Insert new empty node
    ops.push(Data.Graph.Create({
      id: id1,
      type: type
    }));
    ops.push(Data.Graph.Update(["content", "nodes"], Operator.ArrayOperation.Insert(nodePos+1, id1)));

    // Execute all steps at once
    this.apply(Data.Graph.Compound(this, ops));

    return this;
  };


  // Delete current selection
  // --------
  //

  this.delete = function() {
    // Convenience vars
    var startNode = this.selection.start[0];
    var startOffset = this.selection.start[1];
    var endNode = this.selection.end[0];
    var endOffset = this.selection.end[1];
    var nodes = this.selection.getNodes();

    var ops = []; // operations transforming the original doc

    if (nodes.length > 1) {
      // Remove trailing stuff
      _.each(nodes, function(node, index) {
        // only consider textish nodes for now
        if (node.content) {
          if (index === 0) {
            var trailingText = node.content.slice(startOffset);
            var r = [startOffset, -trailingText.length];
            // remove trailing text from first node at the beginning of the selection
            ops.push(Data.Graph.Update([node.id, "content"], Operator.TextOperation.fromOT(node.content, r)));
          } else if (index === nodes.length-1) {
            // Last node of selection
            var text = node.content.slice(0, endOffset);
            var r = [-text.length];

            // remove preceding text from last node until the end of the selection
            ops.push(Data.Graph.Update([node.id, "content"], Operator.TextOperation.fromOT(node.content, r)));
          } else {
            // Delete node from document
            ops.push(Data.Graph.Delete(_.clone(node)));
            var pos = this.get('content').nodes.indexOf(node.id);
            // ... and from view
            ops.push(Data.Graph.Update(["content", "nodes"], Operator.ArrayOperation.Delete(pos, node.id)));
          }
        }
      }, this);
    } else {
      var node = nodes[0];
      var text = node.content.slice(startOffset, endOffset);
      var r = [startOffset, -text.length];
      // remove trailing text from first node at the beginning of the selection
      ops.push(Data.Graph.Update([node.id, "content"], Operator.TextOperation.fromOT(node.content, r)));
    }

    this.apply(Data.Graph.Compound(this, ops));

    this.select({
      start: [startNode, startOffset],
      end: [startNode, startOffset]
    });
  };

  this.copy = function() {
    // Convenience vars
    var startNode = this.selection.start[0];
    var startOffset = this.selection.start[1];
    var endNode = this.selection.end[0];
    var endOffset = this.selection.end[1];
    var nodes = this.selection.getNodes();

    var clipboard = new Document({id: "clipboard"});

    if (nodes.length > 1) {
      // Remove trailing stuff
      _.each(nodes, function(node, index) {
        // only consider textish nodes for now
        if (node.content) {
          if (index === 0) {
            var trailingText = node.content.slice(startOffset);
            var r = [startOffset, -trailingText.length];

            // Add trailing text to clipboard
            var nodeId = util.uuid();
            clipboard.apply(Data.Graph.Create({
              id: nodeId,
              type: "text",
              content: trailingText
            }));
            // and the clipboards content view
            clipboard.apply(Data.Graph.Update(["content", "nodes"], Operator.ArrayOperation.Insert(index, nodeId)));
          } else if (index === nodes.length-1) {
            // Last node of selection
            var text = node.content.slice(0, endOffset);
            var r = [-text.length];

            // Add selected text from last node to clipboard
            var nodeId = util.uuid();
            clipboard.apply(Data.Graph.Create({
              id: nodeId,
              type: "text",
              content: text
            }));
            clipboard.apply(Data.Graph.Update(["content", "nodes"], Operator.ArrayOperation.Insert(index, nodeId)));
          } else {
            var nodeId = util.uuid();
            // Insert node in clipboard document
            clipboard.apply(Data.Graph.Create(_.extend(_.clone(node), {id: nodeId})));
            // ... and view
            clipboard.apply(Data.Graph.Update(["content", "nodes"], Operator.ArrayOperation.Insert(index, nodeId)));
          }
        }
      }, this);
    } else {
      var node = nodes[0];
      var text = node.content.slice(startOffset, endOffset);

      var nodeId = util.uuid();
      clipboard.apply(Data.Graph.Create({
        id: nodeId,
        type: "text",
        content: text
      }));
      clipboard.apply(Data.Graph.Update(["content", "nodes"], Operator.ArrayOperation.Insert(0, nodeId)));
    }

    return clipboard;
  };

  // Paste content from clipboard at current position
  this.paste = function(content) {

    // First off, delete the selection
    this.delete();

    if (!content) return;

    // After delete selection we can be sure
    // that the collection is collapsed
    var startNode = this.selection.start[0];
    var startOffset = this.selection.start[1];

    // This is where the pasting stuff starts
    var referenceNode = this.selection.getNodes()[0];

    // Nodes from the clipboard to insert
    var nodes = content.query(["content", "nodes"]);
    var ops = []; // operations transforming the original doc

    if (nodes.length > 0) {
      // Remove trailing stuff
      _.each(nodes, function(node, index) {
        // only consider textish nodes for now
        if (node.content) {
          if (index === 0) {
            var trailingText = referenceNode.content.slice(startOffset);
            var r = [startOffset, -trailingText.length, node.content];

            // remove trailing text from first node at the beginning of the selection
            ops.push(Data.Graph.Update([referenceNode.id, "content"], Operator.TextOperation.fromOT(referenceNode.content, r)));

            // Move the trailing text into a new node
            var nodeId = util.uuid();
            ops.push(Data.Graph.Create({
              id: nodeId,
              type: "text",
              content: _.last(nodes).content + trailingText
            }));

            // and the clipboards content view
            ops.push(Data.Graph.Update(["content", "nodes"], Operator.ArrayOperation.Insert(startNode+index+1, nodeId)));
          } else if (index === nodes.length-1) {
            // Skip
          } else {
            ops.push(Data.Graph.Create(node));
            ops.push(Data.Graph.Update(["content", "nodes"], Operator.ArrayOperation.Insert(startNode+index, node.id)));
          }
        }
      }, this);
    } else {
      ops.push(Data.Graph.Update([referenceNode.id, "content"], Operator.TextOperation.Insert(startOffset, node.content)));
    }

    this.apply(Data.Graph.Compound(this, ops));
  };

  // Executes a document manipulation command.
  // --------
  // The command is converted into a sequence of graph commands

  this.apply = function(command) {

    var graphCommand = command;

    // normalize commands given in array notation
    if(_.isArray(command)) {
      command = new Data.Command(command, Document.COMMANDS);
    }

    if (converter[command.type]) {
      graphCommand = converter[command.type](this, command);
      if (_.isArray(graphCommand)) {
        graphCommand = Data.Graph.Compound(this, graphCommand);
      }
    }

    // Note: Data.Graph converts everything into ObjectOperations
    // We will pass this also back to the caller.
    var op = __super__.apply.call(this, graphCommand);

    var cmds = (graphCommand.type === Data.Graph.COMPOUND) ? graphCommand.ops : [graphCommand];
    _.each(cmds, function(c) {
      if (c.type === "update") {
        var node = this.get(c.path[0]);
        var property = c.path[1];
        var change = c.args;
        updateAnnotations.call(this, node, property, change);
      }
    }, this);

    // console.log('execing command', command);
    // TODO: maybe we could add events to Data.Graph?
    this.trigger('command:executed', command);

    return op;
  };

  // inserts text at the current position
  this.write = function(text) {
    if (this.selection.isNull()) {
      console.log("Can not write, as no position has been selected.")
      return;
    }

    if (!this.selection.isCollapsed()) {
      this.delete();
    }

    var node = this.selection.getNodes()[0];
    var nodeIdx = this.selection.start[0];
    var pos = this.selection.start[1];

    // TODO: future. This only works for text nodes....
    var cmd = Data.Graph.Update([node.id, "content"], [pos+1, text]);
    this.apply(cmd);
    this.select({
      start: [nodeIdx, pos+text.length],
      end: [nodeIdx, pos+text.length]
    });
  };

  this.toJSON = function() {
    var res = __super__.toJSON.call(this);
    res.id = this.id;
    return res;
  }
};

// Command Converter
// ========
//
// Turns document commands into Data.Graph commands

Converter = function() {

  // Delete nodes from document
  // --------
  //
  // ["delete", {nodes: ["h1", "t1"]}]

  this.delete = function(graph, command) {
    var nodes = command.args.nodes;

    var commands = [];
    _.each(nodes, function(n) {
      commands.push(Data.Graph.Delete({id: n}));
    }, this);

    _.each(graph.get('document').views, function(view) {
      var match = _.intersection(graph.get(view).nodes, nodes);
      commands.push(this.hide(graph, {
        "path": [view],
        args: {nodes: match}
      }));
    }, this);
    return commands;
  };

  // Hide elements from provided view
  // --------
  //
  // ["hide", {"nodes": ["t1", "t2"]}]
  //

  this.hide = function(graph, command) {
    var path = command.path.concat(["nodes"]);
    var view = graph.resolve(path).get();
    var nodes = command.args.nodes;

    var indices = [];
    _.each(nodes, function(n) {
      var i = view.indexOf(n);
      if (i>=0) indices.push(i);
    }, this);

    indices = indices.sort().reverse();

    var ops = _.map(indices, function(index) {
      return Operator.ArrayOperation.Delete(index, view[index]);
    });

    return Data.Graph.Update(path, Operator.ArrayOperation.Compound(ops));
  };

  // Position nodes in document
  // --------
  //
  // ["position", "content", {"nodes": ["t1", "t2"], "target": -1}]
  //

  // TODO: we could use Graph.set which computes a rather minimal set of ArrayOps
  //       to get rid of the ArrayOperation dependency here
  this.position = function(graph, command) {
    var path = command.path.concat(["nodes"]);
    var view = graph.resolve(path).get();
    var nodes = command.args.nodes;
    var ops = [];
    var idx;

    // Create a sequence of atomic array operations that
    // are bundled into a Compound operation
    // 1. Remove elements (from right to left)
    // 2. Insert at the very position

    // the sequence contains selected nodes in the order they
    // occurr in the view
    var seq = _.intersection(view, nodes);
    var l = view.length;

    while(seq.length > 0) {
      var id = seq.pop();
      idx = view.indexOf(id);
      if (idx >= 0) {
        ops.push(Operator.ArrayOperation.Delete(idx, id));
        l--;
      }
    }

    // target index can be given as negative number (as known from python/ruby)
    var target = Math.min(command.args.target, l);
    if (target<0) target = Math.max(0, l+target+1);

    for (idx = 0; idx < nodes.length; idx++) {
      ops.push(Operator.ArrayOperation.Insert(target + idx, nodes[idx]));
    }

    var compound = Operator.ArrayOperation.Compound(ops);

    // TODO: We pack multiple array commands into a compound

    return Data.Graph.Update(path, compound);
  };


  // Update incrementally
  // --------
  //

  // TODO: if we would integrate the convenience mechanisms for update and set into
  // Data.Graph, we could get rid of the OT dependencies here.

  this.update = function(graph, command) {
    var property = graph.resolve(command.path);
    var val = property.get();
    var valueType = property.baseType;

    var update;

    if (valueType === 'string') {
      update = Operator.TextOperation.fromOT(val, command.args);
    }
    else if (valueType === 'array') {
      update = command.args;
    }
    else if (valueType === 'object') {
      update = Operator.ObjectOperation.Extend(val, command.args);
    }
    else {
      throw new Error("Unsupported type for update: " + valueType);
    }
    return Data.Graph.Update(command.path, update);
  };


  // Annotate document
  // --------
  //
  // `command.path` defines the referenced content node and property
  // ["annotate", "t1", "content", {"id": "a1",  type": "idea"}]

  this.annotate = function(graph, command) {
    // TODO: check if source exists, otherwise reject annotation
    if (command.path.length !== 2) throw new Error("Invalid target: " + command.path);

    var annotation = _.extend({}, command.args, {
      node: command.path[0],
      property: command.path[1]
    });

    return Data.Graph.Create(annotation);
  };


  // Comment
  // --------
  //
  // `command.path` holds the node id, where the comment should stick on

  this.comment = function(graph, command) {
    // Delegates to graph.create method
    // TODO: check if source exists, otherwise reject annotation

    // keep track of annotation
    if (command.path.length !== 1) throw new Error("Invalid target: " + command.path);

    var comment = _.extend({}, command.args);
    comment.node = command.path[0];
    comment.type = comment.type || 'comment';

    return Data.Graph.Create(comment);
  };
};
Document.__prototype__.prototype = Data.Graph.prototype;
Document.prototype = new Document.__prototype__();

// Add convenience accessors for builtin document attributes
Object.defineProperties(Document.prototype, {
  id: {
    get: function () {
      return this.get("document").guid;
    },
    set: function() {
      throw "doc.id is immutable";
    }
  },
  creator: {
    get: function () {
      return this.get("document").creator;
    }
  },
  created_at: {
    get: function () {
      return this.get("document").created_at;
    }
  },
  title: {
    get: function () {
      return this.get("document").title;
    }
  },
  abstract: {
    get: function () {
      return this.get("document").abstract;
    }
  },
  keywords: {
    get: function () {
      // Note: returing a copy to avoid inadvertent changes
      return this.get("document").keywords.slice(0);
    }
  },
  views: {
    get: function () {
      // Note: returing a copy to avoid inadvertent changes
      return this.get("document").views.slice(0);
    }
  },
});

// AnnotatedText
// --------
//
// Ties together a text node with its annotations
// Interface defined by Substance.Surface

var AnnotatedText = function(doc, path) {
  this.doc = doc;
  this.path = path;
  this.property = doc.resolve(path);
  this.resetCache();
};

AnnotatedText.__prototype__ = function() {

  this.setAnnotation = function(annotation) {
    this.cache.annotations[annotation.id] = annotation;
    this.commit();
  };

  this.getAnnotation = function(id) {
    return this.cache.annotations[id] || this.doc.get(id);
  };

  this.deleteAnnotation = function(id) {
    delete this.cache.annotations[id];
    this.cache.deleted_annotations.push(id);
  };

  this.setContent = function(content) {
    this.cache.content = content;
    this.commit();
  };

  this.getContent = function() {
    if (this.cache.content !== null) return this.cache.content;
    return this.property.get();
  };

  // Transform Hook
  // --------
  //

  this.each = function(fn) {
    var annos = this.doc.find('annotations', this.property.node.id);
    _.each(this.cache.annotations, fn);

    _.each(annos, function(a) {
      if (!this.cache.annotations[a.id] && !_.include(this.cache.deleted_annotations, a.id)) fn(a, a.id);
    }, this);
  };

  // Transform Hook
  // --------
  //
  // triggered implicitly by Surface.insert|deleteTransformer)

  this.transformAnnotation = function(a, op, expand) {
    if (this.cache.annotations[a.id]) {
      a = this.cache.annotations[a.id];
    } else {
      a = util.deepclone(a);
    }
    Operator.TextOperation.Range.transform(a.range, op, expand);
    this.cache.annotations[a.id] = a;
  };

  this.resetCache = function() {
    this.cache = {
      annotations: {},
      content: null,
      deleted_annotations: []
    };
  };

  // Commit changes
  // --------
  //

  this.commit = function() {

    // 1. Insert Annotations
    var newAnnotations = [];
    var updatedAnnotations = [];
    _.each(this.cache.annotations, function(a) {
      var oa = this.doc.get(a.id);
      if (!oa) newAnnotations.push(a);
      else if (a.type !== oa.type) updatedAnnotations.push(a);
    }, this);

    var cmds = [];

    _.each(newAnnotations, function(a) {
      a.node = this.property.node.id;
      cmds.push(Document.Create(a));
    }, this);

    // Text diff computation
    if (this.cache.content !== null) {
      var delta = _.extractOperation(this.property.get(), this.cache.content);
      cmds.push(Data.Graph.Update(this.path, Operator.TextOperation.fromOT(delta)));
    }

    _.each(cmds, function(c) {
      this.doc.apply(c);
    }, this);
    this.resetCache();
  };
};

AnnotatedText.prototype = new AnnotatedText.__prototype__();

Object.defineProperties(AnnotatedText.prototype, {
  content: {
    get: function () {
      return this.getContent();
    },
    set: function(content) {
      this.setContent(content);
    }
  }
});


// Document Range
// --------
//
// Can refer to a view range
// Or alternatively to a text range within a textnode
//
// [:startnode, :startpos, :endnode, :endpos]

var Range = function(doc, range) {
  this.doc = doc;
  if (!range) {
    this.start = null;
    this.end = null;
    return;
  }
  if (_.isArray(range)) {
    this.start = [range[0], range[1]];
    this.end = [range[2], range[3]];
  } else {
    this.start = _.clone(range.start);
    this.end = _.clone(range.end);
  }

  Object.freeze(this);
};


Range.__prototype__ = function() {
  this.toJSON = function() {
    return {
      "start": this.start,
      "end": this.end
    };
  };

  // For a given document return the selected nodes
  // --------

  this.getNodes = function() {
    var view = this.doc.get('content').nodes;
    if (this.isNull()) return [];

    return _.map(view.slice(this.start[0], this.end[0]+1), function(n) {
      return this.doc.get(n);
    }, this);
  };

  this.isNull = function() {
    return !this.start;
  };


  // this.isSingleNode = function() {
  //   return this.start[0] === this.end[0];
  // };

  this.isCollapsed = function() {
    // if (this.isNull()) return "";
    return this.start[0] === this.end[0] && this.start[1] === this.end[1];
  };

  // For a given document return the selected text
  // --------

  this.getText = function() {
    var text = "";

    if (this.isNull()) return "";

    // start node
    var nodes = this.getNodes();

    if (nodes.length === 1) {
      return nodes[0].content.slice(this.start[1], this.end[1]);
    }

    _.each(nodes, function(n, index) {
      if (n.content) {
        if (index === 0) {
          text += nodes[0].content.slice(this.start[1]);
        } else if (index === nodes.length-1) {
          text += nodes[index].content.slice(0, this.end[1]);
        } else {
          text += n.content;
        }
      }
    }, this);
    return text;
  };
};

Range.prototype = new Range.__prototype__();


// Command Factories
// --------

Document.Create = function(node) {
  return Data.Graph.Create(node);
};

Document.Delete = function(nodes) {
  return ["delete", {nodes: nodes}];
};


Document.COMMANDS = _.extend({}, Data.COMMANDS, {
  "position": {
    "types": ["array"],
    "arguments": 1
  },
  "hide": {
    "types": ["array"],
    "arguments": 1
  },
  "delete": {
    "types": ["graph"],
    "arguments": 1
  },
  "annotate": {
    "types": ["content"],
    "arguments": 1
  },
  "comment": {
    "types": ["content", "annotation"],
    "arguments": 1
  }
});

// Add event support
_.extend(Document.prototype, util.Events);

Document.SCHEMA = SCHEMA;
Document.AnnotatedText = AnnotatedText;
Document.Range = Range;

// Export
// ========

if (typeof exports !== 'undefined') {
  module.exports = Document;
} else {
  root.Substance.Document = Document;
}

})(this);
