import { Plugin, ParsedCommand } from '../Plugin'
import moment = require('moment')
import momentTz = require('moment-timezone')
import { UserStats, SuccessRateStats, Stats11Storage, DayStatus, TimespanType } from './Stats11/stats11Storage'
import * as url from 'url'
import * as http from 'http'
import { IrcMessageMeta, IrcResponseMaker } from '../irc/ircWrapper'
import { ConfigInterface } from '../ConfigInterface';

interface Results {
    successRate: SuccessRateStats
    userStats: UserStats
    chainBeginning: string
}

enum ElevenTime {
    Before, Now, After
}

interface ElevenAttempt {
    nick: string
    time: number
    cooldown: boolean
}

const cooldownTimeMs = 10000

class Stats11 extends Plugin {

    private storage: Stats11Storage
    private currentChain = 0
    private longestChain = 0
    private todaysWinnerDecided = false
    private todaysEntryWritten = false
    private timezone = 'America/New_York' // TODO: configurable
    private interval: NodeJS.Timer|undefined
    private attempts: ElevenAttempt[] = []
    private cooldown: {[nick: string]: number} = {}
    private winningAttempt: ElevenAttempt|undefined

    constructor(responseMaker: IrcResponseMaker, config: ConfigInterface) {
        super('stats11', responseMaker, config)

        this.help = '11:11 stats. Arguments: "raw" = link to raw data, "all" = all-time stats, [1-12] = stats for a specific month this year, [year] = stats for a specific year, "board" = today\'s times'
        this.hasHttpInterface = true

        const storageClass = './Stats11/' + this.config.pluginConfig['Stats11'].storageClass
        const storageConstructor = require(storageClass).default
        this.storage = new storageConstructor(this.config)

        Promise.all([
            this.loadTodaysWinnerStatus(),
            this.loadLongestChain(),
            this.updateCurrentChain()
        ])
        .then(() =>
            this.interval = setInterval(
                () => this.everyMinute(),
                60000
            )
        )
    }

    async onCommandCalled(command: ParsedCommand, meta: IrcMessageMeta) {
        if (command.splitArguments[0] === 'raw') {
            const port = (this.config.http.port === 80 ? '' : (':' + this.config.http.port))
            const url = this.config.http.proxyAddress || ('http://' + this.config.http.hostname + port)
            this.responseMaker.respond(meta, 'Raw data can be found at ' + url + '/stats11')
            return
        }

        if (command.splitArguments[0] === 'board') {
            this.responseMaker.respond(meta, this.getTodaysBoard())
            return
        }
 
        let when = momentTz.tz(this.timezone).month() + 1
        if (!isNaN(Number(command.splitArguments[0]))) {
            when = parseInt(command.splitArguments[0])
        }

        if (command.splitArguments[0] === 'all') {
            when = 0
        }

        const successRate = this.storage.loadSuccessRate()
        const userStats = this.storage.loadUserStats(this.timezone, when)
        const chainBeginning = this.storage.loadChainBeginning()

        const results = {
            successRate: await successRate,
            userStats: await userStats,
            chainBeginning: await chainBeginning
        }

        this.outputStats(meta, results)
    }

    onMessagePosted(message: string, nick: string) {
        const loggedAttempt = this.logAttempt(message, nick)
        if (
            loggedAttempt !== undefined &&
            this.nowVs1111() === ElevenTime.Now &&
            !this.todaysWinnerDecided &&
            this.isWeekDay() &&
            !loggedAttempt.cooldown
        ) {
            this.todaysWinnerDecided = true
            this.writeSuccess(nick)
            this.winningAttempt = loggedAttempt
        }
    }

    onHttpRequest(requestUrl: url.Url, response: http.ServerResponse) {
        this.storage.writeRawResultsToHttp(requestUrl, response)
    }

    private async loadTodaysWinnerStatus() {
        const success = await this.storage.loadDaySuccess(this.todayYmd())
        this.todaysWinnerDecided = (success === DayStatus.Success)
        this.todaysEntryWritten = (success !== DayStatus.Undecided)
    }

    private async loadLongestChain() {
        this.longestChain = await this.storage.loadLongestChain()
    }

    private async updateCurrentChain() {
        this.currentChain = await this.storage.loadCurrentChain()

        if (this.currentChain > this.longestChain) {
            this.longestChain = this.currentChain
            await this.storage.writeLongestChain(this.longestChain)
        }
    }

    private everyMinute() {
        const nowVs11 = this.nowVs1111()

        if (nowVs11 === ElevenTime.After && !this.todaysWinnerDecided && !this.todaysEntryWritten && this.isWeekDay()) {
            this.writeFailure()
        }

        if (nowVs11 === ElevenTime.Before) {
            this.todaysWinnerDecided = false
            this.todaysEntryWritten = false

            if (!this.isIt1110()) {
                this.attempts = []
                this.winningAttempt = undefined
            }
        }

        if (nowVs11 === ElevenTime.After) {
            this.cooldown = {}
        }
    }

    private async writeSuccess(nick: string) {
        this.todaysEntryWritten = true
        await this.storage.writeRecord(this.todayYmd(), true, nick)
        await this.updateCurrentChain()
    }

    private async writeFailure() {
        this.todaysEntryWritten = true
        await this.storage.writeRecord(this.todayYmd(), false, null)
        await this.updateCurrentChain()
    }

    private outputStats(meta: IrcMessageMeta, results: Results) {
        const total = results.successRate.successes + results.successRate.failures
        const percent = (total > 0 ? results.successRate.successes / total : 0) * 100

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

        const topUserStrings = Object.keys(results.userStats.topUsers).map(user =>
            `${this.formatNick(user)} (${results.userStats.topUsers[user]})`
        )

        this.responseMaker.respond(
            meta,
            topUsersPrefix + topUserStrings.join(', ') + ' | \x02latest\x02: ' + this.formatNick(results.userStats.latestUser),
            false
        )
    }

    private nowVs1111(): ElevenTime {
        const time = momentTz.tz(this.timezone)

        if (time.hour() < 11 || (time.hour() === 11 && time.minute() < 11)) {
            return ElevenTime.Before
        }

        if (time.hour() === 11 && time.minute() === 11) {
            return ElevenTime.Now
        }

        return ElevenTime.After
    }

    private isIt1110() {
        const time = momentTz.tz(this.timezone)
        return time.hour() === 11 && time.minute() === 10
    }

    private logAttempt(message: string, nick: string): ElevenAttempt|undefined {
        if (this.nowVs1111() !== ElevenTime.Now && this.isIt1110() === false) { return undefined }
        if (!this.isMessage1111(message)) { return undefined }

        const now = moment.now()
        const onCooldown = this.isOnCooldown(nick, now)

        const loggedAttempt = {
            nick: nick,
            time: now,
            cooldown: onCooldown
        }
        this.attempts.push(loggedAttempt)

        if (!onCooldown) {
            this.cooldown[nick] = now
        }

        return loggedAttempt
    }

    private isOnCooldown(nick: string, now: number) {
        return this.cooldown[nick] !== undefined && (now - this.cooldown[nick] < cooldownTimeMs)
    }

    private isMessage1111(text: string): boolean {
        return text.match( /[1!|l\/\\]{2}:[1!|l\/\\]{2}/ ) !== null
    }

    /** formats nick to prevent highlighting the user */
    private formatNick(nick: string) {
        return nick[0] + "\u200b" + nick.substring(1)
    }

    private todayYmd() {
        const zone = momentTz().tz(this.timezone)
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

    private isWeekDay(date: Date|null = null) {
        if (date === null) {
            const zone = momentTz().tz(this.timezone)
            return (zone.day() != 0 && zone.day() != 6)
        }
        return (date.getDay() != 0 && date.getDay() != 6)
    }

    private getTodaysBoard() {
        if (!this.todaysWinnerDecided) {
            return 'Today\'s winner has not been decided yet.'
        }
        if (this.winningAttempt === undefined) {
            return 'Bot was restarted after today\'s winner was written and the board data was lost.'
        }
        return 'Board: ' + this.attempts.map(this.formatAttempt.bind(this)).join(', ')
    }

    private formatAttempt(attempt: ElevenAttempt) {
        return (
            '\x02' + this.formatNick(attempt.nick) + '\x02' +
            ': ' + momentTz(attempt.time).tz(this.timezone).format('HH:mm:ss.SSS') +
            ' (' + this.formatAttemptDiff(attempt) + ')'
        )
    }

    private formatAttemptDiff(attempt: ElevenAttempt) {
        if (this.winningAttempt === undefined) { return 'error' }

        if (attempt === this.winningAttempt) { return 'winner' }
        if (attempt.cooldown) { return 'cooldown' }
        const secondsDiff = (attempt.time - this.winningAttempt.time) / 1000
        return (secondsDiff >= 0 ? '+' : '') + secondsDiff.toFixed(3)
    }
}

export default Stats11
