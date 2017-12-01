import { Plugin, ParsedCommand } from '../Plugin'
import * as NeDB from 'nedb'
import momentTz = require('moment-timezone')
import { IrcMessageMeta, IrcResponseMaker } from '../irc/ircWrapper'
import { ConfigInterface } from '../ConfigInterface'

var aliases: {[alias: string]: string} = {
    CST: 'Etc/GMT+6',
    CDT: 'Etc/GMT+5',
    PST: 'Etc/GMT+8',
    PDT: 'Etc/GMT+7',
    EDT: 'Etc/GMT+4',
    MST: 'Etc/GMT+7',
    MDT: 'Etc/GMT+6',
    BST: 'Etc/GMT-1'
}

interface NicknameTime {
    nick: string
    zone: string
    realNick: string
}

class Timezone extends Plugin {

    private db: NeDB;
    private timeFormat = 'YYYY-MM-DD hh:mm:ss.SSSA z(Z)';

    constructor(responseMaker: IrcResponseMaker, config: ConfigInterface) {
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

    onCommandCalled(command: ParsedCommand, meta: IrcMessageMeta) {
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

    private outputTime(zoneName: string, messageMeta: IrcMessageMeta) {
        var zone = this.getTimezone(zoneName);
        if (zone !== null) {
            this.responseMaker.respond(messageMeta, zone.format(this.timeFormat));
        }else{
            this.responseMaker.respond(messageMeta, 'Unknown time zone');
        }
    }

    private getTimezone(zoneName: string) {
        if (momentTz.tz.zone(zoneName) !== null) {
            return momentTz.tz(zoneName);
        }else if (aliases.hasOwnProperty(zoneName.toUpperCase()) && momentTz.tz.zone(aliases[zoneName.toUpperCase()]) !== null) {
            return momentTz.tz(aliases[zoneName.toUpperCase()]);
        }
        return null;
    }

    private findMatchingTimezones(query: string): string[] {
        var results = [];
        const zoneNames = momentTz.tz.names()
        for (let z in zoneNames) {
            if (!zoneNames.hasOwnProperty(z)) {
                continue;
            }

            if (zoneNames[z].toLowerCase().indexOf(query.toLowerCase()) !== -1) {
                results.push(zoneNames[z]);
            }
        }
        return results;
    }

    private searchTimezones(command: ParsedCommand, messageMeta: IrcMessageMeta) {
        var zones = this.findMatchingTimezones(command.splitArguments.slice(1).join('_'));
        this.responseMaker.respond(messageMeta,  '[' + zones.join(', ') + ']');
    }


    private registerNickname(command: ParsedCommand, messageMeta: IrcMessageMeta) {
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

    private outputNicknameTime(command: ParsedCommand, messageMeta: IrcMessageMeta) {
        this.db.findOne({ nick: command.splitArguments[1].toLowerCase() }, (err, data: NicknameTime) => {
            if (err) {
                console.log('An error occured');
                return;
            }

            if (data === null) {
                this.responseMaker.respond(messageMeta, 'Nick \'' + command.splitArguments[1] + '\' has no registered timezone.');
                return;
            }

            var zone = this.getTimezone(data.zone);
            if (zone === null) {
                this.responseMaker.respond(messageMeta, 'Unable to get current time');
                return;
            }

            this.responseMaker.respond(messageMeta, `It's ${zone.format(this.timeFormat)} where ${data.realNick} is located.`);
        });
    }
}

export default Timezone;
