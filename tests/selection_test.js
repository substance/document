"use strict";

// Import
// ========

var Test = require('substance-test');
var assert = Test.assert;
var registerTest = Test.registerTest;
var TestDocument = require('./test_document');
var Document = require("../index");
var Selection = Document.Selection;

// Test
// ========

var SelectionTest = function() {


  this.setup = function() {
    this.fixture();
  };

  this.fixture = function() {
    var seed = require("./fixture.json");
    this.doc = new TestDocument({seed: seed});    
    this.sel = new Selection(this.doc);
  };

  this.actions = [

    "Empty Selection 'isNull' and has no valid Cursor", function() {
      assert.isTrue(this.sel.isNull());
      var cursor = this.sel.getCursor();
      assert.isFalse(cursor.isValid());
    },

    "Setting a range in the first node", function() {
      this.sel.set({start: [0,0], end: [0,3]});
      assert.isFalse(this.sel.isCollapsed());
      assert.isEqual(0, this.sel.startNode());
      assert.isEqual(0, this.sel.startChar());
      assert.isEqual(0, this.sel.endNode());
      assert.isEqual(3, this.sel.endChar());
      assert.isFalse(this.sel.isCollapsed());
    },

    "set() should reject invalid positions", function() {
      assert.exception(Selection.SelectionError, function() {
        this.sel.set({start: [-1,0], end: [0,3]});
      }, this);
      assert.exception(Selection.SelectionError, function() {
        this.sel.set({start: [2000,0], end: [0,3]});
      }, this);
      assert.exception(Selection.SelectionError, function() {
        this.sel.set({start: [0,0], end: [-1,3]});
      }, this);
      assert.exception(Selection.SelectionError, function() {
        this.sel.set({start: [0,0], end: [2000,3]});
      }, this);

      // Note: char positions are checked by Cursor and this behavior should be tested there. 
    },

    "setCursor() should collapse the selection", function() {
      this.sel.setCursor([0, 1]);
      assert.isTrue(this.sel.isCollapsed());
    },

    "Setting a reversed range", function() {
      this.sel.set({start: [0,3], end: [0,0]});
      assert.isTrue(this.sel.isReverse());
    },

    "range() always provides a selection in ascending order", function() {
      var expected = {start: [0,0], end: [0,3]};
      this.sel.set({start: [0,0], end: [0,3]});
      assert.isObjectEqual(expected, this.sel.range());

      this.sel.set({start: [0,3], end: [0,0]});
      assert.isObjectEqual(expected, this.sel.range());
    },

    "range() should return null for invalid selections", function() {
      var sel = new Selection(this.doc);
      assert.isNull(sel.range());
    },

    "clear() should invalidate the selection", function() {
      var sel = this.sel;
      sel.set({start: [0,0], end: [0,3]});
      sel.clear();
      assert.isTrue(sel.isNull());
    },

    "selectNode() should span a range over the whole content of a node", function() {
      this.sel.selectNode("h1");
      var l = this.doc.get("h1").content.length;
      assert.isObjectEqual({start: [0,0], end: [0, l]}, this.sel.range());
    },

    "selectNode() should reject invalid node ids", function() {
      assert.exception(Selection.SelectionError, function() {
        this.sel.selectNode("bla");
      }, this);
    },

    "selectNode() should reject selecting invisible nodes", function() {
      this.doc.hide("content", "p1");
      assert.exception(Selection.SelectionError, function() {
        this.sel.selectNode("p1");
      }, this);
    },

    "collapse(): [0->3], right -> 3", function() {
      var sel = this.sel;
      sel.set({start: [0,0], end: [0,3]});
      sel.collapse("right");

      assert.isTrue(sel.isCollapsed());
      assert.isObjectEqual({start: [0,3], end: [0,3]}, sel.range());
    },

    "collapse(): [0->3], left -> 0", function() {
      var sel = this.sel;
      sel.set({start: [0,0], end: [0,3]});
      sel.collapse("left");

      assert.isTrue(sel.isCollapsed());
      assert.isObjectEqual({start: [0,0], end: [0,0]}, sel.range());
    },

    "collapse(): [0<-3], right -> 3", function() {
      var sel = this.sel;
      sel.set({start: [0,0], end: [0,3]});
      sel.collapse("right");

      assert.isTrue(sel.isCollapsed());
      assert.isObjectEqual({start: [0,3], end: [0,3]}, sel.range());
    },

    "collapse(): [0<-3], left -> 0", function() {
      var sel = this.sel;
      sel.set({start: [0,0], end: [0,3]});
      sel.collapse("left");

      assert.isTrue(sel.isCollapsed());
      assert.isObjectEqual({start: [0,0], end: [0,0]}, sel.range());
    },

    "collapse() should reject invalid direction name", function() {
      assert.exception(Selection.SelectionError, function() {
        this.sel.collapse("blupp");
      }, this);
    },

    "hasMultipleNodes()", function() {
      var sel = new Selection(this.doc);
      // null selection should return false
      assert.isFalse(sel.hasMultipleNodes());

      sel.set({start: [0,0], end: [0,3]});
      assert.isFalse(sel.hasMultipleNodes());

      sel.set({start: [0,0], end: [1,3]});
      assert.isTrue(sel.hasMultipleNodes());
    },

/*
  this.move = function(direction, granularity) {

    // moving an expanded selection by char collapses the selection
    // and sets the cursor to the boundary of the direction
    if (!this.isCollapsed() && granularity === "char") {
      this.collapse(direction);
    }
    // otherwise the cursor gets moved (together with start)
    else {
      this.__cursor.move(direction, granularity);
      this.start = this.__cursor.position();
    }

    this.trigger('selection:changed', this.range());
  };

*/
    "move('right', 'char')", function() {
      this.fixture();
      var sel = this.sel;
      sel.setCursor([0,0]);
      sel.move('right', 'char');
      assert.isObjectEqual({start: [0,1], end: [0,1]}, sel.range());
    },

    "move('right', 'char') at end of node should move to next", function() {
      var sel = this.sel;
      var node = this.doc.getNodeFromPosition("content", 0);
      var l = node.content.length;
      sel.setCursor([0,l]);
      sel.move('right', 'char');
      assert.isObjectEqual({start: [1,0], end: [1,0]}, sel.range());
    },

    "move('right', 'char') at end of document should do nothing", function() {
      var sel = this.sel;
      var nodePos = 5;
      var node = this.doc.getNodeFromPosition("content", nodePos);
      var l = node.content.length;
      var pos = [nodePos,l];
      sel.setCursor(pos);
      sel.move('right', 'char');
      assert.isObjectEqual({start: pos, end: pos}, sel.range());
    },

    "move('left', 'char')", function() {
      this.fixture();
      var sel = this.sel;
      sel.setCursor([0,3]);
      sel.move('left', 'char');
      assert.isObjectEqual({start: [0,2], end: [0,2]}, sel.range());
    },

    "move('left', 'char') at begin of node should move to previous", function() {
      var sel = this.sel;
      var node = this.doc.getNodeFromPosition("content", 0);
      var l = node.content.length;
      sel.setCursor([1,0]);
      sel.move('left', 'char');
      assert.isObjectEqual({start: [0,l], end: [0,l]}, sel.range());
    },

    "move('left', 'char') at begin of document should do nothing", function() {
      var sel = this.sel;
      var pos = [0,0];
      sel.setCursor(pos);
      sel.move('left', 'char');
      assert.isObjectEqual({start: pos, end: pos}, sel.range());
    },


    "move('right', 'char') with selected range should collapse to the right boundary", function() {
      var sel = this.sel;
      sel.set({start: [0,0], end: [0,3]});
      sel.move('right', 'char');
      assert.isObjectEqual({start: [0,3], end: [0,3]}, sel.range());
    },

    "move('left', 'char') with selected range should collapse to the left boundary", function() {
      var sel = this.sel;
      sel.set({start: [0,0], end: [0,3]});
      sel.move('left', 'char');
      assert.isObjectEqual({start: [0,0], end: [0,0]}, sel.range());
    },

    "move('right', 'word')", function() {
      // "The quick brown fox jumps over the lazy dog."
      var sel = this.sel;
      sel.setCursor([1,1]); // after 'T' in 'The'
      var expected = [1,3]; // after 'e' in 'The'
      sel.move('right', 'word');
      assert.isObjectEqual({start: expected, end: expected}, sel.range());
    },

    "move('right', 'word') should step to node boundary (e.g, '.' at the end)", function() {
      // "The quick brown fox jumps over the lazy dog."
      var sel = this.sel;
      sel.setCursor([1,42]); // before '.'
      var expected = [1, 43]; // after '.'
      sel.move('right', 'word');
      assert.isObjectEqual({start: expected, end: expected}, sel.range());
    },

    "move('left', 'word')", function() {
      // "The quick brown fox jumps over the lazy dog."
      var sel = this.sel;
      sel.setCursor([1,7]); // before 'c' of 'quick'
      var expected = [1,4]; // before 'q' of 'quick'
      sel.move('left', 'word');
      assert.isObjectEqual({start: expected, end: expected}, sel.range());
    },

    "move('left', 'word') should skip leading non-word characters (e.g., whitespaces)", function() {
      // "  Pack my box with five dozen liquor jugs."
      var sel = this.sel;
      sel.setCursor([2,2]); // before 'P' of 'Pack'
      var expected = [2,0]; // at begin of line
      sel.move('left', 'word');
      assert.isObjectEqual({start: expected, end: expected}, sel.range());
    },

    // Note: expand is not tested in greater detail as it delegates to move
    "expand('right', 'word')", function() {
      // "The quick brown fox jumps over the lazy dog."
      var sel = this.sel;
      sel.setCursor([1,1]); // after 'T' in 'The'
      var expected = [1,3]; // after 'e' in 'The'
      sel.expand('right', 'word');
      assert.isObjectEqual({start: [1,1], end: expected}, sel.range());
    },

    // Note: expand is not tested in greater detail as it delegates to move
    "expand('left', 'word') with change of direction", function() {
      // "The quick brown fox jumps over the lazy dog."
      var sel = this.sel;
      sel.set({
        start: [1,6],  // after 'u' in 'quick' 
        end: [1,9] // after 'k' in 'quick'
      });
      sel.expand('left', 'word');
      assert.isObjectEqual({start: [1,4], end: [1,6]}, sel.range());
      assert.isTrue(sel.isReverse());
    },

    "getNodes()", function() {
      var sel = this.sel;
      sel.set({
        start: [1,0], 
        end: [3,6]
      });
      var expected = [this.doc.get("p1"), this.doc.get("p2"), this.doc.get("h2")];
      var actual = sel.getNodes();
      assert.isArrayEqual(expected, actual);
    },

    // TODO: test ranges more thoroughly
    "getRanges()", function() {
      var sel = this.sel;
      sel.set({
        start: [1,1], 
        end: [3,6]
      });
      var ranges = sel.getRanges();
      assert.isObjectEqual(this.doc.get("p1"), ranges[0].node);
      assert.isObjectEqual(this.doc.get("p2"), ranges[1].node);
      assert.isObjectEqual(this.doc.get("h2"), ranges[2].node);
    },

    "Range.isPartial()/isFull()", function() {
      var sel = this.sel;
      sel.set({
        start: [1,1], 
        end: [3,2]
      });
      var ranges = sel.getRanges();
      assert.isTrue(ranges[0].isPartial());
      assert.isTrue(ranges[1].isFull());
      assert.isTrue(ranges[2].isPartial());
    },

  ];
};

// General aid for the writertest
SelectionTest.Prototype = function() {
  // helpers go here
};

SelectionTest.prototype = new SelectionTest.Prototype();


registerTest(['Document', 'Selection'], new SelectionTest());
