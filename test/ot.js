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

var o = createOperation([["ret", 11], ["ins", " dolor"]]);
var newTxt = o.apply("lorem ipsum");
console.log('applied operation:', newTxt);

// var textOp = ["update", {id: "text:1", "delta": "ret(2) ins(l) ret(4) ins(o) ret(3)"}];

var o = createOperation([["ret", 2], ["ins", "l"], ["ret", 4], ["ins", "o"], ["ret", 3]]);
var newTxt = o.apply("helo wrld");
console.log('applied operation:', newTxt);
