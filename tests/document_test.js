(function(root) {

var _,
    Editor,
    Document;

if (typeof exports !== 'undefined') {
  throw new Error("DocumenTest does not support Node yet.");
} else {
  _ = root._;
  Document = root.Substance.Document;
  Editor = root.Substance.Document.Editor;
}

var ID_IDX = 1;

// Abstract Test for Document
// ================
// 

var DocumentTest = function() {

  this.uuid = function(prefix) {
    prefix = prefix || "node_";
    return prefix+(ID_IDX++);
  };

  this.next_uuid = function() {
    return ID_IDX;
  };

  this.op = function(idx) {
    this.comp[OP(idx)](VAL(idx));
  };

  this.setup = function() {
    ID_IDX = 1;

    this.__document = new Document({id: "surface_test"});
    this.editor = new Editor(this.__document);

    this.fixture();
  };

  this.insertContent = function(content) {
    var id = this.uuid("text_");
    this.__document.apply(["create", {
      "id": id,
      "type": "text",
      "content": content
    }]);
    this.__document.apply(["position", "content", {
      "nodes": [id],
      "target": -1
    }]);
  };

  // Verify state
  // -----------
  // 
  // Checks if the produced output of the Surface reflects
  // The given document state
  // 

  this.verify = function() {
    console.log('verifying..');
  };

  this.verifySelection = function() {
    console.log('verifying selection..');
  };

  // Load fixture
  // --------

  this.fixture = function() {
    // TODO: Load some initial seed
  };
};

// Export
// ====

root.Substance.Document.AbstractTest = DocumentTest;

})(this);
