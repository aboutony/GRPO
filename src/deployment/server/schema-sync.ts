/**
 * Schema Sync – SAP B1 Production DB Migration
 *
 * Compares local schema version against SAP B1 Production,
 * applies UDF/UDT migrations from Sprint 1.1 (idempotent),
 * and generates a verification report.
 */

// ── Schema Definitions (from Sprint 1.1) ─────────────────────────────────────

export interface SchemaField {
    tableName: string;
    fieldName: string;
    fieldType: 'db_Alpha' | 'db_Date' | 'db_Numeric';
    size: number;
    description: string;
}

export interface SchemaTable {
    tableName: string;
    tableDescription: string;
    tableType: 'bott_NoObject' | 'bott_Document';
}

/** All UDTs provisioned in Sprint 1.1 */
export const REQUIRED_TABLES: SchemaTable[] = [
    { tableName: 'GRPO_AUDIT_LOG', tableDescription: 'GRPO Audit Log', tableType: 'bott_NoObject' },
    { tableName: 'GRPO_QC_RECORDS', tableDescription: 'GRPO QC Records', tableType: 'bott_NoObject' },
];

/** All UDFs provisioned in Sprint 1.1 */
export const REQUIRED_FIELDS: SchemaField[] = [
    // Header (OPDN)
    { tableName: 'OPDN', fieldName: 'U_GRPO_SfdaSubId', fieldType: 'db_Alpha', size: 30, description: 'SFDA Submission ID' },
    { tableName: 'OPDN', fieldName: 'U_GRPO_ReceivedBy', fieldType: 'db_Alpha', size: 50, description: 'Received By Operator' },
    { tableName: 'OPDN', fieldName: 'U_GRPO_QcStatus', fieldType: 'db_Alpha', size: 1, description: 'QC Status (P/A/R)' },
    // Lines (PDN1)
    { tableName: 'PDN1', fieldName: 'U_GRPO_UdiDi', fieldType: 'db_Alpha', size: 50, description: 'UDI Device Identifier' },
    { tableName: 'PDN1', fieldName: 'U_GRPO_UdiPi', fieldType: 'db_Alpha', size: 50, description: 'UDI Production Identifier' },
    { tableName: 'PDN1', fieldName: 'U_GRPO_BatchNo', fieldType: 'db_Alpha', size: 30, description: 'Batch/Lot Number' },
    { tableName: 'PDN1', fieldName: 'U_GRPO_Expiry', fieldType: 'db_Date', size: 0, description: 'Expiry Date' },
    { tableName: 'PDN1', fieldName: 'U_GRPO_Sterility', fieldType: 'db_Alpha', size: 1, description: 'Sterility (S/N/T)' },
    { tableName: 'PDN1', fieldName: 'U_GRPO_QcReq', fieldType: 'db_Alpha', size: 1, description: 'QC Required (Y/N)' },
];

// ── Sync Report ──────────────────────────────────────────────────────────────

export interface SyncFieldResult {
    tableName: string;
    fieldName: string;
    exists: boolean;
    typeMatch: boolean;
    sizeMatch: boolean;
    action: 'ok' | 'created' | 'mismatch' | 'error';
    error?: string;
}

export interface SchemaSyncReport {
    timestamp: string;
    environment: string;
    companyDb: string;
    tablesChecked: number;
    tablesCreated: number;
    fieldsChecked: number;
    fieldsCreated: number;
    mismatches: number;
    errors: number;
    allPassed: boolean;
    tables: Array<{ name: string; exists: boolean; action: string }>;
    fields: SyncFieldResult[];
    durationMs: number;
}

// ── Service Layer Client Interface ───────────────────────────────────────────

export interface SchemaClient {
    checkTableExists(tableName: string): Promise<boolean>;
    createTable(table: SchemaTable): Promise<void>;
    checkFieldExists(tableName: string, fieldName: string): Promise<{
        exists: boolean;
        type?: string;
        size?: number;
    }>;
    createField(field: SchemaField): Promise<void>;
}

// ── Sync Execution ───────────────────────────────────────────────────────────

/**
 * Syncs the GRPO schema to the target SAP B1 database.
 * All operations are idempotent (IF NOT EXISTS semantics).
 */
export async function syncSchema(
    client: SchemaClient,
    environment: string,
    companyDb: string
): Promise<SchemaSyncReport> {
    const start = performance.now();
    const report: SchemaSyncReport = {
        timestamp: new Date().toISOString(),
        environment,
        companyDb,
        tablesChecked: REQUIRED_TABLES.length,
        tablesCreated: 0,
        fieldsChecked: REQUIRED_FIELDS.length,
        fieldsCreated: 0,
        mismatches: 0,
        errors: 0,
        allPassed: true,
        tables: [],
        fields: [],
        durationMs: 0,
    };

    // ── Sync UDTs ──────────────────────────────────────────────────────────
    for (const table of REQUIRED_TABLES) {
        try {
            const exists = await client.checkTableExists(table.tableName);
            if (!exists) {
                await client.createTable(table);
                report.tablesCreated++;
                report.tables.push({ name: table.tableName, exists: false, action: 'created' });
            } else {
                report.tables.push({ name: table.tableName, exists: true, action: 'ok' });
            }
        } catch (error) {
            report.errors++;
            report.allPassed = false;
            report.tables.push({
                name: table.tableName,
                exists: false,
                action: `error: ${error instanceof Error ? error.message : String(error)}`,
            });
        }
    }

    // ── Sync UDFs ──────────────────────────────────────────────────────────
    for (const field of REQUIRED_FIELDS) {
        try {
            const check = await client.checkFieldExists(field.tableName, field.fieldName);
            if (!check.exists) {
                await client.createField(field);
                report.fieldsCreated++;
                report.fields.push({
                    tableName: field.tableName,
                    fieldName: field.fieldName,
                    exists: false,
                    typeMatch: true,
                    sizeMatch: true,
                    action: 'created',
                });
            } else {
                const typeMatch = check.type === field.fieldType;
                const sizeMatch = field.fieldType === 'db_Date' || check.size === field.size;
                if (!typeMatch || !sizeMatch) {
                    report.mismatches++;
                    report.allPassed = false;
                }
                report.fields.push({
                    tableName: field.tableName,
                    fieldName: field.fieldName,
                    exists: true,
                    typeMatch,
                    sizeMatch,
                    action: typeMatch && sizeMatch ? 'ok' : 'mismatch',
                });
            }
        } catch (error) {
            report.errors++;
            report.allPassed = false;
            report.fields.push({
                tableName: field.tableName,
                fieldName: field.fieldName,
                exists: false,
                typeMatch: false,
                sizeMatch: false,
                action: 'error',
                error: error instanceof Error ? error.message : String(error),
            });
        }
    }

    report.durationMs = Math.round(performance.now() - start);
    return report;
}
