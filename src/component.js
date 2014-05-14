"use strict";

var Component = function(root, path, options) {
  options = options || {};

  if (!root || !path) {
    throw new Error("Inclomplete arguments for Component");
  }

  // each component belongs to a document node
  // the node is the one which is included in the container
  // and represents the root node which produced this component.
  this.root = root;

  // each component is bound to a specific graph property
  // e.g., ['text_1', 'content']
  this.path = path;

  // position of the component in the flattened list of components
  // This is essentially used to address a component e.g., to set the cursor
  // or to apply changes.
  this.pos = null;

  // TODO: IMO this should be removed as it can be retrieved via the container
  this.rootPos = null;


  // to identify the component within a node
  this.name = options.name;

  // a component can be used in a composite.
  // for composites we use a similar path pattern which however
  // does not correspond to real graph paths.
  // E.g. a figure 'fig_1' could have a node as caption 'caption_1'.
  // The path to the text content would be ['caption_1', 'content']
  // In the view it has the path ['fig_1', 'caption', 'content']
  this.alias = options.alias;

  if (options.length) {
    this.__getLength__ = options.length;
  }

};

Component.Protoype = function() {

  this.__getLength__ = function() {
    throw new Error("This is abstract and must be overridden");
  };

  this.getLength = function() {
    return this.length;
  };

  this.clone = function() {
    var ClonedComponent = function() {};
    ClonedComponent.prototype = this;
    return new ClonedComponent();
  };

};
Component.prototype = new Component.Protoype();

Object.defineProperties(Component.prototype, {
  "length": {
    get: function() {
      return this.__getLength__.call(this);
    }
  },

  // TODO: this are deprecated. I added just to make the refactoring step smaller
  "nodePos": {
    get: function() {
      return this.rootPos;
    },
    set: function() {
      throw new Error("DEPRECATED");
    }
  },
  "node": {
    get: function() {
      console.log("DEPRECATED: please use component.root instead");
      return this.root;
    },
    set: function() {
      throw new Error("DEPRECATED");
    }
  }

});

module.exports = Component;
