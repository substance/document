'use strict';

var Substance = require('substance');
var PathAdapter = Substance.PathAdapter;

function ChangeMap() {
  PathAdapter.call(this);
}

ChangeMap.Prototype = function() {

  this.update = function(op) {
    var path = op.path + ['_ops'];
    var context = this._resolve(path, "create");
    context._ops = context._ops || [];
    context._ops.push(op);
  };

  this.traverse = function(fn, ctx) {
    this.__traverse(this, [], fn, ctx);
  };

  this.__traverse = function(level, path, fn, ctx) {
    if (level._ops && level._ops.length > 0) {
      fn.call(ctx, path, level._ops);
    }
    for (var key in level) {
      if (key === "_ops" || key === "__root__") { continue; }
      var nextLevel = level[key];
      var nextPath = path + [key];
      this.__traverse(nextLevel, nextPath, fn, ctx);
    }
  };
};

Substance.inherit(PathAdapter, ChangeMap);

module.exports = PathAdapter;
