FROM node:10-alpine AS build

RUN apk add python g++ make icu-dev

COPY . /code
WORKDIR /code
RUN npm install && node_modules/.bin/tsc

FROM node:10-alpine

COPY --from=build /code /code
WORKDIR /code
ENTRYPOINT [ "node", "bin/src/run-mitzy" ]
