///<reference path="../lib/node/node.d.ts"/>

import Plugin = require('./Plugin');
import ConfigInterface = require('./ConfigInterface');
import ircWrapper = require('./irc/ircWrapper');

class PluginRegistry {
    plugins: Plugin.Plugin[] = [];
    pluginsByBotCommand: { [cmd: string]: Plugin.Plugin } = {};

    registerPlugin(name: string, responseMaker: ircWrapper.IrcResponseMaker, config: ConfigInterface, pluginDirectory: string = './plugins') {
        var path = pluginDirectory + '/' + name;
        var plugin: Plugin.Plugin = new (require(path))(responseMaker, config);

        this.plugins.push(plugin);

        if (plugin.isCallable) {
            if (this.pluginsByBotCommand.hasOwnProperty(plugin.command)) {
                throw new Error("Command  name conflict");
            }
            this.pluginsByBotCommand[plugin.command] = plugin;
            for (var i in plugin.commandAliases) {
                if (this.pluginsByBotCommand.hasOwnProperty(plugin.commandAliases[i])) {
                    throw new Error("Command  name conflict");
                }
                this.pluginsByBotCommand[plugin.commandAliases[i]] = plugin;
            }
        }
    }

    getCallableCommands(): string[] {
        return this.plugins.map( plugin => plugin.command );
    }
}

export = PluginRegistry;
