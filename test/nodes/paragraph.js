'use strict';

var Substance = require('substance');

function Paragraph() {
  Paragraph.parent.apply(this, arguments);
};

Substance.inherit( Paragraph, Substance.Node );

Paragraph.static.schema = {
  "content": "string"
};

module.exports = Paragraph;
