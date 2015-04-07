var Command = require('../command.js');
var Datastore = require('nedb');
var strftime = require('strftime').utc();
var tz = require('moment-timezone');
var config = require('../config');
var async = require('async');
var fs = require('fs');

var Stats11 = Command.define(module, {
    command: 'stats11',
    help: '11:11 stats, use the "raw" argument to get a link to the raw data',
    decided1111: false,
    todaySuccess: false,
    currentChain: 0,
    longestChain: 0,
    hasHttpInterface: true
});

Stats11.prototype.init = function() {
    this.db = new Datastore({
        filename: config.datadir + '/stats11.db',
        autoload: true
    });
    this.db.persistence.setAutocompactionInterval(36000000);
    this.db.ensureIndex({ fieldName: 'day', unique: true });

    this.timezone = 'America/New_York';

    this.loadTodayIfExists();

    this.loadLongestChain(function() {
        this.updateCurrentChain();
    });
    this.interval = setInterval(this.everyMinute.bind(this), 60000);
};

Stats11.prototype.cleanup = function() {
    this.db.persistence.stopAutocompaction();
    clearInterval(this.interval);
};

Stats11.prototype.process = function(params, target, nick) {

    if (params[0] === 'raw') {
        var port = (config.http.port === 80 ? '' : (':' + config.http.port));
        this.bot.say(target, 'Raw data can be found at http://' + config.http.hostname + port + '/stats11');
        return;
    }

    // a more advanced database system (with aggregate functions etc.)
    // would make this part so much easier...
    async.parallel({
        longestChain: this.loadLongestChainStats.bind(this),
        successes: this.loadSuccessStats.bind(this),
        failures: this.loadFailureStats.bind(this),
        last5Days: this.loadLast5DaysStats.bind(this)
    },

    (function(err, results) {

        var total = results.successes.count + results.failures.count;
        var percent = (total > 0 ? results.successes.count / total : 0) * 100;

        var todayString = 'to be determined';
        if (this.isWeekDay())  {
            if (this.decided1111) {
                todayString = this.todaySuccess ? 'success' : 'failure';
            }
        }else{
            todayString = 'weekend (off)';
        }

        this.bot.say(target, 'Total: ' + results.successes.count +
            '/' + total + ' (' + percent.toFixed(2) + 
            '%), Today: ' + todayString);

        this.bot.say(target, 'Current chain: ' + this.currentChain +
            ', Longest chain: ' + results.longestChain);

        var topUsers = '';
        for (var i=0; i<results.successes.topNicks.length && i<5; i++) {
            if (topUsers.length > 0) {
                topUsers += ', ';
            }
            topUsers += this.formatNick(results.successes.topNicks[i].key) + ' (' + 
                results.successes.topNicks[i].value + ')';
        }

        var latestUser = '';
        if (results.successes.latest.nick) {
            latestUser = ' | latest: ' + this.formatNick(results.successes.latest.nick);
        }
        this.bot.say(target, 'Top users: ' + topUsers + latestUser);

        this.bot.say(target, 'Last 5 weekdays: ' + results.last5Days);
    }).bind(this));
};

Stats11.prototype.postMessageHook = function(nick, text, message) {
    if (this.nowVs1111() === 0 && this.isMessage1111(text) && !this.decided1111
        && this.isWeekDay()) {

        this.writeRecord(true, nick);
    }
};

/**
Returns -1 if it's before 11:11, 0 if it is 11:11, 1 if it's after
*/
Stats11.prototype.nowVs1111 = function() {
    var zone = tz().tz(this.timezone);

    if (zone.hour() < 11 || (zone.hour() === 11 && zone.minute() < 11))
        return -1;
    if (zone.hour() === 11 && zone.minute() === 11)
        return 0;
    return 1;
};

Stats11.prototype.isMessage1111 = function(text) {
    if (text.match( /[1!|l\/\\]{2}:[1!|l\/\\]{2}/ ))
        return true;
    return false;
};

Stats11.prototype.getDayString = function(dateObj) {
    if (typeof dateObj === 'undefined')
        dateObj = new Date();
    return strftime('%F', dateObj);
};

Stats11.prototype.writeRecord = function(success, nick) {
    this.decided1111 = true;
    this.todaySuccess = success;

    var dayStr = this.getDayString();
    if (typeof nick === 'undefined')
        nick = null;

    this.db.insert({ day: this.getDayString(), success: success, nick: nick }, (function() {
        this.updateCurrentChain();
    }).bind(this));
};

Stats11.prototype.everyMinute = function() {
    var nowVs = this.nowVs1111();
    if (nowVs === -1) {
        this.decided1111 = false;
    }else if (nowVs === 1) {
        if (!this.decided1111 && this.isWeekDay()) {
            this.writeRecord(false);
        }
    }
};

Stats11.toArray = function(obj) {
    var ar = [];
    for (var k in obj) {
        ar.push({ key: k, value: obj[k] });
    }
    return ar;
};

Stats11.prototype.loadLongestChain = function(callback) {
    this.db.findOne({ longestChain: { $exists: true } }, (function(err, doc) {
        if (doc === null) {
            this.db.insert({ longestChain: 0 });
            this.longestChain = 0;
        }else{
            this.longestChain = doc.longestChain;
        }
        callback.call(this);
    }).bind(this));
};

Stats11.prototype.updateCurrentChain = function() {
    if (this.decided1111 && !this.todaySuccess) {
        this.currentChain = 0;
        return;
    }

    var chain = 0;
    
    this.db.find({ day: { $exists: true } }).sort({day: -1}).exec((function(err, docs) {
        for (var i=0; i<docs.length; i++) {
            if (docs[i].success)
                chain++;
            else break;
        }

        this.currentChain = chain;

        if (this.currentChain > this.longestChain) {
            this.longestChain = this.currentChain;
            this.db.update({ longestChain: { $exists: true } }, 
                { $set: { longestChain: this.longestChain } });
        }
    }).bind(this));
};

Stats11.prototype.loadSuccessStats = function(callback) {
    var latest = { day: '1970-01-01', nick: null };
    this.db.find({ success: true }, function(err, docs) {
        var grouped = {};
        for (var i=0; i<docs.length; i++) {
            if (!grouped.hasOwnProperty(docs[i].nick))
                grouped[docs[i].nick] = 0;
            grouped[docs[i].nick]++;

            if (docs[i].day > latest.day) {
                latest.day = docs[i].day;
                latest.nick = docs[i].nick;
            }
        }

        var sorted = Stats11.toArray(grouped).sort(function(a, b) {
            return (a.value > b.value ? -1 : (a.value < b.value ? 1 : 0));
        });

        callback(null, { count: docs.length, topNicks: sorted, latest: latest });
    });
};

Stats11.prototype.loadLongestChainStats = function(callback) {
    this.db.findOne({ longestChain: { $exists: true } }, function(err, chain) {
        if (chain === null) //shouldn't happen, as init inserts a default
            callback(null, 0);
        else
            callback(null, chain.longestChain);
    });
};

Stats11.prototype.loadFailureStats = function(callback) {
    this.db.find({ success: false }, function(err, docs) {
        callback(null, { count: docs.length });
    });
};

Stats11.prototype.loadLast5DaysStats = function(callback) {
    var today = new Date();
    var days = [];
    var i = 0;
    while (days.length < 5) {
        var date = new Date(
            Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()-i-1)
        );

        if (this.isWeekDay(date)) {
            days.push(this.getDayString(date));
        }

        i++;
    }

    //TODO missing days (when bot was not in channel)
    this.db.find({ day: { $in: days } }).sort({day: -1}).exec((function(err, docs) {
        var str5Days = '';
        for (var i=0; i<docs.length; i++) {
            var date = this.dayStringToDate(docs[i].day);            

            if (str5Days.length > 0)
                str5Days += ', ';

            str5Days += this.process5DaysStatDay(date, docs[i].success);
        }

        callback(null, str5Days);
    }).bind(this));
};

//TODO: this should go by the same timezone as nowVs1111
Stats11.prototype.isWeekDay = function(date) {
    if (typeof date === 'undefined') {
        var zone = tz().tz(this.timezone);
        return (zone.day() != 0 && zone.day() != 6);
    }
    return (date.getDay() != 0 && date.getDay() != 6);
};

Stats11.prototype.dayStringToDate = function(dayStr) {
    var parts = dayStr.split('-'); //day is in YYYY-MM-DD format
    return new Date(
        Date.UTC(parseInt(parts[0]), parseInt(parts[1])-1, parseInt(parts[2]))
    );
};

Stats11.prototype.process5DaysStatDay = function(date, success) {
    var daysOfWeek = [ 'Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat' ];
    return daysOfWeek[date.getDay()] + ' [' + (success ? 'x' : '-') + ']';
};

Stats11.prototype.loadTodayIfExists = function() {
    var dayStr = this.getDayString();
    this.db.findOne({ day: dayStr }, (function(err, today) {
        if (today !== null) {
            this.decided1111 = true;
            this.todaySuccess = today.success;
        }
    }).bind(this));
};

//format nick to prevent highlighting the user
Stats11.prototype.formatNick = function(nick) {
    return nick[0] + ' ' + nick.substring(1);
};

Stats11.prototype.processHttp = function(path, response) {
    response.writeHead(200, {
        'Content-Type': 'application/json'
    });
    var rawData = fs.readFileSync(config.datadir + '/stats11.db');
    response.write(rawData);
};
