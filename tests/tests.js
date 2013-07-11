var MochaTestRunner = require("substance-test").MochaTestRunner;

require("./001-document-manipulation");
require("./002-document-selection");

new MochaTestRunner().run();
