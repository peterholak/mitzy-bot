import ConfigInterface from '../../ConfigInterface'
import * as url from 'url'
import * as http from 'http'

export interface SuccessRateStats {
    successes: number
    failures: number
}

export enum TimespanType {
    Year, Month, AllTime
}

export interface UserStats {
    timespan: { type: TimespanType, value?: number }
    topUsers: { [nick: string]: number }|{}
    latestUser: string
}

export enum DayStatus {
    Undecided, Success, Failure
}

export interface Stats11Storage {
    loadSuccessRate(callback: AsyncResultCallback<SuccessRateStats, any>)
    loadUserStats(timezone: string, when: number, callback: AsyncResultCallback<UserStats, any>)
    loadChainBeginning(callback: AsyncResultCallback<string, any>)
    loadDaySuccess(day: string, callback: (DayStatus) => void)
    loadLongestChain(callback: (number) => void)
    loadCurrentChain(callback: (number) => void)
    writeRecord(day: string, success: boolean, nick: string, callback: () => void)
    writeLongestChain(longestChain: number)
    writeRawResultsToHttp(request: url.Url, response: http.ServerResponse)
}

export default Stats11Storage
