import { Plugin, ParsedCommand } from '../Plugin'
import { IrcMessageMeta } from '../irc/ircWrapper'

class Source extends Plugin {

    constructor(responseMaker, config) {
        super(responseMaker, config);
        this.command = 'source';
        this.help = 'Displays a link to the bot\'s source code';
    }

    onCommandCalled(command: ParsedCommand, meta: IrcMessageMeta) {
        this.responseMaker.respond(meta, 'My source can be viewed at ' + this.config.pluginConfig['Source'].url);
    }
}

export default Source;
