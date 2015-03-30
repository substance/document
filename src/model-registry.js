'use strict';

var Substance = require('substance');
var Model = require('./model');
var Annotation = require('./annotation');
var Registry = require('./registry');
var Factory = require('./factory');

var ModelRegistry = function VeDmModelRegistry() {
  Registry.call(this);

  this.nodeFactory = new Factory();
  this.annotationFactory = new Factory();
};

ModelRegistry.Prototype = function() {

  this.register = function ( constructor ) {
    var name = constructor.static && constructor.static.name;
    if ( typeof name !== 'string' || name === '' ) {
      throw new Error( 'Model names must be strings and must not be empty' );
    }
    if ( !( constructor.prototype instanceof Model ) ) {
      throw new Error( 'Models must be subclasses of Substance.dm.Model' );
    }
    // Register the model with the right factory
    if ( constructor.prototype instanceof Annotation ) {
      this.annotationFactory.register( constructor );
    }
    this.nodeFactory.register( constructor );

    this.add(name, constructor);
  };

  // Used for built-in HTML import.
  // Each model class should implement `matchFunction`
  this.getModelClassForElement = function(el) {
    var modelClass = null;
    this.each(function(candidate) {
      if (candidate.matchFunction && candidate.matchFunction(el)) {
        modelClass = candidate;
        return false;
      }
    });
    if (!modelClass) {
      throw new Error("No matching model found.");
    }
    return modelClass;
  };
};

Substance.inherit(ModelRegistry, Registry);

module.exports = ModelRegistry;
