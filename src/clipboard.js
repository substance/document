"use strict";

var _ = require("underscore");
var util = require("substance-util");
var Document = require("substance-document");

// Document.Clipboard
// ================
//

var Clipboard = function() {
  // Start with an empty document
  // this.content = new Document({id: "clipboard"});
};


Clipboard.Prototype = function() {

  // Get contents from clipboard
  // --------
  // 

  this.setContent = function(content) {
    this.content = content;
  };

  // Get contents from clipboard
  // --------
  // 
  // Depending on the timestamp 

  this.getContent = function() {
    return this.content;
  };
};


Clipboard.Prototype.prototype = util.Events;
Clipboard.prototype = new Clipboard.Prototype();

// Export
// ========

module.exports = Clipboard;
