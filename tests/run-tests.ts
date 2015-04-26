import tsUnit = require('../node_modules/tsunit.external/tsUnit');
import mitzyTests = require('./mitzy-tests');

var test = new tsUnit.Test(mitzyTests.mitzyTests);

var result = test.run();

console.log(result.passes.length.toString() + ' passes, ' + result.errors.length.toString() + ' fails');
if (result.errors.length) {
    console.log('Errors:');
    console.log(result.errors);
}
