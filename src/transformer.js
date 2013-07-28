var _ = require("underscore");
var Annotator = require("./annotator");
var Selection = require("./selection");

// Registered node types
// --------

var nodeTypes = {
  "paragraph": require('substance-nodes/paragraph'),
  "heading": require('substance-nodes/heading'),
  "image": require('substance-nodes/image')
};

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


  this.insertNode = function() {
    // if (!this.selection.isCollapsed()) {
    //   this.delete();
    // }
    // var doc = this.__document;
    // var nodes = this.selection.getNodes();
    // var node = nodes[0];

    // // Remove the selection
    // // TODO: implement

    // // Remove trailing stuff
    // var nodePos = this.selection.start[0];
    // var cursorPos = this.selection.start[1];
    // var trailingText = node.content.slice(cursorPos);

    // var annotations = this.annotator.copy({start: [nodePos, cursorPos], end: [nodePos, node.content.length]});

    // if (trailingText.length > 0) {
    //   var r = [cursorPos, -trailingText.length];

    //   doc.update([node.id, "content"], r);
    // }

    // // Insert new node for trailingText
    // if (trailingText.length > 0) {
    //   var newId = "text_"+util.uuid();
    //   doc.create({
    //     id: newId,
    //     type: "text",
    //     content: trailingText
    //   });
    //   doc.update(["content", "nodes"], ["+", nodePos+1, newId]);

    //   this.annotator.paste(annotations, newId);
    // }

    // this.selection.set({
    //   start: [nodePos+1, 0],
    //   end: [nodePos+1, 0]
    // });

    // return this;
  };

  // Copy 
  // --------
  //
  // Returns a new document, which contains the contents of a selection

  this.copy = function(doc, sel) {
    // Convenience vars
    // var sel = this.selection;
    // var startOffset = sel.start[1];
    // var endOffset = sel.end[1];
    // var nodes = sel.getNodes();

    // var content = new Document({id: "clipboard"});

    // // keep a mapping of ids to be able to map extracted annotations
    // // to the newly created nodes
    // var idMap = {};
    // var nodeId;

    // if (nodes.length > 1) {
    //   // Remove trailing stuff
    //   _.each(nodes, function(node, index) {
    //     // only consider textish nodes for now
    //     if (node.content) {
    //       if (index === 0) {
    //         var trailingText = node.content.slice(startOffset);

    //         // Add trailing text to clipboard
    //         nodeId = util.uuid();
    //         content.create({
    //           id: nodeId,
    //           type: "text",
    //           content: trailingText
    //         });
    //         // and the clipboards content view
    //         content.update(["content", "nodes"], ["+", index, nodeId]);

    //         idMap[node.id] = nodeId;
    //       } else if (index === nodes.length-1) {
    //         // Last node of selection
    //         var text = node.content.slice(0, endOffset);

    //         // Add selected text from last node to clipboard
    //         nodeId = util.uuid();
    //         content.create({
    //           id: nodeId,
    //           type: "text",
    //           content: text
    //         });
    //         content.update(["content", "nodes"], ["+", index, nodeId]);

    //         idMap[node.id] = nodeId;
    //       } else {
    //         nodeId = util.uuid();
    //         // Insert node in clipboard document
    //         content.create(_.extend(_.clone(node), {id: nodeId}));
    //         // ... and view
    //         content.update(["content", "nodes"], ["+", index, nodeId]);

    //         idMap[node.id] = nodeId;
    //       }
    //     }
    //   }, this);
    // } else {
    //   var node = nodes[0];
    //   var text = node.content.slice(startOffset, endOffset);

    //   nodeId = util.uuid();
    //   content.create({
    //     id: nodeId,
    //     type: "text",
    //     content: text
    //   });
    //   content.update(["content", "nodes"], ["+", 0, nodeId]);

    //   idMap[node.id] = nodeId;
    // }

    // // get a copy of annotations within the selection
    // // and bind them to the newly created nodes using the previously stored id map.
    // var annotations = this.annotator.copy(sel);
    // for (var i = 0; i < annotations.length; i++) {
    //   var annotation = annotations[i];
    //   annotation.node = idMap[annotation.node];
    //   content.create(annotation);
    // }

    // this.clipboard.setContent(content);
  };

  // Paste 
  // --------
  //
  // Paste `content` at given selection

  this.paste = function(doc, content, sel) {
    // var content = this.clipboard.getContent();

    // // First off, delete the selection
    // if (!this.selection.isCollapsed()) this.delete();

    // if (!content) return;
    // var doc = this.__document;

    // // After delete selection we can be sure
    // // that the collection is collapsed
    // var startNode = this.selection.start[0];
    // var startOffset = this.selection.start[1];

    // // This is where the pasting stuff starts
    // var referenceNode = this.selection.getNodes()[0];

    // // Nodes from the clipboard to insert
    // var nodes = content.query(["content", "nodes"]);

    // var sel = this.selection;
    // var newSel;

    // if (nodes.length > 1) {
    //   // Remove trailing stuff
    //   _.each(nodes, function(node, index) {
    //     // only consider textish nodes for now
    //     if (node.content) {
    //       if (index === 0) {
    //         var trailingText = referenceNode.content.slice(startOffset);
    //         var r = [startOffset, -trailingText.length, node.content];

    //         // remove trailing text from first node at the beginning of the selection
    //         doc.update([referenceNode.id, "content"], r);

    //         // Move the trailing text into a new node
    //         var nodeId = util.uuid();
    //         doc.create({
    //           id: nodeId,
    //           type: "text",
    //           content: _.last(nodes).content + trailingText
    //         });

    //         // and the clipboards content view
    //         doc.update(["content", "nodes"], ["+", startNode+index+1, nodeId]);

    //         var annotations = content.find("annotations", node.id);
    //         this.annotator.paste(annotations, referenceNode.id, startOffset);

    //       } else if (index === nodes.length-1) {
    //         // Skip last node of the clipboard document
    //         // TODO why?
    //       } else {
    //         // Create a copy of the 
    //         doc.create(node);
    //         doc.update(["content", "nodes"], ["+", startNode+index, node.id]);
    //         var annotations = content.find("annotations", node.id);
    //         this.annotator.paste(annotations);
    //       }
    //     }
    //   }, this);
    // } else {
    //   // Only one node to insert
    //   var node = nodes[0];
    //   doc.update([referenceNode.id, "content"], [startOffset, node.content]);

    //   var annotations = content.find("annotations", node.id);
    //   this.annotator.paste(annotations, referenceNode.id, startOffset);

    //   // Move selection to the end of the pasted content
    //   newSel = {
    //     start: [sel.start[0], sel.start[1]+node.content.length],
    //     end: [sel.start[0], sel.start[1]+node.content.length]
    //   };
    // }

    // if (newSel) sel.set(newSel);
  };

  // Merges two text nodes
  // --------
  //
  // Takes the contents of of the source node and inserts them after the target node

  this.mergeNodes = function(doc, source, target) {
    if (!source || !target) return false;

    var SourceNodeType = nodeTypes[source.type];
    var TargetNodeType = nodeTypes[target.type];

    if (!SourceNodeType.properties.isText) return false;
    if (!TargetNodeType.properties.isText) return false;

    var sel = new Selection(doc);
    sel.selectNode(source.id);

    var annotator = new Annotator(doc);
    var annotations = annotator.copy(sel);

    // 1. Delete original node from graph
    this.deleteNode(doc, source.id);

    // 2. Update previous node and append text
    doc.update([target.id, "content"], [target.content.length, source.content]);

    // 3. transform all annotations so that they reflect the stitching
    annotator.paste(annotations, target.id, target.length);
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

  // Deletes a given selection from the document
  // --------
  // 

  this.deleteSelection = function(doc, sel) {
    _.each(sel.getRanges(), function(range) {
      if (range.isEnclosed()) {
        this.deleteNode(doc, range.node.id);
      } else {
        var ContentNodeTransformer = nodeTypes[range.node.type].Transformer;
        var t = new ContentNodeTransformer(doc, range.node);
        t.deleteRange(range);  
      }
    }, this);    
  };
};

Transformer.prototype = new Transformer.Prototype();
module.exports = Transformer;
