var Command = require('../command.js');
var config = require('../config.js');
var Datastore = require('nedb');
var moment = require('moment-timezone');

var aliases = {
    CST: 'Etc/GMT+6',
    CDT: 'Etc/GMT+5',
    PST: 'Etc/GMT+8',
    PDT: 'Etc/GMT+7',
    EDT: 'Etc/GMT+4',
    MST: 'Etc/GMT+7',
    MDT: 'Etc/GMT+6',
    BST: 'Etc/GMT-1'
};

var TimeZone = Command.define(module, {
    command: 'tz',
    minParams: 1,
    help: 'Show current time in specified timezone.\n' +
        'Usage: tz [timezone], Example: tz EST, tz Europe/Berlin, ...\n' +
        'Search timezones: tz search [timezone], Example: tz search europe\n' +
        'Register your own timezone: tz reg [timezone], ' + 
        'then others can query your nickname with: tz nick [nickname]',
    timeFormat: 'YYYY-MM-DD hh:mm:ssA z(Z)'
});

TimeZone.prototype.init = function() {
    this.db = new Datastore({
        filename: config.datadir + '/tz-nicks.db',
        autoload: true
    });
    this.db.persistence.setAutocompactionInterval(5400000);
    this.db.ensureIndex({ fieldName: 'nick', unique: true });
};

TimeZone.prototype.cleanup = function() {
    this.db.persistence.stopAutocompaction();
};

TimeZone.prototype.process = function(params, target, nick) {
    if (params.length > 1 && params[0] === 'reg') {
        this.handleNicknameRegister(params, target, nick);
    }else if (params.length > 1 && params[0] === 'nick') {
        this.getNicknameTime(params, target, nick);
    }else if (params.length > 1 && params[0] === 'search') {
        this.bot.say(
            target,
            '[' + this.searchTimeZones(
                params.slice(1).join('_')
            ).join(', ') + ']'
        );
    }
    else{
        var zone = this.getTimeZone(params[0]);
        if (zone) {
            this.bot.say(target, zone.format(this.timeFormat));
        }else{
            this.bot.say(target, 'Unknown time zone');
        }
    }
};


TimeZone.prototype.getTimeZone = function(zone) {
    if (moment.tz.zone(zone) !== null) {
        return moment.tz(zone);
    }else if (aliases.hasOwnProperty(zone.toUpperCase()) && moment.tz.zone(aliases[zone.toUpperCase()]) !== null) {
        return moment.tz(aliases[zone.toUpperCase()]);
    }
    return null;
};

TimeZone.prototype.searchTimeZones = function(query) {
    var results = [];
    for (var z in moment.tz._zones) {
        if (!moment.tz._zones.hasOwnProperty(z) || !moment.tz._zones[z].hasOwnProperty('name')) {
            continue;
        }

        if (moment.tz._zones[z].name.toLowerCase().indexOf(query.toLowerCase()) !== -1) {
            results.push(moment.tz._zones[z].name);
        }
    }
    return results;
};

TimeZone.prototype.handleNicknameRegister = function(params, target, nick) {
    var zone = this.getTimeZone(params[1]);

    if (zone) {
        var self = this;
        self.db.remove({ nick: nick }, {}, function(err, numRemoved) {
            self.db.insert({ nick: nick.toLowerCase(), realNick: nick, zone: zone.format('z') });
        });

        this.bot.say(target, 'Ok. Your timezone is now ' + zone.format('z (Z)') + 
            '. Other users can see it by typing %m tz nick ' + nick);
    }else{
        this.bot.say(target, 'Unknown time zone');
    }
};

TimeZone.prototype.getNicknameTime = function(params, target, nick) {
    var self = this;
    self.db.findOne({ nick: params[1].toLowerCase() }, function(err, data) {
        if (err) {
            console.log('An error occured');
        }else if (data === null) {
            self.bot.say(target, 'Nick \'' + params[1] + 
                '\' has no registered timezone.');
        }else{
            var zone = self.getTimeZone(data.zone);
            if (zone) {
                self.bot.say(target, 'It\'s ' + zone.format('MMM DD, hh:mm A z(Z)') + ' where ' + 
                    data.realNick + ' is located.');
            }else{
                self.bot.say(target, 'Unable to get current time');
            }
        }
    });
};
