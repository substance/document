"use strict";

var _ = require("underscore");

var Document = require('./src/document');
Document.Annotator = require('./src/annotator');
Document.Cursor = require('./src/cursor');
Document.Selection = require('./src/selection');

module.exports = Document;
