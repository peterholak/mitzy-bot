var config = require('./config');
var _commands = config.commands;

function CommandManager(bot, options) {
    this.commands = {};
    this.commandsCmd = {};

    this.bot = bot;
    this.options = options;

    for (var i = 0; i<_commands.length; i++) {
        this.registerCommand(_commands[i]);
    }
}

CommandManager.prototype.registerCommand = function(name) {
    var path = './commands/' + name;
    var instance = new (require(path))(this.bot, this.options);

    this.commands[name] = instance;
    if (!instance.notCallable) {
        this.commandsCmd[instance.command] = instance;
    };
};

CommandManager.prototype.init = function() {
    for (var i in this.commands) {
        this.commands[i].init();
    }
};

CommandManager.prototype.process = function(name, params, target, nick) {
    if (name === 'help') {
        this.showHelp(params, target);
    }else{
        if (!this.commandsCmd.hasOwnProperty(name))
            return false;

        if (params.length >= this.commandsCmd[name].minParams && 
        !this.commandsCmd[name].notCallable) {
            if (config.ignoreBots.indexOf(nick) === -1 ||
            this.commandsCmd[name].ignoreBots === false)
                this.commandsCmd[name].process(params, target, nick);
        }
    }
};

CommandManager.prototype.messageReceived = function(nick, text, message) {
    for (var i in this.commands) {
        if (config.ignoreBots.indexOf(nick) === -1 ||
        this.commands[i].ignoreBots === false)
            this.commands[i].postMessageHook(nick, text, message);
    }
};

CommandManager.prototype.showHelp = function(params, target) {
    if (params.length === 0) {
        var cmdList = Object.keys(this.commandsCmd).join(', ');
        this.bot.say(target, 'Syntax: %m [command] [args]\nCommands: help, ' + 
            cmdList + ' (more coming soon)\n' + 
            'Contact itamz for bug reports, feature requests, complaints, etc.');
    }else{
        name = params[0];
        if (!this.commandsCmd.hasOwnProperty(name))
            return false;

        if (!this.commandsCmd[name].notCallable) {
            this.bot.say(target, this.commandsCmd[name].help);
        }
    }
};

CommandManager.prototype.cleanup = function() {
    for (var i in this.commands) {
        this.commands[i].cleanup();
    }
};

module.exports = CommandManager;
