"use strict";

var _ = require("underscore");
var util = require("substance-util");
var errors = util.errors;
var Cursor = require("./cursor");

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
//     var sel = new Substance.Document.Selection(doc);
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

var Selection = function(document, selection) {
  this.document = document;

  this.start = null;
  this.__cursor = new Cursor(document, null, null);

  if (selection) this.set(selection);
};

Selection.Prototype = function() {

  // Get node from position in contnet view
  // --------
  //

  this.__node = function(pos) {
    return this.document.getNodeFromPosition('content', pos);
  };


  this.copy = function() {
    var copy = new Selection(this.document);
    if (!this.isNull()) copy.set(this);
    return copy;
  };


  // Set selection
  // --------
  //
  // sel: an instanceof Selection
  //      or a document range `{start: [nodePos, charPos], end: [nodePos, charPos]}`
  //      or a document position `[nodePos, charPos]`

  this.set = function(sel) {
    var cursor = this.__cursor;

    if (sel instanceof Selection) {
      this.start = _.clone(sel.start);
      cursor.set(sel.__cursor.nodePos, sel.__cursor.charPos);
    } else if (_.isArray(sel)) {
      this.start = _.clone(sel);
      cursor.set(sel[0], sel[1]);
    } else {
      this.start = _.clone(sel.start);
      cursor.set(sel.end[0], sel.end[1]);
    }
    var start = this.start;

    // being hysterical about the integrity of selections
    var n = this.document.get("content").nodes.length;
    if (start[0] < 0 || start[0] >= n) {
      throw new SelectionError("Invalid node position: " + start[0]);
    }
    var l = this.__node(start[0]).content.length;
    if (start[1] < 0 || start[1] > l) {
      throw new SelectionError("Invalid char position: " + start[1]);
    }

    this.trigger('selection:changed', this.range());
    return this;
  };

  this.clear = function() {
    this.start = null;
    this.__cursor.set(null, null);
    this.trigger('selection:changed', null);
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
    return (cursor.nodePos < this.start[0]) || (cursor.nodePos === this.start[0] && cursor.charPos < this.start[1]);
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
    return [this.__cursor.nodePos, this.__cursor.charPos];
  };

  // Fully selects a the node with the given id
  // --------
  //

  this.selectNode = function(nodeId) {
    var node = this.document.get(nodeId);
    if (!node) {
      throw new SelectionError("Illegal node id: " + nodeId);
    }

    var nodePos = this.document.getPosition('content', nodeId);
    if (nodePos < 0) {
      throw new SelectionError("Node is not visible: " + nodeId);
    }

    this.set({
      start: [nodePos, 0],
      end: [nodePos, node.content.length]
    });
  };

  // Get predecessor node of a given node pos
  // --------
  //

  this.getPredecessor = function() {
    var nodePos = this.isReverse() ? this.__cursor.nodePos: this.start[0];
    if (nodePos === 0) return null;
    return this.__node(nodePos-1);
  };

  // Get successor node of a given node pos
  // --------
  //

  this.getSuccessor = function() {
    var nodePos = this.isReverse() ? this.start[0] : this.__cursor.nodePos;
    return this.__node(nodePos+1);
  };

  // Check if the given position has a successor
  // --------
  //

  // TODO: is this really necessary? ~> document.hasPredecessor
  this.hasPredecessor = function(nodePos) {
    return nodePos > 0;
  };

  // Check if the given node has a successor
  // --------
  //

  // TODO: is this really necessary? ~> document.hasSuccessor
  this.hasSuccessor = function(nodePos) {
    var view = this.document.get('content').nodes;
    return nodePos < view.length-1;
  };


  // Collapses the selection into a given direction
  // --------
  //

  this.collapse = function(direction) {
    if (direction !== "right" && direction !== "left" && direction !== "start" && direction !== "cursor") {
      throw new SelectionError("Invalid direction: " + direction);
    }

    if (this.isCollapsed() || this.isNull()) return;

    if (direction === "start") {
      this.__cursor.set(this.start[0], this.start[1]);

    } else if (direction === "cursor") {
      this.start[0] = this.__cursor.nodePos;
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

    this.trigger('selection:changed', this.range());
  };

  // move selection to position
  // --------
  //
  // Convenience for placing the single cusor where start=end

  this.move = function(direction, granularity) {

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

    this.trigger('selection:changed', this.range());
  };

  // Expand current selection
  // ---------
  //
  // Selections keep the direction as a state
  // They can either be right-bound or left-bound
  //

  this.expand = function(direction, granularity) {
    // expanding is done by moving the cursor
    this.__cursor.move(direction, granularity);

    this.trigger('selection:changed', this.range());
  };

  // JSON serialization
  // --------
  //

  this.toJSON = function() {
    return this.range();
  };

  // For a given document return the selected nodes
  // --------
  //

  this.getNodes = function() {
    var view = this.document.get('content').nodes;
    if (this.isNull()) return [];
    var range = this.range();

    return _.map(view.slice(range.start[0], range.end[0]+1), function(n) {
      return this.document.get(n);
    }, this);
  };

  // Derives Range objects for the selection
  // --------
  //

  this.getRanges = function() {
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
        var node = this.__node(i);
        endChar = node.content.length;
      }
      ranges.push(new Selection.Range(this, i, startChar, endChar));
    }
    return ranges;
  };

  // Returns start node offset
  // --------
  //

  this.startNode = function() {
    return this.isReverse() ? this.__cursor.nodePos : this.start[0];
  };

  // Returns end node offset
  // --------
  //

  this.endNode = function() {
    return this.isReverse() ? this.start[0] : this.__cursor.nodePos;
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
    return this.start[0] === this.__cursor.nodePos && this.start[1] === this.__cursor.charPos;
  };


  // Multinode
  // --------
  //
  // Returns true if the selection refers to multiple nodes

  this.hasMultipleNodes = function() {
    return !this.isNull() && (this.startNode() !== this.endNode());
  };

  // For a given document return the selected text
  // --------

  this.getText = function() {
    var text = "";

    if (this.isNull()) return text;

    // start node
    var nodes = this.getNodes();
    var sel = this.range();

    if (nodes.length === 1) {
      return nodes[0].content.slice(sel.start[1], sel.end[1]);
    }

    _.each(nodes, function(n, index) {
      if (n.content) {
        if (index === 0) {
          text += nodes[0].content.slice(sel.start[1]);
        } else if (index === nodes.length-1) {
          text += nodes[index].content.slice(0, sel.end[1]);
        } else {
          text += n.content;
        }
      }
    }, this);
    return text;
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

// Document.Selection.Range
// ================
//
// A Document.Selection consists of 1..n Ranges
// Each range belongs to a node in the document
// This allows us to ask the range about the selected text
// or ask if it's partially selected or not
// For example if an image is fully selected we can just delete it

var Range = function(selection, nodePos, start, end) {
  this.selection = selection;
  // The node pos within the document which can range
  // between selection.startNode() and selection.endNode()
  this.nodePos = nodePos;
  this.node = selection.__node(nodePos);
  this.start = start;
  this.end = end;
};

Range.Prototype = function() {

  // Returns true if the range denotes the first range in a selection
  // --------
  //

  this.isFirst = function() {
    return this.nodePos === this.selection.startNode();
  };

  // Returns true if the range denotes the last range in a selection
  // --------
  //

  this.isLast = function() {
    return this.nodePos === this.selection.endNode();
  };

  // Returns true if the range denotes the last range in a selection
  // --------
  //

  this.hasPredecessor = function() {
    return !this.isFirst();
  };

  // Returns true if the range denotes the last range in a selection
  // --------
  //

  this.hasSuccessor = function() {
    return !this.isLast();
  };

  // Returns true if the range is fully enclosed by both a preceding and successing range
  // --------
  //

  this.isEnclosed = function() {
    return this.hasPredecessor() && this.hasSuccessor();
  };

  // Returns true if the range includes the last character of a node
  // --------
  //

  this.isRightBound = function() {
    return this.end === this.node.content.length;
  };

  // Returns true if the range includes the first character of a node
  // --------
  //

  this.isLeftBound = function() {
    return this.start === 0;
  };

  // Returns the length of the range which corresponds to the number of chars contained
  // --------
  //

  this.length = function() {
    return this.end - this.start;
  };

  // Returns the range's content
  // --------
  //

  this.content = function() {
    return this.node.content.slice(this.start, this.end);
  };

  // Returns true if all chars are selected
  // --------
  //

  this.isFull = function() {
    return this.isLeftBound() && this.isRightBound();
  };

  // Returns true if the range includes the first character of a node
  // --------
  //

  this.isPartial = function() {
    return !this.isFull();
  };

};

Range.prototype = new Range.Prototype();

Selection.Range = Range;
Selection.SelectionError = SelectionError;

// Export
// ========

module.exports = Selection;
