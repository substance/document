"use strict";

var Text = require("./text_node");

var Codeblock = function(node, document) {
  Text.call(this, node, document);
};

// Type definition
// --------

Codeblock.type = {
  "id": "codeblock",
  "parent": "content",
  "properties": {
    "content": "string"
  }
};

Codeblock.config = {
  "zoomable": true
};

// This is used for the auto-generated docs
// -----------------
//

Codeblock.description = {
  "name": "Codeblock",
  "remarks": [
    "Text in a codeblock is displayed in a fixed-width font, and it preserves both spaces and line breaks"
  ],
  "properties": {
    "content": "Content",
  }
};


// Example Formula
// -----------------
//

Codeblock.example = {
  "type": "codeblock",
  "id": "codeblock_1",
  "content": "var text = \"Sun\";\nvar op1 = Operator.TextOperation.Delete(2, \"n\");\ntext = op2.apply(op1.apply(text));\nconsole.log(text);",
};

Codeblock.Prototype = function() {};

Codeblock.Prototype.prototype = Text.prototype;
Codeblock.prototype = new Codeblock.Prototype();
Codeblock.prototype.constructor = Codeblock;

module.exports = Codeblock;

