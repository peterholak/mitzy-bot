var util = require('util');
var extend = require('extend');

function Command(bot, options) {
    this.minParams = 0;
    this.command = '';
    this.help = 'No help for this command';

    this.bot = bot;
    this.options = options;

    this.notCallable = false;

    this.ignoreBots = true;
    this.hasHttpInterface = false;
}

Command.prototype.process = function(params, target, nick) {
    
};

Command.prototype.init = function() {

};

Command.prototype.cleanup = function() {

};

Command.prototype.postMessageHook = function(nick, text, message) {

};

Command.prototype.processHttp = function(path, response) {

};

Command.define = function(module, replacement) {
    var newObj = function() {
        Command.apply(this, arguments);
        extend(this, replacement);
    };
    util.inherits(newObj, Command);
    module.exports = newObj;
    return newObj;
};

module.exports = Command;
