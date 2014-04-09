var Command = require('../command.js');
var http = require('http');

var Subreddit = Command.define(module, {
    command: 'subreddit',
    minParams: 1,
    help: 'Shows a random post from the current hot posts in a specified subreddit\n' +
        'Usage: subreddit [subreddit_name] (name is without the r/\n' +
        'Example: subreddit worldnews'
});

Subreddit.prototype.process = function(params, target, nick) {
    //we'll be sending this to reddit's server, so don't want them to think
    //badly of us in case some users try to be smartasses
    var disallowedChars = ';\'"()<>\/\\.*?![]~@!#$%^&';
    for (var i=0; i<disallowedChars.length; i++)
        if (params[0].indexOf(disallowedChars[i]) !== -1)
            return false;

    //I literally pulled that number out of my ass
    if (params[0].length > 36)
        return false;

    var urlPath = '/r/' + params[0] + '.json';
    this.sendSubredditRequest(params, target, urlPath);
};

Subreddit.prototype.sendSubredditRequest = function(params, target, urlPath) {
    var self = this;

    var partialData = '';

    http.get({
        hostname: 'www.reddit.com',
        path: urlPath,
        headers: {
            'User-Agent': 'mitzy-bot-140129, bot in #reddit on freenode, u/itamz'
        }
    }, function(res) {
        res.on('error', function(e) {
            self.bot.say(target, 'There was an error with the subreddit command (' + 
                params[0] + ')');
        });

        res.on('data', function(data) {
            partialData += data;
        });

        res.on('end', function() {
            try {
                self.processResult(target, JSON.parse(partialData));
            }catch(e) {
                self.bot.say(target, 'There was an error with the subreddit command (' +
                    params[0] + ')');
                return false;
            }
        });
    });
};

Subreddit.prototype.processResult = function(target, data) {
    if (typeof data !== 'object')
        return false;
    
    if (!data.hasOwnProperty('data') || !data.data.hasOwnProperty('children'))
        return false;

    var posts = data.data.children;
    var randomPost = parseInt(Math.random() * posts.length);

    var post = posts[randomPost].data;
    
    var result = post.title + ' (' + post.score + ' points, ' + post.num_comments +
        ' comments), ' + 'http://redd.it/' + post.id;
    if (post.over_18)
        result += ' NSFW';
    this.bot.say(target, result);
};
