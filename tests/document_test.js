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

    "Document.create() should create a node", function() {
      var expected = {
        id: "t1",
        type: "text",
        content: "Fix problem quickly with galvanized jets"
      };
      this.doc.create(expected);

      var actual = this.doc.get(expected.id);
      assert.isDefined(actual);

      for (var key in expected) {
        assert.isEqual(expected[key], actual[key]);
      }
    },

    "Document.get() should return a rich object", function() {
      var node = this.doc.get("t1");
      assert.isTrue(node instanceof TestDocument.Text);
    },

    "Document.get() should return `undefined` for unknown nodes", function() {
      assert.isUndefined(this.doc.get("bla"));
    },

    "Document.get() should return identical instances", function() {
      var n1 = this.doc.get("p1");
      var n2 = this.doc.get("p1");
      assert.isEqual(n1, n2);
    },

    "...switching fixture...", function() {
      this.fixture();
    },

    "Document.hide() accepts an array of ids", function() {
      this.doc.hide("content", ["h2", "p3"]);
      assert.isArrayEqual(["h1", "p1", "p2", "p4"], this.doc.get(["content", "nodes"]));
    },

    "Document.hide() accepts a single id", function() {
      this.fixture();
      this.doc.hide("content", "h2");
      assert.isArrayEqual(["h1", "p1", "p2", "p3", "p4"], this.doc.get(["content", "nodes"]));
    },

    "Document.hide() should reject an invalid view id", function() {
      assert.exception(Document.DocumentError, function() {
        this.doc.hide("bla", "p1");
      }, this);
    },

    "Document.hide() should do nothing if no ids are given", function() {
      this.fixture();
      this.doc.hide("content", []);
      assert.isArrayEqual(["h1", "p1", "p2", "h2", "p3", "p4"], this.doc.get(["content", "nodes"]));
    },

    "Document.hide() should accept random order", function() {
      this.fixture();
      this.doc.hide("content", ["p3", "h2"]);
      assert.isArrayEqual(["h1", "p1", "p2", "p4"], this.doc.get(["content", "nodes"]));
    },

    "Document.hide() should accept duplicates", function() {
      this.fixture();
      this.doc.hide("content", ["p3", "p3"]);
      assert.isArrayEqual(["h1", "p1", "p2", "h2", "p4"], this.doc.get(["content", "nodes"]));
    },

    "Document.hide() should tolerate invalid ids", function() {
      this.fixture();
      this.doc.hide("content", ["p5", 1, null, undefined]);
      assert.isArrayEqual(["h1", "p1", "p2", "h2", "p3", "p4"], this.doc.get(["content", "nodes"]));
    },

    "Document.show(_, _, 0) puts nodes at the front", function() {
      this.fixture();
      this.doc.hide("content", ["h1", "p1", "p2", "h2", "p3", "p4"]);

      this.doc.show("content", ["h1", "p1", "p2"], 0);
      assert.isArrayEqual(["h1", "p1", "p2"], this.doc.get(["content", "nodes"]));
    },

    "Document.show() accepts a single id, default position is 0 (front)", function() {
      this.fixture();
      this.doc.hide("content", ["h1", "p1", "p2", "h2", "p3", "p4"]);

      this.doc.show("content", "h1", 0);
      assert.isArrayEqual(["h1"], this.doc.get(["content", "nodes"]));
    },

    "Document.show(_,_,-1) puts nodes at the back", function() {
      this.fixture();
      this.doc.hide("content", ["h1", "p1", "p2"]);

      this.doc.show("content", ["h1", "p1", "p2"], -1);
      assert.isArrayEqual(["h2", "p3", "p4", "h1", "p1", "p2"], this.doc.get(["content", "nodes"]));
    },

    "Document.show() should reject an invalid view id", function() {
      assert.exception(Document.DocumentError, function() {
        this.doc.show("bla", "blupp", 0);
      }, this);
    },

    "Document.show() does nothing against duplicates", function() {
      this.fixture();

      this.doc.show("content", ["h1", "p1", "p2"], -1);
      assert.isArrayEqual(["h1", "p1", "p2", "h2", "p3", "p4", "h1", "p1", "p2"], this.doc.get(["content", "nodes"]));
    },

    "Document.show() should do nothing when no ids are given", function() {
      this.fixture();
      this.doc.show("content", [], 0);

      assert.isArrayEqual(["h1", "p1", "p2", "h2", "p3", "p4"], this.doc.get(["content", "nodes"]));
    },

    "Document.show() should reject invalid ids", function() {
      this.fixture();
      assert.exception(Document.DocumentError, function() {
        this.doc.show("content", [1, null, undefined, "bla"], 0);
      }, this);
    },

  ];
};

registerTest(['Substance.Document', 'Document Manipulation'], new DocumentTest());
