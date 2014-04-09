var Command = require('../command.js');
var config = require('../config.js');

var Source = Command.define(module, {
    command: 'source',
    help: 'Displays a link to the bot\'s source code'
});

Source.prototype.process = function(params, target, nick) {
    this.bot.say(target, 'My source can be viewed at ' + config.commandConfig.source.url);
};
