import * as http from 'http'
import * as url from 'url'
import PluginRegistry from './PluginRegistry'

export function runHttpServer(pluginRegistry: PluginRegistry, port: number) {
    http.createServer((request: http.IncomingMessage, response: http.ServerResponse) => {
        const parsedUrl = url.parse(request.url || '')
        const command = parsedUrl.path && parsedUrl.path.split('/')[1]

        if (command === undefined) {
            response.write('Unable to parse URL.')
            response.end()
            return
        }

        if (pluginRegistry.pluginsByBotCommand.hasOwnProperty(command)) {
            pluginRegistry.pluginsByBotCommand[command].onHttpRequest(parsedUrl, response)
        }else{
            response.write('No such command or command has no http interface.')
            response.end()
        }
    }).listen(port)
}
