var fs       = require('fs');
var Document = require('../document.js');

var schema = JSON.parse(fs.readFileSync(__dirname+ '/../data/substance.json', 'utf-8'));
var helloWorld = JSON.parse(fs.readFileSync(__dirname+ '/../data/hello_world.json', 'utf-8'));

// console.log(helloWorld);

// Create a new document at revision 0. It's just a plain old JS object?
// var doc = Document.create(schema);

// // Add a new section
// var newSectionOp = {
//   "rev": 0,
//   "user": "michael",
//   "methods": [
//     ["node:insert", {"type": "section", "properties": {"id": "open-collab", "name": "Open Collaboration"}}]
//   ]
// };

// var addTextOp = {
//   "rev": 1,
//   "user": "michael",
//   "methods": [
//     ["node:insert", {"type": "text", "properties": {"content": "Hallo Welt"}}]
//   ]
// };

// var setTitleOp = {
//   "rev": 2,
//   "user": "michael",
//   "methods": [
//     ["document:update", {"properties": {"content": "Hallo Welt"}}]
//   ]
// };

// var operations = [newSectionOp, addTextOp];

// Document.transform(doc, newSectionOp);


console.log('Tests completed.');

var doc = new Document(helloWorld, schema);

doc.checkout('master');

// console.log(doc.content);
// Add another node to front

doc.apply({
  "op": ["node:insert", {"id": "text:intro", "type": "text", "pos": "front", "properties": {"content": "Some fresh introduction."}}],
  "user": "michael"
});

// Move [text:intro] after text:hello

doc.apply({
  "op": ["node:move", {"nodes": ["text:intro"], "target": "text:hello"}],
  "user": "michael"
});

console.log('LISTING-------------');
doc.list(function(node) {
  console.log(node.id, node);
});

// console.log('FINAL_STAAAATE');

// console.log(doc.content);


// Document session, takes a stream of operations and applies them fast forward style
// var session = new Document.Session(doc, {operations: operations});

