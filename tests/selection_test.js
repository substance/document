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
    this.sel = new Selection(this.doc);
  };

  this.fixture = function() {
    var seed = require("./fixture.json");
    this.doc = new TestDocument({seed: seed});    
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

    "move()", function() {
      assert.fail("Not tested yet");
    },

    "expand()", function() {
      assert.fail("Not tested yet");
    },

    "getNodes()", function() {
      assert.fail("Not tested yet");
    },

    "getRanges()", function() {
      assert.fail("Not tested yet");
    },

  ];
};

// General aid for the writertest
SelectionTest.Prototype = function() {
  // helpers go here
};

SelectionTest.prototype = new SelectionTest.Prototype();


registerTest(['Document', 'Selection'], new SelectionTest());
