///<reference path="../lib/node/node.d.ts"/>
import http = require('http');
import url = require('url');
import ConfigInterface = require('./ConfigInterface');
import ircWrapper = require('./irc/ircWrapper');

export enum MessageType {
    ChannelMessage, Pm, Notice
}

export interface ParsedCommand {
    command: string;
    argumentLine: string;
    splitArguments: string[];
}

export class Plugin {
    requiredArguments:number = 0;
    command:string;
    commandAliases:string[] = [];
    help:string = 'No help for this command';

    isCallable:boolean = true;
    ignoreBots:boolean = true;
    hasHttpInterface:boolean = false;

    constructor(protected responseMaker: ircWrapper.IrcResponseMaker, protected config: ConfigInterface) {
    }

    onCommandCalled(command: ParsedCommand, meta: ircWrapper.IrcMessageMeta) {
    }

    onMessagePosted(message: string, nick: string) {
    }

    onHttpRequest(requestUrl: url.Url, response: http.ServerResponse) {
    }
}
