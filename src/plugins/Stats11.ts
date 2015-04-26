///<reference path="../../lib/moment/moment.d.ts"/>
///<reference path="../../lib/moment-timezone/moment-timezone.d.ts"/>
///<reference path="../../lib/node/node.d.ts"/>
///<reference path="../../lib/async/async.d.ts"/>
import Plugin = require('../Plugin');
import momentTz = require('moment-timezone');
import stats11Storage = require('./Stats11/stats11Storage');
import async = require('async');
import url = require('url');
import http = require('http');
import ircWrapper = require('../irc/ircWrapper');

interface Results {
    successRate: stats11Storage.SuccessRateStats;
    userStats: stats11Storage.UserStats;
    latestFailure: string;
}

enum TimeComparedTo11 {
    Before, Now, After
}

class Stats11 extends Plugin.Plugin {

    private storage: stats11Storage.Stats11Storage;
    private currentChain = 0;
    private longestChain = 0;
    private todaysWinnerDecided = false;
    private timezone = 'America/New_York'; // TODO: configurable
    private interval;

    constructor(responseMaker, config) {
        super(responseMaker, config);

        this.command = 'stats11';
        this.help = '11:11 stats. Use the "raw" arugment to get a link to raw data';
        this.hasHttpInterface = true;

        var storageClass = './Stats11/' + this.config.pluginConfig['Stats11'].storageClass;
        var storageConstructor = require(storageClass);
        this.storage = new storageConstructor(this.config);

        async.series([
            this.loadTodaysWinnerStatus.bind(this),
            this.loadLongestChain.bind(this),
            this.updateCurrentChain.bind(this),
        ], () => {
            this.interval = setInterval(this.everyMinute.bind(this), 60000);
        });
    }

    onCommandCalled(command: Plugin.ParsedCommand, meta: ircWrapper.IrcMessageMeta) {
        if (command.splitArguments[0] === 'raw') {
            var port = (this.config.http.port === 80 ? '' : (':' + this.config.http.port));
            this.responseMaker.respond(meta, 'Raw data can be found at http://' + this.config.http.hostname + port + '/stats11');
            return;
        }

        async.parallel({
            successRate: this.storage.loadSuccessRate.bind(this.storage),
            userStats: this.storage.loadUserStats.bind(this.storage),
            latestFailure: this.storage.loadLatestFailure.bind(this.storage)
        }, (err, results: any) => {
            this.outputStats(meta, err, results);
        });
    }

    onMessagePosted(message: string, nick: string) {
        if (this.nowVs1111() === TimeComparedTo11.Now && this.isMessage1111(message) && !this.todaysWinnerDecided && this.isWeekDay()) {
            this.todaysWinnerDecided = true;
            this.writeSuccess(nick);
        }
    }

    onHttpRequest(requestUrl: url.Url, response: http.ServerResponse) {
        this.storage.writeRawResultsToHttp(requestUrl, response);
    }

    private loadTodaysWinnerStatus(callback: AsyncResultCallback<any>) {
        this.storage.loadDaySuccess(this.todayYmd(), (success: boolean) => {
            this.todaysWinnerDecided = success;
            callback(null, null);
        });
    }

    private loadLongestChain(callback: AsyncResultCallback<any>) {
        this.storage.loadLongestChain((chain: number) => {
            this.longestChain = chain;
            callback(null, null);
        });
    }

    private updateCurrentChain(callback: AsyncResultCallback<any> = null) {
        this.storage.loadCurrentChain((chain: number) => {
            this.currentChain = chain;

            if (this.currentChain > this.longestChain) {
                this.longestChain = this.currentChain;
                this.storage.writeLongestChain(this.longestChain);
            }

            if (callback !== null) {
                callback(null, null);
            }
        });
    }

    private everyMinute() {
        var nowVs11 = this.nowVs1111();

        if (nowVs11 === TimeComparedTo11.After && !this.todaysWinnerDecided && this.isWeekDay()) {
            this.writeFailure();
        }

        if (nowVs11 === TimeComparedTo11.Before) {
            this.todaysWinnerDecided = false;
        }
    }

    private writeSuccess(nick: string) {
        this.storage.writeRecord(this.todayYmd(), true, nick, this.updateCurrentChain.bind(this));
    }

    private writeFailure() {
        this.storage.writeRecord(this.todayYmd(), false, null, this.updateCurrentChain.bind(this));
    }

    private outputStats(meta: ircWrapper.IrcMessageMeta, err, results: Results) {
        var total = results.successRate.successes + results.successRate.failures;
        var percent = (total > 0 ? results.successRate.successes / total : 0) * 100;

        this.responseMaker.respond(
            meta,
            'Total: ' + results.successRate.successes + '/' + total +
                ' (' + percent.toFixed(2) + '%), Today: ' + this.todaySuccessString(),
            false
        );

        this.responseMaker.respond(
            meta,
            'Current chain: ' + this.currentChain + ', longest chain: ' + this.longestChain +
                '. Going strong since the day after ' + results.latestFailure + '.',
            false
        );

        var topUserStrings = [];
        for (var user in results.userStats.topUsers) {
            topUserStrings.push(this.formatNick(user) + ' (' + results.userStats.topUsers[user] + ')');
        }
        this.responseMaker.respond(meta, topUserStrings.join(', ') + ' | latest ' + this.formatNick(results.userStats.latestUser), false);
    }

    private nowVs1111(): TimeComparedTo11 {
        var time = momentTz.tz(this.timezone);

        if (time.hour() < 11 || (time.hour() === 11 && time.minute() < 11)) {
            return TimeComparedTo11.Before;
        }

        if (time.hour() === 11 && time.minute() === 11) {
            return TimeComparedTo11.Now;
        }

        return TimeComparedTo11.After;
    }

    private isMessage1111(text: string): boolean {
        return text.match( /[1!|l\/\\]{2}:[1!|l\/\\]{2}/ ) !== null;
    }

    /** formats nick to prevent highlighting the user */
    private formatNick(nick) {
        return nick[0] + ' ' + nick.substring(1);
    }

    private todayYmd() {
        var zone = momentTz().tz(this.timezone);
        return zone.format('YYYY-MM-DD');
    }

    private todaySuccessString() {
        if (!this.isWeekDay()) {
            return 'weekend (off)';
        }

        if (this.nowVs1111() !== TimeComparedTo11.After && !this.todaysWinnerDecided) {
            return 'to be determined';
        }

        return this.todaysWinnerDecided ? 'success' : 'failure';
    }

    private isWeekDay(date: Date = null) {
        if (date === null) {
            var zone = momentTz().tz(this.timezone);
            return (zone.day() != 0 && zone.day() != 6);
        }
        return (date.getDay() != 0 && date.getDay() != 6);
    }

}

export = Stats11;
