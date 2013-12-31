"use strict";

var _ = require("underscore");
var util = require("substance-util");
var errors = util.errors;

var CursorError = errors.define("CursorError");

// Document.Selection.Cursor
// ================
//

var Cursor = function(container, pos, charPos, view) {
  this.container = container;
  this.view = view || 'content';

  this.pos = pos;
  this.charPos = charPos;

  if (pos !== null && !_.isNumber(pos)) {
    throw new CursorError("Illegal argument: expected pos as number");
  }

  if (charPos !== null && !_.isNumber(charPos)) {
    throw new CursorError("Illegal argument: expected charPos as number");
  }
};


Cursor.Prototype = function() {

  this.copy = function() {
    return new Cursor(this.container, this.pos, this.charPos, this.view);
  };

  this.isValid = function() {
    if (this.pos === null || this.charPos === null) return false;
    if (this.pos < 0 || this.charPos < 0) return false;

    var l = this.container.getLength(this.pos);
    if (this.charPos >= l) return false;

    return true;
  };

  this.isRightBound = function() {
    return this.charPos === this.container.getLength(this.pos);
  };

  this.isLeftBound = function() {
    return this.charPos === 0;
  };

  this.isEndOfDocument = function() {
    return this.isRightBound() && this.pos === this.container.getLength()-1;
  };

  this.isBeginOfDocument = function() {
    return this.isLeftBound() && this.pos === 0;
  };

  // Return previous node boundary for a given node/character position
  // --------
  //

  this.prevNode = function() {
    if (!this.isLeftBound()) {
      this.charPos = 0;
    } else if (this.pos > 0) {
      this.pos -= 1;
      this.charPos = this.container.getLength(this.pos);
    }
  };

  // Return next node boundary for a given node/character position
  // --------
  //

  this.nextNode = function() {
    if (!this.isRightBound()) {
      this.charPos = this.container.getLength(this.pos);
    } else if (this.pos < this.container.getLength()-1) {
      this.pos += 1;
      this.charPos = 0;
    }
  };

  // Return previous occuring word for a given node/character position
  // --------
  //

  this.prevWord = function() {

    // Cursor is at first position -> move to prev paragraph if there is any
    if (this.isLeftBound()) {
      this.prevChar();
    } else {
      return this.prevChar();
    }
  };

  // Return next occuring word for a given node/character position
  // --------
  //

  this.nextWord = function() {

    // Cursor is a last position -> move to next paragraph if there is any
    if (this.isRightBound()) {
      this.nextChar();
    } else {
      this.nextChar();
    }
  };

  // Return next char, for a given node/character position
  // --------
  //
  // Useful when navigating over paragraph boundaries

  this.nextChar = function() {

    // Last char in paragraph
    if (this.isRightBound()) {
      if (this.pos < this.container.getLength()-1) {
        this.pos += 1;
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
    if (this.charPos<0) throw new CursorError('Invalid char position');

    if (this.isLeftBound()) {
      if (this.pos > 0) {
        this.pos -= 1;
        this.charPos = this.container.getLength(this.pos);
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

  this.set = function(pos, charPos) {
    if (pos !== null && !_.isNumber(pos)) {
      throw new CursorError("Illegal argument: expected pos as number");
    }

    if (charPos !== null && !_.isNumber(charPos)) {
      throw new CursorError("Illegal argument: expected charPos as number");
    }

    if (pos !== null) {
      if(!_.isNumber(pos)) {
        throw new CursorError("Illegal argument: expected pos as number");
      }
      var n = this.container.getLength();
      if (pos < 0 || pos >= n) {
        throw new CursorError("Invalid node position: " + pos);
      }

      var l = this.container.getLength(pos);
      if (charPos < 0 || charPos > l) {
        throw new CursorError("Invalid char position: " + charPos);
      }
    }

    this.pos = pos;
    this.charPos = charPos;
  };

  this.position = function() {
    return [this.pos, this.charPos];
  };
};

Cursor.prototype = new Cursor.Prototype();

module.exports = Cursor;
