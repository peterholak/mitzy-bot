mitzy-bot
=========

A simple IRC bot for the #reddit channel on freenode

How to run it (not that you would want to)
------------------------------------------

* clone the repo
* copy `config.ts.dist` to `config.ts` and edit as needed
* `npm install`
* `tsc`
* `node bin/src/run-mitzy`

As for editing the code, everything (including debugging) should work out of the box in Visual Studio Code
with the default config (dummy irc client). Use `tsc -w` to automatically recompile on changes.

Also see http://hackles.org/cgi-bin/archives.pl?request=305
