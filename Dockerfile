FROM alpine:3.18 AS build

RUN apk add --update --no-cache nodejs npm

ENV NPM_CONFIG_UPDATE_NOTIFIER=false
ENV NPM_CONFIG_FUND=false

WORKDIR /root

COPY package*.json tsconfig.json ./
COPY src ./src

ARG SENTRY_AUTH_TOKEN
ARG SENTRY_DSN

ENV SENTRY_AUTH_TOKEN=${SENTRY_AUTH_TOKEN}
ENV SENTRY_DSN=${SENTRY_DSN}

RUN npm install && \
    npm run build && \
    npm prune --production

FROM alpine:3.18

WORKDIR /root

COPY --from=build /root/node_modules ./node_modules
COPY --from=build /root/dist ./dist

ARG PG_VERSION='16'

RUN apk add --update --no-cache postgresql${PG_VERSION}-client --repository=https://dl-cdn.alpinelinux.org/alpine/edge/main && \
    apk add --update --no-cache mysql-client nodejs npm zip

CMD node dist/index.js
