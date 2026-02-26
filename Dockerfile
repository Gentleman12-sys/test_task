# Stage 1: Builder
FROM node:20-alpine AS builder

WORKDIR /app

# Копируем package.json ПЕРЕД установкой
COPY package*.json ./

# Устанавливаем ВСЕ зависимости (включая dev для сборки)
RUN npm ci

COPY . .
RUN npm run build

# Stage 2: Production
FROM node:20-alpine

WORKDIR /app

# Копируем package.json для production-зависимостей
COPY package*.json ./

RUN --mount=type=cache,target=/root/.npm npm ci --omit=dev

# Устанавливаем только production (pino должен быть в dependencies!)
RUN npm ci --omit=dev

# Копируем собранный код
COPY --from=builder /app/dist ./dist

# Копируем миграции
COPY --from=builder /app/src/postgres/migrations/*.js ./dist/postgres/migrations/

# Entrypoint
COPY docker/entrypoint.sh ./entrypoint.sh
RUN chmod +x ./entrypoint.sh

EXPOSE 3000

ENV NODE_ENV=production

ENTRYPOINT ["./entrypoint.sh"]
CMD ["node", "dist/app.js"]