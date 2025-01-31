# Build npmrun
FROM rust:1-alpine as npmrun-builder
WORKDIR /src

RUN apk add --no-cache git alpine-sdk

RUN git clone https://github.com/nexryai/npmrun.git .
RUN cargo build --release

FROM node:22-alpine AS builder
RUN apk add --no-cache ca-certificates git alpine-sdk g++ build-base cmake clang libc6-compat

WORKDIR /app

RUN corepack enable
COPY package.json pnpm-lock.yaml ./

RUN pnpm install

COPY . .

RUN pnpm prisma generate
RUN pnpm run build:api

FROM node:22-alpine as prod_dependencies
RUN apk add --no-cache ca-certificates git

WORKDIR /app

COPY . ./
RUN corepack enable
RUN pnpm install --prod --frozen-lockfile

FROM node:22-alpine AS runner
ENV NODE_ENV=production
RUN apk add --no-cache ca-certificates tini \
	&& addgroup -g 723 app \
	&& adduser -u 723 -G app -D -h /app app

WORKDIR /app

COPY --chown=app:app prisma ./prisma
COPY --from=prod_dependencies /app/node_modules ./node_modules
COPY --from=builder /app/built ./built
COPY --from=npmrun-builder /src/target/release/npmrun /usr/local/bin/npmrun

USER app
ENTRYPOINT ["/sbin/tini", "--"]
CMD ["npmrun", "docker:start"]
