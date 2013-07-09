(function(root) {

var _,
    assert,
    Data,
    Document,
    registerTest,
    getSession;

if (typeof exports !== 'undefined') {
  _    = require('underscore');
  assert = require('substance-test/assert');
  Data = require('substance-data');
  Document = require('..');
  registerTest = require('substance-test').registerTest;
} else {
  _ = root._;
  assert = root.Substance.assert;
  Data = root.Substance.Document;
  Document = root.Substance.Document;
  registerTest = root.Substance.registerTest;
}

var test = {};

test.setup = function() {
  this.doc = new Document({});

  this.doc.apply(Data.Graph.Create({
    "id": "t1",
    "type": "text",
    "content": "The quick brown fox jumps over the lazy dog."
  }));

  this.doc.apply(Data.Graph.Create({
    "id": "t2",
    "type": "text",
    "content": "Lorem ipsum dolor sit amet, consectetur adipiscing elit."
  }));

  this.doc.apply(["position", "content", {"nodes": ["t1", "t2"], "target": -1}]);
};

test.actions = [
  "Select text in a single text node", function() {
    var selection = this.doc.select({start: [0, 4], end: [0, 9]});
    assert.isEqual(1, selection.getNodes().length);
    assert.isEqual("quick", selection.getText());
  },

  "Select text spanning over multiple text nodes", function() {
    var selection = this.doc.select({start: [0, 4], end: [1, 11]});

    // alternative selection api to be discussed
    // this.select({
    //   start: {"node": "t1", "offset": 4},
    //   end: {"node": "t2", "offset": 11}
    // });

    // assert.isEqual(selection, this.doc.selection);
    assert.isEqual(2, selection.getNodes().length);
    assert.isEqual("quick brown fox jumps over the lazy dog.Lorem ipsum", selection.getText());
  },

  "Break node into pieces", function() {
    var selection = this.doc.select({start: [0, 4], end: [0, 4]});
    this.doc.insertNode("text");

    // Original node
    var contentView = this.doc.get('content').nodes;
    assert.isEqual(4, contentView.length);

    var t1a = this.doc.get(contentView[0]);
    var tnew = this.doc.get(contentView[1]);
    var t1b = this.doc.get(contentView[2]);

    // New node
    assert.isEqual("The ", t1a.content);
    assert.isEqual("text", tnew.type);
    assert.isEqual("", tnew.content);

    assert.isEqual("quick brown fox jumps over the lazy dog.", t1b.content);
    assert.isEqual("text", t1b.type);

    assert.isEqual("", selection.getText());
  },

  "Type some new text into new node", function() {
    // Now you probably want to place the cursor at position 0 of the newly created node
    this.doc.select({start: [1, 0], end: [1,0]});

    // only one selected node
    assert.isEqual(1, this.doc.selection.getNodes().length);

    // Pull out the fresh node to be updated
    this.freshNode = this.doc.selection.getNodes()[0];
  
    var op = [
      "update", this.freshNode.id, "content", ["Hello Worrrrld!"]
    ];

    this.doc.apply(op);
    assert.isEqual("Hello Worrrrld!", this.freshNode.content);
  },

  "Delete selection", function() {
    this.doc.select({start: [1, 9], end: [1, 12]});
    this.doc.delete();
    assert.isEqual("Hello World!", this.freshNode.content);
  },

  "Copy selection and store in clipboard", function() {
    // Current state
    // t1a:  "The "
    // tnew: "Hello World!"
    // t1b:  "quick brown fox jumps over the lazy dog."
    // t2:   "Lorem ipsum dolor sit amet, consectetur adipiscing elit."

    this.doc.select({start: [0, 3], end: [2, 11]});

    assert.isEqual(3, this.doc.selection.getNodes().length);

    // Check selection
    assert.isEqual(" Hello World!quick brown", this.doc.selection.getText());

    // Stores the cutted document in this.session.clipboard
    this.clipboard = this.doc.copy();

    // Expected clipboard contents
    // t1: " "
    // t2: "Hello World!"
    // t3: "quick brown"

    var clipboardContent = this.clipboard.get('content').nodes;
    assert.isEqual(3, clipboardContent.length);

    assert.isEqual(" ", this.clipboard.get(clipboardContent[0]).content);
    assert.isEqual("Hello World!", this.clipboard.get(clipboardContent[1]).content);
    assert.isEqual("quick brown", this.clipboard.get(clipboardContent[2]).content);
  },

  "Delete the copied stuff", function() {
    this.doc.delete();

    // Desired new contents
    // t1a: "The"
    // t1b: " fox jumps over the lazy dog."
    // t2: "Lorem ipsum dolor sit amet, consectetur adipiscing elit."

    var contentView = this.doc.get('content').nodes;
    assert.isEqual(3, contentView.length);

    assert.isEqual("The", this.doc.get(contentView[0]).content);
    assert.isEqual(" fox jumps over the lazy dog.", this.doc.get(contentView[1]).content);
    assert.isEqual("Lorem ipsum dolor sit amet, consectetur adipiscing elit.", this.doc.get(contentView[2]).content);
  },

  "Paste clipboard into document", function() {
    this.doc.select({start: [2,12], end: [2,17]});

    this.doc.paste(this.clipboard);

    // Desired new contents
    // t1a:   "The"
    // t1b:   " fox jumps over the lazy dog."
    // t2:    "Lorem ipsum  "  -> one space more from first node in clipboard
    // tnew:  "Hello World!"
    // tnew2: "quick brown sit amet, consectetur adipiscing elit."

    var contentView = this.doc.get('content').nodes;
    assert.isEqual(5, contentView.length);

    assert.isEqual("The", this.doc.get(contentView[0]).content);
    assert.isEqual(" fox jumps over the lazy dog.", this.doc.get(contentView[1]).content);
    assert.isEqual("Lorem ipsum  ", this.doc.get(contentView[2]).content);

    assert.isEqual("Hello World!", this.doc.get(contentView[3]).content);
    assert.isEqual("quick brown sit amet, consectetur adipiscing elit.", this.doc.get(contentView[4]).content);
  }
];

registerTest(['Document', 'Document Selection'], test);

})(this);
