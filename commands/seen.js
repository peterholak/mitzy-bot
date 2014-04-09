var Datastore = require('nedb');
var strftime = require('strftime');
var Command = require('../command.js');
var config = require('../config.js');

var Seen = Command.define(module, {
    command: 'seen',
    minParams: 1,
    help: 'Since the other bot\'s seen doesn\'t work properly...\n' +
        'Usage: seen [nickname]\n' + 
        'Use %anyone in place of nickname to show last seen person overall',
    ignoreBots: false
});

Seen.prototype.init = function() {
    this.db = new Datastore({
        filename: config.datadir + '/seen.db',
        autoload: true
    });
    this.db.persistence.setAutocompactionInterval(3600000);
    this.db.ensureIndex({ fieldName: 'nick', unique: true });
}

Seen.prototype.process = function(params, target, nick) {
    var self = this;

    //we actually do want to ignore bots for process(), just not for postMessageHook()
    if (config.ignoreBots.indexOf(nick) !== -1)
        return false;
    
    if (params[0] === '%anyone') {
        self.db.find({}).sort({ when: -1 }).exec(function(err, docs) {
            if (err) {
                console.log('An error occured');
            }else if (docs.length === 0) {
                self.bot.say(target, 'Database seems to be empty');
            }else{
                var lastseen = docs[0];
                var timeStr = strftime.strftimeTZ('%F %T', new Date(lastseen.when), 0);
                self.bot.say(target, 'Last person seen was \'' + 
                    lastseen.nick + '\' at ' + timeStr + ' GMT saying: "' + 
                    lastseen.what + '"');
            }
        });
    }else{
        self.db.findOne({ nick: params[0] }, function(err, lastseen) {
            if (err) {
                console.log('An error occured');
            }else if (lastseen === null) {
                self.bot.say(target, 'Never seen nick \'' + params[0] + 
                    '\' in this channel since I came online.');
            }else{
                var timeStr = strftime.strftimeTZ('%F %T', new Date(lastseen.when), 0);
                self.bot.say(target, 'Nick \'' + params[0] + 
                    '\' was last seen in this channel ' + timeStr + ' GMT saying: "' + 
                    lastseen.what + '"');
            }
        });
    }
};

Seen.prototype.postMessageHook = function(nick, text, message) {
    var self = this;
    self.db.remove({ nick: nick }, {}, function(err, numRemoved) {
        self.db.insert({ nick: nick, when: new Date().getTime(), what: text });
    });
}
