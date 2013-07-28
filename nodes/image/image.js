"use strict";

var Image = function() {

};

Image.properties = {
  isText: false,
  deletion: {
    preventEmpty: true,
    attemptMerge: false
  },
  allowedAnnotations: ["idea", "question", "error"]
};

module.exports = Image;