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

export type Timespan = {
    type: TimespanType.AllTime
} | {
    type: TimespanType.Month | TimespanType.Year
    value: number
}

export interface UserStats {
    timespan: Timespan
    topUsers: { [nick: string]: number }
    latestUser: string
}

export enum DayStatus {
    Undecided, Success, Failure
}

export interface Stats11Storage {
    loadSuccessRate(): Promise<SuccessRateStats>
    loadUserStats(timezone: string, when: number): Promise<UserStats>
    loadChainBeginning(): Promise<string>
    loadDaySuccess(day: string): Promise<DayStatus>
    loadLongestChain(): Promise<number>
    loadCurrentChain(): Promise<number>
    writeRecord(day: string, success: boolean, nick: string|null): Promise<void>
    writeLongestChain(longestChain: number): Promise<void>
    writeRawResultsToHttp(request: url.Url, response: http.ServerResponse): void
}

export default Stats11Storage
