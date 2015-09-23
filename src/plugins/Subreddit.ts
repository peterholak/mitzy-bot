///<reference path="../../typings/node/node.d.ts"/>
import Plugin = require('../Plugin');
import http = require('http');
import ircWrapper = require('../irc/ircWrapper');

class Subreddit extends Plugin.Plugin {

    constructor(responseMaker, config) {
        super(responseMaker, config);
        this.command = 'subreddit';
        this.requiredArguments = 1;
        this.help =
            'Shows a random post from the current hot posts in a specified subreddit\n' +
            'Usage: subreddit [subreddit_name] (name is without the r/\n' +
            'Example: subreddit worldnews';
    }

    onCommandCalled(command: Plugin.ParsedCommand, meta: ircWrapper.IrcMessageMeta) {
        var subreddit = command.splitArguments[0];

        // we'll be sending this to reddit's server, so we don't want them to think
        // badly of us in case some users try to be smartasses
        var disallowedChars = ';\'"()<>\/\\.*?![]~@!#$%^&';
        for (var i=0; i<disallowedChars.length; i++) {
            if (subreddit.indexOf(disallowedChars[i]) !== -1) {
                return;
            }
        }

        // same as above
        if (subreddit.length > 50) {
            return;
        }

        this.sendSubredditRequest(command.splitArguments[0], meta);
    }

    private sendSubredditRequest(subreddit, meta: ircWrapper.IrcMessageMeta) {
        http.get(
            {
                hostname: 'www.reddit.com',
                path: '/r/' + subreddit + '.json',
                headers: { 'User-Agent': 'mitzy-bot-150426, bot in #reddit on freenode, u/itamz' }
            },
            (res: http.IncomingMessage) => {
                var data = '';
                res.on('error', (e) => {
                    this.responseMaker.respond(meta, 'There was an error with the subreddit command (' + subreddit + ')');
                });

                res.on('data', (chunk) => {
                    data += chunk;
                });

                res.on('end', () => {
                    try {
                        this.printRandomPost(JSON.parse(data), meta);
                    }catch(e) {
                        this.responseMaker.respond(meta, 'There was an error with the subreddit command (' + subreddit + ')');
                        return false;
                    }
                });
            }
        );
    }

    private printRandomPost(subredditJson, meta: ircWrapper.IrcMessageMeta) {
        if (typeof subredditJson !== 'object') {
            return;
        }

        if (!subredditJson.hasOwnProperty('data') || !subredditJson.data.hasOwnProperty('children')) {
            return;
        }

        var posts = subredditJson.data.children;
        var randomPost = Math.floor(Math.random() * posts.length);

        var post = posts[randomPost].data;

        var result =
            post.title +
            ' (' + post.score + ' points, ' + post.num_comments + ' comments), ' +
            'http://redd.it/' + post.id;

        if (post.over_18) {
            result += ' NSFW';
        }
        this.responseMaker.respond(meta, result);
    }
}

export = Subreddit;
