"use strict";

var _ = require("underscore");
var util = require("substance-util");
var Composite = require("./composite");

var Container = function(document, view) {
  this.__document = document;

  this.treeView = document.nodes[view].nodes;
  this.listView = [];

  this.__view = view;
  this.__parents = {};
  this.__composites = {};

  this.listenTo(document, "property:updated", this.onUpdate);
  this.listenTo(document, "property:set", this.onUpdate);
  this.rebuild();
};

Container.Prototype = function() {

  this.rebuild = function() {
    // clear the list view
    this.listView.splice(0, this.listView.length);
    this.__parents = {};
    this.__composites = {};
    this.each(function(node, parent) {
      this.listView.push(node.id);
      if (this.__parents[node.id]) {
        throw new Error("Nodes must be unique in one view.");
      }
      this.__parents[node.id] = parent;
      this.__composites[parent] = parent;
    }, this);
  };

  this.each = function(iterator, context) {
    var queue = [];
    var i;

    for (i = this.treeView.length - 1; i >= 0; i--) {
      queue.unshift({
        id: this.treeView[i],
        parent: null
      });
    }

    var item, node;
    while(queue.length > 0) {
      item = queue.shift();
      node = this.__document.get(item.id);
      if (node instanceof Composite) {
        var children = node.getNodes();
        for (i = children.length - 1; i >= 0; i--) {
          queue.unshift({
            id: children[i],
            parent: node.id,
          });
        }
      } else {
        iterator.call(context, node, item.parent);
      }
    }
  };

  this.getNodes = function(idsOnly) {
    var nodeIds = this.listView;
    if (idsOnly) {
      return _.clone(nodeIds);
    }
    else {
      var result = [];
      for (var i = 0; i < nodeIds.length; i++) {
        result.push(this.__document.get(nodeIds[i]));
      }
      return result;
    }
  };

  this.getPosition = function(nodeId) {
    var nodeIds = this.listView;
    return nodeIds.indexOf(nodeId);
  };

  this.getNodeFromPosition = function(pos) {
    var nodeIds = this.listView;
    var id = nodeIds[pos];
    if (id !== undefined) {
      return this.__document.get(id);
    } else {
      return null;
    }
  };

  this.getParent = function(nodeId) {
    return this.__parents[nodeId];
  };

  this.onUpdate = function(path) {
    var needRebuild = (path[0] === this.__view ||  this.__composites[path[0]] !== undefined);
    if (needRebuild) this.rebuild();
  };

  this.getLength = function() {
    return this.listView.length;
  };

  // Returns true if there is another node after a given position.
  // --------
  //

  this.hasSuccessor = function(nodePos) {
    var l = this.getLength();
    return nodePos < l - 1;
  };

  // Returns true if given view and node pos has a predecessor
  // --------
  //

  this.hasPredecessor = function(nodePos) {
    return nodePos > 0;
  };

  // Get predecessor node for a given view and node id
  // --------
  //

  this.getPredecessor = function(id) {
    var pos = this.getPosition(id);
    if (pos <= 0) return null;
    return this.getNodeFromPosition(pos-1);
  };

  // Get successor node for a given view and node id
  // --------
  //

  this.getSuccessor = function(id) {
    var pos = this.getPosition(id);
    if (pos >= this.getLength() - 1) return null;
    return this.getNodeFromPosition(pos+1);
  };

};

Container.prototype = _.extend(new Container.Prototype(), util.Events.Listener);

module.exports = Container;
