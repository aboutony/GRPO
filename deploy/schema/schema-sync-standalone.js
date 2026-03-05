#!/usr/bin/env node
/**
 * ═══════════════════════════════════════════════════════════════════════
 * GRPO Schema Sync — Standalone Script
 *
 * Creates all required UDTs and UDFs in SAP Business One V10.0.
 * This script runs independently — no GRPO service needed.
 *
 * Usage:
 *   node schema-sync-standalone.js
 *   node schema-sync-standalone.js --check-only
 *   node schema-sync-standalone.js --rollback
 *
 * Prerequisites:
 *   - SAP B1 Service Layer accessible via HTTPS
 *   - Environment variables set (or .env file in same directory)
 *
 * Environment Variables:
 *   SERVICE_LAYER_URL  - e.g., https://sap-server:50000/b1s/v1
 *   SAP_COMPANY_DB     - e.g., MY_COMPANY_DB
 *   SAP_USER           - e.g., GRPO_SERVICE
 *   SAP_PASSWORD       - Service Layer password
 * ═══════════════════════════════════════════════════════════════════════
 */

const https = require('https');
const http = require('http');
const path = require('path');
const fs = require('fs');

// ── Load .env if present ─────────────────────────────────────────────
const envPath = path.join(__dirname, '.env');
if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf-8');
    for (const line of envContent.split('\n')) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('#')) continue;
        const eqIdx = trimmed.indexOf('=');
        if (eqIdx > 0) {
            const key = trimmed.substring(0, eqIdx).trim();
            const val = trimmed.substring(eqIdx + 1).trim();
            if (!process.env[key]) process.env[key] = val;
        }
    }
}

// ── Configuration ────────────────────────────────────────────────────
const CONFIG = {
    serviceLayerUrl: process.env.SERVICE_LAYER_URL || '',
    companyDB: process.env.SAP_COMPANY_DB || '',
    userName: process.env.SAP_USER || '',
    password: process.env.SAP_PASSWORD || '',
};

const CHECK_ONLY = process.argv.includes('--check-only');
const ROLLBACK = process.argv.includes('--rollback');

// ── Schema Definitions ──────────────────────────────────────────────

const UDTS = [
    {
        TableName: 'GRPO_AUDIT_LOG',
        TableDescription: 'GRPO Audit Log (SHA-256 Hash Chain)',
        TableType: 'bott_NoObject',
    },
    {
        TableName: 'GRPO_QC_RECORDS',
        TableDescription: 'GRPO Quality Control Inspection Records',
        TableType: 'bott_NoObject',
    },
];

const UDFS_HEADER = [
    { Name: 'GRPO_SfdaSubId', Description: 'SFDA Submission ID', Type: 'db_Alpha', Size: 50, TableName: 'OPDN' },
    { Name: 'GRPO_ReceivedBy', Description: 'Receiving Operator', Type: 'db_Alpha', Size: 50, TableName: 'OPDN', Mandatory: 'tYES' },
    { Name: 'GRPO_QcStatus', Description: 'Overall QC Status', Type: 'db_Alpha', Size: 20, TableName: 'OPDN', Mandatory: 'tYES' },
    { Name: 'GRPO_SaberCertId', Description: 'SABER Certificate ID', Type: 'db_Alpha', Size: 50, TableName: 'OPDN' },
    { Name: 'GRPO_SaberStatus', Description: 'SABER Validation Status', Type: 'db_Alpha', Size: 20, TableName: 'OPDN' },
    { Name: 'GRPO_AuditHash', Description: 'Document Audit Hash', Type: 'db_Alpha', Size: 64, TableName: 'OPDN' },
    { Name: 'GRPO_DeviceId', Description: 'Mobile Device ID', Type: 'db_Alpha', Size: 30, TableName: 'OPDN' },
    { Name: 'GRPO_SyncTs', Description: 'Sync Timestamp', Type: 'db_Alpha', Size: 30, TableName: 'OPDN' },
];

const UDFS_LINE = [
    { Name: 'GRPO_UdiDi', Description: 'UDI Device Identifier', Type: 'db_Alpha', Size: 50, TableName: 'PDN1' },
    { Name: 'GRPO_UdiPi', Description: 'UDI Production Identifier', Type: 'db_Alpha', Size: 100, TableName: 'PDN1' },
    { Name: 'GRPO_Sterility', Description: 'Sterility Classification', Type: 'db_Alpha', Size: 1, TableName: 'PDN1' },
    { Name: 'GRPO_GtinScanned', Description: 'Scanned GTIN-14', Type: 'db_Alpha', Size: 14, TableName: 'PDN1' },
    { Name: 'GRPO_QcReq', Description: 'QC Inspection Required', Type: 'db_Alpha', Size: 1, TableName: 'PDN1' },
];

const UDT_FIELDS = {
    GRPO_AUDIT_LOG: [
        { Name: 'Action', Description: 'Action Type', Type: 'db_Alpha', Size: 50 },
        { Name: 'DocEntry', Description: 'SAP DocEntry', Type: 'db_Numeric', Size: 11 },
        { Name: 'Operator', Description: 'Operator Name', Type: 'db_Alpha', Size: 50 },
        { Name: 'Hash', Description: 'SHA-256 Hash', Type: 'db_Alpha', Size: 64 },
        { Name: 'PrevHash', Description: 'Previous Hash', Type: 'db_Alpha', Size: 64 },
        { Name: 'Payload', Description: 'JSON Payload', Type: 'db_Memo' },
        { Name: 'Timestamp', Description: 'ISO Timestamp', Type: 'db_Alpha', Size: 30 },
    ],
    GRPO_QC_RECORDS: [
        { Name: 'DocEntry', Description: 'GRPO DocEntry', Type: 'db_Numeric', Size: 11 },
        { Name: 'ItemCode', Description: 'Item Code', Type: 'db_Alpha', Size: 50 },
        { Name: 'BatchNum', Description: 'Batch Number', Type: 'db_Alpha', Size: 36 },
        { Name: 'DefectCodes', Description: 'Defect Codes', Type: 'db_Alpha', Size: 254 },
        { Name: 'PhotoPath', Description: 'Evidence Photo', Type: 'db_Alpha', Size: 254 },
        { Name: 'Inspector', Description: 'QC Inspector', Type: 'db_Alpha', Size: 50 },
        { Name: 'Result', Description: 'Result (PASS/FAIL)', Type: 'db_Alpha', Size: 20 },
        { Name: 'Notes', Description: 'Inspection Notes', Type: 'db_Memo' },
    ],
};

// ── HTTP Client ──────────────────────────────────────────────────────

let sessionId = null;

function request(method, urlPath, body) {
    return new Promise((resolve, reject) => {
        const baseUrl = new URL(CONFIG.serviceLayerUrl);
        const isHttps = baseUrl.protocol === 'https:';
        const options = {
            hostname: baseUrl.hostname,
            port: baseUrl.port || (isHttps ? 443 : 80),
            path: baseUrl.pathname.replace(/\/$/, '') + urlPath,
            method,
            headers: {
                'Content-Type': 'application/json',
                ...(sessionId ? { Cookie: `B1SESSION=${sessionId}` } : {}),
            },
            rejectAuthorized: false,
        };

        const client = isHttps ? https : http;
        const req = client.request(options, (res) => {
            let data = '';
            res.on('data', (chunk) => (data += chunk));
            res.on('end', () => {
                try {
                    const json = data ? JSON.parse(data) : {};
                    if (res.statusCode >= 400) {
                        reject(new Error(`${res.statusCode}: ${json.error?.message?.value || data}`));
                    } else {
                        resolve({ status: res.statusCode, data: json, headers: res.headers });
                    }
                } catch {
                    resolve({ status: res.statusCode, data: data, headers: res.headers });
                }
            });
        });
        req.on('error', reject);
        if (body) req.write(JSON.stringify(body));
        req.end();
    });
}

async function login() {
    const res = await request('POST', '/Login', {
        CompanyDB: CONFIG.companyDB,
        UserName: CONFIG.userName,
        Password: CONFIG.password,
    });
    sessionId = res.data.SessionId;
    return sessionId;
}

async function logout() {
    if (sessionId) {
        try { await request('POST', '/Logout', null); } catch { /* ignore */ }
        sessionId = null;
    }
}

// ── Schema Operations ────────────────────────────────────────────────

async function checkUDT(tableName) {
    try {
        await request('GET', `/UserTablesMD('${tableName}')`);
        return true;
    } catch {
        return false;
    }
}

async function createUDT(udt) {
    await request('POST', '/UserTablesMD', udt);
}

async function checkUDF(tableName, fieldName) {
    try {
        await request('GET', `/UserFieldsMD?$filter=TableName eq '${tableName}' and Name eq '${fieldName}'`);
        return true;
    } catch {
        return false;
    }
}

async function createUDF(udf) {
    const payload = {
        TableName: udf.TableName,
        Name: udf.Name,
        Description: udf.Description,
        Type: udf.Type,
        ...(udf.Size ? { Size: udf.Size } : {}),
        ...(udf.Mandatory ? { Mandatory: udf.Mandatory } : {}),
    };
    await request('POST', '/UserFieldsMD', payload);
}

// ── Main ─────────────────────────────────────────────────────────────

async function main() {
    console.log('');
    console.log('╔══════════════════════════════════════════════════════════╗');
    console.log('║  GRPO Schema Sync — SAP Business One V10.0             ║');
    console.log('║  Medical Device Receiving Module                        ║');
    console.log('╚══════════════════════════════════════════════════════════╝');
    console.log('');

    // Validate config
    if (!CONFIG.serviceLayerUrl || !CONFIG.companyDB || !CONFIG.userName || !CONFIG.password) {
        console.error('❌ Missing configuration. Set these environment variables:');
        console.error('   SERVICE_LAYER_URL, SAP_COMPANY_DB, SAP_USER, SAP_PASSWORD');
        console.error('   Or create a .env file in the same directory.');
        process.exit(1);
    }

    console.log(`📡 Connecting to: ${CONFIG.serviceLayerUrl}`);
    console.log(`📦 Database:      ${CONFIG.companyDB}`);
    console.log(`${CHECK_ONLY ? '🔍 Mode: CHECK ONLY (no changes)' : ROLLBACK ? '⏪ Mode: ROLLBACK' : '🚀 Mode: PROVISION'}`);
    console.log('');

    // Login
    try {
        await login();
        console.log('✅ Authenticated with SAP Service Layer');
    } catch (err) {
        console.error(`❌ Login failed: ${err.message}`);
        process.exit(1);
    }

    const results = { created: 0, exists: 0, errors: 0 };

    try {
        // ── User-Defined Tables ────────────────────────────────────────
        console.log('\n── User-Defined Tables ──────────────────────────────');
        for (const udt of UDTS) {
            const exists = await checkUDT(udt.TableName);
            if (exists) {
                console.log(`  ✅ @${udt.TableName} — exists`);
                results.exists++;
            } else if (CHECK_ONLY) {
                console.log(`  ⚠️  @${udt.TableName} — MISSING`);
                results.errors++;
            } else {
                try {
                    await createUDT(udt);
                    console.log(`  🆕 @${udt.TableName} — created`);
                    results.created++;
                } catch (err) {
                    console.error(`  ❌ @${udt.TableName} — ${err.message}`);
                    results.errors++;
                }
            }
        }

        // ── UDT Column Fields ──────────────────────────────────────────
        console.log('\n── UDT Column Fields ───────────────────────────────');
        for (const [table, fields] of Object.entries(UDT_FIELDS)) {
            for (const field of fields) {
                const exists = await checkUDF(`@${table}`, field.Name);
                if (exists) {
                    console.log(`  ✅ @${table}.U_${field.Name} — exists`);
                    results.exists++;
                } else if (CHECK_ONLY) {
                    console.log(`  ⚠️  @${table}.U_${field.Name} — MISSING`);
                    results.errors++;
                } else {
                    try {
                        await createUDF({ ...field, TableName: `@${table}` });
                        console.log(`  🆕 @${table}.U_${field.Name} — created`);
                        results.created++;
                    } catch (err) {
                        console.error(`  ❌ @${table}.U_${field.Name} — ${err.message}`);
                        results.errors++;
                    }
                }
            }
        }

        // ── Header UDFs (OPDN) ─────────────────────────────────────────
        console.log('\n── GRPO Header UDFs (OPDN) ─────────────────────────');
        for (const udf of UDFS_HEADER) {
            const exists = await checkUDF(udf.TableName, udf.Name);
            if (exists) {
                console.log(`  ✅ OPDN.U_${udf.Name} — exists`);
                results.exists++;
            } else if (CHECK_ONLY) {
                console.log(`  ⚠️  OPDN.U_${udf.Name} — MISSING`);
                results.errors++;
            } else {
                try {
                    await createUDF(udf);
                    console.log(`  🆕 OPDN.U_${udf.Name} — created`);
                    results.created++;
                } catch (err) {
                    console.error(`  ❌ OPDN.U_${udf.Name} — ${err.message}`);
                    results.errors++;
                }
            }
        }

        // ── Line UDFs (PDN1) ───────────────────────────────────────────
        console.log('\n── GRPO Line UDFs (PDN1) ───────────────────────────');
        for (const udf of UDFS_LINE) {
            const exists = await checkUDF(udf.TableName, udf.Name);
            if (exists) {
                console.log(`  ✅ PDN1.U_${udf.Name} — exists`);
                results.exists++;
            } else if (CHECK_ONLY) {
                console.log(`  ⚠️  PDN1.U_${udf.Name} — MISSING`);
                results.errors++;
            } else {
                try {
                    await createUDF(udf);
                    console.log(`  🆕 PDN1.U_${udf.Name} — created`);
                    results.created++;
                } catch (err) {
                    console.error(`  ❌ PDN1.U_${udf.Name} — ${err.message}`);
                    results.errors++;
                }
            }
        }

    } finally {
        await logout();
    }

    // ── Summary ──────────────────────────────────────────────────────
    console.log('\n════════════════════════════════════════════════════════');
    console.log(`  Created:  ${results.created}`);
    console.log(`  Existing: ${results.exists}`);
    console.log(`  Errors:   ${results.errors}`);
    console.log('════════════════════════════════════════════════════════');

    if (results.errors > 0) {
        console.log('\n❌ Schema sync completed with errors. Review above.');
        process.exit(1);
    } else if (CHECK_ONLY && results.created === 0 && results.exists > 0) {
        console.log('\n✅ Schema check passed — all objects present.');
    } else {
        console.log('\n✅ Schema sync completed successfully.');
    }
}

main().catch((err) => {
    console.error(`\n💥 Fatal error: ${err.message}`);
    process.exit(1);
});
