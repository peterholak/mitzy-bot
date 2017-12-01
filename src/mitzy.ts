import * as http from 'http'
import * as url from 'url'
import PluginRegistry from './PluginRegistry'
import { Plugin, ParsedCommand, MessageType } from './Plugin'
import DummyIrcClient from './irc/DummyIrcClient'
import { IrcResponseMaker, IrcMessageMeta } from './irc/ircWrapper'
import config from '../config'
import * as irc from 'irc'
import ClientInterface from './irc/ClientInterface'

// TODO: split this module into some logical parts

var lastReceivedTime: number

export function createIrcClient(): ClientInterface {
    lastReceivedTime = new Date().getTime()

    if (config.useDummyClient) {
        return createDummyClient()
    }
    return createRealClient()
}

function createDummyClient() {
    // TODO: also have dummy storage?
    return new DummyIrcClient('me', config.irc.channel)
}

function createRealClient() {
    var clientConfig: irc.IClientOpts = {
        channels: [ config.irc.channel ],
        port: config.irc.port,
        secure: config.irc.secure === true,
        selfSigned: config.irc.selfSigned === true,
        autoConnect: false,
        showErrors: true
    }

    if (config.irc.username !== null) {
        clientConfig.userName = config.irc.username
    }

    if (config.irc.password !== null) {
        clientConfig.password = config.irc.password
    }

    return new irc.Client(config.irc.network, config.irc.nick, clientConfig)
}

export function parseCommand(message:string, commandRegex:RegExp): ParsedCommand|null {
    var matches = message.match(commandRegex)
    if (matches === null) {
        return null
    }

    if (matches[2] === undefined) {
        return {
            command: matches[1],
            argumentLine: '',
            splitArguments: []
        }
    }

    return {
        command: matches[1],
        argumentLine: matches[2],
        splitArguments: matches[2].split(' ').filter( arg => (arg.length > 0) )
    }
}

function outputHelp(responseMaker: IrcResponseMaker, pluginRegistry: PluginRegistry, messageMeta: IrcMessageMeta, parsedCommand: ParsedCommand) {
    if (
        parsedCommand.splitArguments.length === 0 ||
        !pluginRegistry.pluginsByBotCommand.hasOwnProperty(parsedCommand.splitArguments[0])
    ) {
        var commandList = pluginRegistry.plugins
            .filter( plugin => plugin.isCallable )
            .map( plugin => plugin.command )
            .join(', ')

        return responseMaker.respond(
            messageMeta,
            'Syntax: %m [command] [arguments]\nCommands: help, ' + commandList + "\n" +
                'Contact itamz for bug reports, feature requests, complaints, etc.'
        )
    }

    var plugin = pluginRegistry.pluginsByBotCommand[parsedCommand.splitArguments[0]]
    return responseMaker.respond(messageMeta, plugin.help)
}

function notifyMatchingPlugin(
    responseMaker: IrcResponseMaker,
    pluginRegistry: PluginRegistry,
    message: string,
    commandRegex: RegExp,
    ircTarget: string,
    nick: string,
    messageType: MessageType
) {
    var meta: IrcMessageMeta = {
        messageType: messageType,
        nick: nick,
        ircTarget: ircTarget
    }

    var parsedCommand = parseCommand(message, commandRegex)
    if (parsedCommand === null) {
        return
    }

    if (parsedCommand.command === 'help') {
        return outputHelp(responseMaker, pluginRegistry, meta, parsedCommand)
    }

    if (!pluginRegistry.pluginsByBotCommand.hasOwnProperty(parsedCommand.command)) {
        responseMaker.respond(meta, 'Type %m help to see the list of commands')
        return
    }

    var plugin = pluginRegistry.pluginsByBotCommand[parsedCommand.command]

    if (plugin.requiredArguments > parsedCommand.splitArguments.length) {
        responseMaker.respond(meta, plugin.help)
        return
    }

    pluginRegistry.pluginsByBotCommand[parsedCommand.command].onCommandCalled(parsedCommand, meta)
}

export function initializePlugins(responseMaker: IrcResponseMaker): PluginRegistry {
    var pluginRegistry = new PluginRegistry()
    config.plugins.forEach(p => pluginRegistry.registerPlugin(p, responseMaker, config))
    return pluginRegistry
}

export function registerEventsAndConnect(responseMaker: IrcResponseMaker, pluginRegistry: PluginRegistry, commandRegex:RegExp = /^%m ([a-zA-Z0-9\-_]+) ?(.*)?/i) {
    var client = responseMaker.getClient()

    client.addListener('message' + config.irc.channel, function (nick:string, message:string) {
        // ZNC buffer replays do not have nicks
        if (nick === undefined) {
            return
        }
        notifyMatchingPlugin(responseMaker, pluginRegistry, message, commandRegex, config.irc.channel, nick, MessageType.ChannelMessage)
        pluginRegistry.plugins.forEach( p => p.onMessagePosted(message, nick) )
    })

    client.addListener('notice', function(nick:string, to:string, message:string) {
        if (to === config.irc.nick) {
            notifyMatchingPlugin(responseMaker, pluginRegistry, message, commandRegex, nick, nick, MessageType.Notice)
        }
    })

    client.addListener('pm', function(nick:string, message:string) {
        notifyMatchingPlugin(responseMaker, pluginRegistry, message, commandRegex, nick, nick, MessageType.Pm)
    })

    client.addListener('raw', function() {
        lastReceivedTime = new Date().getTime()
    })

    client.addListener('error', (err: any) => {
        console.error('An error has occured:')
        console.error(err)
    })

    client.on('registered', function() {
        console.log('Connected.')
    })

    client.on('join', (channel: string, nick: string, message: string) => {
        if (nick === config.irc.nick) {
            console.log('Channel joined.')
        }
    })

    if (config.useDummyClient) {
        (client as DummyIrcClient).startReadingCommandLine()
    }else{
        console.log('Connecting...');
        (client as irc.Client).connect()
    }
}

export function setupDisconnectCheck(timeout:number, checkInterval:number, disconnectedCallback: () => void) {
    setInterval(function () {
        checkConnectionTimeout(timeout, disconnectedCallback)
    }, checkInterval)
}

function checkConnectionTimeout(timeout:number, disconnectedCallback: () => void) {
    var now = new Date().getTime()
    if (now - lastReceivedTime > timeout) {
        disconnectedCallback()
    }
}
