///<reference path="../../typings/node/node.d.ts"/>
import readline = require('readline');

class DummyIrcClient {

    private listeners: { [event:string]: Function[] } = {};
    private commandLine: readline.ReadLine;

    constructor(private nick: string, private channel: string) {
        this.commandLine = readline.createInterface({
            input: process.stdin,
            output: process.stdout
        });

        if (this.channel[0] !== '#') {
            this.channel = '#' + this.channel;
        }
    }

    say(target, text) {
        console.log("SAY(to " + target + ")> " + text);
    }

    notice(target, text) {
        console.log("NOTICE(to " + target + ")> " + text);
    }

    addListener(event: string, callback: Function) {
        if (!this.listeners.hasOwnProperty(event)) {
            this.listeners[event] = [];
        }
        this.listeners[event].push(callback);
    }

    on(...args) {
        this.addListener.apply(this, arguments);
    }

    trigger(event:string, args: any[]) {
        if (this.listeners.hasOwnProperty(event)) {
            this.listeners[event].forEach( l => l.apply(this, args) );
        }
    }

    disconnect() {
        console.log('dummy disconnect');
        this.commandLine.close();
    }

    startReadingCommandLine() {
        this.commandLine.setPrompt('M> ');
        this.commandLine.prompt();
        this.commandLine.on('line', this.onCommandLine.bind(this));
    }

    private onCommandLine(line) {
        if (line.trim() === 'quit') {
            this.commandLine.close();
            process.exit();
            return;
        }
        this.processUserInput(line);
        this.commandLine.prompt();
    }

    protected processUserInput(line) {
        if (line.split(' ')[0] === 'pm') {
            this.trigger('pm', [this.nick, line.substr(' pm'.length)]);
        } else if (line.split(' ')[0] === 'notice') {
            this.trigger('notice', [this.nick, line.substr(' notice'.length)]);
        } else {
            this.trigger('message' + this.channel, [this.nick, line]);
        }
    }
}

export = DummyIrcClient;
