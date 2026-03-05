# GRPO Module — Client Installation Package

> **No source code or GitHub access required.** Everything runs from pre-built Docker images.

## Quick Start (3 Steps)

```bash
# Step 1: Configure your SAP B1 connection
cp docker/.env.template docker/.env
nano docker/.env              # Fill in SAP_SERVER, SAP_USER, etc.

# Step 2: Run the installer
chmod +x install.sh
./install.sh

# Step 3: Verify
curl http://localhost:8443/health
```

That's it. The service will connect to your SAP B1, create the required schema, and start receiving.

---

## Package Contents

```
grpo-dist-v1.0.0/
├── install.sh                        ← Run this (one-command setup)
├── README.md                         ← You are here
├── docker/
│   ├── grpo-service.tar              ← Pre-built Docker image (~200 MB)
│   ├── docker-compose.yml            ← Service orchestration
│   ├── .env.template                 ← SAP config template
│   ├── entrypoint.sh                 ← Container startup
│   └── healthcheck.js                ← Health monitor
├── schema/
│   └── schema-sync-standalone.js     ← SAP B1 schema setup (standalone)
├── mobile/
│   ├── android/build-apk.sh          ← Android APK build
│   └── ios/build-ipa.sh              ← iOS IPA build
└── docs/
    └── sap-b1-guide.html             ← Full integration guide (save as PDF)
```

## Prerequisites

| Requirement | Minimum |
|-------------|---------|
| Docker | 24.0+ |
| Docker Compose | v2.20+ |
| SAP B1 | 10.0 FP 2305+ |
| Service Layer | Enabled (HTTPS, port 50000) |
| Network | Server must reach SAP B1 |

## Commands

| Command | Description |
|---------|-------------|
| `./install.sh` | Full setup (first time) |
| `cd docker && docker compose up -d` | Start services |
| `cd docker && docker compose down` | Stop services |
| `cd docker && docker compose logs -f` | View live logs |
| `node schema/schema-sync-standalone.js --check-only` | Verify SAP schema |

## Support

| Level | Contact | Response |
|-------|---------|----------|
| L1 — App issues | IT Helpdesk | 4 hours |
| L2 — SAP config | SAP Consultant | 8 hours |
| L3 — GRPO module | Antigravity Engineering | 24 hours |

---

**Version 1.0.0** · SAP Business One V10.0 · March 2026
