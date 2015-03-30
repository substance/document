'use strict';

var Substance = require('substance');

function DocumentCoordinate(path, charPos) {
  this.path = path;
  this.charPos = charPos;
  Object.freeze(this);
}

DocumentCoordinate.Prototype = function() {

  this.equals = function(other) {
    return (other === this ||
      (Substance.equals(other.path, this.path) && other.charPos === this.charPos) );
  };

  this.withCharPos = function(charPos) {
    return new DocumentCoordinate(this.path, charPos);
  };

  this.getNodeId = function() {
    return this.path[0];
  };

};

Substance.initClass( DocumentCoordinate );

module.exports = DocumentCoordinate;
