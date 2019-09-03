import { Plugin, ParsedCommand } from '../Plugin'
import * as NeDB from 'nedb'
import { IrcMessageMeta, IrcResponseMaker } from '../irc/ircWrapper'
import { ConfigInterface } from '../ConfigInterface'
var strftime = require('strftime').utc()

interface LastSeen {
    when: number
    nick: string
    what: string
}

class Seen extends Plugin {

    private db: NeDB;

    constructor(responseMaker: IrcResponseMaker, config: ConfigInterface) {
        super('seen', responseMaker, config);

        this.requiredArguments = 1;
        this.ignoreBots = false;
        this.help =
            'Because the other bot\'s seen didn\'t work properly when this bot was first made...\n' +
            'Usage: seen [nickname]\n' +
            'Use %anyone in place of nickname to show last seen person overall';

        this.db = new NeDB({
            filename: this.config.storageDirectory + '/seen.db',
            autoload: true
        });
        this.db.persistence.setAutocompactionInterval(3600000);
        this.db.ensureIndex({ fieldName: 'nick', unique: true });
    }

    onCommandCalled(command: ParsedCommand, meta: IrcMessageMeta) {
        // we actually do want to ignore bots so they can't call the command, but we also want to track
        // their last message, that's why ignoreBots is false and this check is here
        if (this.config.knownBots.indexOf(meta.nick) !== -1) {
            return false;
        }

        if (command.splitArguments[0] === '%anyone') {
            this.outputLastMessageByAnyone(meta);
        }else{
            this.outputLastMessageBy(command.splitArguments[0], meta);
        }
    }

    onMessagePosted(message: string, nick: string) {
        this.db.update(
            { nick: nick },
            {
                nick: nick,
                lower: nick.toLowerCase(),
                when: new Date().getTime(),
                what: message
            },
            { upsert: true },
            (err, numReplaced, newDocument) => {
                if (err !== null) {
                    console.error(err);
                }
            }
        );
    }

    private outputLastMessageByAnyone(meta: IrcMessageMeta) {
        this.db
            .find({})
            .sort({ when: -1 })
            .exec( (err, results) => {
                if (err) {
                    this.responseMaker.respond(meta, 'An error occured');
                    return;
                }

                if (results.length === 0) {
                    this.responseMaker.respond(meta, 'Database seems to be empty');
                    return;
                }

                var lastSeen = results[0] as LastSeen
                var time = strftime('%F %T', new Date(lastSeen['when']));
                this.responseMaker.respond(
                    meta,
                    'Last person seen was \'' + lastSeen['nick'] +
                        '\' at ' + time + ' UTC saying: "' + lastSeen['what'] + '"'
                );
            });
    }

    private outputLastMessageBy(nick: string, meta: IrcMessageMeta) {
        this.db.findOne({ lower: nick.toLowerCase() }, (err, lastSeen: LastSeen) => {
            if (err) {
                this.responseMaker.respond(meta, 'An error occured');
                return;
            }

            if (lastSeen === null) {
                this.responseMaker.respond(meta, 'Never seen nick \'' + nick + '\' in this channel since I came online.');
                return;
            }

            var time = strftime('%F %T', new Date(lastSeen['when']));
            this.responseMaker.respond(
                meta,
                'Nick \'' + lastSeen['nick'] + '\' was last seen in this channel ' + time + ' UTC saying: "' +
                    lastSeen['what'] + '"'
            );
        });
    }
}

export default Seen;
