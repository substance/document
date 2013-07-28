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

var doc = {
  "id": "image_doc",
  "nodes": {
    "document": {
      "type": "document",
      "id": "document",
      "views": [
        "content",
        "figures",
        "publications"
      ],
      "guid": "lorem_ipsum",
      "creator": "",
      "title": "",
      "abstract": "",
      "keywords": []
    },
    "content": {
      "type": "view",
      "id": "content",
      "nodes": [
        "text_1",
        "image_1",
        "text_2"
      ]
    },
    "text_1": {
      "type": "text",
      "id": "text_1",
      "content": "The quick brown fox jumps over the lazy dog."
    },
    "image_1": {
      "type": "image",
      "id": "image_1",
      "content": " ",
      "url": "http://i.telegraph.co.uk/multimedia/archive/02429/eleanor_scriven_2429776k.jpg"
    },
    "text_2": {
      "type": "text",
      "id": "text_2",
      "content": "Pack my box with five dozen liquor jugs"
    }
  }
};

var SelectionTest = function() {


  this.setup = function() {
    this.uuid = util.uuidGen('node_');
    this.__document = Document.fromSnapshot(doc);
    this.writer = new Document.Writer(this.__document);
    this.sel = this.writer.selection;
  }

  // deactivate the default fixture
  // for testing basic behavior
  this.fixture = function() {};

  this.actions = [

    "Set cursor before first char of last paragraph", function() {
      this.sel.set({
        start: [2, 0],
        end: [2, 0]
      });
    },

    "Expand selection to the left once ", function() {
      this.sel.expand('left', 'char');

      // Expect start pos to be 1st pos of the image
      assert.isArrayEqual([1,1], this.sel.start);
      assert.isArrayEqual([2,0], this.sel.end);
    },

    "Expand selection to the left a second time to select the image ", function() {
      this.sel.expand('left', 'char');

      // Expect star pos to be 0 pos of the image
      assert.isArrayEqual([1,0], this.sel.start);
      assert.isArrayEqual([2,0], this.sel.end);
    },

    "Expand selection to the left a third time to expand selection to the prev text node", function() {
      this.sel.expand('left', 'char');
      // Expect start pos to be last pos of the image predecessor (in our case a text element)
      assert.isArrayEqual([0,44], this.sel.start);
      assert.isArrayEqual([2,0], this.sel.end);
    },

    "Expand selection another time to include the last char of the preceding text node", function() {
      this.sel.expand('left', 'char');
      // Expect start pos to be next-to-last pos of the image predecessor (in our case a text element)
      assert.isArrayEqual([0,43], this.sel.start);
      assert.isArrayEqual([2,0], this.sel.end);
    },

    "Retrieve ranges", function() {
      // this.sel.expand('left', 'char');
      // // Expect start pos to be next-to-last pos of the image predecessor (in our case a text element)
      // assert.isArrayEqual([0,43], this.sel.start);
      // assert.isArrayEqual([2,0], this.sel.end);
      var ranges = this.sel.getRanges();
      console.log('RANGES', ranges);
    },


  ];
};

// General aid for the writertest
SelectionTest.Prototype = function() {
  // helpers go here
};

SelectionTest.prototype = new SelectionTest.Prototype();


registerTest(['Document', 'Selection'], new SelectionTest());
