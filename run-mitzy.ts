import mitzy = require('./src/mitzy');
import mitzyHttp = require('./src/httpServer');
import ircWrapper = require('./src/irc/ircWrapper');
import config = require('./config');

var responseMaker = new ircWrapper.IrcResponseMaker(mitzy.createIrcClient());
var pluginRegistry = mitzy.initializePlugins(responseMaker);

mitzy.registerEventsAndConnect(responseMaker, pluginRegistry);

mitzyHttp.runHttpServer(pluginRegistry, config.http.port);

mitzy.setupDisconnectCheck(config.irc.timeout, config.irc.timeoutCheckInterval, function() {
    console.log(new Date().toUTCString() + ", Connection lost, reconnecting...");

    responseMaker.getClient().disconnect();

    var newClient = mitzy.createIrcClient();
    mitzy.registerEventsAndConnect(responseMaker, pluginRegistry);

    responseMaker.replaceClient(newClient);
});
