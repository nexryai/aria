# 外部イメージをbaseステージとして扱う
FROM node:22-alpine AS base

# baseステージをもとにbuilderステージを開始
FROM base AS builder

WORKDIR /app

RUN corepack enable
COPY package.json package-lock.json ./

RUN pnpm install

COPY . .

RUN pnpm run build

FROM node:22-alpine AS runner
ENV NODE_ENV=production
RUN apk add --no-cache ca-certificates tini \
	&& addgroup -g 720 app \
	&& adduser -u 720 -G app -D -h /app app \

WORKDIR /app

COPY --from=builder /app/next.config.js ./
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/static ./.next/static

COPY --from=builder /app/.next/standalone ./

USER app
ENTRYPOINT ["/sbin/tini", "--"]
CMD ["node", "server.js"]
