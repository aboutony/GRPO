/**
 * GRPO Schema Provisioning Runner
 *
 * Authenticates with SAP Service Layer and provisions all schema objects:
 *   1. Creates UDTs (@GRPO_AUDIT_LOG, @GRPO_QC_RECORDS)
 *   2. Creates UDFs on OPDN (header), PDN1 (line), and both UDTs
 *
 * Idempotent: handles 409 Conflict gracefully (already exists → skip).
 *
 * Usage: npx ts-node src/provision.ts
 */

import { createSession, destroySession, slPost, type SLSession } from './config/connection';
import { HEADER_UDFS } from './schemas/header-udf';
import { LINE_UDFS } from './schemas/line-udf';
import { AUDIT_LOG_TABLE, AUDIT_LOG_COLUMNS } from './schemas/audit-udt';
import { QC_RECORDS_TABLE, QC_RECORDS_COLUMNS } from './schemas/qc-udt';
import type { UserTablePayload, UserFieldPayload } from './types/grpo-schema';

// ─── Console Output Helpers ──────────────────────────────────────────────────

const C = {
    reset: '\x1b[0m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    red: '\x1b[31m',
    cyan: '\x1b[36m',
    dim: '\x1b[2m',
    bold: '\x1b[1m',
};

function logOk(msg: string) { console.log(`  ${C.green}✔${C.reset} ${msg}`); }
function logSkip(msg: string) { console.log(`  ${C.yellow}⊘${C.reset} ${msg} ${C.dim}(already exists)${C.reset}`); }
function logFail(msg: string, detail?: string) {
    console.log(`  ${C.red}✘${C.reset} ${msg}`);
    if (detail) console.log(`    ${C.dim}${detail}${C.reset}`);
}
function logSection(title: string) { console.log(`\n${C.cyan}${C.bold}▸ ${title}${C.reset}`); }

// ─── Provisioning Functions ──────────────────────────────────────────────────

async function createTable(session: SLSession, table: UserTablePayload): Promise<boolean> {
    const label = `@${table.TableName}`;
    const { success, status, data } = await slPost(session, 'UserTablesMD', table);

    if (success) {
        logOk(`Table ${label} created`);
        return true;
    }

    if (status === 409) {
        logSkip(`Table ${label}`);
        return true; // Already exists — not a failure
    }

    logFail(`Table ${label} — HTTP ${status}`, JSON.stringify(data));
    return false;
}

async function createField(session: SLSession, field: UserFieldPayload): Promise<boolean> {
    const label = `${field.TableName}.U_${field.Name}`;
    const { success, status, data } = await slPost(session, 'UserFieldsMD', field);

    if (success) {
        logOk(`Field ${label} created`);
        return true;
    }

    if (status === 409) {
        logSkip(`Field ${label}`);
        return true;
    }

    logFail(`Field ${label} — HTTP ${status}`, JSON.stringify(data));
    return false;
}

async function provisionFields(session: SLSession, fields: UserFieldPayload[]): Promise<number> {
    let failures = 0;
    for (const field of fields) {
        const ok = await createField(session, field);
        if (!ok) failures++;
    }
    return failures;
}

// ─── Main ────────────────────────────────────────────────────────────────────

async function main() {
    console.log(`\n${C.bold}╔══════════════════════════════════════════════════════╗${C.reset}`);
    console.log(`${C.bold}║  GRPO Module – Schema Provisioning (Sprint 1.1)     ║${C.reset}`);
    console.log(`${C.bold}╚══════════════════════════════════════════════════════╝${C.reset}`);

    let session: SLSession | null = null;
    let totalFailures = 0;

    try {
        // ── Step 1: Authenticate ──
        logSection('Authenticating with SAP Service Layer');
        session = await createSession();
        logOk(`Session established: ${session.sessionId.substring(0, 8)}…`);

        // ── Step 2: Create UDTs ──
        logSection('Creating User-Defined Tables (UDTs)');

        const auditOk = await createTable(session, AUDIT_LOG_TABLE);
        const qcOk = await createTable(session, QC_RECORDS_TABLE);
        if (!auditOk || !qcOk) {
            totalFailures++;
            console.log(`\n${C.red}⚠ Table creation failed. Column provisioning may be incomplete.${C.reset}`);
        }

        // ── Step 3: Create Header UDFs (OPDN) ──
        logSection('Creating Header UDFs (OPDN)');
        totalFailures += await provisionFields(session, HEADER_UDFS);

        // ── Step 4: Create Line UDFs (PDN1) ──
        logSection('Creating Line UDFs (PDN1)');
        totalFailures += await provisionFields(session, LINE_UDFS);

        // ── Step 5: Create Audit Log Columns ──
        logSection('Creating Audit Log Columns (@GRPO_AUDIT_LOG)');
        totalFailures += await provisionFields(session, AUDIT_LOG_COLUMNS);

        // ── Step 6: Create QC Records Columns ──
        logSection('Creating QC Records Columns (@GRPO_QC_RECORDS)');
        totalFailures += await provisionFields(session, QC_RECORDS_COLUMNS);

        // ── Summary ──
        console.log(`\n${C.bold}────────────────────────────────────────────────────────${C.reset}`);
        if (totalFailures === 0) {
            console.log(`${C.green}${C.bold}✔ Schema provisioning complete. All objects ready.${C.reset}`);
        } else {
            console.log(`${C.red}${C.bold}⚠ Provisioning completed with ${totalFailures} failure(s).${C.reset}`);
        }

    } catch (error) {
        console.error(`\n${C.red}Fatal error:${C.reset}`, (error as Error).message);
        process.exit(1);
    } finally {
        if (session) {
            await destroySession(session);
            console.log(`${C.dim}Session destroyed.${C.reset}\n`);
        }
    }

    process.exit(totalFailures > 0 ? 1 : 0);
}

main();
