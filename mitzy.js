var irc = require('irc');
var CommandManager = require('./commandmanager');
var BotFake = require('./utils/bot-fake');
var RateLimit = require('./utils/rate-limit');
var config = require('./config');
var strftime = require('strftime');
var fs = require('fs');

var bot;
if (!config.useFakeBot) {

    var botConfig = {
        channels: [ config.channel ]
    };

    if (config.hasOwnProperty('userName'))
        botConfig.userName = config.userName;

    if (config.hasOwnProperty('password'))
        botConfig.password = config.password;

    console.log('Connecting...');
    bot = new irc.Client(config.network, config.nick, botConfig);

}else{
    bot = new BotFake();
    bot.fakeBotCommandLine();
}

var commands = new CommandManager(bot, { chan: config.channel });
commands.init();

var commandRegex = /^\%m ([a-zA-Z0-9]+) ?(.*)?/i;
var parseCommand = function(matches) {
    var cmd = matches[1];
    var allparams = matches[2];
    var params;
    if (typeof allparams === 'undefined')
        params = [];
    else
        params = allparams.split(' ');

    return {
        command: cmd,
        params: params
    };
};

var rateLimit = new RateLimit(config.rateLimit);
var originalSay = bot.say;
bot.say = function(nick, text) {
    if (rateLimit.canSendMessage(nick)) {
        originalSay.apply(this, arguments);
        //log what the bot says
        fs.appendFile('mitzy.log', nick + ' ' + strftime('%F %T') + ' ' + text + '\n');
        rateLimit.messageSent(nick);
    }
};

bot.on(('message' + config.channel), function(nick, text, message) {
    var m = text.match(commandRegex);

    if (m) {
        var cmd = parseCommand(m);
        commands.process(cmd.command, cmd.params, config.channel, nick);
    }

    commands.messageReceived(nick, text, message);
});

bot.on('pm', function(nick, text, message) {
    if (nick !== config.nick) {
        var m = text.match(commandRegex);

        if (m) {
            var cmd = parseCommand(m);
            commands.process(cmd.command, cmd.params, nick, nick);
        }else{
            bot.say(nick, "Mitzy-bot, for help, type %m help, " +
                "contact itamz for bug reports/complaints/...");
        }
    }
});
