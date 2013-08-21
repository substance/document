"use strict";

var Document = require('./src/document');
Document.Annotator = require('./src/annotator');
Document.Container = require('./src/container');
Document.Cursor = require('./src/cursor');
Document.Selection = require('./src/selection');
Document.Controller = require('./src/controller');
Document.Transformer = require('./src/transformer');

Document.Node = require('./src/node');
Document.Text = require('./src/text_node');
Document.Composite = require('./src/composite');

// Compatibility
Document.Writer = require('./src/controller');

module.exports = Document;
