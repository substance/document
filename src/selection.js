"use strict";

var _ = require("underscore");
var util = require("substance-util");
var SRegExp = require("substance-regexp");


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

  if (!selection) {
    this.start = null;
    this.end = null;
    this.direction = null;
  } else {
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


  // Set selection
  // --------
  //
  // Direction defaults to right

  this.set = function(sel) {
    sel = util.deepclone(sel);
    var dir = sel.direction || "right";
    if (_.isArray(sel)) {
      this.start = [sel[0], sel[1]];
      this.end = [sel[2], sel[3]];
      this.direction = this.isCollapsed() ? null : dir;
    } else {
      this.start = _.clone(sel.start);
      this.end = _.clone(sel.end);
      this.direction = this.isCollapsed() ? null : dir;
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
    return this.direction === "right" ? this.end : this.start;
  };

  // Set cursor to position
  // --------
  //
  // Convenience for placing the single cusor where start=end

  this.setCursor = function(pos) {
    this.start = pos;
    this.end = pos;
    this.trigger('selection:changed', this.toJSON());
    return this;
  };

  // Get node from position in contnet view
  // --------
  //

  this.getNodeAtPosition = function(pos) {
    var view = this.document.get('content').nodes;
    return this.document.get(view[pos]);
  };


  // Check if the given node position has a successor
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
      var prevNode = this.getNodeAtPosition(nodePos - 1);
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
        node = this.getNodeAtPosition(nodePos);

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
        node = this.getNodeAtPosition(nodePos);

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
        node = this.getNodeAtPosition(nodePos);

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
        node = this.getNodeAtPosition(nodePos);

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
        node = this.getNodeAtPosition(nodePos),
        prevNode,
        lastPos;

    if (!node) throw new Error('Invalid node position');
    if (charPos<0) throw new Error('Invalid char position');

    // At end position
    if (charPos === 0) {
      if (nodePos > 0) {
        prevNode = this.getNodeAtPosition(nodePos-1);
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

  this.find = function(start, direction, granularity) {
    if (direction === "left") {
      if (granularity === "word") {
        return this.prevWord(start);
      } else if (granularity === "char") {
        return this.prevChar(start);
      } else if (granularity === "node") {
        return this.prevNode(start);
      }
    } else {
      if (granularity === "word") {
        return this.nextWord(start);
      } else if (granularity === "char") {
        return this.nextChar(start);
      } else if (granularity === "node") {
        return this.nextNode(start);
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



    // // Compute new direction
    // if (this.isCollapsed()) {
    //   this.direction = null;
    // } else {
    //   console.log('direction before', this.direction);
    //   if (this.start[1]>this.end[1]) {
    //     var help = this.start;
    //     this.start = this.end;
    //     this.end = help;

    //     this.direction = direction;
    //   } else {
    //     this.direction = this.direction || direction;
    //   }
    //   console.log('direction after', this.direction);
    // }


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

  this.getNodes = function(sel) {
    sel = sel || this;

    var view = this.document.get('content').nodes;
    if (this.isNull()) return [];

    return _.map(view.slice(sel.start[0], sel.end[0]+1), function(n) {
      return this.document.get(n);
    }, this);
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
