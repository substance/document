var _        = require('underscore');
var fs       = require('fs');
var assert   = require('assert');
var Document = require('../document').Document;
var schema   = JSON.parse(fs.readFileSync(__dirname+ '/../data/substance.json', 'utf-8'));
var emptyDoc = JSON.parse(fs.readFileSync(__dirname+ '/fixtures/empty_document.json', 'utf-8'));



console.log("empty", emptyDoc);

// Just runs all the ops and checks the doc state against an invariant all the time.
var doc = new Document(emptyDoc, schema);
