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

Document.transform(doc, newSectionOp);

// Functional
Document.list(doc, function(node, index) {
  console.log(index, node);
});

console.log('Tests completed.');