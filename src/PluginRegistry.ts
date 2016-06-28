import { Plugin } from './Plugin'
import ConfigInterface from './ConfigInterface'
import * as ircWrapper from './irc/ircWrapper'

class PluginRegistry {
    plugins: Plugin[] = []
    pluginsByBotCommand: { [cmd: string]: Plugin } = {}

    registerPlugin(name: string, responseMaker: ircWrapper.IrcResponseMaker, config: ConfigInterface, pluginDirectory: string = './plugins') {
        var path = pluginDirectory + '/' + name
        var plugin: Plugin = new (require(path).default)(responseMaker, config)

        this.plugins.push(plugin)

        if (plugin.isCallable) {
            if (this.pluginsByBotCommand.hasOwnProperty(plugin.command)) {
                throw new Error("Command  name conflict")
            }
            this.pluginsByBotCommand[plugin.command] = plugin
            for (var i in plugin.commandAliases) {
                if (this.pluginsByBotCommand.hasOwnProperty(plugin.commandAliases[i])) {
                    throw new Error("Command  name conflict")
                }
                this.pluginsByBotCommand[plugin.commandAliases[i]] = plugin
            }
        }
    }

    getCallableCommands(): string[] {
        return this.plugins.map( plugin => plugin.command )
    }
}

export default PluginRegistry
