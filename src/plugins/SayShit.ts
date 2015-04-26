import Plugin = require('../Plugin');

class SayShit extends Plugin.Plugin {

    private data;

    constructor(responseMaker, config) {
        super(responseMaker, config);
        this.isCallable = false;
        this.data = config.pluginConfig['SayShit'].data;
    }

    onMessagePosted(message: string, nick: string) {
        this.data.every( shit => this.checkShit(message, shit) );
    }

    private checkShit(message, shit): boolean {
        if (message.match(shit.regex) && Math.random() < shit.probability) {
            var shitIndex = Math.floor(Math.random() * shit.shit.length);
            this.responseMaker.getClient().say(this.config.irc.channel, shit.shit[shitIndex]);
            return false;
        }
        return true;
    }
}

export = SayShit;
