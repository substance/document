"use strict";

var _ = require("underscore");
var Operator = require('substance-operator');
var SRegExp = require("substance-regexp");
var ObjectOperation = Operator.ObjectOperation;
var TextOperation = Operator.TextOperation;
var Node = require('../../node');

// Substance.Text
// -----------------
//

var Text = function(node, document) {
  Node.call(this, node, document);
};

Text.Prototype = function() {

  this.getChangePosition = function(op) {
    if (op.path[1] === "content") {
      var lastChange = Operator.Helpers.last(op.diff);
      if (lastChange.isInsert()) {
        return lastChange.pos+lastChange.length();
      } else if (lastChange.isDelete()) {
        return lastChange.pos;
      }
    }
    return -1;
  };

  this.getLength = function() {
    return this.properties.content.length;
  };

  this.insertOperation = function(charPos, text) {
    return ObjectOperation.Update([this.properties.id, "content"],
      TextOperation.Insert(charPos, text));
  };

  this.deleteOperation = function(startChar, endChar) {
    var content = this.properties.content;
    return ObjectOperation.Update([this.properties.id, "content"],
      TextOperation.Delete(startChar, content.substring(startChar, endChar)),
      "string");
  };

  this.prevWord = function(charPos) {

    var content = this.properties.content;

    // Matches all word boundaries in a string
    var wordBounds = new SRegExp(/\b\w/g).match(content);
    var prevBounds = _.select(wordBounds, function(m) {
      return m.index < charPos;
    }, this);

    // happens if there is some leading non word stuff
    if (prevBounds.length === 0) {
      return 0;
    } else {
      return _.last(prevBounds).index;
    }
  };

  this.nextWord = function(charPos) {
    var content = this.properties.content;

    // Matches all word boundaries in a string
    var wordBounds = new SRegExp(/\w\b/g).match(content.substring(charPos));

    // at the end there might be trailing stuff which is not detected as word boundary
    if (wordBounds.length === 0) {
      return content.length;
    }
    // before, there should be some boundaries
    else {
      var nextBound = wordBounds[0];
      return charPos + nextBound.index + 1;
    }
  };

  this.canJoin = function(other) {
    return (other instanceof Text);
  };

  this.join = function(doc, other) {
    var pos = this.properties.content.length;
    var text = other.content;

    doc.update([this.id, "content"], [pos, text]);
    var annotations = doc.indexes["annotations"].get(other.id);

    _.each(annotations, function(anno) {
      doc.set([anno.id, "path"], [this.properties.id, "content"]);
      doc.set([anno.id, "range"], [anno.range[0]+pos, anno.range[1]+pos]);
    }, this);
  };

  this.isBreakable = function() {
    return true;
  };

  this.break = function(doc, pos) {
    var tail = this.properties.content.substring(pos);

    // 1. Create a new node containing the tail content
    var newNode = this.toJSON();
    // letting the textish node override the type of the new node
    // e.g., a 'heading' breaks into a 'paragraph'
    newNode.type = this.splitInto ? this.splitInto : this.properties.type;
    newNode.id = doc.uuid(this.properties.type);
    newNode.content = tail;
    doc.create(newNode);

    // 2. Move all annotations
    var annotations = doc.indexes["annotations"].get(this.properties.id);
    _.each(annotations, function(annotation) {
      if (annotation.range[0] >= pos) {
        doc.set([annotation.id, "path"], [newNode.id, "content"]);
        doc.set([annotation.id, "range"], [annotation.range[0]-pos, annotation.range[1]-pos]);
      }
    });

    // 3. Trim this node's content;
    doc.update([this.properties.id, "content"], TextOperation.Delete(pos, tail))

    // return the new node
    return newNode;
  };

};

Text.Prototype.prototype = Node.prototype;
Text.prototype = new Text.Prototype();
Text.prototype.constructor = Text;

Node.defineProperties(Text.prototype, ["content"]);

module.exports = Text;
