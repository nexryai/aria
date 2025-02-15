# Build npmrun
FROM rust:1-alpine as npmrun_builder
WORKDIR /src

RUN apk add --no-cache git alpine-sdk

RUN git clone https://github.com/nexryai/npmrun.git .
RUN cargo build --release

# Build server
FROM node:22-alpine AS builder
RUN apk add --no-cache ca-certificates git alpine-sdk g++ build-base cmake clang libc6-compat

WORKDIR /app

RUN npm install -g pnpm
COPY package.json pnpm-lock.yaml ./

RUN pnpm install

COPY . ./

RUN pnpm prisma generate
RUN pnpm run build:api

# Install production dependencies
FROM node:22-alpine as prod_dependencies
RUN apk add --no-cache ca-certificates git

WORKDIR /app

COPY . ./
RUN npm install -g pnpm
RUN pnpm install --prod --frozen-lockfile

# Build client
FROM node:22-alpine as client_builder
RUN apk add --no-cache ca-certificates git alpine-sdk g++ build-base cmake clang libc6-compat cargo wasm-pack

WORKDIR /app

RUN npm install -g pnpm
COPY package.json pnpm-lock.yaml ./

RUN pnpm install

COPY . ./

RUN pnpm build


# Final image
FROM node:22-alpine as runner
ENV NODE_ENV=production
RUN apk add --no-cache ca-certificates tini nginx \
	&& addgroup -g 723 app \
	&& adduser -u 723 -G app -D -h /app app \
	&& chown -R app:app /var/lib/nginx \
	&& chown -R app:app /run/nginx

WORKDIR /app

COPY nginx.conf /etc/nginx/nginx.conf
COPY package.json /app
COPY --chown=app:app prisma ./prisma
COPY --from=prod_dependencies /app/node_modules ./node_modules
COPY --from=builder /app/built ./built
COPY --from=npmrun_builder /src/target/release/npmrun /usr/local/bin/npmrun
COPY --from=client_builder /app/dist /app/dist

USER app
ENTRYPOINT ["/sbin/tini", "--"]
CMD ["npmrun", "docker:start"]
