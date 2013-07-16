(function(root) {

var Substance = root.Substance;
var util = Substance.util;
var _ = root._;
var Document = Substance.Document;


// Document.Selection
// ================
//
// A selection refers to a sub-fragment of a Substance.Document. It holds
// start/end positions for node and character offsets as well as a direction.
//   
// {
//   start: [NODE_POS, CHAR_POS]
//   end: [NODE_POS, CHAR_POS]
//   direction: "left"|"right"
// }
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


  // Set selection
  // --------
  // 
  // Direction defaults to right

  this.set = function(sel) {
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

  // Check if the given node has a successor
  // --------
  // 

  this.hasSuccessor = function(nodePos) {
    var view = this.document.get('content').nodes;
    return nodePos < view.length-1;
  };

  // Return previous occuring word for a given node/character position
  // --------
  // 

  this.prevWord = function() {
    throw new Error('Not implemented');
  };

  // Return next occuring word for a given node/character position
  // --------
  // 

  this.nextWord = function() {
    throw new Error('Not implemented');
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
        return null;
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
        return null;
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

  this.find = function(direction, granularity) {
    if (direction === "left") {
      if (granularity === "word") {
        return this.prevWord(this.start);
      } else {
        return this.prevChar(this.start);
      }
    } else {
      if (granularity === "word") {
        return this.nextWord(this.end);
      } else {
        return this.nextChar(this.end);
      }
    }
  };


  // Move cursor to position
  // --------
  // 
  // Convenience for placing the single cusor where start=end

  this.move = function(direction, granularity) {
    direction = direction || "right";
    granularity = granularity || 'char';

    if (!this.isCollapsed()) {
      // TODO: Does not yet consider granularity word
      if (direction === "left") {
        this.setCursor(this.start);
      } else {
        this.setCursor(this.end);
      }
    } else {
      // Collapsed: a b c|d e f g
      var next = this.find(direction, granularity);
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

  this.expand = function(direction, granularity) {
    direction = direction || "right";
    granularity = granularity || 'char';

    if (this.direction === "right") {
      // Right bound: a > > d e f g

      if (direction === "left") {
        this.end = this.prevChar(this.end) || this.end;
        // After: a > c d e f g
      } else {
        this.end = this.nextChar(this.end) || this.end;
        // After: a > > > e f g
      }
    }
    else if (this.direction === "left") {
      // Left bound: a < < d e f g
      
      if (direction === "left") {
        this.start = this.prevChar(this.start) || this.start;
        // After: < < < d e f g
      } else {
        this.start = this.nextChar(this.start) || this.start;
      }
    } else {
      // Collapsed: a|b c d e f g

      if (direction === "left") {
        this.start = this.prevChar(this.start) || this.start;
        // After: < b c d e f g
      } else {
        this.end = this.nextChar(this.end) || this.end;
        // After: a > c d e f g
      }
    }

    // Compute new direction
    if (this.isCollapsed()) {
      this.direction = null;
    } else {
      this.direction = this.direction || direction  
    }

    // Update selection
    this.set(this.toJSON());
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

  this.getNodes = function() {
    var view = this.document.get('content').nodes;
    if (this.isNull()) return [];

    return _.map(view.slice(this.start[0], this.end[0]+1), function(n) {
      return this.document.get(n);
    }, this);
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

  // For a given document return the selected text
  // --------

  this.getText = function() {
    var text = "";

    if (this.isNull()) return "";

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

Selection.prototype = new Selection.Prototype();

// Add event support
_.extend(Selection.prototype, util.Events);

// Export
// ========

if (typeof exports !== 'undefined') {
  module.exports = Selection;
} else {
  Document.Selection = Selection;
}

})(this);