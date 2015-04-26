///<reference path="../../lib/node/node.d.ts"/>
import child_process = require('child_process');
import Plugin = require('../Plugin');
import http = require('http');
import url = require('url');
import ircWrapper = require('../irc/ircWrapper');

class Ntpq extends Plugin.Plugin {
    constructor(responseMaker, config) {
        super(responseMaker, config);
        this.command = 'ntpq';
        this.help = 'Displays a link to the output of the ntpq command.';
        this.hasHttpInterface = true;
    }

    onCommandCalled(command: Plugin.ParsedCommand, meta: ircWrapper.IrcMessageMeta) {
        var port = (this.config.http.port === 80 ? '' : (':' + this.config.http.port));
        this.responseMaker.respond(meta, 'ntpq output can be found at http://' + this.config.http.hostname + port + '/ntpq');
    }

    onHttpRequest(requestUrl: url.Url, response: http.ServerResponse) {
        response.writeHead(200, {
            'Content-Type': 'text/plain'
        });
        var rawData = '';
        try {
            rawData = child_process.execSync('ntpq -p').stdout.toString();
        }catch(e) {
            rawData = 'error executing command';
        }
        response.write(rawData);
        response.end();
    }
}

export = Ntpq;
