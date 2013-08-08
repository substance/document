var _ = require("underscore");
var Document = require("./document");
var Annotator = require("./annotator");
var Selection = require("./selection");
var util = require("substance-util");

// Registered node types
// --------

// Substance.Document.Transformer
// -----------------
//
// Manipulation interface for all node types
// This behavior can overriden by the concrete node types

var Transformer = function() {
  // Usually you get passed in a simulation here
  // this.document = document;
};

Transformer.Prototype = function() {

  // Split
  // --------
  //

  this.split = function(doc, node, charPos) {
    var NodeType = Transformer.nodeTypes[node.type];

    var nodePos = doc.getPosition('content', node.id);

    // Pull off the target type from the node configuaration
    var targetType = NodeType.properties.splitInto;

    // Skip non-splittable nodes
    if (!targetType) return null;

    var trailingText = node.content.slice(charPos);

    var annotator = new Annotator(doc);

    var annotations = annotator.copy({
      start: [nodePos, charPos],
      end: [nodePos, node.content.length]
    });

    doc.update([node.id, "content"], [charPos, -trailingText.length]);

    var newNode = {
      id: targetType+"_"+util.uuid(),
      type: targetType,
      content: trailingText
    };

    newNode = this.createNode(doc, newNode, nodePos+1);
    annotator.paste(annotations, newNode.id);
    return newNode;
  };

  // Morph Node
  // --------
  //

  this.morphNode = function(doc, sel, type, data) {
    var cursor = sel.cursor;
    var nodePos = cursor.nodePos;

    if (type === "image" && !data) {
      $('.image-files').click();
    } else {
      this.insertNode(doc, sel, type, data);
      this.deleteNode(doc, cursor.node.id);
      sel.setCursor([nodePos, 0]);
    }
  };

  // this.transformer.morphNode(doc, node, type);

  // Insert Node
  // --------
  //

  this.insertNode = function(doc, sel, type, data) {
    var cursor = sel.cursor;

    // Split and use
    if (this.split(doc, cursor.node, cursor.charPos)) {
      // Lookup some config for dealing with edge cases
      var NodeType = Transformer.nodeTypes[cursor.node.type];
      var splittedType = NodeType.properties.splitInto;

      if (!type || type === splittedType) {
        sel.setCursor([cursor.nodePos+1, 0]);
        return;
      }
    }

    // Default to new paragraph node
    type = type || 'paragraph';

    // var content = "";
    // if (type === "image") content = " ";

    // Move to particular nodetype
    // Something like that: doc.nodeTypes[type].create();

    var newNode = {
      id: type+"_"+util.uuid(),
      type: type,
      content: ""
    };

    _.extend(newNode, data);
    newNode = this.createNode(doc, newNode, cursor.nodePos+1);

    sel.setCursor([cursor.nodePos+1, 0]);
  };

  // Copy
  // --------
  //
  // Returns a new document, which contains the contents of a selection

  this.copy = function(doc, sel) {

    var ranges = sel.getRanges();
    var annotator = new Annotator(doc);
    var content = new Document({id: "clipboard"});
    content.schema = doc.schema;
    content.nodeTypes = doc.nodeTypes;
    content.nodes["content"] = {
      id: "content",
      type: "view",
      nodes: []
    };

    // !!! TODO !!! : we should do the copying in the node implementations.
    // For now, only TextNodes will be partially copied. Others will be copied fully
    // even if the selection does not span the whole node

    for (var i = 0; i < ranges.length; i++) {
      var range = ranges[i];

      var NodeType = Transformer.nodeTypes[range.node.type];
      var isSplittable = (!!NodeType.properties.splitInto);

      var newNode = util.clone(range.node);
      newNode.id = util.uuid();

      if(range.isPartial() && isSplittable) {
        newNode.content = range.node.content.substring(range.start, range.end);
      }

      content.create(newNode);
      content.update(["content", "nodes"], ["+", i, newNode.id]);

      var annotations = annotator.copy({
        start: [range.nodePos, range.start],
        end: [range.nodePos, range.end]
      });

      for (var id in annotations) {
        var annotation = annotations[id];
        annotation.path[0] = newNode.id;
        content.create(annotation);
      }
    }

    return content;
  };

  // Paste
  // --------
  //
  // Paste `content` at given selection

  this.paste = function(doc, content, sel) {

    if (!sel.isCollapsed()) {
      throw new Error("Call delete first.");
    }

    var range = sel.getRanges()[0];
    var nodes = content.get("content").nodes;

    // stop if there are no nodes
    if (nodes.length === 0) return;

    // insert in-place if there is only one node and it is mergable
    if (nodes.length === 1) {
      var node = content.get(nodes[0]);

      if (node.type === range.node.type) {
        // TODO: let the node insert the content inplace
        doc.update([range.node.id, "content"], [range.start, node.content]);
        return;
      }
    }

    var splitted = this.split(doc, range.node, range.start);

    if (splitted === null) {
      console.log("Cannot paste into an un-splittable node");
      return;
    }

    // create the visible nodes
    // TODO: should we add invisible nodes, too?
    var contentAnnotator = new Annotator(content);

    for (var i = 0; i < nodes.length; i++) {
      var nodeId = nodes[i];
      doc.create(content.get(nodeId));
      doc.update(["content", "nodes"], ["+", range.nodePos+1+i, nodeId]);
      var annotations = contentAnnotator.getAnnotations({node: nodeId});
      for (var j = 0; j < annotations.length; j++) {
        doc.create(annotations[j]);
      }
    }

    // try to merge the first node
    var first = doc.get(nodes[0]);
    if (first.type === range.node.type) {
      this.mergeNodes(doc, first, range.node);
    }

    // try to merge the last node
    var last = doc.get(doc.getPredecessor("content", splitted.id));
    if (last.type === splitted.type) {
      this.mergeNodes(doc, splitted, last);
    }

  };

  // Merges two text nodes
  // --------
  //
  // Takes the contents of of the source node and inserts them after the target node

  this.mergeNodes = function(doc, source, target) {
    if (!source || !target) return false;

    var SourceNodeType = Transformer.nodeTypes[source.type];
    //var TargetNodeType = Transformer.nodeTypes[target.type];

    // Check if source node is mergable with targetnode
    var allowedBuddies = SourceNodeType.properties.mergeableWith;
    if (!_.include(allowedBuddies, target.type)) return false;

    var sel = new Selection(doc);
    sel.selectNode(source.id);

    var annotator = new Annotator(doc);
    var annotations = annotator.copy(sel);

    var insPos = target.content.length;

    // 1. Delete original node from graph
    this.deleteNode(doc, source.id);

    // 2. Update previous node and append text
    doc.update([target.id, "content"], [insPos, source.content]);

    // 3. transform all annotations so that they reflect the stitching
    annotator.paste(annotations, target.id, insPos);
    return true;
  };

  // Delete content node
  // --------
  //
  // Delete node from document and removes it from the content view

  this.deleteNode = function(doc, nodeId) {
    doc.update(["content", "nodes"], ["-", doc.getPosition('content', nodeId)]);
    return doc.delete(nodeId);
  };

  // Create node and insert at a given position
  // --------
  //

  this.createNode = function(doc, node, pos) {
    var newNode = doc.create(node);
    doc.update(["content", "nodes"], ["+", pos, node.id]);
    return newNode;
  };

  // Deletes a given selection from the document
  // --------
  //

  this.deleteSelection = function(doc, sel) {
    _.each(sel.getRanges(), function(range) {
      if (range.isEnclosed() || range.isFull()) {
        this.deleteNode(doc, range.node.id);
      } else {
        var ContentNodeTransformer = Transformer.nodeTypes[range.node.type].Transformer;
        var t = new ContentNodeTransformer(doc, range.node);
        t.deleteRange(range);
      }
    }, this);
  };
};

Transformer.prototype = new Transformer.Prototype();
module.exports = Transformer;
