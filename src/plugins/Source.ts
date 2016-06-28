import * as Plugin from '../Plugin'
import * as ircWrapper from '../irc/ircWrapper'

class Source extends Plugin.Plugin {

    constructor(responseMaker, config) {
        super(responseMaker, config);
        this.command = 'source';
        this.help = 'Displays a link to the bot\'s source code';
    }

    onCommandCalled(command: Plugin.ParsedCommand, meta: ircWrapper.IrcMessageMeta) {
        this.responseMaker.respond(meta, 'My source can be viewed at ' + this.config.pluginConfig['Source'].url);
    }
}

export default Source;
