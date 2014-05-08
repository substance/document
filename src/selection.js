"use strict";

var _ = require("underscore");
var util = require("substance-util");
var errors = util.errors;
var Cursor = require("./cursor");
var ComponentSelection = require("./component_selection");
var NodeSelection = require("./node_selection");

var SelectionError = errors.define("SelectionError");

// Document.Selection
// ================
//
// A selection refers to a sub-fragment of a Substance.Document. It holds
// start/end positions for node and character offsets as well as a direction.
//
//     {
//       start: [NODE_POS, CHAR_POS]
//       end: [NODE_POS, CHAR_POS]
//       direction: "left"|"right"
//     }
//
// NODE_POS: Node offset in the document (0 = first node)
// CHAR_POS: Character offset within a textnode (0 = first char)
//
// Example
// --------
//
// Consider a document `doc` consisting of 3 paragraphs.
//
//           0 1 2 3 4 5 6
//     -------------------
//     P0  | a b c d e f g
//     -------------------
//     P1: | h i j k l m n
//     -------------------
//     P2: | o p q r s t u
//
//
// Create a selection operating on that document.
//     var sel = new Substance.Document.Selection(container);
//
//     sel.set({
//       start: [0, 4],
//       end: [1, 2],
//       direction: "right"
//     });
//
// This call results in the following selection:
//
//           0 1 2 3 4 5 6
//     -------------------
//     P0  | a b c d > > >
//     -------------------
//     P1: | > > > k l m n
//     -------------------
//     P2: | o p q r s t u
//

var Selection = function(container, selection) {
  this.container = container;

  this.start = null;
  this.__cursor = new Cursor(container, null, null);

  if (selection) this.set(selection);
};

Selection.Prototype = function() {

  // Get node from position in contnet view
  // --------
  //

  this.copy = function() {
    var copy = new Selection(this.container);
    if (!this.isNull()) copy.set(this);
    return copy;
  };


  // Set selection
  // --------
  //
  // sel: an instanceof Selection
  //      or a document range `{start: [pos, charPos], end: [pos, charPos]}`
  //      or a document position `[pos, charPos]`

  this.set = function(sel, options) {
    if (sel === null) {
      return this.clear();
    }

    var cursor = this.__cursor;
    if (sel instanceof Selection) {
      if (sel.isNull()) {
        this.clear();
        return;
      } else {
        this.start = _.clone(sel.start);
        cursor.set(sel.__cursor.pos, sel.__cursor.charPos);
      }
    } else if (_.isArray(sel)) {
      this.start = _.clone(sel);
      cursor.set(sel[0], sel[1]);
    } else {
      this.start = _.clone(sel.start);
      cursor.set(sel.end[0], sel.end[1]);
    }
    var start = this.start;

    // being hysterical about the integrity of selections
    var n = this.container.getLength();
    if (start[0] < 0 || start[0] >= n) {
      throw new SelectionError("Invalid node position: " + start[0]);
    }
    var l = this.container.getLength(start[0]);
    if (start[1] < 0 || start[1] > l) {
      throw new SelectionError("Invalid char position: " + start[1]);
    }

    this.trigger('selection:changed', this.range(), options);
    return this;
  };

  this.clear = function(options) {
    this.start = null;
    this.__cursor.set(null, null);
    this.trigger('selection:changed', null, options);
  };

  this.range = function() {
    if (this.isNull()) return null;

    var pos1 = this.start;
    var pos2 = this.__cursor.position();

    if (this.isReverse()) {
      return {
        start: pos2,
        end: pos1
      };
    } else {
      return {
        start: pos1,
        end: pos2
      };
    }
  };

  this.isReverse = function() {
    var cursor = this.__cursor;
    return (cursor.pos < this.start[0]) || (cursor.pos === this.start[0] && cursor.charPos < this.start[1]);
  };

  // Set cursor to position
  // --------
  //
  // Convenience for placing the single cusor where start=end

  this.setCursor = function(pos) {
    this.__cursor.set(pos[0], pos[1]);
    this.start = pos;
    return this;
  };

  // Get the selection's  cursor
  // --------
  //

  this.getCursor = function() {
    return this.__cursor.copy();
  };

  this.getCursorPosition = function() {
    return [this.__cursor.pos, this.__cursor.charPos];
  };

  // Fully selects a the node with the given id
  // --------
  //

  this.selectNode = function(nodeId) {
    var components = this.container.getNodeComponents(nodeId);

    var first = components[0];
    var last = components[components.length-1];

    var l = this.container.getLength(last.pos);
    this.set({
      start: [first.pos, 0],
      end: [last.pos, l]
    });
  };

  // Get predecessor node of a given node pos
  // --------
  //

  this.getPredecessor = function() {
    // NOTE: this can not be fixed as now the container can have components that are not nodes
    throw new Error("Not supported anymore");
  };

  // Get successor node of a given node pos
  // --------
  //

  this.getSuccessor = function() {
    // Can not be fixed.
    throw new Error("Not supported anymore");
  };

  // Check if the given position has a successor
  // --------
  //

  // TODO: is this really necessary? ~> document.hasPredecessor
  this.hasPredecessor = function(pos) {
    return pos > 0;
  };

  // Check if the given node has a successor
  // --------
  //

  // TODO: is this really necessary? ~> document.hasSuccessor
  this.hasSuccessor = function(pos) {
    var l = this.container.getLength();
    return pos < l-1;
  };


  // Collapses the selection into a given direction
  // --------
  //

  this.collapse = function(direction, options) {
    if (direction !== "right" && direction !== "left" && direction !== "start" && direction !== "cursor") {
      throw new SelectionError("Invalid direction: " + direction);
    }

    if (this.isCollapsed() || this.isNull()) return;

    if (direction === "start") {
      this.__cursor.set(this.start[0], this.start[1]);

    } else if (direction === "cursor") {
      this.start[0] = this.__cursor.pos;
      this.start[1] = this.__cursor.charPos;

    } else {
      var range = this.range();

      if (this.isReverse()) {
        if (direction === 'left') {
          this.start = range.start;
        } else {
          this.__cursor.set(range.end[0], range.end[1]);
        }
      } else {
        if (direction === 'left') {
          this.__cursor.set(range.start[0], range.start[1]);
        } else {
          this.start = range.end;
        }
      }
    }

    this.trigger('selection:changed', this.range(), options);
  };

  // move selection to position
  // --------
  //
  // Convenience for placing the single cusor where start=end

  this.move = function(direction, granularity, options) {

    // moving an expanded selection by char collapses the selection
    // and sets the cursor to the boundary of the direction
    if (!this.isCollapsed() && granularity === "char") {
      this.collapse(direction);
    }
    // otherwise the cursor gets moved (together with start)
    else {
      this.__cursor.move(direction, granularity);
      this.start = this.__cursor.position();
    }

    this.trigger('selection:changed', this.range(), options);
  };

  // Expand current selection
  // ---------
  //
  // Selections keep the direction as a state
  // They can either be right-bound or left-bound
  //

  this.expand = function(direction, granularity, options) {
    // expanding is done by moving the cursor
    this.__cursor.move(direction, granularity);

    this.trigger('selection:changed', this.range(), options);
  };

  // JSON serialization
  // --------
  //

  this.toJSON = function() {
    var data = null;

    if (!this.isNull()) {
      if (this.isCollapsed()) {
        data = this.__cursor.toJSON();
      } else {
        data = {
          start: _.clone(this.start),
          end: this.__cursor.toJSON()
        };
      }
    }

    return data;
  };

  // For a given document return the selected nodes
  // --------
  //

  this.getNodes = function() {
    throw new Error("This method has been removed, as it is not valid anymore after the Container refactor.");
    // var allNodes = this.container.getNodes();
    // if (this.isNull()) return [];
    // var range = this.range();

    // return allNodes.slice(range.start[0], range.end[0]+1);
  };

  // Derives Range objects for the selection
  // --------
  //

  this.getRanges = function() {
    if (this.isNull()) return [];

    var ranges = [];
    var sel = this.range();

    for (var i = sel.start[0]; i <= sel.end[0]; i++) {
      var startChar = 0;
      var endChar = null;

      // in the first node search only in the trailing part
      if (i === sel.start[0]) {
        startChar = sel.start[1];
      }

      // in the last node search only in the leading part
      if (i === sel.end[0]) {
        endChar = sel.end[1];
      }

      if (!_.isNumber(endChar)) {
        endChar = this.container.getLength(i);
      }

      var component = this.container.getComponent(i);
      ranges.push(new ComponentSelection(component, startChar, endChar));
    }
    return ranges;
  };

  // Gets ranges grouped by nodes
  // ----

  this.getNodeSelections = function() {
    if (this.isNull()) return [];

    var nodeSelections = [];
    var sel = this.range();
    var current = null;

    for (var pos = sel.start[0]; pos <= sel.end[0]; pos++) {

      var component = this.container.getComponent(pos);
      var startChar = 0;
      var endChar = component.length;

      if (!current || current.node !== component.root) {
        var node = component.root;
        var nodeComponents = this.container.getNodeComponents(node.id);
        current = new NodeSelection(node, nodeComponents, []);
        nodeSelections.push(current);
      }

      // the first component has a specific startChar
      if (pos === sel.start[0]) {
        startChar = sel.start[1];
      }
      // the last node has a specific endChar
      else if (pos === sel.end[0]) {
        endChar = sel.end[1];
      }

      current.ranges.push(new ComponentSelection(component, startChar, endChar));
    }

    return nodeSelections;
  };

  // Returns start node offset
  // --------
  //

  this.startNode = function() {
    return this.isReverse() ? this.__cursor.pos : this.start[0];
  };

  // Returns end node offset
  // --------
  //

  this.endNode = function() {
    return this.isReverse() ? this.start[0] : this.__cursor.pos;
  };


  // Returns start node offset
  // --------
  //

  this.startChar = function() {
    return this.isReverse() ? this.__cursor.charPos : this.start[1];
  };

  // Returns end node offset
  // --------
  //

  this.endChar = function() {
    return this.isReverse() ? this.start[1] : this.__cursor.charPos;
  };

  // No selection
  // --------
  //
  // Returns true if there's just a single cursor not a selection spanning
  // over 1+ characters

  this.isNull = function() {
    return this.start === null;
  };


  // Collapsed
  // --------
  //
  // Returns true if there's just a single cursor not a selection spanning
  // over 1+ characters

  this.isCollapsed = function() {
    return !this.isNull() && this.start[0] === this.__cursor.pos && this.start[1] === this.__cursor.charPos;
  };


  // Multinode
  // --------
  //
  // Returns true if the selection refers to multiple nodes

  this.hasMultipleNodes = function() {
    return !this.isNull() && (this.startNode() !== this.endNode());
  };

};

Selection.Prototype.prototype = util.Events;
Selection.prototype = new Selection.Prototype();

Object.defineProperties(Selection.prototype, {
  cursor: {
    get: function() {
      return this.__cursor.copy();
    },
    set: function() { throw "immutable property"; }
  }
});

Selection.SelectionError = SelectionError;

// Export
// ========

module.exports = Selection;
