import { Plugin } from '../Plugin'
import { IrcResponseMaker } from '../irc/ircWrapper'
import { ConfigInterface } from '../ConfigInterface'

interface ShitEntry {
    regex: RegExp
    probability: number
    shit: string[]
}

class SayShit extends Plugin {

    private data: ShitEntry[]

    constructor(responseMaker: IrcResponseMaker, config: ConfigInterface) {
        super(responseMaker, config)
        this.isCallable = false
        this.data = config.pluginConfig['SayShit'].data
    }

    onMessagePosted(message: string, nick: string) {
        this.data.every( shit => this.checkShit(message, shit) )
    }

    private checkShit(message: string, shit: ShitEntry): boolean {
        if (message.match(shit.regex) && Math.random() < shit.probability) {
            var shitIndex = Math.floor(Math.random() * shit.shit.length)
            this.responseMaker.getClient().say(this.config.irc.channel, shit.shit[shitIndex])
            return false
        }
        return true
    }
}

export default SayShit
