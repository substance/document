"use strict";

var Document = require('./src/document');
Document.Annotator = require('./src/annotator');
Document.Selection = require('./src/selection');
Document.Writer = require('./src/writer');
Document.Node = require('./src/node');
Document.Text = require('./src/text');


Document.Heading = require('./nodes/heading/');
Document.Paragraph = require('./nodes/paragraph/');
Document.Image = require('./nodes/image/');

console.log('DOCUMENT HEADINGXXXX', Document.Heading);

module.exports = Document;
