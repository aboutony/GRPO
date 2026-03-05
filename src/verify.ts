/**
 * GRPO Schema – Dry-Run Verification
 *
 * Validates all provisioning payloads WITHOUT calling SAP Service Layer.
 * Checks required fields, enum validity, size constraints, and prints
 * a formatted summary table.
 *
 * Usage: npx ts-node src/verify.ts
 */

import { HEADER_UDFS } from './schemas/header-udf';
import { LINE_UDFS } from './schemas/line-udf';
import { AUDIT_LOG_TABLE, AUDIT_LOG_COLUMNS } from './schemas/audit-udt';
import { QC_RECORDS_TABLE, QC_RECORDS_COLUMNS } from './schemas/qc-udt';
import type { UserFieldPayload, UserTablePayload } from './types/grpo-schema';

// ─── Console Output Helpers ──────────────────────────────────────────────────

const C = {
    reset: '\x1b[0m',
    green: '\x1b[32m',
    red: '\x1b[31m',
    cyan: '\x1b[36m',
    dim: '\x1b[2m',
    bold: '\x1b[1m',
    yellow: '\x1b[33m',
};

// ─── Validation Logic ────────────────────────────────────────────────────────

interface ValidationResult {
    field: string;
    table: string;
    type: string;
    size: string;
    validValues: string;
    errors: string[];
}

const VALID_FIELD_TYPES = ['db_Alpha', 'db_Numeric', 'db_Date', 'db_Float', 'db_Memo'];
const VALID_TABLE_TYPES = [
    'bott_NoObject', 'bott_MasterData', 'bott_MasterDataLines',
    'bott_Document', 'bott_DocumentLines',
];

function validateField(field: UserFieldPayload): ValidationResult {
    const errors: string[] = [];

    // Required properties
    if (!field.Name || field.Name.trim() === '') errors.push('Name is empty');
    if (!field.TableName || field.TableName.trim() === '') errors.push('TableName is empty');
    if (!field.Type) errors.push('Type is missing');
    if (!field.Description || field.Description.trim() === '') errors.push('Description is empty');

    // Type validity
    if (field.Type && !VALID_FIELD_TYPES.includes(field.Type)) {
        errors.push(`Invalid Type: "${field.Type}" — must be one of: ${VALID_FIELD_TYPES.join(', ')}`);
    }

    // Size constraints for alpha & numeric
    if ((field.Type === 'db_Alpha' || field.Type === 'db_Numeric') && !field.EditSize) {
        errors.push(`EditSize required for type ${field.Type}`);
    }
    if (field.EditSize && field.EditSize > 254) {
        errors.push(`EditSize ${field.EditSize} exceeds SAP maximum of 254`);
    }

    // ValidValuesMD validation
    if (field.ValidValuesMD) {
        for (const vv of field.ValidValuesMD) {
            if (!vv.Value || vv.Value.trim() === '') errors.push('ValidValue has empty Value');
            if (!vv.Description || vv.Description.trim() === '') errors.push(`ValidValue "${vv.Value}" has empty Description`);
        }
    }

    // DefaultValue must be in ValidValuesMD if both are set
    if (field.DefaultValue && field.ValidValuesMD) {
        const validVals = field.ValidValuesMD.map(v => v.Value);
        if (!validVals.includes(field.DefaultValue)) {
            errors.push(`DefaultValue "${field.DefaultValue}" not found in ValidValuesMD: [${validVals.join(', ')}]`);
        }
    }

    // U_GRPO_ prefix convention
    if (!field.Name.startsWith('GRPO_')) {
        errors.push(`Name "${field.Name}" does not follow GRPO_ prefix convention`);
    }

    return {
        field: `U_${field.Name}`,
        table: field.TableName,
        type: field.Type,
        size: field.EditSize ? String(field.EditSize) : '—',
        validValues: field.ValidValuesMD ? field.ValidValuesMD.map(v => v.Value).join('/') : '—',
        errors,
    };
}

function validateTable(table: UserTablePayload): string[] {
    const errors: string[] = [];
    if (!table.TableName || table.TableName.trim() === '') errors.push('TableName is empty');
    if (!table.TableDescription || table.TableDescription.trim() === '') errors.push('TableDescription is empty');
    if (!VALID_TABLE_TYPES.includes(table.TableType)) {
        errors.push(`Invalid TableType: "${table.TableType}"`);
    }
    if (!table.TableName.startsWith('GRPO_')) {
        errors.push(`TableName "${table.TableName}" does not follow GRPO_ prefix convention`);
    }
    return errors;
}

// ─── Main ────────────────────────────────────────────────────────────────────

function main() {
    console.log(`\n${C.bold}╔══════════════════════════════════════════════════════╗${C.reset}`);
    console.log(`${C.bold}║  GRPO Module – Dry-Run Schema Verification          ║${C.reset}`);
    console.log(`${C.bold}╚══════════════════════════════════════════════════════╝${C.reset}`);

    let totalErrors = 0;

    // ── Validate Tables ──
    console.log(`\n${C.cyan}${C.bold}▸ User-Defined Tables (UDTs)${C.reset}\n`);

    for (const table of [AUDIT_LOG_TABLE, QC_RECORDS_TABLE]) {
        const errors = validateTable(table);
        if (errors.length > 0) {
            console.log(`  ${C.red}✘${C.reset} @${table.TableName}: ${table.TableDescription}`);
            errors.forEach(e => console.log(`    ${C.dim}→ ${e}${C.reset}`));
            totalErrors += errors.length;
        } else {
            console.log(`  ${C.green}✔${C.reset} @${table.TableName} → ${table.TableType} — ${table.TableDescription}`);
        }
    }

    // ── Validate Fields ──
    const fieldGroups: { label: string; fields: UserFieldPayload[] }[] = [
        { label: 'Header UDFs (OPDN)', fields: HEADER_UDFS },
        { label: 'Line UDFs (PDN1)', fields: LINE_UDFS },
        { label: 'Audit Log Columns (@GRPO_AUDIT_LOG)', fields: AUDIT_LOG_COLUMNS },
        { label: 'QC Records Columns (@GRPO_QC_RECORDS)', fields: QC_RECORDS_COLUMNS },
    ];

    const allResults: ValidationResult[] = [];

    for (const group of fieldGroups) {
        console.log(`\n${C.cyan}${C.bold}▸ ${group.label}${C.reset}\n`);

        for (const field of group.fields) {
            const result = validateField(field);
            allResults.push(result);

            if (result.errors.length > 0) {
                console.log(`  ${C.red}✘${C.reset} ${result.table}.${result.field} [${result.type}(${result.size})]`);
                result.errors.forEach(e => console.log(`    ${C.dim}→ ${e}${C.reset}`));
                totalErrors += result.errors.length;
            } else {
                const vals = result.validValues !== '—' ? ` {${result.validValues}}` : '';
                console.log(`  ${C.green}✔${C.reset} ${result.table}.${result.field} [${result.type}(${result.size})]${vals}`);
            }
        }
    }

    // ── Summary Table ──
    console.log(`\n${C.bold}────────────────────────────────────────────────────────${C.reset}`);
    console.log(`${C.bold}  Summary${C.reset}\n`);

    const pad = (s: string, n: number) => s.padEnd(n);

    console.log(`  ${C.dim}${pad('Table', 22)} ${pad('Field', 22)} ${pad('Type', 14)} ${pad('Size', 6)} ${pad('Values', 10)}${C.reset}`);
    console.log(`  ${C.dim}${'─'.repeat(22)} ${'─'.repeat(22)} ${'─'.repeat(14)} ${'─'.repeat(6)} ${'─'.repeat(10)}${C.reset}`);

    for (const r of allResults) {
        const status = r.errors.length > 0 ? `${C.red}✘` : `${C.green}✔`;
        console.log(`  ${status}${C.reset} ${pad(r.table, 21)} ${pad(r.field, 22)} ${pad(r.type, 14)} ${pad(r.size, 6)} ${r.validValues}`);
    }

    // ── Final Verdict ──
    const totalFields = allResults.length;
    const totalTables = 2;
    const totalPayloads = totalFields + totalTables;

    console.log(`\n${C.bold}────────────────────────────────────────────────────────${C.reset}`);
    if (totalErrors === 0) {
        console.log(`  ${C.green}${C.bold}✔ All ${totalPayloads} payloads validated successfully (${totalTables} tables + ${totalFields} fields).${C.reset}`);
        console.log(`  ${C.dim}Ready for live provisioning: npx ts-node src/provision.ts${C.reset}\n`);
    } else {
        console.log(`  ${C.red}${C.bold}✘ ${totalErrors} validation error(s) found across ${totalPayloads} payloads.${C.reset}`);
        console.log(`  ${C.dim}Fix errors above before running the provisioning script.${C.reset}\n`);
    }

    process.exit(totalErrors > 0 ? 1 : 0);
}

main();
