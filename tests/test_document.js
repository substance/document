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

var Image = function(node, doc) {
  Document.Node.call(this, node, doc);
};
Image.Prototype = function() {
  this.mergeableWith = [];
  this.preventEmpty = true;
  this.allowedAnnotations = ["strong", "idea"];
};
Image.Prototype.prototype = Document.Node.prototype;
Image.prototype = new Image.Prototype();
Document.Node.defineProperties(Image.prototype, ["url"]);

var List = function(node, doc) {
  Document.Composite.call(this, node, doc);
};
List.Prototype = function() {
  this.getNodes = function() {
    return _.clone(this.properties.items);
  };
};
List.Prototype.prototype = Document.Composite.prototype;
List.prototype = new List.Prototype();
Document.Node.defineProperties(List.prototype, ["items"]);

var Figure = function(node, doc) {
  Document.Composite.call(this, node, doc);
};
Figure.Prototype = function() {
  this.getNodes = function() {
    return [this.properties.image, this.properties.caption];
  };
};
Figure.Prototype.prototype = Document.Composite.prototype;
Figure.prototype = new Figure.Prototype();
Document.Node.defineProperties(Figure.prototype, ["image", "caption"]);

var Schema = util.clone(Document.schema);
_.extend(Schema.types, {
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
    "properties": {}
  },
  "composite": {
    "parent": "node",
    "properties": {
      "nodes": ["array", "node"]
    }
  },
  "paragraph": {
    "parent": "node",
    "properties": {
      "content": "string"
    }
  },
  "heading": {
    "parent": "node",
    "properties": {
      "content": "string",
      "level": "number"
    }
  },
  "image": {
    "parent": "node",
    "properties": {
      "url": "string"
    }
  },
  "list": {
    "parent": "composite",
    "properties": {
      "items": ["array", "paragraph"]
    }
  },
  "figure": {
    "parent": "composite",
    "properties": {
      "image": "image",
      "caption": "paragraph"
    }
  },
  "annotation": {
    "properties": {
      "path": ["array", "string"], // -> e.g. ["text_1", "content"]
      "range": "object"
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
  "paragraph": Paragraph,
  "heading": Heading,
  "image": Image,
  "list": List,
  "figure": Figure
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

TestDocument.Paragraph = Paragraph;
TestDocument.Heading = Heading;

module.exports = TestDocument;
