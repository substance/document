(function(root) {

// Import
// ========

var _, ot, util, Document, Substance;

if (typeof exports !== 'undefined') {
  _    = require('underscore');
  ot   = require('./lib/operation');
  util   = require('./lib/util/util');
} else {
  _ = root._;
  ot = root.ot;
  util = root.Substance.util;
  Substance = root.Substance;
  Chronicle = root.Substance.Chronicle;
}

/*

Specification:
========

Inversion
--------

Requires the JSON-OT trick.

### set / update

Compute the inverted OT.

### insert

Remove the node.

### move

Move to the original position (-> record when applying).

### delete

Insert the original node at the original position (-> record when applying).


Rebasing
--------

Implementing the swap needs a bit of fiddling.
The table shows for each pair a strategy 'a/b' where a is for first
and second node/property being different, and 'b' if the first and second nodes/properties are the same.
Where '+' means that the changes can simply be swapped,
'-' that it is not possible at all, and 'x' is considered as an illegal state
which should not happen at all

first/second      set     insert    update    move    delete
set               +/I     +/x       +/I       +/+     +/-
insert            +/-     II/x      +/-       VI/-    VII/-
update            +/I     +/x       +/III     +/+     +/-
move              +/+     VIII/x    +/+       IV/V    VII/-
delete            +/x     VII/x     +/x       VII/x   +/x

Strategies
........

I. Set/update the same property

Transform the OTs.

II. Insert off different nodes

If `second.target == first`: swap targets.

III. Update the same property

Transform the OTs.

IV. Move different nodes

If `(first.target == second || second.target === first)`:  swap targets.

V. Move twice

Swap targets.

VI. Moved node references inserted node

Move to target of inserted node, insert after moved node.

VII. Target of inserted/moved node gets deleted

If `(first.target === second || second.target === first)`: insert at/move to predecessor of deleted node.

VIII. Inserting a node at a moved node.

If `(second.target === first)`: Still insert the node at `first`? Or at predecessor?


Implementation
========

JSON-OT Trick
--------

The idea is to transfer the 'string' OT mechanism to objects of other types
by computing a OT on the JSON.stringified representation.
Applying such a change would look like

 property = JSON.parse(ot.apply(JSON.stringify(property)))

Adapt methods.set to support the following cases:
1. [OTs...]
2. ["JSON", OTs] JSON.parse(ot.apply(JSON.stringify()))
3. val: legacy -> is not invertible!

Process methods.update in a similar way.

Adapt Document
--------

### checkout

Remove. Use `chronicle.open()`.

### export

`commits` should only contain operations in correct order.

### commit

Remove. Done by apply.

### getCommits

Remove. Use `chronicle.index.path(a, b)`.

### setRef/getRef

Remove. Use `chronicle.mark(name)` and `chronicle.find(name)`.

### undo/redo

Remove. Use `chronicle.step(next)`.

### apply

Remove commit stufff and override.
Call Document.apply (silently), add information necessary for inversion,
and record the operation. Finally, trigger listeners.

*/

// Implementation
// ========

var VersionedDocument = function(chronicle, document, schema) {
  Substance.Document.call(this, document, schema);
  this.adapter = new VersionedDocument.Adapter(this, chronicle);
}

VersionedDocument.__prototype__ = function() {
  var __super__ = util.prototype(this);

  this.export = function() {
    return {
      id: this.id,
      meta: this.meta,
      refs: this.refs,
      commits: this.chronicle.getChanges()
    };
  };

  this.apply = function(operation, silent, norecord) {
    __super__.apply.call(this, operation, true);

    if(!norecord) this.adapter.record(operation);

    if(!silend) {
      this.trigger('commit:applied', this.adapter.getState());
    }
  };
}
VersionedDocument.__prototype__.prototype = Substance.Document.prototype;
VersionedDocument.prototype = new VersionedDocument.__prototype__();

var Adapter = function(doc, chronicle) {
  Chronicle.Versioned.call(this, chronicle);
  this.doc = doc;
};

Adapter.__prototype__ = function() {

  var __super__ = util.prototype(this);

  this.apply = function(change) {
    // call the apply
    throw new errors.SubstanceError("Not implemented.");
  };

  this.revert = function(change) {
    throw new errors.SubstanceError("Not implemented.");
  };

  this.reset = function() {
    throw new errors.SubstanceError("Not implemented.");
  };
};
Adapter.__prototype__.prototype = Chronicle.Versioned.prototype;
Adapter.prototype = new Adapter.__prototype__();
VersionedDocument.Adapter = Adapter;

// Export
// ========

if (typeof exports !== 'undefined') {
  module.exports = VersionedDocument;
} else {
  root.Substance.VersionedDocument = VersionedDocument;
}

})(this);
