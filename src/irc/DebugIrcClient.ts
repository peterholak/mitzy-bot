import DummyIrcClient = require('./DummyIrcClient');

/**
 * A client that will simply post some dummy messages on behalf of the user. Sort of a crutch needed
 * for debugging, because node's debugger and reading from stdin just don't seem to mix.
 */
class DebugIrcClient extends DummyIrcClient {
    startReadingCommandLine() {
        setTimeout(() => this.processUserInput("%m rkt (+ 1 2)"), 500);
    }
}

export = DebugIrcClient;
