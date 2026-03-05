#!/bin/bash
# ═══════════════════════════════════════════════════════════════════════
# GRPO Module — Quick-Start Installer (Offline / No GitHub)
#
# This script sets up the GRPO service using a pre-built Docker image.
# No source code or GitHub access required.
#
# Prerequisites: Docker and Docker Compose installed on the server.
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
echo "✅ Docker: $(docker --version)"

COMPOSE_CMD="docker compose"
if ! $COMPOSE_CMD version &> /dev/null 2>&1; then
    COMPOSE_CMD="docker-compose"
    if ! command -v $COMPOSE_CMD &> /dev/null; then
        echo "❌ Docker Compose is not installed."
        exit 1
    fi
fi
echo "✅ Docker Compose detected"
echo ""

# ── Step 1: Configure ────────────────────────────────────────────
if [ ! -f docker/.env ]; then
    echo "📋 Creating configuration file..."
    cp docker/.env.template docker/.env
    echo ""
    echo "╔══════════════════════════════════════════════════════════╗"
    echo "║  ⚠️  ACTION REQUIRED                                    ║"
    echo "║                                                         ║"
    echo "║  Edit docker/.env with your SAP B1 connection details:  ║"
    echo "║    • SAP_SERVER          (SAP B1 server hostname)       ║"
    echo "║    • SAP_COMPANY_DB      (company database name)        ║"
    echo "║    • SAP_USER            (DI API / Service Layer user)  ║"
    echo "║    • SAP_PASSWORD        (password)                     ║"
    echo "║    • SERVICE_LAYER_URL   (https://sap:50000/b1s/v1)    ║"
    echo "║                                                         ║"
    echo "║  Then re-run:  ./install.sh                             ║"
    echo "╚══════════════════════════════════════════════════════════╝"
    exit 0
fi

# ── Validate Config ──────────────────────────────────────────────
source docker/.env 2>/dev/null || true
if [ -z "$SAP_SERVER" ] || [ "$SAP_SERVER" = "sap-b1.your-domain.local" ]; then
    echo "⚠️  Configuration not updated."
    echo "   Edit docker/.env with your SAP B1 details, then re-run."
    exit 1
fi

echo "📡 SAP Server:    $SAP_SERVER"
echo "📦 Company DB:    $SAP_COMPANY_DB"
echo "🔗 Service Layer: $SERVICE_LAYER_URL"
echo ""

# ── Step 2: Load Docker Image ────────────────────────────────────
echo "═══ Step 1/3: Loading Docker Image ══════════════════════════"
echo ""
if docker image inspect grpo-service:1.0.0 > /dev/null 2>&1; then
    echo "✅ Image grpo-service:1.0.0 already loaded"
else
    if [ -f docker/grpo-service.tar ]; then
        echo "📦 Loading image from grpo-service.tar..."
        docker load -i docker/grpo-service.tar
        echo "✅ Image loaded"
    else
        echo "❌ Docker image not found."
        echo "   Expected: docker/grpo-service.tar"
        echo "   Contact your provider for the image file."
        exit 1
    fi
fi
echo ""

# ── Step 3: Schema Sync ─────────────────────────────────────────
echo "═══ Step 2/3: Schema Provisioning ═══════════════════════════"
echo ""
if command -v node &> /dev/null; then
    echo "Running standalone schema sync..."
    cd schema
    cp ../docker/.env .env 2>/dev/null || true
    node schema-sync-standalone.js
    cd ..
else
    echo "⚠️  Node.js not found — schema sync will run via Docker container"
    echo "   (The grpo-schema-sync container handles this automatically)"
fi
echo ""

# ── Step 4: Start Services ───────────────────────────────────────
echo "═══ Step 3/3: Starting Services ════════════════════════════="
echo ""
cd docker
$COMPOSE_CMD up -d
cd ..
echo ""

# ── Health Check ─────────────────────────────────────────────────
echo "⏳ Waiting for service to start (15 seconds)..."
sleep 15

PORT="${GRPO_PORT:-8443}"
if curl -sf "http://localhost:${PORT}/health" > /dev/null 2>&1; then
    echo ""
    echo "╔══════════════════════════════════════════════════════════╗"
    echo "║  🎉 Installation Complete!                              ║"
    echo "║                                                         ║"
    echo "║  Service URL:  http://localhost:${PORT}                  ║"
    echo "║  Health Check: http://localhost:${PORT}/health           ║"
    echo "║                                                         ║"
    echo "║  Next Steps:                                            ║"
    echo "║  • Open the mobile app and enter the Service URL        ║"
    echo "║  • Create a test PO in SAP B1 and verify it appears     ║"
    echo "║  • See docs/sap-b1-guide.html for the full guide        ║"
    echo "║                                                         ║"
    echo "║  Commands:                                              ║"
    echo "║  • View logs:    cd docker && docker compose logs -f     ║"
    echo "║  • Stop:         cd docker && docker compose down        ║"
    echo "║  • Restart:      cd docker && docker compose restart     ║"
    echo "╚══════════════════════════════════════════════════════════╝"
else
    echo ""
    echo "⚠️  Service may still be starting. Check logs:"
    echo "   cd docker && docker compose logs -f grpo-service"
fi
