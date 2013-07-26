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
  this.createWriter = function(spec) {
    // var uuid = util.uuidGen('node_');
    var doc = new Document({"id": "writer_test"});
    var writer = new Document.Writer(doc);

    // Build content nodes
    // --------

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


    // Build annotations if there are any
    // --------

    if (spec.annotations) {
      _.each(spec.annotations, function(annotation, index) {
        var id = annotation[0];
        var node = annotation[1];
        var property = annotation[2]; // e.g. "content" on a text node
        var range = annotation[3]; // e.g. [0,4] for the first 4 chars
        var type = annotation[4];

        doc.create({
          "id": id,
          "type": type,
          "node": node,
          "property": property,
          "range": range
        });
      });      
    }


    // Set the selection
    // --------

    var sel = spec.selection;

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
