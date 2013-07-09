(function(root) {

var _,
    assert,
    Document,
    registerTest;

if (typeof exports !== 'undefined') {
  _    = require('underscore');
  assert = require('substance-test/assert');
  Document = require('..');
  registerTest = require('substance-test').registerTest;
} else {
  _ = root._;
  assert = root.Substance.assert;
  Document = root.Substance.Document;
  registerTest = root.Substance.registerTest;
}


var test = {};

test.setup = function() {
  this.doc = new Document({
    id: "substance-doc",
    creator: "michael",
    created_at: new Date()
  });
};

test.actions = [

  "Check if valid document has been constructed", function() {
    assert.isArrayEqual(["content", "figures", "publications"], this.doc.get('document').views);
    assert.isTrue(_.isArray(this.doc.get('content').nodes));
  },

  "Create a new heading node", function() {
    var op = ["create", {
        "id": "h1",
        "type": "heading",
        "content": "Heading 1"
      }
    ];

    this.doc.apply(op);
    assert.isEqual(op[1].content, this.doc.get('h1').content);

    // h1.level should be automatically initialized with 0
    // TODO: should default to null later, once we support null values
    assert.isEqual(0, this.doc.get('h1').level);
  },


  "Create a new text nodes", function() {
    var op = ["create", {
        "id": "t1",
        "type": "text",
        "content": "Text 1"
      }
    ];

    var op2 = ["create", {
        "id": "t2",
        "type": "text",
        "content": "Text 2"
      }
    ];

    this.doc.apply(op);
    this.doc.apply(op2);

    assert.isDefined(this.doc.get('t1'));
    assert.isDefined(this.doc.get('t2'));
  },

  "Add nodes to content view", function() {
    var op = [
      "position", "content", {"nodes": ["t2", "h1", "t1"], "target": -1}
    ];
    this.doc.apply(op);
    assert.isArrayEqual(["t2", "h1", "t1"], this.doc.get('content').nodes);
  },

  "Add nodes to content view 2", function() {
    var op = [
      "position", "content", {"nodes": ["t2", "h1", "t1"], "target": -1}
    ];
    this.doc.apply(op);
    assert.isArrayEqual(["t2", "h1", "t1"], this.doc.get('content').nodes);
  },

  "Reposition nodes ", function() {
    var op = [
      "position", "content", {"nodes": ["h1", "t1", "t2"], "target": 0}
    ];
    this.doc.apply(op);
    assert.isArrayEqual(["h1", "t1", "t2"], this.doc.get('content').nodes);
  },

  "Move down h1 by one", function() {
    var op = [
      "position", "content", {"nodes": ["h1"], "target": 1}
    ];
    this.doc.apply(op);
    assert.isArrayEqual(["t1", "h1", "t2"], this.doc.get('content').nodes);
  },

  "Move down h1 by one again", function() {
    var op = [
      "position", "content", {"nodes": ["h1"], "target": 2}
    ];
    this.doc.apply(op);
    assert.isArrayEqual(["t1", "t2", "h1"], this.doc.get('content').nodes);
  },

  "Update heading content", function() {
    var op = [
      "update", "h1", "content", [4, "ING", -3]
    ];

    this.doc.apply(op);
    assert.isEqual("HeadING 1", this.doc.get("h1").content);
  },

  "Create a comment", function() {
    var op = ["comment", "t1", {
        "id": "c1",
        "content": "Hi, I'm a comment"
      }
    ];

    this.doc.apply(op);

    // Get comments for t1
    var comments = this.doc.find("comments", "t1");
    assert.equal(comments.length, 1);
    assert.equal(comments[0].id, "c1");
  },

  "Create an annotation", function() {
    var op = ["annotate", "t1", "content", {
        "id": "a1",
        "type": "idea",
        "range": {start: 1, length: 3}
      }
    ];

    this.doc.apply(op);

    // Get annotations for text:1
    var annotations = this.doc.find("annotations", "t1");
    assert.isEqual(1, annotations.length);

    var a1 = this.doc.get('a1');
    assert.equal("a1", a1.id);
    assert.equal("t1", a1.node, "t1");
    assert.isEqual(1, a1.range.start);
    assert.isEqual(3, a1.range.length);
  },

  "Change text, which affects the annotation we just created", function() {
    var op = [
      "update", "t1", "content", [2, "EEE"]
    ];
    this.doc.apply(op);

    var a1 = this.doc.get('a1');
    assert.isEqual(1, a1.range.start);
    assert.isEqual(6, a1.range.length);
  },

  "Stick comment to annotation", function() {
    // Create a comment that sticks on the annotation
    var op = ["comment", "a1", {
        "id": "c2",
        "content": "Hello world"
      }
    ];

    this.doc.apply(op);

    // Get comments for annotation:1
    var comments = this.doc.find("comments", "a1");
    assert.equal(comments.length, 1);
    assert.equal(comments[0].id, "c2");
  },

  "Replace old property value with a new value (string)", function() {
    var op = ["set", "c2", "content", "Meeh"];
    this.doc.apply(op);

    assert.equal(this.doc.get('c2').content, "Meeh");
  },

  "Delete all comments", function() {
    var op = ["delete", {
      "nodes": ["c1", "c2"]
    }];

    // Delete element, then check indexes again
    this.doc.apply(op);

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

    var op = ["set", "a1", "node", "t2"];

    this.doc.apply(op);

    // Annotation no longer sticks on t1
    var annotations = this.doc.find('annotations', 't1');
    assert.equal(annotations.length, 0);

    // Should be returned when querying for annotations, t2
    annotations = this.doc.find('annotations', 't2');
    assert.equal(annotations.length, 1);
  },

  // Coming soon
  "Update Annotation Range", function() {

    var op = ["update", "a1", "range", {start: 1, length: 4}];
    this.doc.apply(op);

    var a1 = this.doc.get('a1');
    assert.isEqual(1, a1.range.start);
    assert.isEqual(4, a1.range.length);
  },

  "Update Text by assigning new value", function() {
    var op = [
      "update", "t2", "content", [5, -1, "Zwei"]
    ];

    this.doc.apply(op);
    assert.isEqual("Text Zwei", this.doc.get('t2').content);
  },

  "Update numeric value of a heading", function() {
    var op = ["set", "h1", "level", 2];
    this.doc.apply(op);
    assert.isEqual(2, this.doc.nodes["h1"].level);
  },

  "Hide nodes from view", function() {
    var op = ["hide", "content", {"nodes": ["t1", "t2"]}];

    this.doc.apply(op);
    assert.isArrayEqual(["h1"], this.doc.get('content').nodes);
  },

  "Delete nodes from graph and view(s)", function() {
    var op = ["delete", {"nodes": ["t1", "t2"]}];

    this.doc.apply(op);
    assert.isUndefined(this.doc.get('t1'));
    assert.isUndefined(this.doc.get('t2'));
    assert.isArrayEqual(["h1"], this.doc.get('content').nodes);
  },

  "Add new text element to the bottom", function() {
    var op = ["create", {
        "id": "t3",
        "type": "text",
        "content": "Text 3"
      }
    ];

    this.doc.apply(op);

    assert.isDefined(this.doc.get('t3'));

    op = [
      "position", "content", {"nodes": ["t3"], "target": -1}
    ];
    this.doc.apply(op);

    assert.isArrayEqual(["h1", "t3"], this.doc.get('content').nodes);
  }
];

registerTest(['Document', 'Document Manipulation'], test);

})(this);
