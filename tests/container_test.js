var Test = require('substance-test');
var assert = Test.assert;
var registerTest = Test.registerTest;
var TestDocument = require('./test_document');
var Document = require("../index");
var Container = require("../src/container");
var Chronicle = require("substance-chronicle");

var DOC = {
  "nodes": {
    "h1": {
      "id": "h1",
      "type": "heading",
      "content": "Part 1",
      "level": 1
    },
    "p1": {
      "id": "p1",
      "type": "paragraph",
      "content": "The quick brown fox jumps over the lazy dog."
    },
    "l1": {
      "id": "l1",
      "type": "list",
      "items": ["p10", "p11", "p12"],
    },
    "p10": {
      "id": "p10",
      "type": "paragraph",
      "content": "List item 1."
    },
    "p11": {
      "id": "p11",
      "type": "paragraph",
      "content": "List item 2."
    },
    "p12": {
      "id": "p12",
      "type": "paragraph",
      "content": "List item 3."
    },
    "p2": {
      "id": "p2",
      "type": "paragraph",
      "content": "  Pack my box with five dozen liquor jugs."
    },
    "h2": {
      "id": "h2",
      "type": "heading",
      "content": "Part 2",
      "level": 1
    },
    "p3": {
      "id": "p3",
      "type": "paragraph",
      "content": "Fix problem quickly with galvanized jets."
    },
    "f1": {
      "id": "f1",
      "type": "figure",
      "image": "i1",
      "caption": "p13"
    },
    "i1": {
      "id": "i1",
      "type": "image",
      "url": "https://github-camo.global.ssl.fastly.net/e0a00dc1e48a3c136441721dfe70a8bf67719e2b/687474703a2f2f662e636c2e6c792f6974656d732f334d326a306a326e31733042304f3259337032682f696c2d6c656f6e652d69636f6e2e706e67"
    },
    "p13": {
      "id": "p13",
      "type": "paragraph",
      "content": "The Substance Icon."
    },
    "p4": {
      "id": "p4",
      "type": "paragraph",
      "content": "Heavy boxes perform quick waltzes and jigs."
    },
    "content": {
      "id": "content",
      "type": "view",
      "nodes": ["h1", "p1", "l1", "p2", "h2", "p3", "f1", "p4"]
    },
    "p20": {
      "id": "p20",
      "type": "paragraph",
      "content": "Some other content."
    },
  }
};

var ContainerTest = function () {

  this.setup = function() {
    this.doc = new TestDocument({seed: DOC, chronicle: Chronicle.create({mode: Chronicle.HYSTERICAL})});
    this.container = this.doc.get("content");
  };

  this.actions = [
    "Access nodes in the flattened view", function() {
      var nodes = this.container.getNodes("idsOnly");
      assert.isArrayEqual(["h1", "p1", "p10", "p11", "p12", "p2", "h2", "p3", "i1", "p13", "p4"], nodes);
    },

    "Get parent of nested node", function() {
      var parent = this.container.getParent("p10");
      assert.isEqual("l1", parent);
    },

    "Parent of top-level nodes is null", function() {
      var parent = this.container.getParent("p1");
      assert.isEqual(null, parent);
    },

    "Update the view when adding a node to a composite", function() {
      this.setup();
      this.doc.update(["l1", "items"], ["+", 3, "p20"]);
      var nodes = this.container.getNodes("idsOnly");
      assert.isArrayEqual(["h1", "p1", "p10", "p11", "p12", "p20", "p2", "h2", "p3", "i1", "p13", "p4"], nodes);
    },

    "Update the view when removing a node from a composite", function() {
      this.setup();
      this.doc.update(["l1", "items"], ["-", 2, "p12"]);
      var nodes = this.container.getNodes("idsOnly");
      assert.isArrayEqual(["h1", "p1", "p10", "p11", "p2", "h2", "p3", "i1", "p13", "p4"], nodes);
    },

    "Update the view when changing a reference in a composite", function() {
      this.setup();
      this.doc.set(["f1", "caption"], "p20");
      var nodes = this.container.getNodes("idsOnly");
      assert.isArrayEqual(["h1", "p1", "p10", "p11", "p12", "p2", "h2", "p3", "i1", "p20", "p4"], nodes);
    },

    "Update the view when changing a top-level composite", function() {
      this.setup();
      this.doc.update(["content", "nodes"], ["-", 2, "l1"]);
      var nodes = this.container.getNodes("idsOnly");
      assert.isArrayEqual(["h1", "p1", "p2", "h2", "p3", "i1", "p13", "p4"], nodes);
    },

    "Child nodes can only be referenced once", function() {
      this.setup();
      // Note: "p13" is already used as caption in 'f1'
      assert.exception(function() {
        this.doc.update(["l1", "items"], ["+", 3, "p13"]);
      }, this);
    },
  ];
};

registerTest(['Substance.Document', 'Container'], new ContainerTest());
