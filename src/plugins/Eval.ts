import { Plugin, ParsedCommand }  from '../Plugin'
import * as http from 'http'
import * as querystring from 'querystring'
import { IrcMessageMeta, IrcResponseMaker } from '../irc/ircWrapper'
import { ConfigInterface } from '../ConfigInterface'

class Eval extends Plugin {

    private languageAliases: {[alias: string]: string}

    constructor(responseMaker: IrcResponseMaker, config: ConfigInterface) {
        super('eval', responseMaker, config);
        this.commandAliases = this.config.pluginConfig['Eval'].commandAliases;
        this.languageAliases = this.config.pluginConfig['Eval'].languageAliases;
        this.help =
            "Evaluates code in a specified language (use language alias instead of 'eval' command).\n" +
            "Available: " + this.commandAliases.join(',') + "\n" +
            "Those without -x (except 'c') will output the value of the expression, with -x (and 'c') " +
            "will just execute the code and output stdout. 'c' your code is inside main function, 'c-m' = outside.";
    }

    onCommandCalled(command: ParsedCommand, meta: IrcMessageMeta) {
        this.sendCodeToEvaluate(command, meta);
    }

    private sendCodeToEvaluate(command: ParsedCommand, meta: IrcMessageMeta) {
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
            (res: http.IncomingMessage) => {
                var partialData = '';
                res.on('data', (data: string|Buffer) => {
                    partialData += data
                });

                res.on('end', () => {
                    var resultData = partialData.replace(/[\n\r]/g, ' ');
                    if (resultData.length > 300) {
                        resultData = resultData.substring(0, 300) + '...';
                    }
                    this.responseMaker.respond(meta, resultData);
                });
            }
        );
        req.write(postData);
        req.end();
    }
}

export default Eval;
