"use strict";

// Import
// ========

var Test = require('substance-test');
var assert = Test.assert;
var registerTest = Test.registerTest;
var util = require('substance-util');
var Document = require('../index');


// Test
// ========

// Some example paragraphs
// --------
//

var P1 = "The quick brown fox jumps over the lazy dog."; // 0..43
var P2 = "Pack my box with five dozen liquor jugs"; // 0..38
var P3 = "Fix problem quickly with galvanized jets"; // 0..39

var WriterTest = function() {

  this.uuid = util.uuidGen('node_');

  this.setup = function() {
    this.__document = new Document({id: "writer_test"});
    this.writer = new Document.Writer(this.__document);
  }

  // deactivate the default fixture
  // for testing basic behavior
  this.fixture = function() {};

  // this.setDelay(25);

  this.actions = [
    "Insert some text", function() {
      this.insertContent(P1);
    },

    "Insert some more text", function() {
      this.insertContent(P2);
      this.insertContent(P3);
    },

    "Set single cursor", function() {
      this.writer.selection.set({
        start: [1,2],
        end: [1,2]
      });

      assert.isArrayEqual([1,2], this.writer.selection.start);
      assert.isArrayEqual([1,2], this.writer.selection.end);
    },

    "Edge case: Select last char of text node", function() {
      this.writer.selection.set({
        start: [1,39],
        end: [1,39]
      });
    },

    "Make a selection", function() {
      this.writer.selection.set({
        start: [0, 4],
        end: [1, 21],
      });

      var EXPECTED = "quick brown fox jumps over the lazy dog.Pack my box with five";
      assert.isEqual(EXPECTED, this.writer.selection.getText());
    },

    "Make a selection within a single node", function() {
      this.writer.selection.set({
        start: [0, 4],
        end: [0, 19],
      });

      var EXPECTED = "quick brown fox";
      assert.isEqual(EXPECTED, this.writer.selection.getText());
    },

    "Annotate current selection", function() {
      var annotation = this.writer.annotate('idea');

      assert.isEqual('idea', annotation.type);
      assert.isArrayEqual([4, 19], annotation.range);
      // ["annotate", "t1", "content", {"id": "a1",  type": "idea"}]
    },

    "Get all annotations for current document", function() {
      var annotations = this.writer.getAnnotations();
      assert.isEqual(1, annotations.length);
    },

    // "Delete previous character for collapsed (single cursor) selection", function() {
    //   this.document.select({
    //     start: [0, 4],
    //     end: [0, 4]
    //   });

    //   this.document.delete();
    // },

    // "Select last three chars of a textnode", function() {
    //   this.document.select({
    //     start: [0, 1],
    //     end: [0, 4]
    //   });
    //   assert.isEqual(3, $('.content-node span.selected').length);
    // },

    // "Select last char in text node", function() {
    //   this.document.select({
    //     start: [0, 3],
    //     end: [0, 4]
    //   });

    //   assert.isEqual(1, $('.content-node span.selected').length);
    // },

    // "Position cursor after last char and hit backspace", function() {
    //   this.document.select({
    //     start: [0, 4],
    //     end: [0, 4]
    //   });

    //   // Make sure there's no selection, but a
    //   // TODO: move check to a shared verifySelection
    //   // that compares the selection in the modle with
    //   // the DOM equivalent
    //   assert.isEqual(0, $('.content-node span.selected').length);
    //   assert.isEqual(1, $('.content-node span .cursor').length);

    //   this.document.delete();

    //   assert.isEqual(1, $('.content-node span .cursor').length);
    //   // After delection there must be three remaining chars in the first paragraph
    //   assert.isEqual(3, $('.content-node:first .content')[0].children.length);
    // },


    // "Move cursor to previous char", function() {
    //   this.document.select({
    //     start: [1, 30],
    //     end: [1, 30]
    //   });
    //   this.document.previous();
    //   var sel = this.document.selection;
    //   assert.isDeepEqual([1,29], sel.start);
    //   assert.isDeepEqual([1,29], sel.end);
    // },

    // "Move cursor to next char", function() {
    //   this.document.next();
    //   var sel = this.document.selection;
    //   assert.isDeepEqual([1,30], sel.start);
    //   assert.isDeepEqual([1,30], sel.end);
    // },

    // "Move cursor to next paragraph", function() {
    //   this.document.next();
    //   var sel = this.document.selection;
    //   assert.isDeepEqual([2,0], sel.start);
    //   assert.isDeepEqual([2,0], sel.end);
    // },

    // "Move cursor back to prev paragraph", function() {
    //   this.document.previous();
    //   var sel = this.document.selection;
    //   assert.isDeepEqual([1,30], sel.start);
    //   assert.isDeepEqual([1,30], sel.end);
    // },

    // "Collapse cursor after multi-char selection", function() {
    //   this.document.select({
    //     start: [1, 18],
    //     end: [1, 24]
    //   });
    //   this.document.next();
    //   var sel = this.document.selection;
    //   assert.isDeepEqual([1,24], sel.start);
    //   assert.isDeepEqual([1,24], sel.end);
    // },

    // "Collapse cursor before multi-char selection", function() {
    //   this.document.select({
    //     start: [1, 18],
    //     end: [1, 24]
    //   });
    //   this.document.previous();
    //   var sel = this.document.selection;
    //   assert.isDeepEqual([1,18], sel.start);
    //   assert.isDeepEqual([1,18], sel.end);
    // },

    // "Merge with previous text node", function() {
    //   this.document.select({
    //     start: [1, 0],
    //     end: [1, 0]
    //   });

    //   this.document.delete();
    //   var sel = this.document.selection;
    //   assert.isDeepEqual([0,3], sel.start);
    //   assert.isDeepEqual([0,3], sel.end);
    // },

    // // Think pressing enter
    // "Split text node at current cursor position (inverse of merge)", function() {
    //   this.document.insertNode('text');
    // },

    // "Merge back (revert the text split)", function() {
    //   this.document.delete();
    // },

    // // Think pressing enter in the middle of a sentence
    // "Split text node at current cursor position (in-between)", function() {
    //   this.document.select({
    //     start: [1, 2],
    //     end: [1, 2]
    //   });
    //   this.document.insertNode('text');
    // },

    // // Think pressing enter in the middle of a sentence
    // "Split text node at (cusor before first char)", function() {
    //   // Undo previous split
    //   this.document.delete();

    //   this.document.select({
    //     start: [1, 0],
    //     end: [1, 0]
    //   });
    //   this.document.insertNode('text');
    // },

    // Think pressing enter in the middle of a sentence
    // "Expand selection (to the right)", function() {
    //   // Undo previous split
    //   this.document.select({
    //     start: [2, 4],
    //     end: [2, 4]
    //   });

    //   this.document.selection.set({
    //     start: [0,2],
    //     end: [0,4],
    //     // direction: -1
    //   });

    //   this.document.selection.extend('left');
    //   this.document.selection.extend('right');
    //   this.document.selection.move('left');
    //   this.document.selection.move('right');

    //   // if direction = 1 -> expand right bound
    //   // if direction = 0 -> expand right bound, set dir=1
    //   // if direction <- 0 -> expand left bound by one

    //   this.document.selection.expandRight();
    // }


    // "Select text spanning over multiple text nodes", function() {
    //   var selection = this.doc.select({
    //     start: [0, 4],
    //     end: [1, 11]
    //   });

    //   // alternative selection api to be discussed
    //   // this.select({
    //   //   start: {"node": "t1", "offset": 4},
    //   //   end: {"node": "t2", "offset": 11}
    //   // });

    //   // assert.isEqual(selection, this.doc.selection);
    //   assert.isEqual(2, selection.getNodes().length);
    //   assert.isEqual("quick brown fox jumps over the lazy dog.Lorem ipsum", selection.getText());
    // },

    // "Break node into pieces", function() {
    //   var selection = this.doc.select({start: [0, 4], end: [0, 4]});
    //   this.doc.insertNode("text");

    //   // Original node
    //   var contentView = this.doc.get('content').nodes;
    //   assert.isEqual(4, contentView.length);

    //   var t1a = this.doc.get(contentView[0]);
    //   var tnew = this.doc.get(contentView[1]);
    //   var t1b = this.doc.get(contentView[2]);

    //   // New node
    //   assert.isEqual("The ", t1a.content);
    //   assert.isEqual("text", tnew.type);
    //   assert.isEqual("", tnew.content);

    //   assert.isEqual("quick brown fox jumps over the lazy dog.", t1b.content);
    //   assert.isEqual("text", t1b.type);

    //   assert.isEqual("", selection.getText());
    // },

    // "Type some new text into new node", function() {
    //   // Now you probably want to place the cursor at position 0 of the newly created node
    //   this.doc.select({start: [1, 0], end: [1,0]});

    //   // only one selected node
    //   assert.isEqual(1, this.doc.selection.getNodes().length);

    //   // Pull out the fresh node to be updated
    //   this.freshNode = this.doc.selection.getNodes()[0];

    //   var op = [
    //     "update", this.freshNode.id, "content", ["Hello Worrrrld!"]
    //   ];

    //   this.doc.apply(op);
    //   assert.isEqual("Hello Worrrrld!", this.freshNode.content);
    // },

    // "Delete selection", function() {
    //   this.doc.select({start: [1, 9], end: [1, 12]});
    //   this.doc.delete();
    //   assert.isEqual("Hello World!", this.freshNode.content);
    // },

    // "Copy selection and store in clipboard", function() {
    //   // Current state
    //   // t1a:  "The "
    //   // tnew: "Hello World!"
    //   // t1b:  "quick brown fox jumps over the lazy dog."
    //   // t2:   "Lorem ipsum dolor sit amet, consectetur adipiscing elit."

    //   this.doc.select({start: [0, 3], end: [2, 11]});

    //   assert.isEqual(3, this.doc.selection.getNodes().length);

    //   // Check selection
    //   assert.isEqual(" Hello World!quick brown", this.doc.selection.getText());

    //   // Stores the cutted document in this.session.clipboard
    //   this.clipboard = this.doc.copy();

    //   // Expected clipboard contents
    //   // t1: " "
    //   // t2: "Hello World!"
    //   // t3: "quick brown"

    //   var clipboardContent = this.clipboard.get('content').nodes;
    //   assert.isEqual(3, clipboardContent.length);

    //   assert.isEqual(" ", this.clipboard.get(clipboardContent[0]).content);
    //   assert.isEqual("Hello World!", this.clipboard.get(clipboardContent[1]).content);
    //   assert.isEqual("quick brown", this.clipboard.get(clipboardContent[2]).content);
    // },

    // "Delete the copied stuff", function() {
    //   this.doc.delete();

    //   // Desired new contents
    //   // t1a: "The"
    //   // t1b: " fox jumps over the lazy dog."
    //   // t2: "Lorem ipsum dolor sit amet, consectetur adipiscing elit."

    //   var contentView = this.doc.get('content').nodes;
    //   assert.isEqual(3, contentView.length);

    //   assert.isEqual("The", this.doc.get(contentView[0]).content);
    //   assert.isEqual(" fox jumps over the lazy dog.", this.doc.get(contentView[1]).content);
    //   assert.isEqual("Lorem ipsum dolor sit amet, consectetur adipiscing elit.", this.doc.get(contentView[2]).content);
    // },

    // "Paste clipboard into document", function() {
    //   this.doc.select({start: [2,12], end: [2,17]});

    //   this.doc.paste(this.clipboard);

    //   // Desired new contents
    //   // t1a:   "The"
    //   // t1b:   " fox jumps over the lazy dog."
    //   // t2:    "Lorem ipsum  "  -> one space more from first node in clipboard
    //   // tnew:  "Hello World!"
    //   // tnew2: "quick brown sit amet, consectetur adipiscing elit."

    //   var contentView = this.doc.get('content').nodes;
    //   assert.isEqual(5, contentView.length);

    //   assert.isEqual("The", this.doc.get(contentView[0]).content);
    //   assert.isEqual(" fox jumps over the lazy dog.", this.doc.get(contentView[1]).content);

    //   // was "Lorem ipsum  " - please check!
    //   assert.isEqual("Lorem ipsum  ", this.doc.get(contentView[2]).content);

    //   assert.isEqual("Hello World!", this.doc.get(contentView[3]).content);
    //   // was "quick brown sit amet, consectetur adipiscing elit." - pls check
    //   assert.isEqual("quick brown sit amet, consectetur adipiscing elit.", this.doc.get(contentView[4]).content);
    // }
  ];
};


// General aid for the writertest
WriterTest.Prototype = function() {

  // Inserts content 

  this.insertContent = function(content) {
    var id = this.uuid("text_");
    this.__document.apply(["create", {
      "id": id,
      "type": "text",
      "content": content
    }]);
    this.__document.apply(["position", "content", {
      "nodes": [id],
      "target": -1
    }]);
  };
};

WriterTest.prototype = new WriterTest.Prototype();


registerTest(['Document', 'Writer'], new WriterTest());
