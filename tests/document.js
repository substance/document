"use strict";

// Import
// ========

var _ = require("underscore");
var Test = require('substance-test');
var Operator = require('substance-operator');
var assert = Test.assert;
var registerTest = Test.registerTest;
var Document = require('../index');

var Document = require('../index');


// Test
// ========

var test = {};

test.setup = function() {
  this.doc = new Document({
    id: "substance_doc",
    creator: "michael",
    created_at: new Date()
  });

  // TODO: we should move annotation buisness to extra test
  this.annotator = new Annotator(this.doc);
};

test.actions = [

  "Check if valid document has been constructed", function() {
    assert.isArrayEqual(["content"], this.doc.get('document').views);
    assert.isTrue(_.isArray(this.doc.get('content').nodes));
    assert.isEqual("substance_doc", this.doc.get('document').guid);
    assert.isEqual("substance_doc", this.doc.id);
  },

  "Create a new heading node", function() {
    var node = {
      "id": "h1",
      "type": "heading",
      "content": "Heading 1"
    };
    this.doc.create(node);
    assert.isEqual(node.content, this.doc.get('h1').content);

    // h1.level should be automatically initialized with 0
    // TODO: should default to null later, once we support null values
    assert.isEqual(0, this.doc.get('h1').level);
  },

  "Create a new paragraph node", function() {

    this.doc.create({
      "id": "p1",
      "type": "paragraph",
      "content": "Text 1"
    });
    this.doc.create({
      "id": "p2",
      "type": "paragraph",
      "content": "Text 2"
    });

    assert.isDefined(this.doc.get('tp'));
    assert.isDefined(this.doc.get('tp'));
  },

  "Add nodes to content view", function() {
    this.doc.position("content", ["t2", "h1", "t1"], -1);
    assert.isArrayEqual(["t2", "h1", "t1"], this.doc.get('content').nodes);
  },

  "Repeating the positioning should have the same result", function() {
    this.doc.position("content", ["t2", "h1", "t1"], -1);
    assert.isArrayEqual(["t2", "h1", "t1"], this.doc.get('content').nodes);
  },

  "Reposition nodes ", function() {
    this.doc.position("content", ["h1", "t1", "t2"], 0);
    assert.isArrayEqual(["h1", "t1", "t2"], this.doc.get('content').nodes);
  },

  "Move down h1 by one", function() {
    this.doc.position("content", ["h1"], 1);
    assert.isArrayEqual(["t1", "h1", "t2"], this.doc.get('content').nodes);
  },

  "Move down h1 by one again", function() {
    this.doc.position("content", ["h1"], 2);
    assert.isArrayEqual(["t1", "t2", "h1"], this.doc.get('content').nodes);
  },

  "Update heading content", function() {
    this.doc.update(["h1", "content"], Operator.TextOperation.fromOT("Heading 1", [4, "ING", -3]));
    assert.isEqual("HeadING 1", this.doc.get("h1").content);
  },

  "Create a comment", function() {
    var comment = {
      "id": "c1",
      "content": "Hi, I'm a comment"
    }

    this.doc.comment("t1", comment);

    var comments = this.doc.find("comments", "t1");
    assert.equal(comments.length, 1);
    assert.equal(comments[0].id, "c1");
  },

  "Create an annotation", function() {
    var annotation = {
      "id": "a1",
      "type": "idea",
      "range": {start: 1, length: 3}
    };

    this.annotator.annotate(["t1", "content"], annotation);

    // Get annotations for text:1
    var annotations = this.annotator.getAnnotations({node: "t1"});
    assert.isEqual(1, annotations.length);

    var a1 = this.doc.get('a1');
    assert.equal("a1", a1.id);
    assert.equal("t1", a1.node, "t1");
    assert.isEqual(1, a1.range.start);
    assert.isEqual(3, a1.range.length);
  },

  "Change text, which affects the annotation we just created", function() {
    this.doc.update(["t1", "content"], [2, "EEE"]);

    var a1 = this.doc.get('a1');
    //assert.isEqual(1, a1.range.start);
    //assert.isEqual(6, a1.range.length);
  },

  "Stick comment to annotation", function() {
    // Create a comment that sticks on the annotation

    this.doc.comment("a1", {
      "id": "c2",
      "content": "Hello world"
    });

    // Get comments for annotation:1
    var comments = this.doc.find("comments", "a1");
    assert.equal(comments.length, 1);
    assert.equal(comments[0].id, "c2");
  },

  "Replace old property value with a new value (string)", function() {
    var newVal = "Meeh";
    this.doc.set(["c2", "content"], newVal);

    assert.equal(newVal, this.doc.get('c2').content);
  },

  "Delete all comments", function() {

    // Delete element, then check indexes again
    this.doc.delete("c1");
    this.doc.delete("c2");

    // Get comments for annotation:1
    var comments = this.doc.find("comments", "a1");
    assert.equal(comments.length, 0);
    assert.equal(undefined, this.doc.get('c1'));
    assert.equal(undefined, this.doc.get('c2'));
    assert.isDefined(this.doc.get('a1'));
  },

  "Update Annotation", function() {

    // TODO: this does not really make sense. Annotations have a range
    // which can not be transferred to another node.
    // Can this test be changed so that it makes more sense?

    this.doc.set(["a1", "node"], "t2");

    // Annotation no longer sticks on t1
    var annotations = this.doc.find('annotations', 't1');
    assert.equal(annotations.length, 0);

    // Should be returned when querying for annotations, t2
    annotations = this.doc.find('annotations', 't2');
    assert.equal(annotations.length, 1);
  },

  // Coming soon
  "Update Annotation Range (via setting the value)", function() {

    this.doc.set(["a1", "range"], {start: 1, length: 4});

    var a1 = this.doc.get('a1');
    assert.isEqual(1, a1.range.start);
    assert.isEqual(4, a1.range.length);
  },

  "Update Text incrementally", function() {
    this.doc.update(["t2", "content"], [5, -1, "Zwei"]);
    assert.isEqual("Text Zwei", this.doc.get('t2').content);
  },

  "Update numeric value of a heading", function() {
    this.doc.set(["h1", "level"], 2);
    assert.isEqual(2, this.doc.nodes["h1"].level);
  },

  "Hide nodes from view", function() {
    this.doc.hide("content", ["t1", "t2"]);
    assert.isArrayEqual(["h1"], this.doc.get('content').nodes);
  },

  "Delete nodes from graph and view(s)", function() {
    this.doc.delete("t1");
    this.doc.delete("t2");

    assert.isUndefined(this.doc.get('t1'));
    assert.isUndefined(this.doc.get('t2'));
    assert.isArrayEqual(["h1"], this.doc.get('content').nodes);
  },

  "Add new text element to the bottom", function() {

    this.doc.create({
      "id": "t3",
      "type": "text",
      "content": "Text 3"
    });

    assert.isDefined(this.doc.get('t3'));

    this.doc.position("content", ["t3"], -1);
    assert.isArrayEqual(["h1", "t3"], this.doc.get('content').nodes);
  }
];

registerTest(['Document', 'Document Manipulation'], test);
