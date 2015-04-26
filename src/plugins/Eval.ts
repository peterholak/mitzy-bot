///<reference path="../../lib/node/node.d.ts"/>
import Plugin = require('../Plugin');
import http = require('http');
import querystring = require('querystring');
import ircWrapper = require('../irc/ircWrapper');

class Eval extends Plugin.Plugin {

    private languageAliases;

    constructor(responseMaker, config) {
        super(responseMaker, config);
        this.command = 'eval';
        this.commandAliases = this.config.pluginConfig['Eval'].commandAliases;
        this.languageAliases = this.config.pluginConfig['Eval'].languageAliases;
        this.help =
            "Evaluates code in a specified language (use language alias instead of 'eval' command).\n" +
            "Available: " + this.commandAliases.join(',') + "\n" +
            "Those without -x (except 'c') will output the value of the expression, with -x (and 'c') " +
            "will just execute the code and output stdout. 'c' your code is inside main function, 'c-m' = outside.";
    }

    onCommandCalled(command: Plugin.ParsedCommand, meta: ircWrapper.IrcMessageMeta) {
        this.sendCodeToEvaluate(command, meta);
    }

    private sendCodeToEvaluate(command: Plugin.ParsedCommand, meta: ircWrapper.IrcMessageMeta) {
        var language = command.command;
        if (this.languageAliases.hasOwnProperty(language)) {
            language = this.languageAliases[language];
        }

        var postData = querystring.stringify({
            'lang': language,
            'code': command.argumentLine
        });
        var req = http.request(
            {
                hostname: this.config.pluginConfig['Eval'].host,
                path: '/eval',
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                    'Content-Length': postData.length
                }
            },
            function(res) {
                var partialData = '';
                res.on('data', function(data) {
                    partialData += data
                }.bind(this));

                res.on('end', function() {
                    var resultData = partialData.replace(/[\n\r]/g, ' ');
                    if (resultData.length > 300) {
                        resultData = resultData.substring(0, 300) + '...';
                    }
                    this.responseMaker.respond(meta, resultData);
                }.bind(this));
            }.bind(this)
        );
        req.write(postData);
        req.end();
    }
}

export = Eval;
