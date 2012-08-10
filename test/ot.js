var ot = require('operational-transformation');
var _  = require('underscore');

// The classic
// --------

var operation = new ot.Operation(0)
  .retain(11)
  .insert(" dolor");

var newTxt = operation.apply("lorem ipsum");
console.log('applied operation:', newTxt);


// The JSON
// --------

var obj = {
  id: '1234',
  revision: 0,
  baseLength: 11,
  targetLength: 17,
  ops: [
    { retain: 11 },
    { insert: " dolor" }
  ]
};


var o = ot.Operation.fromJSON(obj);
var newTxt = o.apply("lorem ipsum");
console.log('applied operation:', newTxt);



// The Sequence
// --------

function createOperation(ops) {
  var operation = new ot.Operation(0)

  function map(method) {
    if (method === "ret") return "retain";
    if (method === "del") return "delete";
    if (method === "ins") return "insert";
  }

  _.each(ops, function(op) {
    operation[map(op[0])](op[1]);
  });
  return operation;
};


// ---

createOperation([["ret", 11], ["ins", " dolor"]]);

var o = ot.Operation.fromJSON(obj);
var newTxt = o.apply("lorem ipsum");

console.log('applied operation:', newTxt);