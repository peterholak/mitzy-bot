import { Plugin, ParsedCommand } from '../Plugin'
import { IrcMessageMeta } from '../irc/ircWrapper'

class Ping extends Plugin {

    constructor(responseMaker, config) {
        super(responseMaker, config);
        this.command = 'ping';
        this.help = 'The bot replies. Can be useful to check for bot issues.';
    }

    onCommandCalled(command: ParsedCommand, meta: IrcMessageMeta) {
        this.responseMaker.respond(meta, 'Yep, I\'m here.');
    }
}

export default Ping;
