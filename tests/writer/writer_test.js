"use strict";

// Import
// ========

var Test = require('substance-test');
var assert = Test.assert;
var registerTest = Test.registerTest;
var util = require('substance-util');
var Document = require('../../src/document');

var WriterTest = function() {
  
};

// General aid for the writertest
WriterTest.Prototype = function() {
  // helpers go here

  this.createWriter = function(spec) {
    // var uuid = util.uuidGen('node_');
    var doc = new Document({"id": "writer_test"});
    var writer = new Document.Writer(doc);

    _.each(spec.document, function(node, index) {
      var id = node[0];
      var type = id.split('_')[0];

      // Use blank by default for non-text types such as images
      var content = node[1] || " ";

      // Create node based on the minidoc spec
      doc.create({
        "id": id,
        "type": type,
        "content": content,
        "medium": "http://i.telegraph.co.uk/multimedia/archive/02429/eleanor_scriven_2429776k.jpg"
      });

      doc.position("content", [id], -1);
    });

    var sel = spec.selection;
    // Now set the selection

    var startNodeOffset = doc.getPosition("content", sel[0]);
    var startCharOffset = sel[1];
    var endNodeOffset;
    var endCharOffset;

    if (sel.length === 4) {
      endNodeOffset = doc.getPosition("content", sel[2]);
      endCharOffset = sel[3];
    } else {
      endNodeOffset = startNodeOffset;
      endCharOffset = startCharOffset;
    }

    writer.selection.set({
      start: [startNodeOffset, startCharOffset],
      end: [endNodeOffset, endCharOffset]
    });

    return writer;
  };

  this.isWriterEqual = function(expectedWriter, actualWriter) {
    assert.isEqual(expectedWriter.getNodes().length, actualWriter.getNodes().length);
    
    _.each(expectedWriter.__document.nodes, function(n, key) {
      assert.isDeepEqual(n, actualWriter.get(key));
    }, this);

    // Check selection
    assert.isDeepEqual(expectedWriter.selection.toJSON(), actualWriter.selection.toJSON());
  };
};

WriterTest.prototype = new WriterTest.Prototype();

module.exports = WriterTest;
