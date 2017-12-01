import * as readline from 'readline'
import ClientInterface from './ClientInterface'

export enum CommandLine {
    ReadCommandLine,
    NoCommandLine
}

export class DummyIrcClient implements ClientInterface {

    private listeners: { [event:string]: Function[] } = {}
    private commandLine: readline.ReadLine

    constructor(private nick: string, private channel: string, useCommandLine: CommandLine = CommandLine.ReadCommandLine, private clientToTrigger?: DummyIrcClient) {
        if (useCommandLine === CommandLine.ReadCommandLine) {
            this.commandLine = readline.createInterface({
                input: process.stdin,
                output: process.stdout
            })
        }

        if (this.channel[0] !== '#') {
            this.channel = '#' + this.channel
        }
    }

    say(target: string, text: string) {
        console.log("SAY(to " + target + " as " + this.nick + ")> " + text)
        if (this.clientToTrigger !== undefined) {
            this.clientToTrigger.trigger('message' + target, [ this.nick, text ])
        }
    }

    notice(target: string, text: string) {
        console.log("NOTICE(to " + target + ")> " + text)
    }

    addListener(event: string, callback: Function) {
        if (!this.listeners.hasOwnProperty(event)) {
            this.listeners[event] = []
        }
        this.listeners[event].push(callback)
        return this
    }

    on(event: string, listener: Function) {
        this.addListener.apply(this, arguments)
        return this
    }

    trigger(event:string, args: any[]) {
        if (this.listeners.hasOwnProperty(event)) {
            this.listeners[event].forEach( l => l.apply(this, args) )
        }
    }

    disconnect() {
        console.log('dummy disconnect')
        this.commandLine.close()
    }

    startReadingCommandLine() {
        this.commandLine.setPrompt('M> ')
        this.commandLine.prompt()
        this.commandLine.on('line', this.onCommandLine.bind(this))
    }

    private onCommandLine(line: string) {
        if (line.trim() === 'quit') {
            this.commandLine.close()
            process.exit()
            return
        }
        this.processUserInput(line)
        this.commandLine.prompt()
    }

    protected processUserInput(line: string) {
        if (line.split(' ')[0] === 'pm') {
            this.trigger('pm', [this.nick, line.substr(' pm'.length)])
        } else if (line.split(' ')[0] === 'notice') {
            this.trigger('notice', [this.nick, line.substr(' notice'.length)])
        } else {
            this.trigger('message' + this.channel, [this.nick, line])
        }
    }
}

export default DummyIrcClient
