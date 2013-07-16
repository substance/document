// AnnotatedText
// --------
//
// Ties together a text node with its annotations
// Interface defined by Substance.Surface
// TODO: Move to separated Substance.Annotator project?
// Not yet functional code!

var AnnotatedText = function(doc, path) {
  this.doc = doc;
  this.path = path;
  this.property = doc.resolve(path);
  this.resetCache();
};

AnnotatedText.Prototype = function() {

  this.setAnnotation = function(annotation) {
    this.cache.annotations[annotation.id] = annotation;
    this.commit();
  };

  this.getAnnotation = function(id) {
    return this.cache.annotations[id] || this.doc.get(id);
  };

  this.deleteAnnotation = function(id) {
    delete this.cache.annotations[id];
    this.cache.deleted_annotations.push(id);
  };

  this.setContent = function(content) {
    this.cache.content = content;
    this.commit();
  };

  this.getContent = function() {
    if (this.cache.content !== null) return this.cache.content;
    return this.property.get();
  };

  // Transform Hook
  // --------
  //

  this.each = function(fn) {
    var annos = this.doc.find('annotations', this.property.node.id);
    _.each(this.cache.annotations, fn);

    _.each(annos, function(a) {
      if (!this.cache.annotations[a.id] && !_.include(this.cache.deleted_annotations, a.id)) fn(a, a.id);
    }, this);
  };

  // Transform Hook
  // --------
  //
  // triggered implicitly by Surface.insert|deleteTransformer)

  this.transformAnnotation = function(a, op, expand) {
    if (this.cache.annotations[a.id]) {
      a = this.cache.annotations[a.id];
    } else {
      a = util.deepclone(a);
    }
    Operator.TextOperation.Range.transform(a.range, op, expand);
    this.cache.annotations[a.id] = a;
  };

  this.resetCache = function() {
    this.cache = {
      annotations: {},
      content: null,
      deleted_annotations: []
    };
  };

  // Commit changes
  // --------
  //

  this.commit = function() {

    // 1. Insert Annotations
    var newAnnotations = [];
    var updatedAnnotations = [];
    _.each(this.cache.annotations, function(a) {
      var oa = this.doc.get(a.id);
      if (!oa) newAnnotations.push(a);
      else if (a.type !== oa.type) updatedAnnotations.push(a);
    }, this);

    var cmds = [];

    _.each(newAnnotations, function(a) {
      a.node = this.property.node.id;
      cmds.push(Document.Create(a));
    }, this);

    // Text diff computation
    if (this.cache.content !== null) {
      var delta = _.extractOperation(this.property.get(), this.cache.content);
      cmds.push(Data.Graph.Update(this.path, Operator.TextOperation.fromOT(delta)));
    }

    _.each(cmds, function(c) {
      this.doc.apply(c);
    }, this);
    this.resetCache();
  };
};

AnnotatedText.prototype = new AnnotatedText.Prototype();

Object.defineProperties(AnnotatedText.prototype, {
  content: {
    get: function () {
      return this.getContent();
    },
    set: function(content) {
      this.setContent(content);
    }
  }
});