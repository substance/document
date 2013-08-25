"use strict";

var _ = require("underscore");
var util = require("substance-util");
var Test = require('substance-test');
var assert = Test.assert;
var registerTest = Test.registerTest;
var TestDocument = require("./test_document");
var DocumentController = require("../src/controller");
var Chronicle = require("substance-chronicle");

var FIXTURES = {};

var DocumentManipulationTest = function () {

  this.setup = function() {
  };

  this.fixture = function(name) {
    var data = FIXTURES[name];
    this.doc = new TestDocument({seed: data, chronicle: Chronicle.create({mode: Chronicle.HYSTERICAL })});
    this.controller = new DocumentController(this.doc);
    this.container = this.controller.container;
    this.manipulator = new DocumentController.ManipulationSession(this.doc, this.controller.selection);
    return data;
  };

  this.actions = [

    "Join two paragraphs", function() {
      var fixture = this.fixture("two_paragraphs");

      var success = this.manipulator.join("p1", "p2");
      assert.isTrue(success);

      var p1 = this.doc.get("p1");
      var expectedContent = fixture.nodes["p1"].content + fixture.nodes["p2"].content;

      assert.isEqual(expectedContent, p1.content);
      assert.isUndefined(this.doc.get("p2"));
      assert.isArrayEqual(["p1"], this.container.getNodes("idsOnly"));
    },

    "Reject join of incompatible nodes", function() {
      this.fixture("paragraph_and_image");

      var success = this.manipulator.join("p1", "i1");

      assert.isFalse(success);
      assert.isArrayEqual(["p1", "i1"], this.container.getNodes("idsOnly"));
    },

    "Nested nodes: join two list items", function() {
      var fixture = this.fixture("list");

      var success = this.manipulator.join("p1", "p2");
      assert.isTrue(success);

      var p1 = this.doc.get("p1");
      var l1 = this.doc.get("l1");

      var expectedContent = fixture.nodes["p1"].content + fixture.nodes["p2"].content;

      assert.isEqual(expectedContent, p1.content);
      assert.isUndefined(this.doc.get("p2"));
      assert.isArrayEqual(["p1", "p3"], l1.items);
    },

    "Embedded Nested Nodes: join paragraph with list item", function() {
      var fixture = this.fixture("embedded_list");

      var success = this.manipulator.join("p1", "p2");
      assert.isTrue(success);

      var p1 = this.doc.get("p1");
      var l1 = this.doc.get("l1");

      var expectedContent = fixture.nodes["p1"].content + fixture.nodes["p2"].content;
      assert.isEqual(expectedContent, p1.content);
      assert.isUndefined(this.doc.get("p2"));
      assert.isArrayEqual(["p3", "p4"], l1.items);
    },

    "Embedded Nested Nodes: join last list item with paragraph", function() {
      var fixture = this.fixture("embedded_list");

      var success = this.manipulator.join("p4", "p5");
      assert.isTrue(success);

      var p4 = this.doc.get("p4");

      var expectedContent = fixture.nodes["p4"].content + fixture.nodes["p5"].content;
      assert.isEqual(expectedContent, p4.content);
      assert.isUndefined(this.doc.get("p5"));
      assert.isArrayEqual(["p1", "l1"], this.container.treeView);
    },

    "Embedded Nested Nodes: can not join with a figure caption", function() {
      this.fixture("embedded_figure");

      var success = this.manipulator.join("p2", "p3");
      assert.isFalse(success);

      assert.isArrayEqual(["p1", "f1", "p3"], this.container.treeView);
    },

    "Join two lists", function() {
      var fixture = this.fixture("two_lists");

      var success = this.manipulator.join("p2", "p3");
      assert.isTrue(success);

      var l1 = this.doc.get("l1");
      var p2 = this.doc.get("p2");

      var expectedContent = fixture.nodes["p2"].content + fixture.nodes["p3"].content;
      assert.isEqual(expectedContent, p2.content);
      assert.isUndefined(this.doc.get("p3"));
      assert.isArrayEqual(["p1", "p2", "p4"], l1.items);
      assert.isArrayEqual(["l1"], this.container.treeView);
    },

    "Joins in multiply nested nodes: nested lists", function() {
      var fixture = this.fixture("nested_lists");

      var success = this.manipulator.join("p1", "p2");
      assert.isTrue(success);

      var l1 = this.doc.get("l1");
      var l2 = this.doc.get("l2");
      var p1 = this.doc.get("p1");

      var expectedContent = fixture.nodes["p1"].content + fixture.nodes["p2"].content;
      assert.isEqual(expectedContent, p1.content);
      assert.isUndefined(this.doc.get("p2"));
      assert.isArrayEqual(["p1", "l2", "p4"], l1.items);
      assert.isArrayEqual(["p3"], l2.items);
      assert.isArrayEqual(["l1"], this.container.treeView);
    },

    "Delete partially (single paragraph)", function() {
      this.fixture("single_paragraph");

      this.controller.selection.set({start: [0, 2], end: [0, 4]});
      this.controller.delete();

      var p1 = this.doc.get("p1");
      var expected = "Heo";
      assert.isEqual(expected, p1.content);
    },

    "Delete full node (single paragraph)", function() {
      this.fixture("single_paragraph");

      this.controller.selection.set({start: [0, 0], end: [0, 5]});
      this.controller.delete();

      assert.isUndefined(this.doc.get("p1"));
      assert.isArrayEqual([], this.container.getNodes("idsOnly"));
    },

    "Delete across two paragraphs", function() {
      this.fixture("two_paragraphs");

      this.controller.selection.set({start: [0, 4], end: [1, 1]});
      this.controller.delete();

      var p1 = this.doc.get("p1");
      var expected = "Hellorld";

      assert.isEqual(expected, p1.content);
    },

    "Delete multi-nodes, fully", function() {
      this.fixture("two_paragraphs");

      this.controller.selection.set({start: [0, 0], end: [1, 5]});
      this.controller.delete();

      assert.isArrayEqual([], this.container.getNodes("idsOnly"));
    },

    "Delete, but don't join an image", function() {
      this.fixture("paragraph_and_image");

      this.controller.selection.set({start: [0, 4], end: [1, 0]});
      this.controller.delete();

      assert.isArrayEqual(["p1", "i1"], this.container.getNodes("idsOnly"));
    },

    "Delete a list item", function() {
      this.fixture("list");

      this.controller.selection.set({start: [0, 0], end: [1, 0]});
      this.controller.delete();

      var l1 = this.doc.get("l1");
      assert.isArrayEqual(["p2", "p3"], l1.items);
    },

    "Deleting in list with join of items", function() {
      this.fixture("list");

      this.controller.selection.set({start: [0, 2], end: [1, 1]});
      this.controller.delete();

      var l1 = this.doc.get("l1");
      var p1 = this.doc.get("p1");
      assert.isArrayEqual(["p1", "p3"], l1.items);
      assert.isEqual("Tiac", p1.content);
    },

    "Delete a list", function() {
      this.fixture("list");

      this.controller.selection.set({start: [0, 0], end: [2, 3]});
      this.controller.delete();

      assert.isUndefined(this.doc.get("l1"));
      assert.isArrayEqual([], this.container.treeView);
    },

    "Partially delete a paragraph and a succeeding list item", function() {
      this.fixture("embedded_list");

      this.controller.selection.set({start: [0, 3], end: [1, 2]});
      this.controller.delete();

      var l1 = this.doc.get("l1");
      var p1 = this.doc.get("p1");

      assert.isEqual("Helc", p1.content);
      assert.isUndefined(this.doc.get("p2"));
      assert.isArrayEqual(["p3", "p4"], l1.items);
    },

    "Partially delete a list and a succeeding paragraph", function() {
      this.fixture("embedded_list");

      this.controller.selection.set({start: [3, 2], end: [4, 3]});
      this.controller.delete();

      var p4 = this.doc.get("p4");

      assert.isEqual("Told", p4.content);
      assert.isUndefined(this.doc.get("p5"));
      assert.isArrayEqual(["p1", "l1"], this.container.treeView);
    },

    "Deleting a Figure's image leaves a null reference", function() {
      this.fixture("figure");

      this.controller.selection.set({start: [0, 0], end: [0, 1]});
      this.controller.delete();

      var f1 = this.doc.get("f1");
      assert.isUndefined(this.doc.get("i1"));
      assert.isNull(f1.image);
    },

    "Deleting a Figure's caption empties the caption (but does not delete it)", function() {
      this.fixture("figure");

      this.controller.selection.set({start: [1, 0], end: [1, 7]});
      this.controller.delete();

      var p1 = this.doc.get("p1");
      assert.isEqual("", p1.content);
    },

    "Delete a Figure", function() {
      this.fixture("figure");

      this.controller.selection.set({start: [0, 0], end: [1, 7]});
      this.controller.delete();

      assert.isUndefined(this.doc.get("f1"));
      assert.isArrayEqual([], this.container.treeView);
    },

    "Delete before a Figures'image without merging", function() {
      this.fixture("embedded_figure");

      this.controller.selection.set({start: [0, 3], end: [1, 0]});
      this.controller.delete();

      var p1 = this.doc.get("p1");

      assert.isEqual("Hel", p1.content);
      assert.isArrayEqual(["p1", "f1", "p3"], this.container.treeView);
    },

    "Delete at a Figure's caption without join with next", function() {
      this.fixture("embedded_figure");

      this.controller.selection.set({start: [2, 3], end: [3, 2]});
      this.controller.delete();

      var p2 = this.doc.get("p2");
      var p3 = this.doc.get("p3");

      assert.isDefined(p3);
      assert.isEqual("Cap", p2.content);
      assert.isEqual("rld", p3.content);
      assert.isArrayEqual(["p1", "f1", "p3"], this.container.treeView);
    },

    "Delete accross list boundaries (join lists)", function() {
      this.fixture("two_lists");

      this.controller.selection.set({start: [1, 2], end: [2, 2]});
      this.controller.delete();

      var p2 = this.doc.get("p2");

      assert.isUndefined(this.doc.get("p3"));
      assert.isEqual("Item 3", p2.content);
      assert.isArrayEqual(["l1"], this.container.treeView);
    },

    "Delete in nested lists", function() {
      this.fixture("nested_lists");

      this.controller.selection.set({start: [0, 2], end: [1, 2]});
      this.controller.delete();

      var p1 = this.doc.get("p1");
      var l1 = this.doc.get("l1");
      var l2 = this.doc.get("l2");

      assert.isUndefined(this.doc.get("p2"));
      assert.isEqual("Item 2", p1.content);
      assert.isArrayEqual(["p1", "l2", "p4"], l1.items);
      assert.isArrayEqual(["p3"], l2.items);
    },

    "Delete in nested lists: from parent into child list", function() {
      this.fixture("nested_lists");

      this.controller.selection.set({start: [2, 6], end: [3, 0]});
      this.controller.delete();

      var p3 = this.doc.get("p3");
      var l1 = this.doc.get("l1");
      var l2 = this.doc.get("l2");

      assert.isUndefined(this.doc.get("p4"));
      assert.isDefined(this.doc.get("l1"));
      assert.isDefined(this.doc.get("l2"));
      assert.isEqual("Item 3Item 4", p3.content);
      assert.isArrayEqual(["p1", "l2"], l1.items);
      assert.isArrayEqual(["p2", "p3"], l2.items);
    },

    "Delete a nested list", function() {
      this.fixture("nested_lists_2");

      this.controller.selection.set({start: [0, 6], end: [1, 0]});
      this.controller.delete();

      var p1 = this.doc.get("p1");
      var l1 = this.doc.get("l1");

      assert.isDefined(this.doc.get("l1"));
      assert.isUndefined(this.doc.get("l2"));
      assert.isEqual("Item 1Item 2", p1.content);
      assert.isArrayEqual(["p1"], l1.items);
    },
  ];

};

var SUBSTANCE_ICON_URL = "https://github-camo.global.ssl.fastly.net/e0a00dc1e48a3c136441721dfe70a8bf67719e2b/687474703a2f2f662e636c2e6c792f6974656d732f334d326a306a326e31733042304f3259337032682f696c2d6c656f6e652d69636f6e2e706e67";

FIXTURES["single_paragraph"] = {
  nodes: {
    "p1": {
      id: "p1",
      type: "paragraph",
      content: "Hello"
    },
    "content": {
      "id": "content",
      "type": "view",
      "nodes": ["p1"]
    }
  }
};

FIXTURES["two_paragraphs"] = {
  nodes: {
    "p1": {
      id: "p1",
      type: "paragraph",
      content: "Hello"
    },
    "p2": {
      id: "p2",
      type: "paragraph",
      content: "World"
    },
    "content": {
      "id": "content",
      "type": "view",
      "nodes": ["p1", "p2"]
    }
  }
};

FIXTURES["paragraph_and_image"] = {
  nodes: {
    "p1": {
      id: "p1",
      type: "paragraph",
      content: "Hello"
    },
    "i1": {
      id: "i1",
      type: "image",
      url: SUBSTANCE_ICON_URL
    },
    "content": {
      "id": "content",
      "type": "view",
      "nodes": ["p1", "i1"]
    }
  }
};

FIXTURES["list"] = {
  nodes: {
    "p1": {
      id: "p1",
      type: "paragraph",
      content: "Tic"
    },
    "p2": {
      id: "p2",
      type: "paragraph",
      content: "Tac"
    },
    "p3": {
      id: "p3",
      type: "paragraph",
      content: "Toe"
    },
    "l1": {
      id: "l1",
      type: "list",
      items: ["p1", "p2", "p3"]
    },
    "content": {
      "id": "content",
      "type": "view",
      "nodes": ["l1"]
    }
  }
};

FIXTURES["figure"] = {
  nodes: {
    "i1": {
      id: "i1",
      type: "image",
      url: SUBSTANCE_ICON_URL
    },
    "p1": {
      id: "p1",
      type: "paragraph",
      content: "Caption"
    },
    "f1": {
      id: "f1",
      type: "figure",
      image: "i1",
      caption: "p1"
    },
    "content": {
      "id": "content",
      "type": "view",
      "nodes": ["f1"]
    }
  }
};

FIXTURES["embedded_list"] = {
  nodes: {
    "p1": {
      id: "p1",
      type: "paragraph",
      content: "Hello"
    },
    "p2": {
      id: "p2",
      type: "paragraph",
      content: "Tic"
    },
    "p3": {
      id: "p3",
      type: "paragraph",
      content: "Tac"
    },
    "p4": {
      id: "p4",
      type: "paragraph",
      content: "Toe"
    },
    "l1": {
      id: "l1",
      type: "list",
      items: ["p2", "p3", "p4"]
    },
    "p5": {
      id: "p5",
      type: "paragraph",
      content: "World"
    },
    "content": {
      "id": "content",
      "type": "view",
      "nodes": ["p1", "l1", "p5"]
    }
  }
};

FIXTURES["embedded_figure"] = {
  nodes: {
    "p1": {
      id: "p1",
      type: "paragraph",
      content: "Hello"
    },
    "i1": {
      id: "i1",
      type: "image",
      url: SUBSTANCE_ICON_URL
    },
    "p2": {
      id: "p2",
      type: "paragraph",
      content: "Caption"
    },
    "f1": {
      id: "f1",
      type: "figure",
      image: "i1",
      caption: "p2"
    },
    "p3": {
      id: "p3",
      type: "paragraph",
      content: "World"
    },
    "content": {
      "id": "content",
      "type": "view",
      "nodes": ["p1", "f1", "p3"]
    }
  }
};

FIXTURES["two_lists"] = {
  nodes: {
    "p1": {
      id: "p1",
      type: "paragraph",
      content: "Item 1"
    },
    "p2": {
      id: "p2",
      type: "paragraph",
      content: "Item 2"
    },
    "p3": {
      id: "p3",
      type: "paragraph",
      content: "Item 3"
    },
    "p4": {
      id: "p4",
      type: "paragraph",
      content: "Item 4"
    },
    "l1": {
      id: "l1",
      type: "list",
      items: ["p1", "p2"]
    },
    "l2": {
      id: "l2",
      type: "list",
      items: ["p3", "p4"]
    },
    "content": {
      "id": "content",
      "type": "view",
      "nodes": ["l1", "l2"]
    }
  }
};

FIXTURES["nested_lists"] = {
  nodes: {
    "p1": {
      id: "p1",
      type: "paragraph",
      content: "Item 1"
    },
    "p2": {
      id: "p2",
      type: "paragraph",
      content: "Item 2"
    },
    "p3": {
      id: "p3",
      type: "paragraph",
      content: "Item 3"
    },
    "p4": {
      id: "p4",
      type: "paragraph",
      content: "Item 4"
    },
    "l2": {
      id: "l2",
      type: "list",
      items: ["p2", "p3"]
    },
    "l1": {
      id: "l1",
      type: "list",
      items: ["p1", "l2", "p4"]
    },
    "content": {
      "id": "content",
      "type": "view",
      "nodes": ["l1"]
    }
  }
};

FIXTURES["nested_lists_2"] = {
  nodes: {
    "p1": {
      id: "p1",
      type: "paragraph",
      content: "Item 1"
    },
    "p2": {
      id: "p2",
      type: "paragraph",
      content: "Item 2"
    },
    "l2": {
      id: "l2",
      type: "list",
      items: ["p2"]
    },
    "l1": {
      id: "l1",
      type: "list",
      items: ["p1", "l2"]
    },
    "content": {
      "id": "content",
      "type": "view",
      "nodes": ["l1"]
    }
  }
};

_.each(FIXTURES, function(fixture) {
  util.freeze(fixture);
});

registerTest(['Document', 'Manipulation'], new DocumentManipulationTest());
