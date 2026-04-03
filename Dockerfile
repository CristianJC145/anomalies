# ── Stage 1: Build frontend ───────────────────────────────────────────────────
FROM node:20-alpine AS frontend-builder

WORKDIR /app

# Install frontend deps
COPY frontend/package*.json ./frontend/
RUN npm ci --prefix frontend

# Copy source and build
# The output dir in vite.config.js is ../backend/public
COPY frontend/ ./frontend/
RUN mkdir -p ./backend/public && npm run --prefix frontend build


# ── Stage 2: Production backend ───────────────────────────────────────────────
FROM node:20-alpine AS production

WORKDIR /app

# Install backend production deps only
COPY backend/package*.json ./
RUN npm ci --omit=dev

# Copy backend source
COPY backend/ ./

# Copy compiled frontend from stage 1
COPY --from=frontend-builder /app/backend/public ./public

# Create logs dir
RUN mkdir -p logs

ENV NODE_ENV=production
EXPOSE 3001

# Healthcheck
HEALTHCHECK --interval=30s --timeout=10s --start-period=15s --retries=3 \
  CMD wget -qO- http://localhost:3001/api/scanner/status || exit 1

CMD ["node", "server.js"]
