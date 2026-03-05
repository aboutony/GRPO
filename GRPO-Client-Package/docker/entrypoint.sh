#!/bin/sh
# ═══════════════════════════════════════════════════════════════════════
# GRPO Module — Container Entrypoint
# ═══════════════════════════════════════════════════════════════════════

set -e

# ── Trial Expiration Gate ───────────────────────────────────────────
# Change this date to extend or revoke the trial.
# Format: YYYY-MM-DD (UTC)
TRIAL_EXPIRY="2026-03-20"

CURRENT_DATE=$(date -u +%Y-%m-%d 2>/dev/null || date +%Y-%m-%d)

if [ "$(echo "$CURRENT_DATE" | tr -d '-')" -gt "$(echo "$TRIAL_EXPIRY" | tr -d '-')" ]; then
    echo ""
    echo "╔══════════════════════════════════════════════════════════╗"
    echo "║  ⛔ EVALUATION PERIOD EXPIRED                           ║"
    echo "║                                                         ║"
    echo "║  Your trial license expired on: $TRIAL_EXPIRY          ║"
    echo "║                                                         ║"
    echo "║  To continue using GRPO, please contact:                ║"
    echo "║  Antigravity Engineering — sales@antigravity.dev        ║"
    echo "║                                                         ║"
    echo "║  Service will not start.                                ║"
    echo "╚══════════════════════════════════════════════════════════╝"
    echo ""
    exit 1
fi

# Calculate remaining days (approximate)
EXPIRY_NUM=$(echo "$TRIAL_EXPIRY" | tr -d '-')
CURRENT_NUM=$(echo "$CURRENT_DATE" | tr -d '-')

echo "╔══════════════════════════════════════════════════════════╗"
echo "║  GRPO Medical Device Receiving Module                    ║"
echo "║  SAP Business One V10.0 Integration                     ║"
echo "║  Version 1.0.0                                          ║"
echo "║                                                         ║"
echo "║  License: EVALUATION (expires $TRIAL_EXPIRY)           ║"
echo "╚══════════════════════════════════════════════════════════╝"
echo ""

# ── Validate Required Environment Variables ─────────────────────────
REQUIRED_VARS="SAP_SERVER SAP_COMPANY_DB SAP_USER SAP_PASSWORD SERVICE_LAYER_URL"
MISSING=""

for var in $REQUIRED_VARS; do
    eval val=\$$var
    if [ -z "$val" ]; then
        MISSING="$MISSING $var"
    fi
done

if [ -n "$MISSING" ]; then
    echo "❌ ERROR: Missing required environment variables:"
    for var in $MISSING; do
        echo "   - $var"
    done
    echo ""
    echo "Copy .env.template to .env and fill in your SAP B1 details."
    exit 1
fi

echo "✅ Environment validated"
echo "   SAP Server:    $SAP_SERVER"
echo "   Company DB:    $SAP_COMPANY_DB"
echo "   Service Layer: $SERVICE_LAYER_URL"
echo "   Port:          ${GRPO_PORT:-8443}"
echo ""

# ── Run Schema Check (non-blocking) ────────────────────────────────
echo "🔍 Checking SAP B1 schema..."
node dist/schema/schema-sync-standalone.js --check-only 2>/dev/null || \
    echo "⚠️  Schema check skipped (will run via schema-sync container)"
echo ""

# ── Start GRPO Service ─────────────────────────────────────────────
echo "🚀 Starting GRPO Service on port ${GRPO_PORT:-8443}..."
exec node dist/index.js "$@"
