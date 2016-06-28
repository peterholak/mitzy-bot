import * as http from 'http'
import * as url from 'url'
import PluginRegistry from './PluginRegistry'

export function runHttpServer(pluginRegistry: PluginRegistry, port: number) {
    http.createServer(function (request:http.IncomingMessage, response:http.ServerResponse) {
        var parsedUrl = url.parse(request.url)
        var command = parsedUrl.path.split('/')[1]

        if (pluginRegistry.pluginsByBotCommand.hasOwnProperty(command)) {
            pluginRegistry.pluginsByBotCommand[command].onHttpRequest(parsedUrl, response)
        }else{
            response.write('no such command or command has no http interface')
            response.end()
        }
    }).listen(port)
}
