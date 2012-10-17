$(function() {

  // Util
  // ---------------

  // Render Underscore templates
  _.tpl = function (tpl, ctx) {
    var source = $('script[name='+tpl+']').html();
    // var source = templates[tpl];
    return _.template(source, ctx);
  };


  var Router = Backbone.Router.extend({
    initialize: function() {
      // Using this.route, because order matters
      this.route(':document', 'loadDocument', this.loadDocument);
      this.route('new', 'newDocument', this.newDocument);
      this.route('', 'start', app.start);
    },

    newDocument: function() {
      app.document(Math.uuid());
    },

    loadDocument: function(id) {
      app.document(id);
    }
  });


  // Welcome screen
  // ---------------

  var Start = Backbone.View.extend({
    render: function() {
      this.$el.html(_.tpl('start'));
    }
  });


  // The Mothership
  // ---------------

  var Application = Backbone.View.extend({
    events: {
      'click .current': '_toggleOptions',
      'click .load-testsuite': '_loadDocument'
    },

    _toggleOptions: function() {
      this.$('.options').toggle();
    },

    _loadDocument: function(e) {
      this.document($(e.currentTarget).attr('data-file'));
    },

    initialize: function (options) {
      // Load some data
      // this.document = new Document();
    },

    // Toggle document view
    document: function(file) {
      var that = this;
      loadDocument(file, function(err, rawDoc) {
        var doc = new Substance.Document(rawDoc);
        that.view = new Document({el: '#document', model: doc });
        that.view.render();
      });
    },

    // Toggle Start view
    start: function() {

    },

    // Render application template
    render: function() {
      this.$el.html(_.tpl('application'));
    }
  });


  // Document Visualization
  // ---------------

  var Document = Backbone.View.extend({
    events: {
      'click .operation': '_checkoutOperation',
      'click .apply-operation': '_applyOperation'
    },

    _applyOperation: function() {
      var op = JSON.parse(this.$('#command').val());
      console.log(op);
      this.model.apply({
        op: op,
        user: "Foo"
      });
      this.render();
      return false;
    },

    _checkoutOperation: function(e) {
      var sha = $(e.currentTarget).attr('data-sha');
      // Checkout previous version
      this.model.checkout(sha);
      this.sha = sha;
      this.render(); // Re-render it
    },

    initialize: function (options) {
      this.sha = 'master';
    },

    // Toggle document view
    document: function(id) {

    },

    // Toggle Start view
    start: function() {
      
    },

    // Render application template
    render: function() {
      this.$el.html(_.tpl('document', {
        sha: this.sha,
        operations: this.model.operations('master'),
        nodes: this.model.nodes(),
        document: this.model
      }));
    }
  });


  window.app = new Application({el: '#container'});
  app.render();

  app.document('substance.json');

  // Start responding to routes
  window.router = new Router({});

  Backbone.history.start();
});

// Global helpers
// ---------------

function loadDocument(file, cb) {
  $.getJSON('documents/' + file, function(doc) {
    cb(null, doc);
  });
}
