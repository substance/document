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

var AnnotationBusinessTest = function() {

  this.setup = function() {

  };

  // deactivate the default fixture
  // ----------

  this.fixture = function() {

  };

  this.actions = [
    "Add emphasis to a text", function() {
      
      // 1. Construct writing scenario
      // ---------------

      var writer = createWriter({
        "document": [
          ["text_1", "abcdefghi"],
          ["text_2", "jklmnopq"]
          ["text_3", "rstuvxyz"]
        ],
        "selection": ["text_1", 0, "text_3", 3]
      });

      // 2. Perform operation
      // ---------------

      doc.annotate("emphasis");

      // 3. Check the result 
      // ---------------

      var expectedWriter = createWriter({
        "document": [
          ["text_1", "abcdefghi"],
          ["text_2", "jklmnopq"]
          ["text_3", "rstuvxyz"]
        ],
        "annotations": [
          ["text_1", [0, 3], "emphasis"]
        ],
        "selection": ["text_1", 0, "text_3", 3]
      });

      assert.isWriterEqual(expectedWriter, writer);
    },

    "Toggle back (remove) the previous annotation", function() {
      
      // 1. Construct writing scenario
      // ---------------

      var expectedWriter = createWriter({
        "document": [
          ["text_1", "abcdefghi"],
          ["text_2", "jklmnopq"]
          ["text_3", "rstuvxyz"]
        ],
        "annotations": [
          ["text_1", [0, 3], "emphasis"]
        ],
        "selection": ["text_1", 0, "text_3", 3]
      });

      // 2. Perform operation
      // ---------------

      doc.annotate("emphasis");

      // 3. Check the result 
      // ---------------

      var expectedWriter = createWriter({
        "document": [
          ["text_1", "abcdefghi"],
          ["text_2", "jklmnopq"]
          ["text_3", "rstuvxyz"]
        ],
        "selection": ["text_1", 0, "text_1", 3]
      });

      assert.isWriterEqual(expectedWriter, writer);
    },

    "Breaking an existing annotation into pieces", function() {
      
      // 1. Construct writing scenario
      // ---------------

      var expectedWriter = createWriter({
        "document": [
          ["text_1", "abcdefghi"],
        ],
        "annotations": [
          ["text_1", [0, 3], "emphasis"]
        ],
        "selection": ["text_1", 0, "text_1", 3]
      });

      // 2. Perform operation
      // ---------------

      // doc.annotate("emphasis");
      doc.insertNode('text');

      // 3. Check the result 
      // ---------------

      var expectedWriter = createWriter({
        "document": [
          ["text_1", "abcdefghi"],
          ["text_*", "jklmnopq"]
          ["text_3", "rstuvxyz"]
        ],
        "selection": ["text_1", 0, "text_3", 3]
      });

      assert.isWriterEqual(expectedWriter, writer);
    },


  ];
};

// General aid for the writertest
AnnotationBusinessTest.Prototype = function() {
  // helpers go here
};

AnnotationBusinessTest.prototype = new AnnotationBusinessTest.Prototype();

registerTest(['Document', 'Writer', 'Content Deletion'], new AnnotationBusinessTest());
