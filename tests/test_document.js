"use strict";

var _ = require("underscore");
var util = require("substance-util");
var Document = require("../index");

var Paragraph = function(node, doc) {
  Document.Text.call(this, node, doc);
};
Paragraph.Prototype = function() {
  this.mergeableWith = ["paragraph", "heading"];
  this.preventEmpty = false;
  this.splitInto = 'paragraph';
  this.allowedAnnotations = ["strong", "idea"];
};
Paragraph.Prototype.prototype = Document.Text.prototype;
Paragraph.prototype = new Paragraph.Prototype();

var Heading = function(node, doc) {
  Document.Text.call(this, node, doc);
};
Heading.Prototype = function() {
  this.mergeableWith = ["paragraph", "heading"];
  this.preventEmpty = false;
  this.splitInto = 'paragraph';
  this.allowedAnnotations = ["strong", "idea"];
};
Heading.Prototype.prototype = Document.Text.prototype;
Heading.prototype = new Heading.Prototype();

var Schema = util.clone(Document.schema);
_.extend(Schema.types, {
  "annotation": {
    "properties": {
      "path": ["array", "string"], // -> e.g. ["text_1", "content"]
      "range": "object"
    }
  },
  "document": {
    "properties": {
      "views": ["array", "view"],
      "guid": "string",
      "creator": "string",
      "title": "string",
      "abstract": "string"
    }
  },
  "node": {
    "parent": "content",
    "properties": {
      "content": ["array", "object"]
    }
  },
  "paragraph": {
    "parent": "content",
    "properties": {
      "content": "string"
    }
  },
  "heading": {
    "parent": "content",
    "properties": {
      "content": "string",
      "level": "number"
    }
  },
  "strong": {
    "parent": "annotation",
    "properties": {
    }
  },
  "idea": {
    "parent": "annotation",
    "properties": {
    }
  },
});

var nodeTypes = {
  node: Node,
  paragraph: Paragraph,
  heading: Heading
};

var TestDocument = function(options) {
  options = options || {};

  options.schema = util.deepclone(Schema);

  if (options.seed === undefined) {
    options.seed = TestDocument.Seed;
  }

  // Call parent constructor
  // --------

  Document.call(this, options);

  this.nodeTypes = nodeTypes;
};

TestDocument.Prototype = function() {};
TestDocument.Prototype.prototype = Document.prototype;
TestDocument.prototype = new TestDocument.Prototype();

TestDocument.Schema = Schema;

TestDocument.Seed = {
  nodes : {
    document: {
      id: "document",
      type: "document",
      views: ["content"],
    },
    content: {
      id: "content",
      type: "view",
      nodes: []
    }
  }
};

TestDocument.Node = Node;
TestDocument.Paragraph = Paragraph;

module.exports = TestDocument;
