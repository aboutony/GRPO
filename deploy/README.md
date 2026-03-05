# GRPO Module — Client Distribution Package

## Quick Start

### Option A: Docker (Recommended)

```bash
# 1. Configure
cp docker/.env.template docker/.env
nano docker/.env   # Fill in your SAP B1 details

# 2. Install
chmod +x install.sh
./install.sh
```

### Option B: Manual Setup

```bash
# 1. Run schema sync
cd schema/
cp ../.env.template .env
nano .env   # Fill in your SAP B1 details
node schema-sync-standalone.js

# 2. Start with Docker Compose
cd ../docker/
docker compose up -d
```

---

## Package Contents

| Folder | Contents |
|--------|----------|
| `docker/` | Dockerfile, docker-compose.yml, .env.template |
| `schema/` | Standalone schema sync script (zero dependencies) |
| `mobile/android/` | APK build script |
| `mobile/ios/` | IPA build script |
| `docs/` | SAP B1 Integration Guide (PDF-ready) |
| `install.sh` | One-command installer |

## Prerequisites

- **Server**: Docker + Docker Compose
- **SAP B1**: Version 10.0 FP 2305+, Service Layer enabled
- **Network**: Server must reach SAP B1 on port 50000 (Service Layer)
- **Mobile**: Android 11+ or iOS 16+ devices

## Schema Sync (Standalone)

The schema script creates 2 UDTs + 13 UDFs in your SAP B1 database.
It requires **only Node.js** — no other dependencies.

```bash
# Check what would be created (no changes)
node schema/schema-sync-standalone.js --check-only

# Create all tables and fields
node schema/schema-sync-standalone.js
```

## Support

| Level | Contact | SLA |
|-------|---------|-----|
| L1 | IT Helpdesk | 4h |
| L2 | SAP B1 Consultant | 8h |
| L3 | Antigravity Engineering | 24h |

---

**Version**: 1.0.0  
**SAP B1**: 10.0 FP 2305+  
**Date**: March 2026
