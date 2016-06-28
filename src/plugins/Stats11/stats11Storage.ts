import ConfigInterface from '../../ConfigInterface'
import * as url from 'url'
import * as http from 'http'

export interface SuccessRateStats {
    successes: number
    failures: number
}

export interface UserStats {
    topUsers: Object
    latestUser: string
}

export enum DayStatus {
    Undecided, Success, Failure
}

export interface Stats11Storage {
    loadSuccessRate(callback: AsyncResultCallback<SuccessRateStats>)
    loadUserStats(callback: AsyncResultCallback<UserStats>)
    loadLatestFailure(callback: AsyncResultCallback<string>)
    loadDaySuccess(day: string, callback: (DayStatus) => void)
    loadLongestChain(callback: (number) => void)
    loadCurrentChain(callback: (number) => void)
    writeRecord(day: string, success: boolean, nick: string, callback: () => void)
    writeLongestChain(longestChain: number)
    writeRawResultsToHttp(request: url.Url, response: http.ServerResponse)
}

export default Stats11Storage
