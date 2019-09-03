import { Plugin, ParsedCommand } from '../Plugin'
import { IrcMessageMeta, IrcResponseMaker } from '../irc/ircWrapper'
import { ConfigInterface } from '../ConfigInterface'

class Source extends Plugin {

    constructor(responseMaker: IrcResponseMaker, config: ConfigInterface) {
        super('source', responseMaker, config);
        this.help = 'Displays a link to the bot\'s source code';
    }

    onCommandCalled(command: ParsedCommand, meta: IrcMessageMeta) {
        this.responseMaker.respond(meta, 'My source can be viewed at ' + this.config.pluginConfig['Source'].url);
    }
}

export default Source;
