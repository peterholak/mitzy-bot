// Common parts between irc.Client and DummyIrcClient
export default interface ClientInterface {
    say(target: string, text: string): any
    notice(target: string, text: string): any
    disconnect(message?: string, callback?: () => void): void
    addListener(event: string, callback: Function): this
    on(event: string, listener: Function): this
}
