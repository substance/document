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

var ContentDeletionTest = function() {

  this.setup = function() {

  };

  // deactivate the default fixture
  // ----------

  this.fixture = function() {

  };

  this.actions = [
    "Delete when cursor is on the image (right edge)", function() {
      
      // 1. Construct writing scenario
      // ---------------

      var writer = createWriter({
        "document": [
          ["heading_1", "ABCD"],
          ["image_1"          ],
          ["text_1",    "abcd"]
        ],
        "selection": ["image_1", 1]
      });

      // 2. Perform operation
      // ---------------

      doc.delete();

      // 3. Check the result 
      // ---------------

      var expectedWriter = createWriter({
        "document": [
          ["heading_1", "ABCD"],
          ["text_1",    "abcd"]
        ],
        "selection": ["heading_1", 4]
      });

      assert.isWriterEqual(expectedWriter, writer);
    },


    "Delete when cursor is right after an image", function() {
      
      // 1. Construct writing scenario
      // ---------------

      var writer = createWriter({
        "document": [
          ["heading_1", "ABCD"],
          ["image_1"          ],
          ["text_1",    "abcd"]
        ],
        "selection": ["text_1", 0]
      });

      // 2. Perform operation
      // ---------------

      doc.delete();

      // 3. Check the result 
      // ---------------
      // 
      // We expect that the deletion command just selects the image
      // to make the pending deletion explicit

      var expectedWriter = createWriter({
        "document": [
          ["heading_1", "ABCD"],
          ["image_1"          ],
          ["text_1",    "abcd"]
        ],
        "selection": ["image_1", 0, "image_1", 1]
      });

      assert.isWriterEqual(expectedWriter, writer);
    },


    "Delete when image is selected", function() {
      
      // 1. Construct writing scenario
      // ---------------

      var writer = createWriter({
        "document": [
          ["heading_1", "ABCD"],
          ["image_1"          ],
          ["text_1",    "abcd"]
        ],
        "selection": ["image_1", 0, "image_1", 1 ]
      });

      // 2. Perform operation
      // ---------------

      doc.delete();

      // 3. Check the result 
      // ---------------
      // 
      // Image is finall removed and the cursor ends up at the last position 
      // of the preceding heading

      var expectedWriter = createWriter({
        "document": [
          ["heading_1", "ABCD"],
          ["text_1",    "abcd"]
        ],
        "selection": ["heading_1", 4, "heading_1", 4]
      });

      assert.isWriterEqual(expectedWriter, writer);
    },

    "Delete multi-node selection (with image in between)", function() {
      
      // 1. Construct writing scenario
      // ---------------

      var writer = createWriter({
        "document": [
          ["heading_1", "ABCD"],
          ["image_1"          ],
          ["text_1",    "abcd"]
        ],
        "selection": ["heading_1", 2, "text_1", 2 ]
      });

      // 2. Perform operation
      // ---------------

      doc.delete();

      // 3. Check the result 
      // ---------------
      // 
      // Selected content should be gone and cusor ends up at the start
      // of the selection. Text node gets merged into header node

      var expectedWriter = createWriter({
        "document": [
          ["heading_1", "ABcd"],
        ],
        "selection": ["heading_1", 2]
      });

      assert.isWriterEqual(expectedWriter, writer);
    },

    "Delete content when heading follows a text node", function() {
      
      // 1. Construct writing scenario
      // ---------------

      var writer = createWriter({
        "document": [
          ["text_1",    "abcd"],
          ["heading_1", "ABCD"]
        ],
        "selection": ["text_1", 1, "heading_1", 3 ]
      });

      // 2. Perform operation
      // ---------------

      doc.delete();

      // 3. Check the result 
      // ---------------
      // 
      // Selected content should be gone and cusor ends up at the start
      // of the selection. Text node gets merged into header node

      var expectedWriter = createWriter({
        "document": [
          ["text_1", "aD"],
        ],
        "selection": ["text_1", 1]
      });

      assert.isWriterEqual(expectedWriter, writer);
    },

    "Delete selection that ends right before an image", function() {
      
      // 1. Construct writing scenario
      // ---------------

      var writer = createWriter({
        "document": [
          ["heading_1", "ABCD"],
          ["image_1"          ],
          ["text_1",    "abcd"]
        ],
        "selection": ["heading_1", 1, "image_1", 0 ]
      });

      // 2. Perform operation
      // ---------------

      doc.delete();

      // 3. Check the result 
      // ---------------
      // 
      // Selected content should be gone and cusor ends up at the start
      // of the selection. Text node gets merged into header node

      var expectedWriter = createWriter({
        "document": [
          ["heading_1", "A"],
          ["image_1"          ],
          ["text_1",    "abcd"]
        ],
        "selection": ["heading_1", 1]
      });

      assert.isWriterEqual(expectedWriter, writer);
    },

    "Delete selection that ends right after an image", function() {
      
      // 1. Construct writing scenario
      // ---------------

      var writer = createWriter({
        "document": [
          ["heading_1", "ABCD"],
          ["image_1"          ],
          ["text_1",    "abcd"]
        ],
        "selection": ["heading_1", 1, "image_1", 1 ]
      });

      // 2. Perform operation
      // ---------------

      doc.delete();

      // 3. Check the result 
      // ---------------
      // 
      // Image should be removed but heading_1 and text_1 should not be
      // merged since the selection didn't touch the text_1 node
      // Next test describes that scenario

      var expectedWriter = createWriter({
        "document": [
          ["heading_1", "A"],
          ["text_1",    "abcd"]
        ],
        "selection": ["heading_1", 1]
      });

      assert.isWriterEqual(expectedWriter, writer);
    },

    "Delete selection that ends at the beginning of text node, right after image", function() {
      
      // 1. Construct writing scenario
      // ---------------

      var writer = createWriter({
        "document": [
          ["heading_1", "ABCD"],
          ["image_1"          ],
          ["text_1",    "abcd"]
        ],
        "selection": ["heading_1", 1, "text_1", 0 ]
      });

      // 2. Perform operation
      // ---------------

      doc.delete();

      // 3. Check the result 
      // ---------------
      // 
      // Image should be removed but and text_1 gets merged
      // into heading_1

      var expectedWriter = createWriter({
        "document": [
          ["heading_1", "Aabcd"]
        ],
        "selection": ["heading_1", 1]
      });

      assert.isWriterEqual(expectedWriter, writer);
    }


  ];
};

// General aid for the writertest
ContentDeletionTest.Prototype = function() {
  // helpers go here
};


ContentDeletionTest.prototype = new ContentDeletionTest.Prototype();

registerTest(['Document', 'Writer', 'Content Deletion'], new ContentDeletionTest());
