import * as sqlite3 from 'sqlite3'
import * as fs from 'fs'
import * as async from 'async'
import * as url from 'url'
import * as http from 'http'
import moment = require('moment')
import { Stats11Storage, SuccessRateStats, UserStats, DayStatus } from './stats11Storage'
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

    loadSuccessRate(callback: AsyncResultCallback<SuccessRateStats>) {
        this.db.all("SELECT success, COUNT(*) AS days FROM stats11 GROUP BY success", (err, rows) => {
            if (err) {
                return callback(err, null)
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

            callback(err, stats)
        })
    }

    loadUserStats(previousNDays: number, callback: AsyncResultCallback<UserStats>) {
        let dateLimit = ''
        let queryParameters = []
        if (previousNDays !== 0) {
            queryParameters = [ moment().subtract(previousNDays, 'days').format('YYYY-MM-DD') ]
            dateLimit = 'AND day >= ?'
        }

        async.parallel({
            top: cb => this.db.all(
                "SELECT nick, COUNT(*) AS score FROM stats11 WHERE success = 1 " + dateLimit + " GROUP BY nick ORDER BY score DESC LIMIT 5",
                queryParameters,
                cb
            ),
            latest: cb => this.db.get("SELECT nick FROM stats11 WHERE success = 1 ORDER BY day DESC LIMIT 1", cb)
        }, function(err, results: any) {

            if (err) {
                return callback(err, null)
            }

            var summary = {
                topUsers: {},
                latestUser: (results.latest ? results.latest.nick : 'none'),
                previousNDays: previousNDays
            }

            results.top.forEach( r => summary.topUsers[r.nick] = r.score )

            callback(err, summary)
        })
    }

    loadLatestFailure(callback:AsyncResultCallback<string>) {
        this.db.get("SELECT day FROM stats11 WHERE success = 0 ORDER BY day DESC LIMIT 1", (err, row) => {
            if (err) {
                return callback(err, null)
            }

            callback(null, row ? row.day : 'never')
        })
    }

    loadDaySuccess(day: string, callback: (status: DayStatus) => void) {
        this.db.get("SELECT success FROM stats11 WHERE day = ?", [ day ], (err, row) => {
            // good enough, see comment in loadLongestChains
            if (err) { throw err }

            if (row === undefined) {
                return callback(DayStatus.Undecided)
            }
            return callback(row.success === 1 ? DayStatus.Success : DayStatus.Failure)
        })
    }

    loadLongestChain(callback: (number) => void) {
        this.db.get("SELECT longest_chain FROM stats11_chain", (err, row) => {
            if (err) {
                // good enough for now, there is no real way to recover from this error and this method will
                // only run shortly after the bot is started, so any errors will immediately be visible in the console
                throw err
            }
            callback(row.longest_chain)
        })
    }

    loadCurrentChain(callback: (number) => void) {
        // this data is small enough to be loaded in one piece
        this.db.all("SELECT success FROM stats11 ORDER BY day DESC", (err, rows) => {
            if (err) { throw err }

            var chain = 0
            rows.every((row) => {
                if (row.success === 1) {
                    chain++
                }
                return row.success === 1
            })

            callback(chain)
        })
    }

    writeLongestChain(longestChain: number) {
        this.db.run("UPDATE stats11_chain SET longest_chain = ?", [ longestChain ])
    }

    writeRecord(day: string, success: boolean, nick: string, callback: () => void) {
        this.db.run(
            "INSERT OR IGNORE INTO stats11(day, success, nick) VALUES(?, ?, ?)",
            [ day, success ? 1 : 0, nick ],
            (err) => {
                if (err) { throw err }
                callback()
            }
        )
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
