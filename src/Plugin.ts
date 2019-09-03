import * as http from 'http'
import * as url from 'url'
import ConfigInterface from './ConfigInterface'
import { IrcResponseMaker, IrcMessageMeta } from './irc/ircWrapper'

export enum MessageType {
    ChannelMessage, Pm, Notice
}

export interface ParsedCommand {
    command: string
    argumentLine: string
    splitArguments: string[]
}

export class Plugin {

    requiredArguments: number = 0

    command: string
    commandAliases: string[] = []
    help: string = 'No help for this command'

    isCallable: boolean = true
    ignoreBots: boolean = true
    hasHttpInterface:boolean = false

    constructor(
        command: string,
        protected responseMaker: IrcResponseMaker,
        protected config: ConfigInterface
    ) {
        this.command = command
    }

    onCommandCalled(command: ParsedCommand, meta: IrcMessageMeta) { }
    onMessagePosted(message: string, nick: string) { }
    onHttpRequest(requestUrl: url.Url, response: http.ServerResponse) { }
}

export default Plugin
