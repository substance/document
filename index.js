'use strict';

var Document = require('./src/document');

Document.Model = require('./src/model');
Document.Node = require('./src/node');
Document.Annotation = require('./src/annotation');
Document.ContainerNode = require('./src/container-node');
Document.Schema = require('./src/schema');
Document.Coordinate = require('./src/coordinate');
Document.Range = require('./src/range');

Document.Selection = require('./src/selection');
Document.NullSelection = Document.Selection.NullSelection;
Document.PropertySelection = require('./src/property-selection');
Document.ContainerSelection = require('./src/container-selection');

Document.AbstractIndex = require('./src/abstract-index');

module.exports = Document;
