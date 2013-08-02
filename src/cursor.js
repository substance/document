var _ = require("underscore");
var SRegExp = require("substance-regexp");

// Document.Selection.Cursor
// ================
//
// Hi, I'm an iterator, just so you know.

var Cursor = function(document, nodePos, charPos) {
  this.document = document;
  this.view = 'content';

  this.nodePos = nodePos;
  this.charPos = charPos;

  if (nodePos !== null && !_.isNumber(nodePos)) {
    throw new Error("Illegal argument: expected nodePos as number");
  }

  if (charPos !== null && !_.isNumber(charPos)) {
    throw new Error("Illegal argument: expected charPos as number");
  }

};


Cursor.Prototype = function() {

  this.copy = function() {
    return new Cursor(this.document, this.nodePos, this.charPos);
  };

  this.isValid = function() {
    // TODO: check if the positions are valid document positions
    return (this.nodePos !== null && this.charPos !== null);
  };

  this.isRightBound = function() {
    return this.charPos === this.node.content.length;
  };

  this.isLeftBound = function() {
    return this.charPos === 0;
  };

  this.isEndOfDocument = function() {
    return this.isRightBound() && !this.document.hasSuccessor(this.view, this.nodePos);
  };

  this.isBeginOfDocument = function() {
    return this.isLeftBound() && !this.document.hasPredecessor(this.view, this.nodePos);
  };


  // Return previous node boundary for a given node/character position
  // --------
  //

  this.prevNode = function() {
    if (!this.isLeftBound()) {
      this.charPos = 0;
    } else if (this.document.hasPredecessor(this.view, this.nodePos)) {
      this.nodePos -= 1;
      this.charPos = this.node.content.length;
    }
  };

  // Return next node boundary for a given node/character position
  // --------
  //

  this.nextNode = function() {
    if (!this.isRightBound()) {
      this.charPos = this.node.content.length;
    } else if (this.document.hasSuccessor(this.view, this.nodePos)) {
      this.nodePos += 1;
      this.charPos = 0;
    }
  };

  // Return previous occuring word for a given node/character position
  // --------
  //

  this.prevWord = function() {
    if (!this.node) throw new Error('Invalid node position');

    // Cursor is at first position -> move to prev paragraph if there is any
    if (this.isLeftBound()) return this.prevChar();

    var content = this.node.content;

    // Matches all word boundaries in a string
    var wordBounds = new SRegExp(/\b\w/g).match(content);
    var prevBounds = _.select(wordBounds, function(m) {
      return m.index < this.charPos;
    }, this);

    // happens if there is some leading non word stuff
    if (prevBounds.length === 0) {
      this.charPos = 0;
    } else {
      this.charPos = _.last(prevBounds).index;
    }
  };

  // Return next occuring word for a given node/character position
  // --------
  //

  this.nextWord = function() {
    if (!this.node) throw new Error('Invalid node position');

    // Cursor is a last position -> move to next paragraph if there is any
    if (this.isRightBound()) return this.nextChar();

    var content = this.node.content;

    // Matches all word boundaries in a string
    var wordBounds = new SRegExp(/\w\b/g).match(content.substring(this.charPos));

    // at the end there might be trailing stuff which is not detected as word boundary
    if (wordBounds.length === 0) {
      this.charPos = content.length;
    }
    // before, there should be some boundaries
    else {
      var nextBound = wordBounds[0];
      this.charPos += nextBound.index + 1;
    }
  };

  // Return next char, for a given node/character position
  // --------
  //
  // Useful when navigating over paragraph boundaries

  this.nextChar = function() {
    if (!this.node) throw new Error('Invalid node position');

    // Last char in paragraph
    if (this.isRightBound()) {
      if (this.document.hasSuccessor(this.view, this.nodePos)) {
        this.nodePos += 1;
        this.charPos = 0;
      }
    } else {
      this.charPos += 1;
    }
  };


  // Return next char, for a given node/character position
  // --------
  //
  // Useful when navigating over paragraph boundaries

  this.prevChar = function() {
    if (!this.node) throw new Error('Invalid node position');
    if (this.charPos<0) throw new Error('Invalid char position');

    if (this.isLeftBound()) {
      if (this.nodePos > 0) {
        this.nodePos -= 1;
        this.charPos = this.node.content.length;
      }
    } else {
      this.charPos -= 1;
    }
  };

  // Move
  // --------
  //
  // Useful helper to find char,word and node boundaries
  //
  //     find('right', 'char');
  //     find('left', 'word');
  //     find('left', 'node');

  this.move = function(direction, granularity) {
    if (direction === "left") {
      if (granularity === "word") {
        return this.prevWord();
      } else if (granularity === "char") {
        return this.prevChar();
      } else if (granularity === "node") {
        return this.prevNode();
      }
    } else {
      if (granularity === "word") {
        return this.nextWord();
      } else if (granularity === "char") {
        return this.nextChar();
      } else if (granularity === "node") {
        return this.nextNode();
      }
    }
  };

  this.set = function(nodePos, charPos) {
    this.nodePos = nodePos;
    this.charPos = charPos;

    if (nodePos !== null && !_.isNumber(nodePos)) {
      throw new Error("Illegal argument: expected nodePos as number");
    }

    if (charPos !== null && !_.isNumber(charPos)) {
      throw new Error("Illegal argument: expected charPos as number");
    }
  };

  this.position = function() {
    return [this.nodePos, this.charPos];
  };
};

Cursor.prototype = new Cursor.Prototype();

Object.defineProperties(Cursor.prototype, {
  node: {
    get: function() {
      return this.document.getNodeFromPosition(this.view, this.nodePos);
    }
  }
});

module.exports = Cursor;
