import { Plugin, ParsedCommand } from '../Plugin'
import { IrcMessageMeta, IrcResponseMaker } from '../irc/ircWrapper'
import { ConfigInterface } from '../ConfigInterface'

class Ping extends Plugin {

    constructor(responseMaker: IrcResponseMaker, config: ConfigInterface) {
        super('ping', responseMaker, config);
        this.help = 'The bot replies. Can be useful to check for bot issues.';
    }

    onCommandCalled(command: ParsedCommand, meta: IrcMessageMeta) {
        this.responseMaker.respond(meta, 'Yep, I\'m here.');
    }
}

export default Ping;
