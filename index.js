"use strict";

var _ = require("underscore");

var Document = require('./src/document');
Document.Annotator = require('./src/annotator');
Document.Container = require('./src/container');
Document.Cursor = require('./src/cursor');
Document.Selection = require('./src/selection');
Document.Controller = require('./src/document_controller');

// Compatibility
Document.Writer = require('./src/document_controller');

module.exports = Document;
