var MochaTestRunner = require("substance-test").MochaTestRunner;

require("./document_manipulation");
require("./document_selection");

new MochaTestRunner().run();
