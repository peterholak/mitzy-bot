import { MessageType } from '../Plugin'

export interface IrcMessageMeta {
    messageType: MessageType
    ircTarget: string
    nick: string
}

export class IrcResponseMaker {
    constructor(private client) {

    }

    respond(messageMeta: IrcMessageMeta, text: string, nickPrefix: boolean = true) {
        if (messageMeta.messageType === MessageType.Notice) {
            return this.client.notice(messageMeta.ircTarget, text)
        }

        var prefix = ''
        if (nickPrefix && messageMeta.messageType === MessageType.ChannelMessage) {
            prefix = messageMeta.nick + ': '
        }
        return this.client.say(messageMeta.ircTarget, prefix + text)
    }

    getClient() {
        return this.client
    }

    replaceClient(newClient) {
        this.client = newClient
    }
}
