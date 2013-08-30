"use strict";

var DocumentNode = require("../node");
var WebResource = require("./web_resource");

var ImageNode = function(node, document) {
  WebResource.call(this, node, document);
};

// Type definition
// -----------------
//

ImageNode.type = {
  "id": "image",
  "parent": "webresource",
  "properties": {
  }
};

// Example Image
// -----------------
//

ImageNode.example = {
  "type": "image",
  "id": "image_1",
  "url": "http://elife.elifesciences.org/content/elife/1/e00311/F3.medium.gif"
};

// This is used for the auto-generated docs
// -----------------
//


ImageNode.description = {
  "name": "Image",
  "remarks": [
    "Represents a web-resource for an image."
  ],
  "properties": {}
};

ImageNode.Prototype = function() {};

ImageNode.Prototype.prototype = WebResource.prototype;
ImageNode.prototype = new ImageNode.Prototype();
ImageNode.prototype.constructor = ImageNode;

module.exports = ImageNode;
