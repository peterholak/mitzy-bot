var readline = require('readline');

function BotFake() {
    this.listeners = {};
    this.rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
    });
}

BotFake.prototype.say = function(target, text) {
    console.log("SAY(" + target + ")> " + text);
};

BotFake.prototype.on = function(what, callback) {
    if (!this.listeners.hasOwnProperty(what))
        this.listeners[what] = [];
    this.listeners[what].push(callback);
};

BotFake.prototype.trigger = function(what, args) {
    if (this.listeners.hasOwnProperty(what)) {
        for (var i = 0; i<this.listeners[what].length; i++) {
            this.listeners[what][i].apply(this, args);
        }
    }
};

BotFake.prototype.fakeBotCommandLine = function() {
    var self = this;
    self.rl.setPrompt('M> ');
    self.rl.prompt();

    self.rl.on('line', function(line) {
        switch (line.trim()) {
            case 'quit':
                self.rl.close();
                process.exit(0);
                break;

            default:
                if (line.split(' ')[0] === 'pm') {
                    self.trigger('pm', [ 'itamz', line.substr(3) ]);
                }else{
                    self.trigger('message#reddit', [ 'itamz', line ]);
                }
                break;
        }
        self.rl.prompt();
    });
}

module.exports = BotFake;
