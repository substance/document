"use strict";

var _ = require("underscore");

var NodeSurfaceProvider = function(doc) {
  this.document = doc;
  this.nodeTypes = this.document.nodeTypes;
  this.nodeSurfaces = {};
};

NodeSurfaceProvider.Prototype = function() {

  this.getNodeSurface = function(node_or_nodeId) {
    var nodeId, node;
    if (_.isString(node_or_nodeId)) {
      nodeId = node_or_nodeId;
    } else {
      node = node_or_nodeId;
      nodeId = node.id;
    }

    if (!this.nodeSurfaces[nodeId]) {
      node = node || this.document.get(nodeId);
      this.nodeSurfaces[nodeId] = this.createNodeSurface(node);
    }

    return this.nodeSurfaces[nodeId];
  };

  this.createNodeSurface = function(node) {
      var nodeSurface;
      if (!node) {
        throw new Error("Unknown node: " + nodeId);
      }

      var NodeSurface = this.nodeTypes[node.type].Surface;
      if (NodeSurface) {
        // Note: passing this provider ot allow nesting/delegation
        nodeSurface = new NodeSurface(node, this);
      } else {
        // console.log("No surface available for node type", node.type,". Using Stub.");
        nodeSurface = new NodeSurfaceProvider.EmptySurface(node);
      }

      return nodeSurface;
  };

  // Creates a copy of this provider for a given document.
  // --------
  // This is as a named constructor for establishing a manipulation simulation session.
  //
  this.createCopy = function(document) {
    // Note: As this method is mainly used to implement document simulations,
    //   we must not copy the node surface instances as they contain a reference
    //   to the actual node.
    return new NodeSurfaceProvider(document);
  };

};
NodeSurfaceProvider.prototype = new NodeSurfaceProvider.Prototype();

NodeSurfaceProvider.EmptySurface = function(node) {
  this.node = node;
  this.view = null;
  this.components = [];
};

module.exports = NodeSurfaceProvider;
