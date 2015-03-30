'use strict';

var Substance = require('substance');

function DocumentListeners() {
  this.registry = {};
}

DocumentListeners.Prototype = function() {

  this.add = function(path, listener) {
    if (!Substance.isFunction(listener.onDocumentChange)) {
      throw new Error('Illegal listener: a DocumentListener must implement "onDocumentChange".');
    }
    var layer = this.registry;
    for (var i = 0; i < path.length; i++) {
      var id = path[i];
      layer[id] = layer[id] || { __listeners__: [] };
      layer = layer[id];
    }
    layer.__listeners__.push(listener);
  };

  this.remove = function(path, listener) {
    var layer = this.registry;
    for (var i = 0; i < path.length; i++) {
      var id = path[i];
      if (!layer[id]) {
        console.error('Could not resolve listener for path %s.', path);
      }
      layer = layer[id];
    }
    var idx = layer.indexOf(listener);
    if (idx >= 0) {
      layer.splice(idx, 1);
    } else {
      console.error('Could not resolve listener for path %s.', path);
    }
  };

  this.notify = function(path /*, ...*/) {
    var layer = this.registry;
    var i;
    for (i = 0; i < path.length; i++) {
      var id = path[i];
      if (!layer[id]) {
        break;
      }
      layer = layer[id];
    }
    if (!layer) {
      return;
    }
    var args = Array.prototype.slice.call(arguments, 2);
    for (i = layer.__listeners__.length - 1; i >= 0; i--) {
      var listener = layer.__listeners__[i];
      listener.onDocumentChange.apply(null, args);
    }
  };
};

Substance.initClass(DocumentListeners);

module.exports = DocumentListeners;
