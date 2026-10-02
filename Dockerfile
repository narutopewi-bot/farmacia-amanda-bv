# Production Dockerfile for Pharmacy ERP + Web Store
FROM node:20-slim AS builder

WORKDIR /app

# Install build essentials for native module compilation (better-sqlite3)
RUN apt-get update && apt-get install -y python3 make g++ && rm -rf /var/lib/apt/lists/*

# Build Frontend
WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN npm install
COPY frontend ./
RUN npm run build

# Install Backend dependencies
WORKDIR /app/backend
COPY backend/package*.json ./
RUN npm install --production
COPY backend ./

# ----------------------------------------------------
# Final Runner Stage
# ----------------------------------------------------
FROM node:20-slim

WORKDIR /app

# Copy built backend and frontend assets
COPY --from=builder /app/backend /app/backend
COPY --from=builder /app/frontend/dist /app/frontend/dist

ENV NODE_ENV=production
ENV PORT=5000

EXPOSE 5000

WORKDIR /app/backend
CMD ["node", "src/server.js"]
