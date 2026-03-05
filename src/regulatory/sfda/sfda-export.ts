/**
 * SFDA Export Service – Daily UDI/Batch Data Aggregator & Formatter
 *
 * Aggregates all GRPO receipts for a given date, formats into
 * SFDA-mandated XML and CSV schemas, and produces the export payload.
 */

import type {
    SfdaReportRecord,
    SfdaExportPayload,
    SfdaConfig,
} from './sfda-types';

// ── Data Source Interface ────────────────────────────────────────────────────

export interface ReceiptDataSource {
    /** Retrieves all synced receipts for a given date (ISO YYYY-MM-DD) */
    getReceiptsByDate: (date: string) => Promise<Array<{
        sapDocEntry: number;
        sapDocNum: number;
        cardCode: string;
        docDate: string;
        sfdaSubId: string | null;
        lines: Array<{
            itemCode: string;
            udiDi: string | null;
            udiPi: string | null;
            batchNo: string | null;
            expiry: string | null;
            quantity: number;
            warehouseCode: string;
            sterility: 'S' | 'N' | 'T';
        }>;
    }>>;
}

// ── Aggregation ──────────────────────────────────────────────────────────────

/**
 * Aggregates all daily receipts into SFDA report records.
 */
export async function aggregateDailyRecords(
    dataSource: ReceiptDataSource,
    reportDate: string
): Promise<SfdaReportRecord[]> {
    const receipts = await dataSource.getReceiptsByDate(reportDate);
    const records: SfdaReportRecord[] = [];

    for (const receipt of receipts) {
        for (const line of receipt.lines) {
            // Skip lines without UDI-DI (non-regulated items)
            if (!line.udiDi) continue;

            records.push({
                udiDi: line.udiDi,
                udiPi: line.udiPi,
                batchNo: line.batchNo ?? '',
                expiryDate: line.expiry,
                quantity: line.quantity,
                warehouseCode: line.warehouseCode,
                grpoDocEntry: receipt.sapDocEntry,
                grpoDocNum: receipt.sapDocNum,
                sfdaSubId: receipt.sfdaSubId ?? '',
                receiptDate: receipt.docDate,
                vendorCode: receipt.cardCode,
                sterility: line.sterility,
            });
        }
    }

    return records;
}

// ── Payload Building ─────────────────────────────────────────────────────────

/**
 * Builds the complete SFDA export payload with integrity hash.
 */
export async function buildExportPayload(
    records: SfdaReportRecord[],
    reportDate: string,
    config: SfdaConfig
): Promise<SfdaExportPayload> {
    const contentHash = await hashRecords(records);

    return {
        header: {
            reportDate,
            facilityId: config.facilityId,
            facilityName: config.facilityName,
            recordCount: records.length,
            generatedAt: new Date().toISOString(),
            contentHash,
        },
        records,
    };
}

// ── XML Formatting ───────────────────────────────────────────────────────────

/**
 * Formats the export payload into SFDA-mandated XML schema.
 */
export function formatAsXml(payload: SfdaExportPayload): string {
    const { header, records } = payload;

    let xml = `<?xml version="1.0" encoding="UTF-8"?>\n`;
    xml += `<SaudiDIReport xmlns="urn:sfda:saudi-di:v1">\n`;
    xml += `  <Header>\n`;
    xml += `    <ReportDate>${escapeXml(header.reportDate)}</ReportDate>\n`;
    xml += `    <FacilityId>${escapeXml(header.facilityId)}</FacilityId>\n`;
    xml += `    <FacilityName>${escapeXml(header.facilityName)}</FacilityName>\n`;
    xml += `    <RecordCount>${header.recordCount}</RecordCount>\n`;
    xml += `    <GeneratedAt>${escapeXml(header.generatedAt)}</GeneratedAt>\n`;
    xml += `    <ContentHash>${escapeXml(header.contentHash)}</ContentHash>\n`;
    xml += `  </Header>\n`;
    xml += `  <Records>\n`;

    for (const r of records) {
        xml += `    <Record>\n`;
        xml += `      <UDI_DI>${escapeXml(r.udiDi)}</UDI_DI>\n`;
        xml += `      <UDI_PI>${escapeXml(r.udiPi ?? '')}</UDI_PI>\n`;
        xml += `      <BatchNumber>${escapeXml(r.batchNo)}</BatchNumber>\n`;
        xml += `      <ExpiryDate>${escapeXml(r.expiryDate ?? '')}</ExpiryDate>\n`;
        xml += `      <Quantity>${r.quantity}</Quantity>\n`;
        xml += `      <WarehouseCode>${escapeXml(r.warehouseCode)}</WarehouseCode>\n`;
        xml += `      <GRPODocEntry>${r.grpoDocEntry}</GRPODocEntry>\n`;
        xml += `      <GRPODocNum>${r.grpoDocNum}</GRPODocNum>\n`;
        xml += `      <SFDASubId>${escapeXml(r.sfdaSubId)}</SFDASubId>\n`;
        xml += `      <ReceiptDate>${escapeXml(r.receiptDate)}</ReceiptDate>\n`;
        xml += `      <VendorCode>${escapeXml(r.vendorCode)}</VendorCode>\n`;
        xml += `      <Sterility>${escapeXml(r.sterility)}</Sterility>\n`;
        xml += `    </Record>\n`;
    }

    xml += `  </Records>\n`;
    xml += `</SaudiDIReport>`;

    return xml;
}

// ── CSV Formatting ───────────────────────────────────────────────────────────

/**
 * Formats the export payload into CSV format.
 */
export function formatAsCsv(payload: SfdaExportPayload): string {
    const headers = [
        'UDI_DI', 'UDI_PI', 'BatchNumber', 'ExpiryDate', 'Quantity',
        'WarehouseCode', 'GRPODocEntry', 'GRPODocNum', 'SFDASubId',
        'ReceiptDate', 'VendorCode', 'Sterility',
    ];

    let csv = headers.join(',') + '\n';

    for (const r of payload.records) {
        csv += [
            escapeCsv(r.udiDi),
            escapeCsv(r.udiPi ?? ''),
            escapeCsv(r.batchNo),
            escapeCsv(r.expiryDate ?? ''),
            r.quantity,
            escapeCsv(r.warehouseCode),
            r.grpoDocEntry,
            r.grpoDocNum,
            escapeCsv(r.sfdaSubId),
            escapeCsv(r.receiptDate),
            escapeCsv(r.vendorCode),
            escapeCsv(r.sterility),
        ].join(',') + '\n';
    }

    return csv;
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function escapeXml(value: string): string {
    return value
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&apos;');
}

function escapeCsv(value: string): string {
    if (value.includes(',') || value.includes('"') || value.includes('\n')) {
        return `"${value.replace(/"/g, '""')}"`;
    }
    return value;
}

/**
 * SHA-256 hash of all records for integrity verification.
 */
async function hashRecords(records: SfdaReportRecord[]): Promise<string> {
    const content = JSON.stringify(records);
    const encoder = new TextEncoder();
    const data = encoder.encode(content);

    if (typeof crypto !== 'undefined' && crypto.subtle) {
        const hashBuffer = await crypto.subtle.digest('SHA-256', data);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    }

    // Fallback: simple deterministic hash for environments without crypto.subtle
    let hash = 0;
    for (let i = 0; i < content.length; i++) {
        const chr = content.charCodeAt(i);
        hash = ((hash << 5) - hash) + chr;
        hash |= 0;
    }
    return Math.abs(hash).toString(16).padStart(16, '0');
}
