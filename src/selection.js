"use strict";

var _ = require("underscore");
var util = require("substance-util");
var SRegExp = require("substance-regexp");

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
  if (selection) {
    this.set(selection);
  }
};


Selection.Prototype = function() {

  function compare(a, b) {
    if (a[0]>b[0]) {
      return 1;
    } else if (a[0]<b[0]) {
      return -1;
    } else {
      if (a[1]>b[1]) {
        return 1;
      } else if (a[1]<b[1]) {
        return -1;
      } else {
        return 0;
      }
    }
  }

  // Return left if start > end
  // Returns null if start === end
  // Returns right if start < end
  // Ensures start <= end afterwards

  // Transformations which are equivalent
  // but we want to ensure start < end

  // ____2>>1___   -> ____1<<2___
  // ____2<<1___   -> ____1>>2___

  function normalize(sel) {
    var res = util.deepclone(sel);
    var signum = compare(sel.start, sel.end);

    // Right-bound
    if (signum === -1) {
      // ooo>>oo
      // ooo<<oo
      // default case do nothing
      if (!sel.direction) res.direction = 'right';

    } else if (signum === 1) {
      // ooo>>oo (start>end)
      // ooo<<oo (start>end)
        res.start = sel.end;
        res.end = sel.start;

        if (!sel.direction) {
          res.direction = 'left';
        } else {
          res.direction = sel.direction === 'left' ? 'right' : 'left';
        }
    } else {
      // Collapsed
      res.direction = null;
    }
    return res;
  }

  // Get node from position in contnet view
  // --------
  //

  this.__node = function(pos) {
    return this.document.getNodeFromPosition('content', pos);
  };


  // Set selection
  // --------
  //
  // Direction defaults to right

  this.set = function(sel) {
    this.start = null;
    this.end = null;
    this.direction = null;

    sel = util.deepclone(sel);
    if (!sel) return this;
    var dir = sel.direction || 'right';
    if (_.isArray(sel)) {
      this.start = [sel[0], sel[1]];
      this.end = [sel[2], sel[3]];
      this.direction = this.isCollapsed() ? null : dir;
    } else {
      // TODO: Make smarter
      // should also check for out of range errors
      if (sel && sel.start && sel.start.length === 2 && sel.start[0]>=0 && sel.start[1]>=0) {
        this.start = sel.start;
      }
      if (sel && sel.end && sel.end.length === 2 && sel.end[0]>=0 && sel.end[1]>=0) {
        this.end = sel.end;
      }
      this.direction = this.isNull() || this.isCollapsed() ? null : dir;
    }
    this.trigger('selection:changed', this.toJSON());
    return this;
  };

  // Always returns the cursor position
  // even for a multi-char selection
  // and takes into consideration the selection direction
  // --------
  //

  this.getCursor = function() {
    var result = (this.direction === "right" ? this.end : this.start);
    return _.clone(result);
  };

  // Set cursor to position
  // --------
  //
  // Convenience for placing the single cusor where start=end

  this.setCursor = function(pos) {
    this.set({
      start: pos,
      end: pos
    });
    return this;
  };

  // Fully selects a the node with the given id
  // --------
  //

  this.selectNode = function(nodeId) {
    var node = this.document.get(nodeId);
    var nodePos = this.document.getPosition('content', nodeId);
    this.set({
      start: [nodePos, 0],
      end: [nodePos, node.content.length]
    });
  };

  // Get predecessor node of a given node pos
  // --------
  //

  this.getPredecessor = function(nodePos) {
    nodePos = nodePos || this.start[0];
    if (nodePos === 0) return null;
    return this.__node(nodePos-1);
  };

  // Get successor node of a given node pos
  // --------
  //

  this.getSuccessor = function(nodePos) {
    nodePos = nodePos || this.end[0];
    return this.__node(nodePos+1);
  };

  // Check if the given position has a successor
  // --------
  //

  this.hasPredecessor = function(nodePos) {
    return nodePos > 0;
  };

  // Check if the given node has a successor
  // --------
  //

  this.hasSuccessor = function(nodePos) {
    var view = this.document.get('content').nodes;
    return nodePos < view.length-1;
  };


  // Return previous node boundary for a given node/character position
  // --------
  //

  this.prevNode = function(pos) {
    var nodePos = pos[0],
        charPos = pos[1];

    if (charPos > 0) {
      return [nodePos, 0];
    } else if (this.hasPredecessor(nodePos)) {
      var prevNode = this.__node(nodePos - 1);
      return [nodePos-1, prevNode.content.length];
    } else {
      // Beginning of the document reached
      return pos;
    }
  };

  // Return next node boundary for a given node/character position
  // --------
  //

  this.nextNode = function(pos) {
    var nodePos = pos[0],
        charPos = pos[1],
        node = this.__node(nodePos);

    if (charPos < node.content.length) {
      return [nodePos, node.content.length];
    } else if (this.hasSuccessor(nodePos)) {
      return [nodePos+1, 0];
    } else {
      // End of the document reached
      return pos;
    }
  };

  // Return previous occuring word for a given node/character position
  // --------
  //

  this.prevWord = function(pos) {
    // throw new Error('Not implemented');
    var nodePos = pos[0],
        charPos = pos[1],
        node = this.__node(nodePos);

    if (!node) throw new Error('Invalid node position');

    // Cursor is at first position -> move to prev paragraph if there is any
    if (charPos === 0) return this.prevChar(pos);

    var content = node.content;

    // Matches all word boundaries in a string
    var wordBounds = new SRegExp(/\b\w/g).match(content);
    var prevBounds = _.select(wordBounds, function(m) {
      return m.index<charPos;
    });

    if (prevBounds.length === 0) return [nodePos, 0];
    return [nodePos, _.last(prevBounds).index];
  };

  // Return next occuring word for a given node/character position
  // --------
  //

  this.nextWord = function(pos) {
    var nodePos = pos[0],
        charPos = pos[1],
        node = this.__node(nodePos);

    if (!node) throw new Error('Invalid node position');

    // Cursor is a last position -> move to next paragraph if there is any
    if (charPos >= node.content.length) return this.nextChar(pos);

    var content = node.content;

    // Matches all word boundaries in a string
    var wordBounds = new SRegExp(/\w\b/g).match(content);
    var nextBound = _.find(wordBounds, function(m) {
      return m.index>charPos;
    });

    if (!nextBound) return [nodePos, content.length];
    return [nodePos, nextBound.index+1];
  };


  // Return next char, for a given node/character position
  // --------
  //
  // Useful when navigating over paragraph boundaries

  this.nextChar = function(pos) {
    var nodePos = pos[0],
        charPos = pos[1],
        node = this.__node(nodePos);

    if (!node) throw new Error('Invalid node position');

    // Last char in paragraph
    if (charPos >= node.content.length) {
      if (this.hasSuccessor(nodePos)) {
        return [nodePos+1, 0];
      } else {
        return pos;
      }
    } else {
      return [nodePos, charPos+1];
    }
  };


  // Return next char, for a given node/character position
  // --------
  //
  // Useful when navigating over paragraph boundaries

  this.prevChar = function(pos) {
    var nodePos = pos[0],
        charPos = pos[1],
        node = this.__node(nodePos),
        prevNode,
        lastPos;

    if (!node) throw new Error('Invalid node position');
    if (charPos<0) throw new Error('Invalid char position');

    // At end position
    if (charPos === 0) {
      if (nodePos > 0) {
        prevNode = this.__node(nodePos-1);
        lastPos = prevNode.content.length;
        return [nodePos-1, lastPos];
      } else {
        return pos;
      }
    } else {
      return [nodePos, charPos-1];
    }
  };

  // Find
  // --------
  //
  // Useful helper to find char,word and node boundaries
  //
  //     find('right', 'char');
  //     find('left', 'word');
  //     find('left', 'node');

  this.find = function(pos, direction, granularity) {
    if (direction === "left") {
      if (granularity === "word") {
        return this.prevWord(pos);
      } else if (granularity === "char") {
        return this.prevChar(pos);
      } else if (granularity === "node") {
        return this.prevNode(pos);
      }
    } else {
      if (granularity === "word") {
        return this.nextWord(pos);
      } else if (granularity === "char") {
        return this.nextChar(pos);
      } else if (granularity === "node") {
        return this.nextNode(pos);
      }
    }
  };

  // Move cursor to position
  // --------
  //
  // Convenience for placing the single cusor where start=end

  this.move = function(direction, granularity) {
    direction = direction || 'right';
    granularity = granularity || 'char';

    if (!this.isCollapsed()) {
      // TODO: Does not yet consider granularity word
      if (direction === 'left') {
        this.setCursor(this.start);
      } else {
        this.setCursor(this.end);
      }
    } else {
      // Collapsed: a b c|d e f g
      var next = this.find(this.start, direction, granularity);
      this.setCursor(next);
      // After (direction=left):  a b|c d e f g
      // After (direction=right): a b c d|e f g
    }
  };

  // Expand current selection
  // ---------
  //
  // Selections keep the direction as a state
  // They can either be right-bound or left-bound
  //

  this.expand = function(direction, granularity) {
    direction = direction || 'right';
    granularity = granularity || 'char';

    // Create a copy to ensure consistency during transformation
    var res = this.toJSON();

    if (this.direction === 'right') {
      // Right bound: a > > d e f g
      if (direction === 'left') {
        res.end = this.find(this.end, direction, granularity);
        // After: a > c d e f g
      } else {
        res.end = this.find(this.end, direction, granularity);
        // After: a > > > e f g
      }
    }
    else if (this.direction === 'left') {
      // Left bound: a < < d e f g
      res.start = this.find(this.start, direction, granularity);
    } else {
      // Collapsed: a|b c d e f g
      res.end = this.find(this.end, direction, granularity);
      // After: < b c d e f g
      // After: a > c d e f g
    }

    // Update selection
    this.set(normalize(res));
  };


  // JSON serialization
  // --------
  //

  this.toJSON = function() {
    return {
      "start": _.clone(this.start),
      "end": _.clone(this.end),
      "direction": this.direction
    };
  };

  // For a given document return the selected nodes
  // --------
  // 
  // TODO: is now covered by this.ranges

  this.getNodes = function() {
    var view = this.document.get('content').nodes;
    if (this.isNull()) return [];

    return _.map(view.slice(this.start[0], this.end[0]+1), function(n) {
      return this.document.get(n);
    }, this);
  };

  // Derives Range objects for the selection
  // --------
  // 

  this.getRanges = function() {
    // var nodes = this.getNodes();
    var ranges = [];

    for (var i = this.startNode(); i <= this.endNode(); i++) {
      var startChar = 0;
      var endChar = null;

      // in the first node search only in the trailing part
      if (i === this.startNode()) {
        startChar = this.start[1];
      }

      // in the last node search only in the leading part
      if (i === this.endNode()) {
        endChar = this.end[1];
      }

      if (!endChar) {
        var node = this.__node(i);
        endChar = node.content.length;
      }
      ranges.push(new Range(this, i, startChar, endChar));
    }
    return ranges;
  };

  // Returns start node offset
  // --------
  //

  this.startNode = function() {
    return this.start[0];
  };

  // Returns end node offset
  // --------
  //

  this.endNode = function() {
    return this.end[0];
  };


  // Returns start node offset
  // --------
  //

  this.startChar = function() {
    return this.start[1];
  };

  // Returns end node offset
  // --------
  //

  this.endChar = function() {
    return this.end[1];
  };


  // No selection
  // --------
  //
  // Returns true if there's just a single cursor not a selection spanning
  // over 1+ characters

  this.isNull = function() {
    return !this.start || !this.end;
  };


  // Collapsed
  // --------
  //
  // Returns true if there's just a single cursor not a selection spanning
  // over 1+ characters

  this.isCollapsed = function() {
    return this.start[0] === this.end[0] && this.start[1] === this.end[1];
  };


  // Multinode
  // --------
  //
  // Returns true if the selection refers to multiple nodes

  this.hasMultipleNodes = function() {
    return this.startNode() !== this.endNode();
  };


  // For a given document return the selected text
  // --------

  this.getText = function() {
    var text = "";

    if (this.isNull()) return text;

    // start node
    var nodes = this.getNodes();

    if (nodes.length === 1) {
      return nodes[0].content.slice(this.start[1], this.end[1]);
    }

    _.each(nodes, function(n, index) {
      if (n.content) {
        if (index === 0) {
          text += nodes[0].content.slice(this.start[1]);
        } else if (index === nodes.length-1) {
          text += nodes[index].content.slice(0, this.end[1]);
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

// Export
// ========

module.exports = Selection;
