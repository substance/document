'use strict';

var Substance = require('substance');

Substance.Model = require('./src/model');
Substance.Node = require('./src/node');
Substance.Annotation = require('./src/annotation');

Substance.Document = require('./src/document');
Substance.Document.Schema = require('./src/schema');

Substance.Registry = require('./src/registry');
Substance.Factory = require('./src/factory');

module.exports = Substance;
