var Command = require('../command.js');
var config = require('../config.js');

var SayShit = Command.define(module, {
	notCallable: true,
	data: config.commandConfig.sayshit.data
});

SayShit.prototype.postMessageHook = function(nick, text, message) {
	for (var i=0; i<this.data.length; i++) {
		var s = this.data[i];
		if (text.match(s.regex)) {
			if (Math.random() < s.probability) {
				var shitIndex = parseInt(Math.random()*s.shit.length);
				this.bot.say(this.options.chan, s.shit[shitIndex]);
				break;
			}
		}
	}
};
