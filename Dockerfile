FROM node:10-alpine AS build

RUN apk add python g++ make icu-dev dumb-init

COPY . /code
WORKDIR /code
RUN npm install && node_modules/.bin/tsc

FROM node:10-alpine

COPY --from=build /code /code
COPY --from=build /usr/bin/dumb-init /usr/bin/dumb-init
WORKDIR /code
ENTRYPOINT [ "dumb-init", "--", "node", "bin/src/run-mitzy" ]
