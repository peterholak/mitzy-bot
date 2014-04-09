function RateLimit(config) {
    this.config = config;

    this.lastMessages = [];
    this.lastMessagesBy = {};

    //these limits help cap the memory usage, see removeOldRecords
    this.numMessagesKeep = this.maxLimit(this.config.global, 'messages');
    this.numMessagesByKeep = this.maxLimit(this.config.perUser, 'messages');
    this.timeToKeepMessagesBy = this.maxLimit(this.config.perUser, 'interval');

    this.removeEvery = 20;
    this.removeEveryCounter = 0;
};

RateLimit.prototype.maxLimit = function(limits, what) {
    return limits.reduce(function(prev, cur) {
        return Math.max(prev, cur[what]);
    }, 0);
};

RateLimit.prototype.messageSent = function(nick) {
    this.removeEveryCounter++;
    if (this.removeEveryCounter >= this.removeEvery) {
        this.removeOldRecords();
        this.removeEveryCounter = 0;
    }

    var now = new Date().getTime() / 1000;
    this.lastMessages.push(now);
    if (!this.lastMessagesBy.hasOwnProperty(nick))
        this.lastMessagesBy[nick] = [];
    this.lastMessagesBy[nick].push(now);
};

RateLimit.prototype.canSendMessage = function(nick) {
    if (!this.checkLimits(this.config.global, this.lastMessages))
        return false;

    if (!this.lastMessagesBy.hasOwnProperty(nick))
        return true;

    if (!this.checkLimits(this.config.perUser, this.lastMessagesBy[nick]))
        return false;

    return true;
};

RateLimit.prototype.checkLimits = function(limits, messageArray) {
    var now = new Date().getTime() / 1000;

    for (var i=0; i<limits.length; i++) {
        var limit = limits[i];
        if (messageArray.length < limit.messages)
            continue;

        if (now - messageArray[messageArray.length - limit.messages] < limit.interval)
            return false;
    }
    return true;
}

RateLimit.prototype.removeOldRecords = function() {
    var now = new Date().getTime() / 1000;

    while (this.lastMessages.length > this.numMessagesKeep)
        this.lastMessages.shift();

    for (var i in this.lastMessagesBy) {
        while (this.lastMessagesBy[i].length > this.numMessagesByKeep) {
            this.lastMessagesBy[i].shift();
        }
        if (this.lastMessagesBy[i][this.lastMessagesBy[i].length-1]
            < now - this.timeToKeepMessagesBy) {
            delete this.lastMessagesBy[i];
        }
    }
}

module.exports = RateLimit;
