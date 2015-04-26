interface HttpConfig {
    hostname: string;
    port: number;
}

interface IrcConfig {
    network: string;
    port: number;
    channel: string;
    nick: string;
    username: string;
    password: string;
    timeout: number;
    timeoutCheckInterval: number;
}

interface ConfigInterface {
    http: HttpConfig;
    useDummyClient: boolean;
    irc: IrcConfig;
    plugins: string[];
    pluginConfig: { [plugin: string]: any };
    storageDirectory: string;
    knownBots: string[];
}

export = ConfigInterface;
