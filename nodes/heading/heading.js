"use strict";

var Heading = function() {

};

Heading.properties = {
  isText: true,
  deletion: {
    preventEmpty: false,
    attemptMerge: true
  },
  allowedAnnotations: ["emphasis", "strong", "idea", "question", "error"]
};

module.exports = Heading;