"use strict";

// Import
// ========

var Test = require('substance-test');
var assert = Test.assert;
var TestDocument = require('./test_document');
var Selection = require("../src/selection");
var Container = require("../src/container");
var errors = require("substance-util").errors;

// Test
// ========

var SelectionTest = function() {
  Test.call(this);
};

SelectionTest.Prototype = function() {

  this.setup = function() {
    this.fixture();
  };

  this.fixture = function() {
    var seed = require("./fixture.json");
    this.doc = new TestDocument({seed: seed});
    this.container = new Container(this.doc, "content");
    this.sel = new Selection(this.container);
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

    "Selection.set() should reject invalid positions", function() {
      assert.exception(Selection.SelectionError, function() {
        this.sel.set({start: [-1,0], end: [0,3]});
      }, this);
      assert.exception(Selection.SelectionError, function() {
        this.sel.set({start: [2000,0], end: [0,3]});
      }, this);
      assert.exception(errors.CursorError, function() {
        this.sel.set({start: [0,0], end: [-1,3]});
      }, this);
      assert.exception(errors.CursorError, function() {
        this.sel.set({start: [0,0], end: [2000,3]});
      }, this);

      // Note: char positions are checked by Cursor and this behavior should be tested there.
    },

    "Selection.setCursor() should collapse the selection", function() {
      this.sel.setCursor([0, 1]);
      assert.isTrue(this.sel.isCollapsed());
    },

    "Setting a reversed range", function() {
      this.sel.set({start: [0,3], end: [0,0]});
      assert.isTrue(this.sel.isReverse());
    },

    "Selection.range() always provides a selection in ascending order", function() {
      var expected = {start: [0,0], end: [0,3]};
      this.sel.set({start: [0,0], end: [0,3]});
      assert.isObjectEqual(expected, this.sel.range());

      this.sel.set({start: [0,3], end: [0,0]});
      assert.isObjectEqual(expected, this.sel.range());
    },

    "Selection.range() should return null for invalid selections", function() {
      var sel = new Selection(this.container);
      assert.isNull(sel.range());
    },

    "Selection.clear() should invalidate the selection", function() {
      var sel = this.sel;
      sel.set({start: [0,0], end: [0,3]});
      sel.clear();
      assert.isTrue(sel.isNull());
    },

    "Selection.selectNode() should span a range over the whole content of a node", function() {
      this.sel.selectNode("h1");
      var l = this.doc.get("h1").content.length;
      assert.isObjectEqual({start: [0,0], end: [0, l]}, this.sel.range());
    },

    "Selection.selectNode() should reject invalid node ids", function() {
      assert.exception(Container.ContainerError, function() {
        this.sel.selectNode("bla");
      }, this);
    },

    "Selection.selectNode() should reject selecting invisible nodes", function() {
      this.doc.hide("content", "p1");
      assert.exception(errors.ContainerError, function() {
        this.sel.selectNode("p1");
      }, this);
    },

    "Selection.collapse(): [0->3], right -> 3", function() {
      var sel = this.sel;
      sel.set({start: [0,0], end: [0,3]});
      sel.collapse("right");

      assert.isTrue(sel.isCollapsed());
      assert.isObjectEqual({start: [0,3], end: [0,3]}, sel.range());
    },

    "Selection.collapse(): [0->3], left -> 0", function() {
      var sel = this.sel;
      sel.set({start: [0,0], end: [0,3]});
      sel.collapse("left");

      assert.isTrue(sel.isCollapsed());
      assert.isObjectEqual({start: [0,0], end: [0,0]}, sel.range());
    },

    "Selection.collapse(): [0<-3], right -> 3", function() {
      var sel = this.sel;
      sel.set({start: [0,0], end: [0,3]});
      sel.collapse("right");

      assert.isTrue(sel.isCollapsed());
      assert.isObjectEqual({start: [0,3], end: [0,3]}, sel.range());
    },

    "Selection.collapse(): [0<-3], left -> 0", function() {
      var sel = this.sel;
      sel.set({start: [0,0], end: [0,3]});
      sel.collapse("left");

      assert.isTrue(sel.isCollapsed());
      assert.isObjectEqual({start: [0,0], end: [0,0]}, sel.range());
    },

    "Selection.collapse() should reject invalid direction name", function() {
      assert.exception(Selection.SelectionError, function() {
        this.sel.collapse("blupp");
      }, this);
    },

    "Selection.hasMultipleNodes()", function() {
      var sel = new Selection(this.container);
      // null selection should return false
      assert.isFalse(sel.hasMultipleNodes());

      sel.set({start: [0,0], end: [0,3]});
      assert.isFalse(sel.hasMultipleNodes());

      sel.set({start: [0,0], end: [1,3]});
      assert.isTrue(sel.hasMultipleNodes());
    },

    "Selection.move('right', 'char')", function() {
      this.fixture();
      var sel = this.sel;
      sel.setCursor([0,0]);
      sel.move('right', 'char');
      assert.isObjectEqual({start: [0,1], end: [0,1]}, sel.range());
    },

    "Selection.move('right', 'char') at end of node should move to next", function() {
      var sel = this.sel;
      var l = this.container.getLength(0);
      sel.setCursor([0,l]);
      sel.move('right', 'char');
      assert.isObjectEqual({start: [1,0], end: [1,0]}, sel.range());
    },

    "Selection.move('right', 'char') at end of document should do nothing", function() {
      var sel = this.sel;
      var nodePos = 5;
      var l = this.container.getLength(nodePos);
      var pos = [nodePos, l];
      sel.setCursor(pos);
      sel.move('right', 'char');
      assert.isObjectEqual({start: pos, end: pos}, sel.range());
    },

    "Selection.move('left', 'char')", function() {
      this.fixture();
      var sel = this.sel;
      sel.setCursor([0,3]);
      sel.move('left', 'char');
      assert.isObjectEqual({start: [0,2], end: [0,2]}, sel.range());
    },

    "Selection.move('left', 'char') at begin of node should move to previous", function() {
      var sel = this.sel;
      var l = this.container.getLength(0);
      sel.setCursor([1,0]);
      sel.move('left', 'char');
      assert.isObjectEqual({start: [0,l], end: [0,l]}, sel.range());
    },

    "Selection.move('left', 'char') at begin of document should do nothing", function() {
      var sel = this.sel;
      var pos = [0,0];
      sel.setCursor(pos);
      sel.move('left', 'char');
      assert.isObjectEqual({start: pos, end: pos}, sel.range());
    },


    "Selection.move('right', 'char') with selected range should collapse to the right boundary", function() {
      var sel = this.sel;
      sel.set({start: [0,0], end: [0,3]});
      sel.move('right', 'char');
      assert.isObjectEqual({start: [0,3], end: [0,3]}, sel.range());
    },

    "Selection.move('left', 'char') with selected range should collapse to the left boundary", function() {
      var sel = this.sel;
      sel.set({start: [0,0], end: [0,3]});
      sel.move('left', 'char');
      assert.isObjectEqual({start: [0,0], end: [0,0]}, sel.range());
    },

    "Selection.getRanges()", function() {
      var sel = this.sel;
      sel.set({
        start: [1,1],
        end: [3,6]
      });
      var ranges = sel.getRanges();
      assert.isObjectEqual(this.doc.get("p1"), ranges[0].component.root);
      assert.isObjectEqual(this.doc.get("p2"), ranges[1].component.root);
      assert.isObjectEqual(this.doc.get("h2"), ranges[2].component.root);
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
SelectionTest.Prototype.prototype = Test.prototype;
SelectionTest.prototype = new SelectionTest.Prototype();

Test.registerTest(['Substance.Document', 'Selection'], new SelectionTest());
