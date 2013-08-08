"use strict";

// Import
// ========

var Test = require('substance-test');
var assert = Test.assert;
var registerTest = Test.registerTest;
var TestDocument = require('./test_document');
var Document = require("../index");

// Test
// ========

var DocumentTest = function () {

  this.setup = function() {

    this.doc = new TestDocument();
    console.log('constructed document', this.doc);
    // TODO: we should move annotation buisness to extra test
    this.annotator = new Document.Annotator(this.doc);
  };

  this.fixture = function() {
    var seed = require("./fixture.json");
    this.doc = new TestDocument({seed: seed});
  };

  this.actions = [

    "Document should have been seeded", function() {
      assert.isObjectEqual(TestDocument.Seed.nodes, this.doc.nodes);
    },

    "create()", function() {
      var expected = {
        id: "p1",
        type: "paragraph",
        content: "Fix problem quickly with galvanized jets"
      };
      this.doc.create(expected);

      var actual = this.doc.get(expected.id);
      assert.isDefined(actual);
      assert.isObjectEqual(expected, actual);
    },

    "get() should return a rich object", function() {
      var node = this.doc.get("p1");
      assert.isTrue(node instanceof TestDocument.Paragraph);
    },

    "get() should return `undefined` for unknown nodes", function() {
      assert.isUndefined(this.doc.get("bla"));
    },

    "get() should return identical instances", function() {
      var n1 = this.doc.get("p1");
      var n2 = this.doc.get("p1");
      assert.isEqual(n1, n2);
    },

    "Load fixture", function() {
      this.fixture();
    },

    "getPredecessor()", function() {
      var expected = this.doc.get("h1");
      var actual = this.doc.getPredecessor("content", "p1");
      assert.isEqual(expected, actual);
    },

    "getPredecessor() of the first node should return null", function() {
      assert.isNull(this.doc.getPredecessor("content", "h1"));
    },

    "getSuccessor()", function() {
      var expected = this.doc.get("h2");
      var actual = this.doc.getSuccessor("content", "p2");
      assert.isEqual(expected, actual);
    },

    "getSuccessor() of the last node should return null", function() {
      assert.isNull(this.doc.getSuccessor("content", "p4"));
    },

    "getNodeFromPosition()", function() {
      assert.isEqual(this.doc.get("h1"), this.doc.getNodeFromPosition("content", 0));
      assert.isEqual(this.doc.get("p3"), this.doc.getNodeFromPosition("content", 4));
    },

    "getNodeFromPosition() should return null for invalid positions", function() {
      assert.isNull(this.doc.getNodeFromPosition("content", -1));
    },

    "hide(<viewId>, <array-of-ids>)", function() {
      this.doc.hide("content", ["h2", "p3"]);
      assert.isArrayEqual(["h1", "p1", "p2", "p4"], this.doc.get(["content", "nodes"]));
    },

    "hide(<viewId>, <nodeId>): calling with single node id", function() {
      this.fixture();
      this.doc.hide("content", "h2");
      assert.isArrayEqual(["h1", "p1", "p2", "p3", "p4"], this.doc.get(["content", "nodes"]));
    },

    "hide() should reject an invalid view id", function() {
      assert.exception(Document.DocumentError, function() {
        this.doc.hide("bla", "p1");
      }, this);
    },

    "hide() should do nothing if no ids are given", function() {
      this.fixture();
      this.doc.hide("content", []);
      assert.isArrayEqual(["h1", "p1", "p2", "h2", "p3", "p4"], this.doc.get(["content", "nodes"]));
    },

    "hide() should accept random order", function() {
      this.fixture();
      this.doc.hide("content", ["p3", "h2"]);
      assert.isArrayEqual(["h1", "p1", "p2", "p4"], this.doc.get(["content", "nodes"]));
    },

    "hide() should accept duplicates", function() {
      this.fixture();
      this.doc.hide("content", ["p3", "p3"]);
      assert.isArrayEqual(["h1", "p1", "p2", "h2", "p4"], this.doc.get(["content", "nodes"]));
    },

    "hide() should tolerate invalid ids", function() {
      this.fixture();
      this.doc.hide("content", ["p5", 1, null, undefined]);
      assert.isArrayEqual(["h1", "p1", "p2", "h2", "p3", "p4"], this.doc.get(["content", "nodes"]));
    },

    "show() nodes at front", function() {
      this.fixture();
      this.doc.hide("content", ["h1", "p1", "p2", "h2", "p3", "p4"]);

      this.doc.show("content", ["h1", "p1", "p2"], 0);
      assert.isArrayEqual(["h1", "p1", "p2"], this.doc.get(["content", "nodes"]));
    },

    "show(<viewId>, <nodeId>): called with single id", function() {
      this.fixture();
      this.doc.hide("content", ["h1", "p1", "p2", "h2", "p3", "p4"]);

      this.doc.show("content", "h1", 0);
      assert.isArrayEqual(["h1"], this.doc.get(["content", "nodes"]));
    },

    "show() nodes at back", function() {
      this.fixture();
      this.doc.hide("content", ["h1", "p1", "p2"]);

      this.doc.show("content", ["h1", "p1", "p2"], -1);
      assert.isArrayEqual(["h2", "p3", "p4", "h1", "p1", "p2"], this.doc.get(["content", "nodes"]));
    },

    "show() should reject an invalid view id", function() {
      assert.exception(Document.DocumentError, function() {
        this.doc.show("bla", "blupp", 0);
      }, this);
    },

    "show() does not care about duplicates", function() {
      this.fixture();

      this.doc.show("content", ["h1", "p1", "p2"], -1);
      assert.isArrayEqual(["h1", "p1", "p2", "h2", "p3", "p4", "h1", "p1", "p2"], this.doc.get(["content", "nodes"]));
    },

    "show() should do nothing when no ids are given", function() {
      this.fixture();
      this.doc.show("content", [], 0);

      assert.isArrayEqual(["h1", "p1", "p2", "h2", "p3", "p4"], this.doc.get(["content", "nodes"]));
    },

    "show() should reject invalid ids", function() {
      this.fixture();
      assert.exception(Document.DocumentError, function() {
        this.doc.show("content", [1, null, undefined, "bla"], 0);
      }, this);
    },

    // TODO: write tests for startSimulation when it gets stable.

  ];
};

registerTest(['Document', 'Document Manipulation'], new DocumentTest());
