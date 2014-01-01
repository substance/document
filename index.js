"use strict";

var _ = require("underscore");

var Document = require('./src/document');
Document.Annotator = require('./src/annotator');
Document.Cursor = require('./src/cursor');
Document.Selection = require('./src/selection');
Document.Container = require('./src/container');
Document.Session = require('./src/document_session');

module.exports = Document;
