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
// {"id": "annotation:1", "type": "em", "pos": [0, 4] }
// {"id": "annotation:2", "type": "strong", "pos": [5, 9] }


// Update text
// =====================

// Apply a text operation on that using the Substance Document Manipulation API

var textOp = ["update", {id: "text:1", "delta": "ret(2) ins(l) ret(4) ins(o) ret(3) "}];
doc.apply(textOp);

// The new content will be:
// 
// 0   1   2   3   4   5   6   7   8   9  10  11
// ---------------------------------------------
// | h | e | l | l | o | _ | w | o | r | l | d |
// ---------------------------------------------

// Magic annotation transformation
// =====================
// 
// To update the annotations accordingly, we need a mechanism that takes a text operation as an input
// and returns a number of operations that can be applied on the annotation level

var corrections = extractAnnotationCorrections(textOp, annotations);

// =>
// [
//   ["update", {"id": "annotation:1", pos: [0, 5]}],
//   ["update", {"id": "annotation:2", pos: [6, 11]}]
// ]

// This is the format, that is understood by the Substance Document Model

annoations.apply(corrections);

// New annotation state
// =====================
// 
// {"id": "annotation:1", "type": "em", "pos": [0, 5] }
// {"id": "annotation:2", "type": "strong", "pos": [6, 11] }