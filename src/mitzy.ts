/// <reference path="../lib/node/node.d.ts"/>
import http = require('http');
import url = require('url');
import PluginRegistry = require('./PluginRegistry');
import Plugin = require('./Plugin');
import DummyIrcClient = require('./irc/DummyIrcClient');
import DebugIrcClient = require('./irc/DebugIrcClient');
import ircWrapper = require('./irc/ircWrapper');
import config = require('../config');
var irc = require('irc');

// TODO: split this module into some logical parts

var lastReceivedTime: number;

export function createIrcClient() {
    lastReceivedTime = new Date().getTime();

    if (config.useDummyClient) {
        return createDummyClient();
    }
    return createRealClient();
}

function createDummyClient() {
    // TODO: also have dummy storage?
    return new DummyIrcClient('me', config.irc.channel);
}

function createRealClient() {
    var clientConfig = {
        channels: [ config.irc.channel ],
        port: config.irc.port
    };

    if (config.irc.username !== null) {
        clientConfig['userName'] = config.irc.username;
    }

    if (config.irc.password !== null) {
        clientConfig['password'] = config.irc.password;
    }

    return new irc.Client(config.irc.network, config.irc.nick, clientConfig);
}

export function parseCommand(message:string, commandRegex:RegExp):Plugin.ParsedCommand {
    var matches = message.match(commandRegex);
    if (matches === null) {
        return null;
    }

    if (matches[2] === undefined) {
        return {
            command: matches[1],
            argumentLine: '',
            splitArguments: []
        };
    }

    return {
        command: matches[1],
        argumentLine: matches[2],
        splitArguments: matches[2].split(' ').filter( arg => (arg.length > 0) )
    };
}

function outputHelp(responseMaker: ircWrapper.IrcResponseMaker, pluginRegistry: PluginRegistry, messageMeta: ircWrapper.IrcMessageMeta, parsedCommand: Plugin.ParsedCommand) {
    if (
        parsedCommand.splitArguments.length === 0 ||
        !pluginRegistry.pluginsByBotCommand.hasOwnProperty(parsedCommand.splitArguments[0])
    ) {
        var commandList = pluginRegistry.plugins
            .filter( plugin => plugin.isCallable )
            .map( plugin => plugin.command )
            .join(', ');

        return responseMaker.respond(
            messageMeta,
            'Syntax: %m [command] [arguments]\nCommands: help, ' + commandList + "\n" +
                'Contact itamz for bug reports, feature requests, complaints, etc.'
        );
    }

    var plugin = pluginRegistry.pluginsByBotCommand[parsedCommand.splitArguments[0]];
    return responseMaker.respond(messageMeta, plugin.help);
}

function notifyMatchingPlugin(responseMaker: ircWrapper.IrcResponseMaker, pluginRegistry: PluginRegistry, message, commandRegex, ircTarget: string, nick: string, messageType: Plugin.MessageType) {
    var meta: ircWrapper.IrcMessageMeta = {
        messageType: messageType,
        nick: nick,
        ircTarget: ircTarget
    };

    var parsedCommand = parseCommand(message, commandRegex);
    if (parsedCommand === null) {
        return;
    }

    if (parsedCommand.command === 'help') {
        return outputHelp(responseMaker, pluginRegistry, meta, parsedCommand);
    }

    if (!pluginRegistry.pluginsByBotCommand.hasOwnProperty(parsedCommand.command)) {
        responseMaker.respond(meta, 'Type %m help to see the list of commands');
        return;
    }

    var plugin = pluginRegistry.pluginsByBotCommand[parsedCommand.command];

    if (plugin.requiredArguments > parsedCommand.splitArguments.length) {
        responseMaker.respond(meta, plugin.help);
        return;
    }

    pluginRegistry.pluginsByBotCommand[parsedCommand.command].onCommandCalled(parsedCommand, meta);
}

export function initializePlugins(responseMaker: ircWrapper.IrcResponseMaker): PluginRegistry {
    var pluginRegistry = new PluginRegistry();
    config.plugins.forEach(p => pluginRegistry.registerPlugin(p, responseMaker, config));
    return pluginRegistry;
}

export function registerClientEvents(responseMaker: ircWrapper.IrcResponseMaker, pluginRegistry: PluginRegistry, commandRegex:RegExp = /^%m ([a-zA-Z0-9\-_]+) ?(.*)?/i) {
    var client = responseMaker.getClient();

    client.addListener('message' + config.irc.channel, function (nick:string, message:string) {
        notifyMatchingPlugin(responseMaker, pluginRegistry, message, commandRegex, config.irc.channel, nick, Plugin.MessageType.ChannelMessage);
        pluginRegistry.plugins.forEach( p => p.onMessagePosted(message, nick) );
    });

    client.addListener('notice', function(nick:string, message:string) {
        notifyMatchingPlugin(responseMaker, pluginRegistry, message, commandRegex, nick, nick, Plugin.MessageType.Notice);
    });

    client.addListener('pm', function(nick:string, message:string) {
        notifyMatchingPlugin(responseMaker, pluginRegistry, message, commandRegex, nick, nick, Plugin.MessageType.Pm);
    });

    client.addListener('raw', function() {
        lastReceivedTime = new Date().getTime();
    });

    client.addListener('error', function (err) {
        console.error('An error has occured:');
        console.error(err);
    });

    if (config.useDummyClient) {
        client.startReadingCommandLine();
    }
}

export function setupDisconnectCheck(timeout:number, checkInterval:number, disconnectedCallback: () => void) {
    setInterval(function () {
        checkConnectionTimeout(timeout, disconnectedCallback);
    }, checkInterval);
}

function checkConnectionTimeout(timeout:number, disconnectedCallback: () => void) {
    var now = new Date().getTime();
    if (now - lastReceivedTime > timeout) {
        disconnectedCallback();
    }
}
