'use strict';

var Substance = require('substance');

function Model( data ) {
  Substance.EventEmitter.call(this);

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
    return Substance.deepclone(this.constructor.__defaultProperties__);
  };

  this.isInstanceOf = function(typeName) {
    var staticData = this.constructor.static;
    while (staticData && staticData.name !== "model") {
      if (staticData && staticData.name === typeName) {
        return true;
      }
      staticData = Object.getPrototypeOf(staticData);
    }
    return false;
  };
};

Substance.inherit( Model, Substance.EventEmitter );

/**
 * Symbolic name for this model class. Must be set to a unique string by every subclass.
 */
Model.static.name = "model";

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

Model.__extend__ = function( parent, modelSpec ) {
  var ctor = function ModelClass() {
    parent.apply(this, arguments);
  }
  Substance.inherit(ctor, parent);
  for(var key in modelSpec) {
    if (modelSpec.hasOwnProperty(key)) {
      if (key === "name" || key === "properties") {
        continue;
      }
      ctor.prototype[key] = modelSpec[key];
    }
  }
  ctor.static.name = modelSpec.name;
  ctor.static.schema = modelSpec.properties;
  // add a extend method so that this class can be used to create child models.
  ctor.extend = Substance.bind(Model.__extend__, null, ctor);
  return ctor;
};

Model.extend = Substance.bind( Model.__extend__, null, Model);

module.exports = Model;
