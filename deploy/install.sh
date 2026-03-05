#!/bin/bash
# ═══════════════════════════════════════════════════════════════════════
# GRPO Module — Quick-Start Installer
#
# This script sets up the GRPO service on a fresh server.
# Prerequisites: Docker and Docker Compose installed.
# ═══════════════════════════════════════════════════════════════════════

set -e

echo ""
echo "╔══════════════════════════════════════════════════════════╗"
echo "║  GRPO Module — Quick-Start Installer                    ║"
echo "║  SAP Business One V10.0 Integration                     ║"
echo "╚══════════════════════════════════════════════════════════╝"
echo ""

# ── Check Docker ──────────────────────────────────────────────────
if ! command -v docker &> /dev/null; then
    echo "❌ Docker is not installed. Please install Docker first."
    echo "   https://docs.docker.com/get-docker/"
    exit 1
fi

if ! command -v docker compose &> /dev/null && ! command -v docker-compose &> /dev/null; then
    echo "❌ Docker Compose is not installed."
    echo "   https://docs.docker.com/compose/install/"
    exit 1
fi

echo "✅ Docker detected: $(docker --version)"
echo ""

# ── Configure ─────────────────────────────────────────────────────
if [ ! -f docker/.env ]; then
    echo "📋 Creating configuration file..."
    cp docker/.env.template docker/.env
    echo ""
    echo "⚠️  IMPORTANT: Edit docker/.env with your SAP B1 details:"
    echo "   - SAP_SERVER"
    echo "   - SAP_COMPANY_DB"
    echo "   - SAP_USER"
    echo "   - SAP_PASSWORD"
    echo "   - SERVICE_LAYER_URL"
    echo ""
    echo "   Then re-run this script."
    exit 0
fi

# ── Validate Config ──────────────────────────────────────────────
source docker/.env 2>/dev/null || true
if [ -z "$SAP_SERVER" ] || [ "$SAP_SERVER" = "sap-b1.your-domain.local" ]; then
    echo "⚠️  Config not updated. Edit docker/.env with your SAP B1 details."
    exit 1
fi

echo "📡 SAP Server: $SAP_SERVER"
echo "📦 Database:   $SAP_COMPANY_DB"
echo ""

# ── Step 1: Schema Sync ──────────────────────────────────────────
echo "═══ Step 1/3: Schema Provisioning ═══════════════════════════"
echo ""
echo "Running standalone schema sync..."
cd schema
node schema-sync-standalone.js
cd ..
echo ""

# ── Step 2: Build & Start ────────────────────────────────────────
echo "═══ Step 2/3: Building Docker Images ════════════════════════"
echo ""
cd docker
docker compose build --no-cache
echo ""

echo "═══ Step 3/3: Starting Services ════════════════════════════"
echo ""
docker compose up -d
echo ""

# ── Health Check ─────────────────────────────────────────────────
echo "⏳ Waiting for service to start..."
sleep 10

HEALTH_URL="http://localhost:${GRPO_PORT:-8443}/health"
if curl -sf "$HEALTH_URL" > /dev/null 2>&1; then
    echo "✅ GRPO Service is HEALTHY"
    echo ""
    echo "╔══════════════════════════════════════════════════════════╗"
    echo "║  🎉 Installation Complete!                              ║"
    echo "║                                                         ║"
    echo "║  Service:  https://localhost:${GRPO_PORT:-8443}              ║"
    echo "║  Health:   https://localhost:${GRPO_PORT:-8443}/health       ║"
    echo "║  Logs:     docker compose logs -f grpo-service          ║"
    echo "╚══════════════════════════════════════════════════════════╝"
else
    echo "⚠️  Service may still be starting. Check with:"
    echo "   docker compose logs -f grpo-service"
fi
