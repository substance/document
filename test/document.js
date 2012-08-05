var fs       = require('fs');
var Document = require('../document.js');

var schema = JSON.parse(fs.readFileSync(__dirname+ '/../data/substance.json', 'utf-8'));


// Create a new document at revision 0. It's just a plain old JS object?
var doc = Document.create(schema);

// Add a new section
var newSectionOp = {
  "rev": 0,
  "user": "michael",
  "methods": [
    ["node:insert", {"type": "section", "properties": {"id": "open-collab", "name": "Open Collaboration"}}]
  ]
};

var addTextOp = {
  "rev": 1,
  "user": "michael",
  "methods": [
    ["node:insert", {"type": "text", "properties": {"content": "Hallo Welt"}}]
  ]
};

var setTitleOp = {
  "rev": 2,
  "user": "michael",
  "methods": [
    ["document:update", {"properties": {"content": "Hallo Welt"}}]
  ]
};

var operations = [newSectionOp, addTextOp];

// Document.transform(doc, newSectionOp);

// // Functional
// Document.list(doc, function(node, index) {
//   console.log(index, node);
// });

console.log('Tests completed.');

// Document session, takes a stream of operations and applies them fast forward style
var session = new Document.Session(doc, {operations: operations});

session.loadRevision(2);

console.log('REV1');
console.log(doc);

session.undo();
session.undo();

console.log('After undo undo.');
console.log(doc);

session.redo();
console.log('After redo.');
console.log(doc);


// session.loadRevision(1);

// console.log('REV1');
// console.log(doc);
