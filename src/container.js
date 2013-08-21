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

  this.getNodes = function() {
    return _.clone(this.listView);
  };

  this.getParent = function(nodeId) {
    return this.__parents[nodeId];
  };

  this.onUpdate = function(path) {
    var needRebuild = (path[0] === this.__view ||  this.__composites[path[0]] !== undefined);
    if (needRebuild) this.rebuild();
  };

};

Container.prototype = _.extend(new Container.Prototype(), util.Events.Listener);

module.exports = Container;
