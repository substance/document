"use strict";

var NodeViewFactory = require("./node_view_factory");
var _ = require("underscore");

var DocumentRenderer = function(document, viewName, options) {
  NodeViewFactory.call(this, document);

  this.viewName = viewName;
  this.options = options || {};
  this.nodeViews = {};
};

DocumentRenderer.Prototype = function() {

  var __super__ = NodeViewFactory.prototype;

  // Note: it is important to recreate a view to be able to dispose child views
  // and not having to reuse all the time.
  this.createView = function(node, overwrite) {
    if (this.nodeViews[node.id] && !overwrite) {
      return this.nodeViews[node.id];
    } else if (this.nodeViews[node.id] && overwrite) {
      this.nodeViews[node.id].dispose();
    }
    var nodeView = __super__.createView.call(this, node);
    this.nodeViews[node.id] = nodeView;
    return nodeView;
  };

  this.getView = function(nodeId) {
    if (this.nodeViews[nodeId]) {
      return this.nodeViews[nodeId];
    }
    var node = this.document.get(nodeId);
    return this.createView(node);
  };

  // Render it
  // --------
  //

  this.render = function() {
    _.each(this.nodeViews, function(nodeView) {
      nodeView.dispose();
    });

    var frag = window.document.createDocumentFragment();

    var nodeIds = this.document.get(this.viewName).nodes;
    _.each(nodeIds, function(id) {
      var node = this.document.get(id);
      var view = this.createView(node);
      frag.appendChild(view.render().el);

      // Lets you customize the resulting DOM sticking on the el element
      // Example: Lens focus controls
      if (this.options.afterRender) {
        this.options.afterRender(this.document, view);
      }
    }, this);

    return frag;
  };

};

DocumentRenderer.Prototype.prototype = NodeViewFactory.prototype;
DocumentRenderer.prototype = new DocumentRenderer.Prototype();

module.exports = DocumentRenderer;
