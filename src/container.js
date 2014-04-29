"use strict";

var _ = require("underscore");
var util = require("substance-util");

var util = require("substance-util");
var errors = util.errors;
var ContainerError = errors.define("ContainerError");

// The container must be much more view oriented as the actual visualized components depend very much on the
// used renderers.

var Container = function(document, name, surfaceProvider) {
  this.document = document;
  this.name = name;

  var container = this.document.get(name);
  if (!container || container.type !== "view") {
    throw new ContainerError("Illegal argument: no view with name " + name);
  }

  // TODO: rename this.view to this.node, which is less confusing
  this.view = container;
  this.__components = null;
  this.__children = null;
  this.__updater = null;

  this.surfaceProvider = surfaceProvider || new Container.DefaultNodeSurfaceProvider(document);
  this.rebuild();

  this.listenTo(this.document, "operation:applied", this.update);
};

Container.Prototype = function() {

  _.extend(this, util.Events);

  this.rebuild = function() {
    // console.log("Container.rebuild", this.name);
    var __components = [];
    var __children = {};
    var __updater = [];
    var view = this.document.get(this.name);

    var rootNodes = view.nodes;

    // TODO: we have a problem with doc-simulation here.
    // Nodes are duplicated for simulation. Not so the references in the components.
    for (var i = 0; i < rootNodes.length; i++) {
      var id = rootNodes[i];
      var nodeSurface = this.surfaceProvider.getNodeSurface(id);
      if (!nodeSurface) {
        throw new ContainerError("Aaaaah! no surface available for node " + id);
      }

      if (nodeSurface.update) {
        __updater.push(nodeSurface.update.bind(nodeSurface));
      }

      var components = nodeSurface.components;
      if (!components) {
        throw new ContainerError("Node Surface did not provide components: " + nodeSurface.node.type);
      }
      __children[id] = [];
      for (var j = 0; j < components.length; j++) {
        var component = components[j].clone();
        component.surface.detachView();
        component.pos = __components.length;
        component.rootPos = i;
        __children[id].push(component);
        __components.push(component);
      }
    }
    this.__components = __components;
    this.__children = __children;
    this.__updater = __updater;
    this.view = view;
  };

  this.getComponents = function() {
    if (!this.__components) {
      this.rebuild();
    }
    return this.__components;
  };

  this.lookup = function(path) {
    var components = this.getComponents();
    for (var i = 0; i < components.length; i++) {
      var component = components[i];
      // a node surface can register an alias for a component
      if (component.alias && _.isEqual(component.alias, path)) {
        return component;
      }
      if (_.isEqual(component.path, path)) {
        return component;
      }
    }

    console.error("Could not find a view component for path " + JSON.stringify(path));

    return null;
  };

  this.getNodes = function(idsOnly) {
    var nodeIds = this.view.nodes;
    if (idsOnly) {
      return _.clone(nodeIds);
    }
    else {
      var result = [];
      for (var i = 0; i < nodeIds.length; i++) {
        result.push(this.document.get(nodeIds[i]));
      }
      return result;
    }
  };

  this.update = function(op) {
    var path = op.path;
    var needRebuild = (!this.__components || path[0] === this.view.id);

    // Note: we let the NodeSurfaces in invalidate the container
    // TODO: this could be done more efficiently.
    // This strategy means that every container iterates through all
    // surfaces on *each* graph operation.
    // One way to solve this efficiently would be to add an invalidate()
    // that runs with a timeout=0.
    // This however comes with extra listeners and hard to control order of
    // observer calls.
    if (!needRebuild) {
      for (var i = 0; i < this.__updater.length; i++) {
        if (this.__updater[i](op)) {
          needRebuild = true;
          break;
        }
      }
    }
    if (needRebuild) this.rebuild();
  };

  this.getLength = function(pos) {
    var components = this.getComponents();
    if (pos === undefined) {
      return components.length;
    } else {
      return components[pos].length;
    }
  };

  this.getRootNodeFromPos = function(pos) {
    if (!this.__components) this.rebuild();
    return this.__components[pos].root;
  };

  this.getNodePos = function(pos) {
    if (!this.__components) this.rebuild();
    var id = this.__components[pos].root.id;
    return this.view.nodes.indexOf(id);
  };

  // This is used to find the containing node of a reference target.
  // E.g., an annotation might point to ['caption_2', 'content'] which is actually
  // contained by the 'figure_1' on the top-level.
  this.lookupRootNode = function(path) {
    var components = this.getComponents();
    for (var i = 0; i < components.length; i++) {
      var component = components[i];
      if ( (component.alias && _.isEqual(path, component.alias)) || _.isEqual(path, component.path) ) {
        return component.root;
      }
    }
    console.error("Could not find a root node for the given path:" + path);
    return null;
  };

  this.getComponent = function(pos) {
    var components = this.getComponents();
    return components[pos];
  };

  this.last = function() {
    var components = this.getComponents();
    return components[components.length-1];
  };

  this.getNodeComponents = function(nodeId) {
    var result = this.__children[nodeId];
    if (!result) {
      throw new ContainerError("Node is not in this container:"+nodeId);
    }
    return result;
  };

  this.dispose = function() {
    this.stopListening();
  };

  // Creates a container for a given document
  // --------
  // This named constructor is used to create Container instance with the
  // same setup (name, surface provider, etc.) for a another document instance.
  // This is particularly used for creating manipulation sessions.
  //
  this.createContainer = function(doc) {
    return new Container(doc, this.name, this.surfaceProvider.createCopy(doc));
  };

  // Returns the first position after a given node.
  // if the node is the last in the container it will set
  this.after = function(nodeId) {
    var comps = this.getNodeComponents(nodeId);
    var lastComp = comps[comps.length-1];
    if (this.__components.length - 1 === lastComp.pos) {
      return [lastComp.pos, lastComp.length];
    } else {
      return [lastComp.pos+1, 0];
    }
  };

  this.first = function(nodeId) {
    var comps = this.getNodeComponents(nodeId);
    return [comps[0].pos, 0];
  };
};

Container.prototype = _.extend(new Container.Prototype(), util.Events.Listener);

Object.defineProperties(Container.prototype, {
  "id": {
    get: function() { return this.view.id; }
  },
  "type": {
    get: function() { return this.view.type; }
  },
  "nodes": {
    get: function() { return this.view.nodes; },
    set: function(val) { this.view.nodes = val; }
  }
});

Container.DefaultNodeSurfaceProvider = require("./node_surface_provider");
Container.ContainerError = ContainerError;

module.exports = Container;
