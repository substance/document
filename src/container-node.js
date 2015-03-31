'use strict';

var Substance = require('substance');
var Node = require('./node');

var ContainerNode = Node.extend({
  name: "container",

  properties: {
    // array of node ids
    nodes: ['array', 'string']
  },

});

module.exports = ContainerNode;
