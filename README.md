# mitzy-bot

A simple IRC bot for the #reddit channel on freenode

The code is quite ancient and thus ugly by today's standards, but works ok.

## How to run it (not that you would want to)

### Locally
- copy `config.ts.dist` to `config.ts` and edit as needed
- `npm install`
- `node_modules/.bin/tsc`
- `node bin/src/run-mitzy`

### In Docker
- copy `config.ts.dist` to `config.ts` and edit any options you want to hard-code into the image (yeah, it's an old codebase, I didn't want to refactor it properly 😐)
- build the image using the `Dockerfile` in the repo
- when creating the container, you can override any settings by using `--set key value`, e.g. `--set irc.network chat.freenode.net`
- for volumes, ports, etc., see the config file

## Editing

As for editing the code, everything (including debugging) should work out of the box in Visual Studio Code
with the default config (dummy irc client). Use `tsc -w` to automatically recompile on changes.

## More stuff

Also see http://hackles.org/cgi-bin/archives.pl?request=305
