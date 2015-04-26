import tsUnit = require('../node_modules/tsunit.external/tsUnit');
import mitzy = require('../src/mitzy');

export module mitzyTests {

    var defaultRegex = /^%m ([a-zA-Z0-9\-_]+) ?(.*)?/i;

    export class mitzyTests extends tsUnit.TestClass {

        returnsNullWhenNotACommand() {
            var parsed = mitzy.parseCommand('%x something', defaultRegex);
            this.areIdentical(null, parsed);
        }

        parsesNoArgumentCommand() {
            var parsed = mitzy.parseCommand('%m test', defaultRegex);
            this.areIdentical('test', parsed.command);
            this.areIdentical('', parsed.argumentLine);
            this.areCollectionsIdentical([], parsed.splitArguments);
        }

        parsesCommandWithTwoArguments() {
            var parsed = mitzy.parseCommand('%m cmd one two', defaultRegex);
            this.areIdentical('cmd', parsed.command);
            this.areIdentical('one two', parsed.argumentLine);
            this.areCollectionsIdentical(['one', 'two'], parsed.splitArguments);
        }

        parsesCommandWithMultipleSpacesBetweenArguments() {
            var parsed = mitzy.parseCommand('%m cmd   also   here ', defaultRegex);
            this.areIdentical('cmd', parsed.command);
            this.areIdentical('  also   here ', parsed.argumentLine);
            this.areCollectionsIdentical(['also', 'here'], parsed.splitArguments);
        }

    }
}