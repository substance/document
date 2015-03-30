'use strict';

var Substance = require('substance');

function Strong( data ) {
  Substance.Annotation.call(this, data);
}

Substance.inherit( Strong, Substance.Annotation );

Strong.static.name = 'strong';

Strong.static.matchFunction = function(el) {
  return el.tagName.toLowerCase() === "strong";
}

module.exports = Strong;
