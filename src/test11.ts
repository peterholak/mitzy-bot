import { DummyIrcClient, CommandLine } from './irc/DummyIrcClient'
import moment = require('moment')
import { deduplicateAndCountNicks, LastSeen } from './plugins/Seen'

// TODO: proper tests for the whole project
export async function sendSomeElevens(mitzyClient: DummyIrcClient, count: number = 3) {

    const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

    const names: string[] = []
    for (let i = 0; i<count; i++) {
        names[i] = Math.random().toString(36).substring(7);
    }
    
    const sendThem = () => {
        for (let i = 0; i<count; i++) {
            const name = names[i]
            const client = new DummyIrcClient(name, "#reddit", CommandLine.NoCommandLine, mitzyClient)
            client.say("#reddit", "11:11")
        }
    }
    
    moment.now = () => +new Date(2017, 0, 3, 17, 9);
    sendThem();

    moment.now = () => +new Date(2017, 0, 3, 17, 10, 59);
    sendThem();

    await wait(2000);
    moment.now = () => +new Date(2017, 0, 3, 17, 11);
    sendThem();

    await wait(2000);
    moment.now = () => +new Date(2017, 0, 3, 17, 11, 5, 25);
    sendThem();
}

export function testDeduplicateAndCountNicks() {
    function n(nicks: string[]): LastSeen[] {
        return nicks.map(nick => ({ nick, lower: nick.toLowerCase(), when: 0, what: '' }))
    }
    function assert(condition: boolean) {
        if (!condition) { throw new Error('Assertion failed') }
    }
    assert(deduplicateAndCountNicks([], []) === 0)
    assert(deduplicateAndCountNicks(n(['itamz']), []) === 1)
    assert(deduplicateAndCountNicks(n(['itamz', 'Itamz', 'itamz-', 'itamz--']), []) === 1)
    assert(deduplicateAndCountNicks(n(['itamz', 'other']), []) === 2)
    assert(deduplicateAndCountNicks(n(['itamz', 'other', 'reddit-bot']), ['reddit-bot']) === 2)
    assert(deduplicateAndCountNicks(n(['itamz', 'other', 'reddit-bot', 'itamz_']), ['reddit-bot']) === 2)

    console.log('deduplicateAndCountNicks ok')
}
