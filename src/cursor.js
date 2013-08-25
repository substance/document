var _ = require("underscore");
var SRegExp = require("substance-regexp");
var util = require("substance-util");
var errors = util.errors;

var CursorError = errors.define("CursorError");

// Document.Selection.Cursor
// ================
//
// Hi, I'm an iterator, just so you know.

var Cursor = function(container, nodePos, charPos, view) {
  this.container = container;
  this.view = view || 'content';

  this.nodePos = nodePos;
  this.charPos = charPos;

  if (nodePos !== null && !_.isNumber(nodePos)) {
    throw new CursorError("Illegal argument: expected nodePos as number");
  }

  if (charPos !== null && !_.isNumber(charPos)) {
    throw new CursorError("Illegal argument: expected charPos as number");
  }
};


Cursor.Prototype = function() {

  this.copy = function() {
    return new Cursor(this.container, this.nodePos, this.charPos, this.view);
  };

  this.isValid = function() {
    if (this.nodePos === null || this.charPos === null) return false;
    if (this.nodePos < 0 || this.charPos < 0) return false;

    var node = this.container.getNodeFromPosition(this.nodePos);

    if (!node) return false;
    if (this.charPos >= node.getLength()) return false;

    return true;
  };

  this.isRightBound = function() {
    return this.charPos === this.node.getLength();
  };

  this.isLeftBound = function() {
    return this.charPos === 0;
  };

  this.isEndOfDocument = function() {
    return this.isRightBound() && this.nodePos === this.container.getLength()-1;
  };

  this.isBeginOfDocument = function() {
    return this.isLeftBound() && this.nodePos === 0;
  };

  // Return previous node boundary for a given node/character position
  // --------
  //

  this.prevNode = function() {
    if (!this.isLeftBound()) {
      this.charPos = 0;
    } else if (this.nodePos > 0) {
      this.nodePos -= 1;
      this.charPos = this.node.length;
    }
  };

  // Return next node boundary for a given node/character position
  // --------
  //

  this.nextNode = function() {
    if (!this.isRightBound()) {
      this.charPos = this.node.length;
    } else if (this.nodePos < this.container.getLength()-1) {
      this.nodePos += 1;
      this.charPos = 0;
    }
  };

  // Return previous occuring word for a given node/character position
  // --------
  //

  this.prevWord = function() {
    if (!this.node) throw new CursorError('Invalid node position');

    // Cursor is at first position -> move to prev paragraph if there is any
    if (this.isLeftBound()) {
      this.prevChar();
    } else if (this.node.prevWord) {
      this.charPos = this.node.prevWord(this.charPos);
    } else {
      return this.prevChar();
    }
  };

  // Return next occuring word for a given node/character position
  // --------
  //

  this.nextWord = function() {
    if (!this.node) throw new CursorError('Invalid node position');

    // Cursor is a last position -> move to next paragraph if there is any
    if (this.isRightBound()) {
      this.nextChar();
    } else if (this.node.nextWord) {
      this.charPos = this.node.nextWord(this.charPos);
    } else {
      this.nextChar();
    }
  };

  // Return next char, for a given node/character position
  // --------
  //
  // Useful when navigating over paragraph boundaries

  this.nextChar = function() {
    if (!this.node) throw new CursorError('Invalid node position');

    // Last char in paragraph
    if (this.isRightBound()) {
      if (this.nodePos < this.container.getLength()-1) {
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
    if (!this.node) throw new CursorError('Invalid node position');
    if (this.charPos<0) throw new CursorError('Invalid char position');

    if (this.isLeftBound()) {
      if (this.nodePos > 0) {
        this.nodePos -= 1;
        this.charPos = this.node.getLength();
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
        this.prevWord();
      } else if (granularity === "char") {
        this.prevChar();
      } else if (granularity === "node") {
        this.prevNode();
      }
    } else {
      if (granularity === "word") {
        this.nextWord();
      } else if (granularity === "char") {
        this.nextChar();
      } else if (granularity === "node") {
        this.nextNode();
      }
    }
  };

  this.set = function(nodePos, charPos) {
    this.nodePos = nodePos;
    this.charPos = charPos;

    if (nodePos !== null && !_.isNumber(nodePos)) {
      throw new CursorError("Illegal argument: expected nodePos as number");
    }

    if (charPos !== null && !_.isNumber(charPos)) {
      throw new CursorError("Illegal argument: expected charPos as number");
    }

    if (nodePos !== null) {
      if(!_.isNumber(nodePos)) {
        throw new CursorError("Illegal argument: expected nodePos as number");
      }
      var n = this.container.getLength();
      if (nodePos < 0 || nodePos >= n) {
        throw new CursorError("Invalid node position: " + nodePos);
      }
      var node = this.container.getNodeFromPosition(nodePos);
      var l = node.getLength();
      if (charPos < 0 || charPos > l) {
        throw new CursorError("Invalid char position: " + charPos);
      }
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
      return this.container.getNodeFromPosition(this.nodePos);
    }
  }
});

module.exports = Cursor;
