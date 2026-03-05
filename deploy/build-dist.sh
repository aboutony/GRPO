#!/bin/bash
# ═══════════════════════════════════════════════════════════════════════
# GRPO Module — Distribution Bundle Builder
#
# Creates a client-ready distribution package:
#   grpo-dist-v1.0.0/
#   ├── docker/                   # Docker deployment files
#   │   ├── Dockerfile
#   │   ├── docker-compose.yml
#   │   ├── .env.template
#   │   ├── entrypoint.sh
#   │   └── healthcheck.js
#   ├── schema/                   # Standalone schema script
#   │   └── schema-sync-standalone.js
#   ├── mobile/                   # Mobile build instructions
#   │   ├── android/
#   │   │   └── build-apk.sh
#   │   └── ios/
#   │       └── build-ipa.sh
#   ├── docs/                     # Documentation
#   │   └── sap-b1-guide.html
#   ├── install.sh                # Quick-start installer
#   └── README.md                 # Getting started
# ═══════════════════════════════════════════════════════════════════════

set -e

VERSION="1.0.0"
DIST_DIR="grpo-dist-v${VERSION}"

echo "📦 Building GRPO distribution package v${VERSION}..."
echo ""

# Clean previous
rm -rf "${DIST_DIR}" "${DIST_DIR}.zip" "${DIST_DIR}.tar.gz"

# Create structure
mkdir -p "${DIST_DIR}/docker"
mkdir -p "${DIST_DIR}/schema"
mkdir -p "${DIST_DIR}/mobile/android"
mkdir -p "${DIST_DIR}/mobile/ios"
mkdir -p "${DIST_DIR}/docs"

# Copy Docker files
cp deploy/docker/Dockerfile          "${DIST_DIR}/docker/"
cp deploy/docker/docker-compose.yml  "${DIST_DIR}/docker/"
cp deploy/docker/.env.template       "${DIST_DIR}/docker/"
cp deploy/docker/entrypoint.sh       "${DIST_DIR}/docker/"
cp deploy/docker/healthcheck.js      "${DIST_DIR}/docker/"

# Copy schema
cp deploy/schema/schema-sync-standalone.js "${DIST_DIR}/schema/"
cp deploy/docker/.env.template             "${DIST_DIR}/schema/.env.template"

# Copy mobile
cp deploy/mobile/android/build-apk.sh "${DIST_DIR}/mobile/android/"
cp deploy/mobile/ios/build-ipa.sh     "${DIST_DIR}/mobile/ios/"

# Copy docs
cp public/sap-b1-guide.html "${DIST_DIR}/docs/"

# Copy install script and README
cp deploy/install.sh "${DIST_DIR}/"
cp deploy/README.md  "${DIST_DIR}/"

# Create archives
tar -czf "${DIST_DIR}.tar.gz" "${DIST_DIR}/"
echo "✅ Created ${DIST_DIR}.tar.gz"

if command -v zip &> /dev/null; then
  zip -r "${DIST_DIR}.zip" "${DIST_DIR}/"
  echo "✅ Created ${DIST_DIR}.zip"
fi

echo ""
echo "📦 Distribution package ready:"
echo "   ${DIST_DIR}/"
echo "   ${DIST_DIR}.tar.gz"
echo ""
echo "Share this with the client. They start with README.md."
