"use strict";

// Import
// ========

var Test = require('substance-test');
var WriterTest = require('./writer_test');
// var assert = Test.assert;
var registerTest = Test.registerTest;
// var Document = require('../index');


// Test
// ========

var AnnotationBusinessTest = function() {

  this.setup = function() {

  };

  // Deactivate the default fixture
  // ----------

  this.fixture = function() {

  };

  this.actions = [
    "Add emphasis to a text", function() {
      
      // 1. Construct writing scenario
      // ---------------

      var writer = this.createWriter({
        "document": [
          ["text_1", "abcdefghi"],
          ["text_2", "jklmnopq"],
          ["text_3", "rstuvxyz"]
        ],
        "selection": ["text_1", 0, "text_1", 3]
      });

      // 2. Perform operation
      // ---------------

      var a = writer.annotate("emphasis");

      // 3. Check the result 
      // ---------------

      var expectedWriter = this.createWriter({
        "document": [
          ["text_1", "abcdefghi"],
          ["text_2", "jklmnopq"],
          ["text_3", "rstuvxyz"]
        ],
        "annotations": [
          [a.id, "text_1", "content", [0, 3], "emphasis"]
        ],
        "selection": ["text_1", 0, "text_1", 3]
      });

      this.isWriterEqual(expectedWriter, writer);
    },


    "Toggle back (remove) the previous annotation", function() {
      
      // 1. Construct writing scenario
      // ---------------

      var writer = this.createWriter({
        "document": [
          ["text_1", "abcdefghi"],
          ["text_2", "jklmnopq"],
          ["text_3", "rstuvxyz"]
        ],
        "annotations": [
          ["annotation_1", "text_1", "content", [0, 3], "emphasis"]
        ],
        "selection": ["text_1", 0, "text_1", 3]
      });

      // 2. Perform operation
      // ---------------

      writer.annotate("emphasis");

      // 3. Check the result 
      // ---------------

      var expectedWriter = this.createWriter({
        "document": [
          ["text_1", "abcdefghi"],
          ["text_2", "jklmnopq"],
          ["text_3", "rstuvxyz"]
        ],
        "selection": ["text_1", 0, "text_1", 3]
      });

      this.isWriterEqual(expectedWriter, writer);
    },

    "Breaking an existing annotation into pieces", function() {
      
      // 1. Construct writing scenario
      // ---------------

      var writer = this.createWriter({
        "document": [
          ["text_1", "abcdefghi"]
        ],
        "annotations": [
          ["annotation_1", "text_1", "content", [0, 3], "idea"]
        ],
        "selection": ["text_1", 2]
      });

      // 2. Perform operation
      // ---------------

      var n = writer.insertNode('text');

      // 3. Check the result 
      // ---------------

      var expectedWriter = this.createWriter({
        "document": [
          ["text_1", "ab"],
          [n.id, "cdefghi"]
        ],
        "annotations": [
          ["annotation_1", "text_1", "content", [0, 2], "idea"]
        ],
        "selection": [n.id, 0]
      });

      assert.isWriterEqual(expectedWriter, writer);
    }

  ];
};



// General aid for the writertest
AnnotationBusinessTest.Prototype = function() {
  // helpers go here
};

AnnotationBusinessTest.Prototype.prototype = WriterTest.prototype;

AnnotationBusinessTest.prototype = new AnnotationBusinessTest.Prototype();

registerTest(['Document', 'Writer', 'Annotation Business'], new AnnotationBusinessTest());
