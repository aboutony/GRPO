# ═══════════════════════════════════════════════════════════════════════
# GRPO Module — Production Dockerfile
#
# Multi-stage build:
#   Stage 1: Build TypeScript → JavaScript
#   Stage 2: Build .NET DI API Adapter
#   Stage 3: Slim production image
# ═══════════════════════════════════════════════════════════════════════

# ── Stage 1: Build Node.js Service ────────────────────────────────────
FROM node:20-alpine AS node-builder
WORKDIR /build
COPY package.json package-lock.json* tsconfig.json ./
RUN npm ci --production=false
COPY src/ ./src/
RUN npx tsc --outDir dist --declaration --sourceMap false

# ── Stage 2: Build .NET DI API Adapter ────────────────────────────────
FROM mcr.microsoft.com/dotnet/sdk:8.0-alpine AS dotnet-builder
WORKDIR /build
COPY src/GrpoAdapter/ ./GrpoAdapter/
RUN dotnet publish GrpoAdapter/GrpoAdapter.csproj \
    -c Release \
    -o /build/adapter-out \
    --self-contained false

# ── Stage 3: Production Image ─────────────────────────────────────────
FROM node:20-alpine AS production

# Labels
LABEL maintainer="Antigravity Engineering"
LABEL description="GRPO Medical Device Receiving Module for SAP Business One"
LABEL version="1.0.0"

# Install .NET Runtime for DI API Adapter
RUN apk add --no-cache icu-libs krb5-libs libstdc++ libintl

# Create app user (non-root)
RUN addgroup -S grpo && adduser -S grpo -G grpo
WORKDIR /app

# Copy Node.js build
COPY --from=node-builder /build/dist ./dist
COPY --from=node-builder /build/node_modules ./node_modules
COPY --from=node-builder /build/package.json ./

# Copy .NET Adapter
COPY --from=dotnet-builder /build/adapter-out ./adapter

# Copy entrypoint and configs
COPY deploy/docker/entrypoint.sh ./entrypoint.sh
COPY deploy/docker/healthcheck.js ./healthcheck.js
RUN chmod +x entrypoint.sh

# Create directories for logs and exports
RUN mkdir -p /app/logs /app/exports/sfda /app/data && \
    chown -R grpo:grpo /app

# Runtime config
ENV NODE_ENV=production
ENV GRPO_PORT=8443
ENV GRPO_HOST=0.0.0.0

# Expose service port
EXPOSE 8443

# Health check (every 30s)
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD node healthcheck.js

# Run as non-root
USER grpo

ENTRYPOINT ["./entrypoint.sh"]
