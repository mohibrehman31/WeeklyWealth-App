# Build stage
FROM node:20-slim AS builder

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .
RUN npm run build

# Production stage - sql.js is pure JS, no native deps
FROM node:20-slim

WORKDIR /app

COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/server ./server
COPY --from=builder /app/shared ./shared

RUN npm install -g tsx

EXPOSE 3000

ENV NODE_ENV=production

CMD ["tsx", "server/index.ts"]
