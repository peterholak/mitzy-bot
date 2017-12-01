import * as child_process from 'child_process'
import { Plugin, ParsedCommand } from '../Plugin'
import * as http from 'http'
import * as url from 'url'
import { IrcMessageMeta, IrcResponseMaker } from '../irc/ircWrapper'
import { ConfigInterface } from '../ConfigInterface'

class Ntpq extends Plugin {
    constructor(responseMaker: IrcResponseMaker, config: ConfigInterface) {
        super(responseMaker, config)
        this.command = 'ntpq'
        this.help = 'Displays a link to the output of the ntpq command.'
        this.hasHttpInterface = true
    }

    onCommandCalled(command: ParsedCommand, meta: IrcMessageMeta) {
        var port = (this.config.http.port === 80 ? '' : (':' + this.config.http.port))
        this.responseMaker.respond(meta, 'ntpq output can be found at http://' + this.config.http.hostname + port + '/ntpq')
    }

    onHttpRequest(requestUrl: url.Url, response: http.ServerResponse) {
        response.writeHead(200, {
            'Content-Type': 'text/plain'
        })
        var rawData = ''
        try {
            rawData = child_process.execSync('ntpq -p').toString()
        }catch(e) {
            rawData = 'error executing command'
        }
        response.write(rawData)
        response.end()
    }
}

export default Ntpq
