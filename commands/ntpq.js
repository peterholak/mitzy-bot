var Command = require('../command.js');
var config = require('../config.js');
var sync_exec = require('sync-exec');

var Ntpq = Command.define(module, {
    command: 'ntpq',
    help: 'Displays a link to output of the ntpq command',
    hasHttpInterface: true
});

Ntpq.prototype.process = function(params, target, nick) {
    var port = (config.http.port === 80 ? '' : (':' + config.http.port));
    this.bot.say(target, 'ntpq output can be found at http://' + config.http.hostname + port + '/ntpq');
};

Ntpq.prototype.processHttp = function(path, response) {
    response.writeHead(200, {
        'Content-Type': 'text/plain'
    });
    var rawData = sync_exec('ntpq -p').stdout;
    response.write(rawData);
};
