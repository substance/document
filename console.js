(function() {

// Commands
// ---------------

var SUBSTANCE_COMMANDS = {
  "document": [
    {
      "name": "Insert Heading",
      "op": ["insert", {"id": "UNIQUE_ID", "type": "heading", "target": "back", "data": {"content": "HEADING_NAME"}}]
    },
    {
      "name": "Insert Text",
      "op": ["insert", {"id": "UNIQUE_ID", "type": "text", "target": "back", "data": {"content": "CONTENT"}}]
    },
    {
      "name": "Update Text (Delta)",
      "op": ["update", {"id": "NODE_ID", "data": {"content": [5, " world!"]}}]
    },
    {
      "name": "Update Heading (Properties)",
      "op": ["update", {"id": "NODE_ID", "data": {"content": "NEW_CONTENT"}}]
    },
    {
      "name": "Move Node(s)",
      "op": ["move", {"nodes": ["NODE_ID", "ANOTHER_NODE_ID"], "target": "TARGET_NODE_ID"}]
    },
    {
      "name": "Delete Node(s)",
      "op": ["delete", {"nodes": ["NODE_ID", "ANOTHER_NODE_ID"]}]
    }
  ],

  "annotation": [
    {
      "name": "Insert Annotation",
      "op": ["insert", {"id": "idea:1", "type": "idea", "node": "text:2", "pos": [4, 5]}]
    },
    {
      "name": "Update Annotation",
      "op": ["update", {"id": "idea:1", "data": {"pos": [6, 10]}}]
    }
  ],

  "comment": [
    {
      "name": "Insert Comment (node)",
      "op": ["insert", {"id": "comment:a", "node": "text:2", "data": {"content": "Good argumentation."}}]
    },
    {
      "name": "Insert Comment (annotation)",
      "op": ["insert", {"id": "comment:b", "data": {"node": "idea:1", "content": "A way of saying helo."}}]
    },
    {
      "name": "Update comment",
      "op": ["update", {"id": "comment:a", "data": {"content": "Hey there."}}]
    }
  ]
};


var Console = Backbone.View.extend({

  // Events
  // ------

  events: {
    'click .operation': '_checkoutOperation',
    'click .apply-operation': '_applyOperation',
    'change #select_scope': '_selectScope',
    'change #select_example': '_selectExample',
    'click .toggle-output': '_toggleOutput',
    'focus .console textarea': '_makeEditable'
  },

  // Handlers
  // --------

  _makeEditable: function() {
    this.$('#command').removeClass('inactive');
    this.$('.apply-operation').addClass('active');
  },

  _toggleOutput: function(e) {
    var view = $(e.currentTarget).attr('data-output');
    
    this.$('.toggle-output').removeClass('active');
    this.$(e.currentTarget).addClass('active');

    if (view === "visualization") {
      this.render();
    } else if (view === "content") {
      this.$('.output .document').html('<textarea class="json">'+JSON.stringify(this.document.toJSON(), null, '  ')+'</textarea>');
    } else {
      this.$('.output .document').html('<textarea class="json">'+JSON.stringify(this.document.export(), null, '  ')+'</textarea>');
    }
    return false;
  },

  _selectScope: function() {
    this.scope = $('#select_scope').val();
    this.render();
    return false;
  },

  _selectExample: function() {
    this._makeEditable();
    var option = $('#select_example').val().split(':');
    var scope = option[0];
    var index = option[1];
    
    var op = SUBSTANCE_COMMANDS[scope][index];
    $('#command').val(JSON.stringify(op.op, null, '  '));
    return false;
  },

  _applyOperation: function(e) {
    if (!$(e.currentTarget).hasClass('active')) return;
    var op = JSON.parse(this.$('#command').val());

    this.document.apply(op);
    this.sha = this.document.chronicle.getState();

    this.render();
    return false;
  },

  _checkoutOperation: function(e) {
    this.sha = $(e.currentTarget).attr('data-sha');
    this.document.chronicle.open(sha);
    this.render(); // Re-render it
    return false;
  },

  initialize: function (options) {
    this.sha = this.document.chronicle.getState();
    this.scope = 'document';
  },

  // Toggle Start view
  start: function() {
    
  },

  // Render application template
  render: function() {

    var last = this.chronicle.find('last') || this.chronicle.getState();
    var commits = this.chronicle.getChanges(last);

    this.$el.html(_.tpl('console', {
      sha: this.sha,
      operations: commits,
      nodes: _.map(this.document.views.content, function(n) { return this.document.nodes[n];}, this),
      document: this.document
    }));

    // Get current op
    var op = this.chronicle.get(this.sha).data;
    
    if (op) $('#command').val(JSON.stringify(op.op, null, '  '));
    this.renderAnnotations();
    this.renderScope();
    return this;
  },

  renderAnnotations: function() {
    var that = this;
    _.each(this.document.views.content, function(nodeId) {
      var node = that.model.nodes[nodeId];
      var annotations = that.model.find('annotations', node.id);
      _.each(annotations, function(a) {
        var elems = $('div[data-id="'+a.node+'"]').children().slice(a.pos[0], a.pos[0] + a.pos[1]);
        elems.addClass(a.type);
      });
    });
  },

  renderScope: function() {
    this.$('#scope').html(_.tpl('scope', {
      scope: this.scope,
      commands: SUBSTANCE_COMMANDS
    }));
  }
});

// Export
if (!window.Substance) window.Substance = {};
if (!window.Substance.Console) window.Substance.Console = Console;

}).call(this);
