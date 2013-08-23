"use strict";

var _ = require("underscore");
var util = require("substance-util");
var Test = require('substance-test');
var assert = Test.assert;
var registerTest = Test.registerTest;
var TestDocument = require("./test_document");
var DocumentController = require("../src/controller");

var FIXTURES = {};

var DocumentManipulationTest = function () {

  this.setup = function() {
  };

  this.fixture = function(name) {
    var data = FIXTURES[name];
    this.doc = new TestDocument({seed: data});
    this.controller = new DocumentController(this.doc);
    this.container = this.controller.container;
    return data;
  };

  this.actions = [
    "Join two paragraphs", function() {
      var fixture = this.fixture("two_paragraphs");

      var success = this.controller.join("p1", "p2");

      assert.isTrue(success);

      var p1 = this.doc.get("p1");
      var expectedContent = fixture.nodes["p1"].content + fixture.nodes["p2"].content;

      assert.isEqual(expectedContent, p1.content);
      assert.isUndefined(this.doc.get("p2"));
      assert.isArrayEqual(["p1"], this.container.getNodes("idsOnly"));
    },

    "Reject join of incompatible nodes", function() {
      this.fixture("paragraph_and_image");

      var success = this.controller.join("p1", "i1");

      assert.isFalse(success);
      assert.isArrayEqual(["p1", "i1"], this.container.getNodes("idsOnly"));
    },

    "Nested nodes: join two list items", function() {
      var fixture = this.fixture("list");

      var success = this.controller.join("p1", "p2");
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

      var success = this.controller.join("p1", "p2");
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

      var success = this.controller.join("p4", "p5");
      assert.isTrue(success);

      var p4 = this.doc.get("p4");

      var expectedContent = fixture.nodes["p4"].content + fixture.nodes["p5"].content;
      assert.isEqual(expectedContent, p4.content);
      assert.isUndefined(this.doc.get("p5"));
      assert.isArrayEqual(["p1", "l1"], this.container.treeView);
    },

    "Embedded Nested Nodes: can not join with a figure caption", function() {
      var fixture = this.fixture("embedded_figure");

      var success = this.controller.join("p2", "p3");
      assert.isFalse(success);

      assert.isArrayEqual(["p1", "f1", "p3"], this.container.treeView);
    },

    "Join two lists", function() {
      var fixture = this.fixture("two_lists");

      var success = this.controller.join("p2", "p3");
      assert.isTrue(success);

      var l1 = this.doc.get("l1");
      var p2 = this.doc.get("p2");

      var expectedContent = fixture.nodes["p2"].content + fixture.nodes["p3"].content;
      assert.isEqual(expectedContent, p2.content);
      assert.isUndefined(this.doc.get("p3"));
      assert.isArrayEqual(["p1", "p2", "p4"], l1.items);
      assert.isArrayEqual(["l1"], this.container.treeView);
    },
  ];

};

var SUBSTANCE_ICON_URL = "https://github-camo.global.ssl.fastly.net/e0a00dc1e48a3c136441721dfe70a8bf67719e2b/687474703a2f2f662e636c2e6c792f6974656d732f334d326a306a326e31733042304f3259337032682f696c2d6c656f6e652d69636f6e2e706e67";

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

_.each(FIXTURES, function(fixture) {
  util.freeze(fixture);
});

registerTest(['Document', 'Manipulation'], new DocumentManipulationTest());
