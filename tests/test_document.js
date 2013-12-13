"use strict";

var _ = require("underscore");
var util = require("substance-util");
var Document = require("../index");

var nodeTypes = require("substance-nodes");

var Schema = util.clone(Document.schema);
_.each(nodeTypes, function(node, key) {
  Schema.types[key] = node.Model.type;
});
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

var TestDocument;
function _options(options) {
  options = options || {};
  options.schema = util.deepclone(Schema);
  if (options.seed === undefined) {
    options.seed = TestDocument.Seed;
  }
  return options;
}
TestDocument = function(options) {
  Document.call(this, _options(options));
  this.nodeTypes = nodeTypes;
};

TestDocument.Prototype = function() {
  this.fromSnapshot = function(data, options) {
    options = options || {};
    options.seed = data;
    return new TestDocument(options);
  };
};
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

TestDocument.Paragraph = nodeTypes.paragraph.Node;
TestDocument.Heading = nodeTypes.heading.Node;

module.exports = TestDocument;
