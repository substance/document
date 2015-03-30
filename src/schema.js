'use strict';

var Substance = require("substance");
var ModelRegistry = require("./model-registry");
var Model = require('./model');
var Node = require('./node');
var Annotation = require('./annotation');

function Schema(name, version, nodes) {
  this.name = name;
  this.version = version;
  this.nodes = nodes;
  this.modelRegistry = new ModelRegistry();

  var i;
  var builtins = Schema.static.builtins;
  for (i = 0; i < builtins.length; i++) {
    Model.initModelClass(builtins[i]);
    this.modelRegistry.register(builtins[i]);
  }
  for (i = 0; i < nodes.length; i++) {
    Model.initModelClass(nodes[i]);
    this.modelRegistry.register(nodes[i]);
  }
}

Schema.Prototype = function() {

  this.isAnnotationType = function(type) {
    var nodeClass = this.modelRegistry.registry[type];
    return (nodeClass && nodeClass.prototype instanceof Annotation);
  };

  function getJsonForModel(modelClass) {
    var modelSchema = {};
    if (modelClass.static.hasOwnProperty('schema')) {
      modelSchema.properties = Substance.clone(modelClass.static.schema);
    }
    if (modelClass.prototype instanceof Annotation) {
      modelSchema.parent = 'annotation';
    } else if (modelClass !== Node) {
      modelSchema.parent = 'node';
    }
    return modelSchema;
  }

  this.toJSON = function() {
    var data = {
      id: this.name,
      version: this.version,
      types: {}
    };
    for (var key in this.modelRegistry.registry) {
      var modelClass = this.modelRegistry.registry[key];
      data.types[modelClass.static.name] = getJsonForModel(modelClass);
    }
    return data;
  };

  this.createNode = function(type, data) {
    var node = this.modelRegistry.nodeFactory.create(type, data);
    return node;
  };

};

Substance.initClass( Schema );

Schema.static.builtins = [ Node, Annotation ];

module.exports = Schema;
