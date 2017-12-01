import { DummyIrcClient, CommandLine } from './irc/DummyIrcClient'
import moment = require('moment')

// TODO: proper tests for the whole project
export function sendSomeElevens(mitzyClient: DummyIrcClient, count: number = 3) {

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
    
    return Promise.resolve()
        .then(() => {
            moment.now = () => +new Date(2017, 0, 3, 17, 9)
            sendThem()
        })
        .then(() => {
            moment.now = () => +new Date(2017, 0, 3, 17, 10, 59)
            sendThem()
        })
        .then(() => wait(2000))
        .then(() => {
            moment.now = () => +new Date(2017, 0, 3, 17, 11)
            sendThem()
        })
        .then(() => wait(2000))
        .then(() => {
            moment.now = () => +new Date(2017, 0, 3, 17, 11, 5, 25)
            sendThem()
        })

}
