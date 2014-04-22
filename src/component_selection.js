"use strict";

function ComponentSelection(component, start, end) {
  this.component = component;
  this.start = start;
  this.end = end;
}

ComponentSelection.Prototype = function() {

  this.getLength = function() {
    return this.end - this.start;
  };

  // Returns true if the selection includes the end of the component
  // --------
  //

  this.isRightBound = function() {
    return this.end === this.component.length;
  };

  // Returns true if the selection includes the begin of the component
  // --------
  //

  this.isLeftBound = function() {
    return this.start === 0;
  };

  // Returns true if the selection includes the full component
  // --------
  //

  this.isFull = function() {
    return this.isLeftBound() && this.isRightBound();
  };

  // Returns true if the selection does include the component only partially
  // --------
  //

  this.isPartial = function() {
    return !this.isFull();
  };

};
ComponentSelection.prototype = new ComponentSelection.Prototype();

module.exports = ComponentSelection;
