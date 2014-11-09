var Command = require('../command.js');
var config = require('../config.js');

var Ping = Command.define(module, {
    command: 'ping',
    help: 'The bot replies. Can be useful to check for connection problems.'
});

Ping.prototype.process = function(params, target, nick) {
    this.bot.say(target, 'Yep, I\'m here. And so are you apparently');
};

