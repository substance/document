"use strict";

var Substance = require('substance');
var Registry = require('./registry');

function Factory() {
  this.registry = new Registry();
}

Factory.Prototype = function() {

  this.register = function () {
    if (arguments.length === 1) {
      this.registerWithClassName(arguments[0]);
    } else if (arguments.length === 2) {
      this.registerWithName(arguments[0], arguments[1]);
    }
  };

  this.registerWithClassName = function(constructor) {
    var name = constructor.static && constructor.static.name;
    this.registerWithName(name, constructor);
  };

  this.registerWithName = function (name, constructor) {
    if ( typeof constructor !== 'function' ) {
      throw new Error( 'constructor must be a function, cannot be a ' + typeof constructor );
    }
    if ( typeof name !== 'string' || name === '' ) {
      throw new Error( 'Name must be a string and must not be empty' );
    }
    this.registry.add(name, constructor);
  };

  this.create = function ( name ) {
    var constructor = this.registry.get(name);
    if ( !constructor ) {
      throw new Error( 'No class registered by that name: ' + name );
    }
    // call the constructor providing the remaining arguments
    var args = Array.prototype.slice.call( arguments, 1 );
    var obj = Object.create( constructor.prototype );
    constructor.apply( obj, args );
    return obj;
  };

};

Substance.initClass(Factory);

module.exports = Factory;
