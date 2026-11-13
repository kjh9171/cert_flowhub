# FlowHub Backend (Node.js + TypeScript) - Multi-stage build
FROM node:20-slim AS deps
WORKDIR /app
COPY package.json package-lock.json* ./
RUN if [ -f package-lock.json ]; then npm ci; else npm install; fi

FROM node:20-slim AS builder
WORKDIR /app
RUN apt-get update && apt-get install -y --no-install-recommends openssl ca-certificates && rm -rf /var/lib/apt/lists/*
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# Prisma 클라이언트 생성
RUN npx prisma generate
# TypeScript 빌드
RUN npm run build

FROM node:20-slim AS runner
WORKDIR /app
RUN apt-get update && apt-get install -y --no-install-recommends openssl ca-certificates && rm -rf /var/lib/apt/lists/*
ENV NODE_ENV=production
ENV PORT=4000
RUN groupadd --system --gid 1001 nodejs && useradd --system --uid 1001 --gid nodejs nodeapp
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/prisma ./prisma
COPY docker-entrypoint.sh /usr/local/bin/docker-entrypoint.sh
RUN chmod +x /usr/local/bin/docker-entrypoint.sh
EXPOSE 4000
ENTRYPOINT ["docker-entrypoint.sh"]
# 스키마 동기화 → 데모 데이터 시드(멱등: 이미 존재하면 즉시 종료) → 서버 기동
CMD ["sh", "-c", "npx prisma db push --accept-data-loss --skip-generate && (node prisma/seed.mjs || echo '[entrypoint] seed skipped') && node dist/main.js"]
