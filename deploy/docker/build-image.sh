#!/bin/bash
# ═══════════════════════════════════════════════════════════════════════
# GRPO Module — Build & Export Docker Image for Client Distribution
#
# RUN THIS ON YOUR MACHINE (not the client's).
# It builds the Docker image and exports it as a .tar file
# that you zip and send to the client.
#
# The client will never need access to GitHub or source code.
#
# Usage:
#   ./build-image.sh
#
# Output:
#   deploy/docker/grpo-service.tar  (~150-250 MB)
# ═══════════════════════════════════════════════════════════════════════

set -e

VERSION="1.0.0"
IMAGE_NAME="grpo-service"
IMAGE_TAG="${IMAGE_NAME}:${VERSION}"
OUTPUT_PATH="deploy/docker/grpo-service.tar"

echo ""
echo "╔══════════════════════════════════════════════════════════╗"
echo "║  GRPO — Build Docker Image for Client Distribution      ║"
echo "╚══════════════════════════════════════════════════════════╝"
echo ""

# Must be run from project root
if [ ! -f "package.json" ]; then
    echo "❌ Run this from the project root (where package.json is)."
    exit 1
fi

# ── Build the image ──────────────────────────────────────────────
echo "🔨 Building Docker image: ${IMAGE_TAG}..."
echo ""
docker build -t "${IMAGE_TAG}" -f deploy/docker/Dockerfile .
echo ""

# ── Export to .tar ───────────────────────────────────────────────
echo "📦 Exporting image to ${OUTPUT_PATH}..."
docker save "${IMAGE_TAG}" -o "${OUTPUT_PATH}"

SIZE=$(du -h "${OUTPUT_PATH}" | cut -f1)
echo ""
echo "╔══════════════════════════════════════════════════════════╗"
echo "║  ✅ Image exported successfully                         ║"
echo "╚══════════════════════════════════════════════════════════╝"
echo ""
echo "   Image:   ${IMAGE_TAG}"
echo "   File:    ${OUTPUT_PATH}"
echo "   Size:    ${SIZE}"
echo ""
echo "   Next steps:"
echo "   1. Zip the entire deploy/ folder"
echo "   2. Send to client"
echo "   3. Client runs: docker load -i grpo-service.tar"
echo "   4. Client runs: docker compose up -d"
