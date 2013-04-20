var _        = require('underscore');
var fs       = require('fs');
var assert   = require('assert');
var Document = require('../document.js');
var schema   = JSON.parse(fs.readFileSync(__dirname+ '/../data/substance.json', 'utf-8'));

var helloWorld = JSON.parse(fs.readFileSync(__dirname+ '/../data/hello_world.json', 'utf-8'));
var helloWorldAnnotations = JSON.parse(fs.readFileSync(__dirname+ '/../data/hello_world_annotations.json', 'utf-8'));


// Bookkeeper
// --------
// 
// Keeps in sync annotations with the document
// Takes a document and an annotations document as an input

var Bookkeeper = function(doc, annotations) {

  function isTextUpdate(op) {
    return op.op[0] === "update" && doc.content.nodes[op.op[1].id].type === "text";
  }

  // get Text annotations for a particular text node
  function getTextAnnotations(nodeId) {
    return _.select(annotations.content.nodes, function(a) {
      return doc.content.nodes[a.node].id === nodeId;
    });
  }

  // Not functional yet, just sketching the idea
  doc.on('operation:applied', function(op) {
    console.log('APPLIIIED', op);
    if (isTextUpdate(op)) {
      // console.log('Annotations for Text:', getTextAnnotations(op.op[1].id));
      var corrections = Bookkeeper.transform(op, getTextAnnotations(op.op[1].id));
      _.each(corrections, function(op) {
        annotations.apply({op: op, user: op.user});
      });
    }
  });
};


// Uses a text operation and an array of annotation objects as an input and spits out
// 
// Usage:
// 
// var textOp = ["update", {id: "text:hello", "delta": [["ret", 2], ["ins", "l"], ["ret", 4], ["ins", "o"], ["ret", 3]]}];
// var annotations = [
//   {"id": "annotation:1", "type": "em", "pos": [0, 4] },
//   {"id": "annotation:2", "type": "strong", "pos": [5, 9] }
// ];
// Bookkeeper.transform(textOp, annotations);

// Question: Does it actually matter on which content the text operation is applied?
// Or does this work without any context, which would be great! :)

Bookkeeper.transform = function(operation, annotations) {
  // Oliver... over to you! :)
  return [
    ["update", {"id": "annotation:1", pos: [0, 5]}],
    ["update", {"id": "annotation:2", pos: [6, 11]}]
  ];
};


var doc = new Document(helloWorld, schema);
doc.checkout('master', 'head');

var annotations = new Document(helloWorldAnnotations, schema);
annotations.checkout('master', 'head');



// Start Bookkeeper
// =====================

// To update the annotations accordingly, we need a mechanism that takes a text operation as an input
// and returns a number of operations that can be applied on the annotation level

var bookKeeper = new Bookkeeper(doc, annotations);


// Initial situation
// =====================
// 
// Assume we have a Substance document at revision 3
// It contains a text element text:1 with this content
// 
// 0   1   2   3   4   5   6   7   8   9 
// -------------------------------------
// | h | e | l | o | _ | w | r | l | d |
// -------------------------------------
// 
// And we have two annotations kept externally
// 
// {"id": "annotation:1", "node": "text:hello", "type": "em", "pos": [0, 4] }
// {"id": "annotation:2", "node": "text:hello", type": "strong", "pos": [5, 9] }


// Update text
// =====================

// Apply a text operation on that using the Substance Document Manipulation API

var textOp = ["update", {id: "text:hello", "delta": [["ret", 2], ["ins", "l"], ["ret", 4], ["ins", "o"], ["ret", 3]]}];
doc.apply({op: textOp, user: "michael"});


// The new content will be:
// 
// 0   1   2   3   4   5   6   7   8   9  10  11
// ---------------------------------------------
// | h | e | l | l | o | _ | w | o | r | l | d |
// ---------------------------------------------

assert.ok(doc.content.nodes["text:hello"].content === "Hello world");


console.log('---------------------');
console.log('Document State:');
console.log('---------------------');

console.log(doc.content);


// New annotation state
// =====================
// 
// {"id": "annotation:1", "type": "em", "pos": [0, 5] }
// {"id": "annotation:2", "type": "strong", "pos": [6, 11] }

console.log('---------------------');
console.log('Annotations State:');
console.log('---------------------');
console.log(annotations.content.nodes);


assert.deepEqual(annotations.content.nodes["annotation:1"].pos, [0, 5]);
assert.deepEqual(annotations.content.nodes["annotation:2"].pos, [6, 11]);
