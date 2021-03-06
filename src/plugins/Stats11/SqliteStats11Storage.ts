import * as sqlite3 from 'sqlite3'
import * as fs from 'fs'
import * as async from 'async'
import * as url from 'url'
import * as http from 'http'
import moment = require('moment')
import momentTz = require('moment-timezone')
import { Stats11Storage, SuccessRateStats, UserStats, DayStatus, TimespanType, Timespan } from './stats11Storage'
import ConfigInterface from '../../ConfigInterface'

class SqliteStats11Storage implements Stats11Storage {

    private db: sqlite3.Database

    constructor(config: ConfigInterface) {
        var dbFile = config.storageDirectory + '/stats11.db'

        var creatingNewDatabase = false
        if (!fs.existsSync(dbFile)) {
            console.log("Creating brand new stats11 database in " + dbFile)
            creatingNewDatabase = true
        }
        this.db = new sqlite3.Database(dbFile, (err) => { if (err) throw err })
        if (creatingNewDatabase) {
            this.db.serialize(() => {
                this.db.run('CREATE TABLE stats11 (day VARCHAR (10) PRIMARY KEY NOT NULL, success BOOLEAN NOT NULL, nick VARCHAR (50))')
                this.db.run('CREATE TABLE stats11_chain (longest_chain INT NOT NULL)')
                this.db.run('INSERT INTO stats11_chain(longest_chain) VALUES (0)')
                this.db.run('CREATE TABLE stats11_migration (schema_version INT NOT NULL)')
                this.db.run('INSERT INTO stats11_migration(schema_version) VALUES (1)')
            })
        }
    }

    loadSuccessRate(): Promise<SuccessRateStats> {
        return new Promise<SuccessRateStats>((resolve, reject) => {
            this.db.all("SELECT success, COUNT(*) AS days FROM stats11 GROUP BY success", (err, rows) => {
                if (err) {
                    return reject(err)
                }

                var stats = { successes: 0, failures: 0 }

                var successesRow = rows.filter( r => r.success === 1 )
                if (successesRow.length) {
                    stats.successes = successesRow[0].days
                }

                var failuresRow = rows.filter( r => r.success === 0 )
                if (failuresRow.length) {
                    stats.failures = failuresRow[0].days
                }

                resolve(stats)
            })
        })
    }

    private timespanFromNumber(when: number): Timespan {
        if (when === 0) {
            return { type: TimespanType.AllTime }
        }

        if (when <= 12) {
            return { type: TimespanType.Month, value: Math.max(0, when-1) }
        }

        return { type: TimespanType.Year, value: when }
    }

    loadUserStats(timezone: string, when: number): Promise<UserStats> {
        return new Promise((resolve, reject) => {
            let query = "SELECT nick, COUNT(*) AS score FROM stats11 WHERE success = 1 GROUP BY nick ORDER BY score DESC LIMIT 5"
            let queryParameters: string[] = []

            const timespan = this.timespanFromNumber(when)

            if (timespan.type !== TimespanType.AllTime) {
                let start, end
                if (timespan.type === TimespanType.Month) {
                    start = momentTz.tz(timezone).month(timespan.value).startOf('month').format('YYYY-MM-DD')
                    end = momentTz.tz(timezone).month(timespan.value).endOf('month').format('YYYY-MM-DD')
                }else{
                    start = momentTz.tz(timezone).year(timespan.value).startOf('year').format('YYYY-MM-DD')
                    end = momentTz.tz(timezone).year(timespan.value).endOf('year').format('YYYY-MM-DD')
                }
                query = "SELECT nick, COUNT(*) AS score FROM stats11 WHERE success = 1 AND day >= ? AND day <= ? GROUP BY nick ORDER BY score DESC LIMIT 5"
                queryParameters = [ start, end ]
            }

            async.parallel({
                top: cb => this.db.all(query, queryParameters, cb),
                latest: cb => this.db.get("SELECT nick FROM stats11 WHERE success = 1 ORDER BY day DESC LIMIT 1", cb)
            }, function(err, resultsRaw) {

                // TODO: stop using that ancient async library, use something to promisify sqlite3 instead
                const results = resultsRaw as {
                    latest: { nick: string }
                    top: { nick: string, score: number }[]
                }

                if (err) {
                    return reject(err)
                }

                const summary: UserStats = {
                    topUsers: {},
                    latestUser: (results.latest ? results.latest.nick : 'none'),
                    timespan: timespan
                }

                results.top.forEach( r => summary.topUsers[r.nick] = r.score )

                resolve(summary)
            })
        })
    }

    loadChainBeginning(): Promise<string> {
        return new Promise((resolve, reject) => {
            this.db.get("SELECT day FROM stats11 WHERE success = 0 ORDER BY day DESC LIMIT 1", (err, row) => {
                if (err) { return reject(err) }

                const beginning = row ? moment(row.day).add(1, 'day').format('YYYY-MM-DD') : 'beginning'
                resolve(beginning)
            })
        })
    }

    loadDaySuccess(day: string): Promise<DayStatus> {
        return new Promise((resolve, reject) => {
            this.db.get("SELECT success FROM stats11 WHERE day = ?", [ day ], (err, row) => {
                if (err) { return reject(err) }

                if (row === undefined) {
                    return resolve(DayStatus.Undecided)
                }
                return resolve(row.success === 1 ? DayStatus.Success : DayStatus.Failure)
            })
        })
    }

    loadLongestChain(): Promise<number> {
        return new Promise((resolve, reject) => {
            this.db.get("SELECT longest_chain FROM stats11_chain", (err, row) => {
                if (err) { return reject(err) }
                resolve(row.longest_chain)
            })
        })
    }

    loadCurrentChain(): Promise<number> {
        return new Promise((resolve, reject) => {
            // this data is small enough to be loaded in one piece
            this.db.all("SELECT success FROM stats11 ORDER BY day DESC", (err, rows) => {
                if (err) { return reject(err) }

                var chain = 0
                rows.every(row => {
                    if (row.success === 1) {
                        chain++
                    }
                    return row.success === 1
                })

                resolve(chain)
            })
        })
    }

    writeLongestChain(longestChain: number): Promise<void> {
        return new Promise<void>((resolve, reject) => {
            this.db.run("UPDATE stats11_chain SET longest_chain = ?", [ longestChain ], err => {
                if (err) { return reject(err) }
                resolve()
            })
        })
    }

    writeRecord(day: string, success: boolean, nick: string): Promise<void> {
        return new Promise<void>((resolve, reject) => {
            this.db.run(
                "INSERT OR IGNORE INTO stats11(day, success, nick) VALUES(?, ?, ?)",
                [ day, success ? 1 : 0, nick ],
                (err) => {
                    if (err) { return reject(err) }
                    resolve()
                }
            )
        })
    }

    writeRawResultsToHttp(requestUrl: url.Url, response: http.ServerResponse) {
        this.db.all("SELECT * FROM stats11 ORDER BY day DESC", (err, rows) => {
            if (err) {
                response.writeHead(500)
                response.write("An error occured.")
                return
            }

            response.writeHead(200, { "Content-Type": "text/plain" })
            response.write(
                rows.map(
                    row => row.day + ', ' + row.nick + ', ' + (row.success ? 'success' : 'failure')
                ).join("\n")
            )
            response.end()
        })
    }
}

export default SqliteStats11Storage
