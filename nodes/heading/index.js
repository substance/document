"use strict";

var Heading = require('./heading');
Heading.Transformer = require('./heading_transformer');
Heading.View = require('./heading_view');

console.log('heading/index.js', Object.keys(Heading.Transformer));

module.exports = Heading;
