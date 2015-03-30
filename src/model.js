'use strict';

var Substance = require('substance');
var EventEmitter = require('./event-emitter');

function Model( data ) {
  // Mix-in
  EventEmitter.call(this);

  this.properties = Substance.extend({}, this.getDefaultProperties(), data);
  this.properties.type = this.constructor.static.name;
  this.properties.id = this.properties.id || Substance.uuid(this.properties.type);
}

Model.Prototype = function() {
  this.toJSON = function() {
    return this.properties;
  };

  this.fromHTML = function( el ) {
    this.properties.id = $(el).attr('id') || this.properties.id;
  };

  this.getDefaultProperties = function() {
    return Substance.deepClone(this.constructor.__defaultProperties__);
  };
};

Substance.inherit( Model, EventEmitter );

/**
 * Symbolic name for this model class. Must be set to a unique string by every subclass.
 */
Model.static.name = null;

Model.static.schema = {
  type: 'string',
  id: 'string'
};

Model.static.readOnlyProperties = ['type', 'id'];

Model.static.matchFunction = function(/*el*/) {
  return false;
};

function defineProperty(prototype, property, readonly) {
  var getter, setter;
  getter = function() {
    return this.properties[property];
  };
  if (readonly) {
    setter = function() {
      throw new Error("Property " + property + " is readonly!");
    };
  } else {
    setter = function(val) {
      this.properties[property] = val;
      return this;
    };
  }
  var spec = {
    get: getter,
    set: setter
  };
  Object.defineProperty(prototype, property, spec);
}

Model.defineProperties = function(ModelClass) {
  var prototype = ModelClass.prototype;

  if (!ModelClass.static.schema) return;

  var properties = Object.keys(ModelClass.static.schema);
  for (var i = 0; i < properties.length; i++) {
    var property = properties[i];

    if (prototype.hasOwnProperty(property)) continue;

    var readonly = ( ModelClass.static.readOnlyProperties &&
      ModelClass.static.readOnlyProperties.indexOf(property) > 0 );

    defineProperty(prototype, property, readonly);
  }
};

Model.collectDefaultProperties = function( ModelClass ) {
  var staticData = ModelClass.static;
  var props = [{}];
  while(staticData) {
    if (staticData.hasOwnProperty('defaultProperties')) {
      props.push(staticData.defaultProperties);
    }
    staticData = Object.getPrototypeOf(staticData);
  }
  ModelClass.__defaultProperties__ = Substance.extend.apply(null, props);
};

Model.initModelClass = function( ModelClass ) {
  if (!ModelClass.__initialized__) {
    Model.defineProperties(ModelClass);
    Model.collectDefaultProperties(ModelClass);
    ModelClass.__initialized__ = true;
  }
};

Model.initModelClass( Model );

module.exports = Model;
