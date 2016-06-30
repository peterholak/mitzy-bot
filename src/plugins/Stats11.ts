import { Plugin, ParsedCommand } from '../Plugin'
import momentTz = require('moment-timezone')
import { UserStats, SuccessRateStats, Stats11Storage, DayStatus, TimespanType } from './Stats11/stats11Storage'
import * as async from 'async'
import * as url from 'url'
import * as http from 'http'
import { IrcMessageMeta } from '../irc/ircWrapper'

interface Results {
    successRate: SuccessRateStats
    userStats: UserStats
    chainBeginning: string
}

enum ElevenTime {
    Before, Now, After
}

class Stats11 extends Plugin {

    private storage: Stats11Storage
    private currentChain = 0
    private longestChain = 0
    private todaysWinnerDecided = false
    private todaysEntryWritten = false
    private timezone = 'America/New_York' // TODO: configurable
    private interval

    constructor(responseMaker, config) {
        super(responseMaker, config)

        this.command = 'stats11'
        this.help = '11:11 stats. Use the "raw" arugment to get a link to raw data'
        this.hasHttpInterface = true

        var storageClass = './Stats11/' + this.config.pluginConfig['Stats11'].storageClass
        var storageConstructor = require(storageClass).default
        this.storage = new storageConstructor(this.config)

        async.series([
            this.loadTodaysWinnerStatus.bind(this),
            this.loadLongestChain.bind(this),
            this.updateCurrentChain.bind(this),
        ], () => {
            this.interval = setInterval(this.everyMinute.bind(this), 60000)
        })
    }

    onCommandCalled(command: ParsedCommand, meta: IrcMessageMeta) {
        if (command.splitArguments[0] === 'raw') {
            var port = (this.config.http.port === 80 ? '' : (':' + this.config.http.port))
            this.responseMaker.respond(meta, 'Raw data can be found at http://' + this.config.http.hostname + port + '/stats11')
            return
        }
 
        let when = momentTz.tz(this.timezone).month() + 1
        if (!isNaN(Number(command.splitArguments[0]))) {
            when = parseInt(command.splitArguments[0])
        }

        if (command.splitArguments[0] === 'all') {
            when = 0
        }

        async.parallel({
            successRate: this.storage.loadSuccessRate.bind(this.storage),
            userStats: this.storage.loadUserStats.bind(this.storage, this.timezone, when),
            chainBeginning: this.storage.loadChainBeginning.bind(this.storage)
        }, (err, results: any) => {
            this.outputStats(meta, err, results)
        })
    }

    onMessagePosted(message: string, nick: string) {
        if (this.nowVs1111() === ElevenTime.Now && this.isMessage1111(message) && !this.todaysWinnerDecided && this.isWeekDay()) {
            this.todaysWinnerDecided = true
            this.writeSuccess(nick)
        }
    }

    onHttpRequest(requestUrl: url.Url, response: http.ServerResponse) {
        this.storage.writeRawResultsToHttp(requestUrl, response)
    }

    private loadTodaysWinnerStatus(callback: AsyncResultCallback<any>) {
        this.storage.loadDaySuccess(this.todayYmd(), (success: DayStatus) => {
            this.todaysWinnerDecided = (success === DayStatus.Success)
            this.todaysEntryWritten = (success !== DayStatus.Undecided)
            callback(null, null)
        })
    }

    private loadLongestChain(callback: AsyncResultCallback<any>) {
        this.storage.loadLongestChain((chain: number) => {
            this.longestChain = chain
            callback(null, null)
        })
    }

    private updateCurrentChain(callback: AsyncResultCallback<any> = null) {
        this.storage.loadCurrentChain((chain: number) => {
            this.currentChain = chain

            if (this.currentChain > this.longestChain) {
                this.longestChain = this.currentChain
                this.storage.writeLongestChain(this.longestChain)
            }

            if (callback !== null) {
                callback(null, null)
            }
        })
    }

    private everyMinute() {
        var nowVs11 = this.nowVs1111()

        if (nowVs11 === ElevenTime.After && !this.todaysWinnerDecided && !this.todaysEntryWritten && this.isWeekDay()) {
            this.writeFailure()
        }

        if (nowVs11 === ElevenTime.Before) {
            this.todaysWinnerDecided = false
            this.todaysEntryWritten = false
        }
    }

    private writeSuccess(nick: string) {
        this.todaysEntryWritten = true
        this.storage.writeRecord(this.todayYmd(), true, nick, this.updateCurrentChain.bind(this))
    }

    private writeFailure() {
        this.todaysEntryWritten = true
        this.storage.writeRecord(this.todayYmd(), false, null, this.updateCurrentChain.bind(this))
    }

    private outputStats(meta: IrcMessageMeta, err, results: Results) {
        var total = results.successRate.successes + results.successRate.failures
        var percent = (total > 0 ? results.successRate.successes / total : 0) * 100

        this.responseMaker.respond(
            meta,
            'Total: ' + results.successRate.successes + '/' + total +
                ' (' + percent.toFixed(2) + '%), Today: ' + this.todaySuccessString(),
            false
        )

        this.responseMaker.respond(
            meta,
            '\x02Chain\x02: ' + this.currentChain + ', \x02longest\x02: ' + this.longestChain +
                ', \x02since\x02: ' + results.chainBeginning + '.',
            false
        )

        let topUsersPrefix = '\x02All-time\x02: '
        if (results.userStats.timespan.type === TimespanType.Month) {
            topUsersPrefix = `\x02${momentTz.tz(this.timezone).month(results.userStats.timespan.value).format('MMMM')}\x02: `
        }else if (results.userStats.timespan.type === TimespanType.Year) {
            topUsersPrefix = `\x02${momentTz.tz(this.timezone).year(results.userStats.timespan.value).format('YYYY')}\x02: `
        }

        let topUserStrings = Object.keys(results.userStats.topUsers).map(user =>
            `${this.formatNick(user)} (${results.userStats.topUsers[user]})`
        )

        this.responseMaker.respond(
            meta,
            topUsersPrefix + topUserStrings.join(', ') + ' | \x02latest\x02: ' + this.formatNick(results.userStats.latestUser),
            false
        )
    }

    private nowVs1111(): ElevenTime {
        var time = momentTz.tz(this.timezone)

        if (time.hour() < 11 || (time.hour() === 11 && time.minute() < 11)) {
            return ElevenTime.Before
        }

        if (time.hour() === 11 && time.minute() === 11) {
            return ElevenTime.Now
        }

        return ElevenTime.After
    }

    private isMessage1111(text: string): boolean {
        return text.match( /[1!|l\/\\]{2}:[1!|l\/\\]{2}/ ) !== null
    }

    /** formats nick to prevent highlighting the user */
    private formatNick(nick) {
        return nick[0] + "\u200b" + nick.substring(1)
    }

    private todayYmd() {
        var zone = momentTz().tz(this.timezone)
        return zone.format('YYYY-MM-DD')
    }

    private todaySuccessString() {
        if (!this.isWeekDay()) {
            return 'weekend (off)'
        }

        if (this.nowVs1111() !== ElevenTime.After && !this.todaysWinnerDecided) {
            return 'to be determined'
        }

        return this.todaysWinnerDecided ? 'success' : 'failure'
    }

    private isWeekDay(date: Date = null) {
        if (date === null) {
            var zone = momentTz().tz(this.timezone)
            return (zone.day() != 0 && zone.day() != 6)
        }
        return (date.getDay() != 0 && date.getDay() != 6)
    }

}

export default Stats11
