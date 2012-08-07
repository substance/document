var fs       = require('fs');
var assert   = require('assert');
var Document = require('../document.js');

var schema = JSON.parse(fs.readFileSync(__dirname+ '/../data/substance.json', 'utf-8'));
var helloWorld = JSON.parse(fs.readFileSync(__dirname+ '/../data/hello_world.json', 'utf-8'));

var doc = new Document(helloWorld, schema);
doc.checkout('master');

// Ol' dirty fast forward merge
doc.merge('patch-1');

assert.ok(doc.content.nodes["text:outro"]);

// Add another node to front

doc.apply({
  "op": ["node:insert", {"id": "text:intro", "type": "text", "target": "front", "properties": {"content": "Some fresh introduction."}}],
  "user": "michael"
});

assert.ok(doc.content.nodes["text:intro"]);

// Move [text:intro] after text:hello

doc.apply({
  "op": ["node:move", {"nodes": ["text:intro"], "target": "text:hello"}],
  "user": "michael"
});

assert.ok(doc.content.head === "section:hello");

console.log('---------------------');
console.log('Your nodes, in order:');
console.log('---------------------');

doc.list(function(node) {
  console.log(node.id, node);
});

console.log('---------------------');
console.log('Tests completed.');
console.log('---------------------');
