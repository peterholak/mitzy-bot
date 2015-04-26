///<reference path="../../lib/node/node.d.ts"/>
///<reference path="../../lib/nedb/nedb.d.ts"/>
///<reference path="../../lib/moment/moment.d.ts"/>
///<reference path="../../lib/moment-timezone/moment-timezone.d.ts"/>
import Plugin = require('../Plugin');
import NeDB = require('nedb');
import momentTz = require('moment-timezone');
import ircWrapper = require('../irc/ircWrapper');

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

class Timezone extends Plugin.Plugin {

    private db: NeDB;
    private timeFormat = 'YYYY-MM-DD hh:mm:ssA z(Z)';

    constructor(responseMaker, config) {
        super(responseMaker, config);

        this.command = 'tz';
        this.commandAliases = [ 'timezone', 'time' ];
        this.requiredArguments = 1;
        this.help =
            'Show current time in specified timezone.\n' +
            'Usage: tz [timezone], Example: tz EST, tz Europe/Berlin, ...\n' +
            'Search timezones: tz search [timezone], Example: tz search europe\n' +
            'Register your own timezone: tz reg [timezone], ' +
            'then others can query your nickname with: tz nick [nickname]';

        this.db = new NeDB({
            filename: this.config.storageDirectory + '/tz-nicks.db',
            autoload: true
        });
        this.db.persistence.setAutocompactionInterval(36000000);
        this.db.ensureIndex({ fieldName: 'nick', unique: true });
    }

    onCommandCalled(command: Plugin.ParsedCommand, meta: ircWrapper.IrcMessageMeta) {
        if (command.splitArguments.length > 1) {
            if (command.splitArguments[0] === 'reg') {
                return this.registerNickname(command, meta);
            }

            if (command.splitArguments[0] === 'nick') {
                return this.outputNicknameTime(command, meta);
            }

            if (command.splitArguments[0] === 'search') {
                return this.searchTimezones(command, meta);
            }
        }

        this.outputTime(command.splitArguments[0], meta);
    }

    private outputTime(zoneName: string, messageMeta: ircWrapper.IrcMessageMeta) {
        var zone = this.getTimezone(zoneName);
        if (zone !== null) {
            this.responseMaker.respond(messageMeta, zone.format(this.timeFormat));
        }else{
            this.responseMaker.respond(messageMeta, 'Unknown time zone');
        }
    }

    private getTimezone(zoneName: string): moment.Moment {
        if (momentTz.tz.zone(zoneName) !== null) {
            return momentTz.tz(zoneName);
        }else if (aliases.hasOwnProperty(zoneName.toUpperCase()) && momentTz.tz.zone(aliases[zoneName.toUpperCase()]) !== null) {
            return momentTz.tz(aliases[zoneName.toUpperCase()]);
        }
        return null;
    }

    private findMatchingTimezones(query: string): string[] {
        var results = [];
        for (var z in momentTz.tz['_zones']) {
            if (!momentTz.tz['_zones'].hasOwnProperty(z) || !momentTz.tz['_zones'][z].hasOwnProperty('name')) {
                continue;
            }

            if (momentTz.tz['_zones'][z].name.toLowerCase().indexOf(query.toLowerCase()) !== -1) {
                results.push(momentTz.tz['_zones'][z].name);
            }
        }
        return results;
    }

    private searchTimezones(command: Plugin.ParsedCommand, messageMeta: ircWrapper.IrcMessageMeta) {
        var zones = this.findMatchingTimezones(command.splitArguments.slice(1).join('_'));
        this.responseMaker.respond(messageMeta,  '[' + zones.join(', ') + ']');
    }


    private registerNickname(command: Plugin.ParsedCommand, messageMeta: ircWrapper.IrcMessageMeta) {
        var zone = this.getTimezone(command.splitArguments[1]);

        if (zone) {
            this.db.remove({ nick: messageMeta.nick }, {}, (err, numRemoved) => {
                if (err !== null) {
                    console.error(err);
                }
                this.db.insert(
                    { nick: messageMeta.nick.toLowerCase(), realNick: messageMeta.nick, zone: command.splitArguments[1] },
                    err => { if (err) { console.error(err); } }
                );
            });

            this.responseMaker.respond(
                messageMeta,
                'Ok. Your timezone is now ' + zone.format('z (Z)') +
                    '. Other users can see it by typing %m tz nick ' +
                    messageMeta.nick
            );
        }else{
            this.responseMaker.respond(messageMeta, 'Unknown time zone');
        }
    }

    private outputNicknameTime(command: Plugin.ParsedCommand, messageMeta: ircWrapper.IrcMessageMeta) {
        this.db.findOne({ nick: command.splitArguments[1].toLowerCase() }, (err, data) => {
            if (err) {
                console.log('An error occured');
                return;
            }

            if (data === null) {
                this.responseMaker.respond(messageMeta, 'Nick \'' + command.splitArguments[1] + '\' has no registered timezone.');
                return;
            }

            var zone = this.getTimezone(data['zone']);
            if (zone === null) {
                this.responseMaker.respond(messageMeta, 'Unable to get current time');
                return;
            }

            this.responseMaker.respond(messageMeta, 'It\'s ' + zone.format(this.timeFormat) + ' where ' + data['realNick'] + ' is located.');
        });
    }
}

export = Timezone;
