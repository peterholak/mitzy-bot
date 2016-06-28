import * as Plugin from '../Plugin'
import * as ircWrapper from '../irc/ircWrapper'

class Ping extends Plugin.Plugin {

    constructor(responseMaker, config) {
        super(responseMaker, config);
        this.command = 'ping';
        this.help = 'The bot replies. Can be useful to check for bot issues.';
    }

    onCommandCalled(command: Plugin.ParsedCommand, meta: ircWrapper.IrcMessageMeta) {
        this.responseMaker.respond(meta, 'Yep, I\'m here.');
    }
}

export default Ping;
