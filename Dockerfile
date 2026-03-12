# Build stage
FROM node:20-slim AS builder

WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm install

# Copy source and build
COPY . .
RUN npm run build

# Production stage - use full node image for better native module compatibility
FROM node:20-bookworm-slim

WORKDIR /app

# Copy node_modules from builder (avoids recompiling better-sqlite3)
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./

# Copy built assets and server code
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/server.ts ./

# Install tsx to run the server
RUN npm install -g tsx

EXPOSE 3000

# Set environment to production
ENV NODE_ENV=production

CMD ["tsx", "server.ts"]
