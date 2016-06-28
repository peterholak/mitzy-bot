export interface HttpConfig {
    hostname: string
    port: number
}

export interface IrcConfig {
    network: string
    port: number
    secure?: boolean
    selfSigned?: boolean
    channel: string
    nick: string
    username: string
    password: string
    timeout: number
    timeoutCheckInterval: number
}

export interface ConfigInterface {
    http: HttpConfig
    useDummyClient: boolean
    irc: IrcConfig
    plugins: string[]
    pluginConfig: { [plugin: string]: any }
    storageDirectory: string
    knownBots: string[]
}

export default ConfigInterface
