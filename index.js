"use strict";

var _ = require("underscore");

var Document = require('./src/document');
Document.Container = require('./src/container');
Document.Controller = require('./src/controller');
Document.Node = require('./src/node');
Document.Composite = require('./src/composite');
// TODO: this should also be moved to 'substance-nodes'
// However, currently there is too much useful in it that is also necessary for the test-suite
// Maybe, we should extract such things into helper functions so that it is easier to
// create custom text based, annotatable nodes.
Document.TextNode = require('./src/text_node');

module.exports = Document;
