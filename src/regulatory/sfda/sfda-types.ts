/**
 * SFDA Types – Saudi-DI Payload Schemas
 *
 * Types for the SFDA (Saudi Food & Drug Authority) Saudi-DI
 * database reporting. Daily UDI/Batch data is aggregated and
 * transmitted in SFDA-mandated XML/CSV format.
 */

// ── Report Record ────────────────────────────────────────────────────────────

export interface SfdaReportRecord {
    /** UDI Device Identifier (GTIN) */
    udiDi: string;
    /** UDI Production Identifier (batch+expiry+serial composite) */
    udiPi: string | null;
    /** Batch/lot number */
    batchNo: string;
    /** Expiry date (ISO) */
    expiryDate: string | null;
    /** Quantity received */
    quantity: number;
    /** Warehouse code */
    warehouseCode: string;
    /** GRPO DocEntry in SAP */
    grpoDocEntry: number;
    /** GRPO DocNum in SAP */
    grpoDocNum: number;
    /** SFDA Submission ID linked to this product */
    sfdaSubId: string;
    /** Receipt date (ISO) */
    receiptDate: string;
    /** Vendor/supplier code */
    vendorCode: string;
    /** Item sterility classification */
    sterility: 'S' | 'N' | 'T';
}

// ── Export Payload ────────────────────────────────────────────────────────────

export interface SfdaExportPayload {
    /** Report header */
    header: {
        /** Report date (YYYY-MM-DD) */
        reportDate: string;
        /** Facility/company registration number */
        facilityId: string;
        /** Facility name */
        facilityName: string;
        /** Total record count */
        recordCount: number;
        /** Report generation timestamp */
        generatedAt: string;
        /** SHA-256 hash of all records (for integrity verification) */
        contentHash: string;
    };
    /** Individual report records */
    records: SfdaReportRecord[];
}

// ── Transmission Status ──────────────────────────────────────────────────────

export enum SfdaTransmissionStatus {
    Queued = 'QUEUED',
    Sent = 'SENT',
    Acknowledged = 'ACKNOWLEDGED',
    Rejected = 'REJECTED',
    Retry = 'RETRY',
}

export interface SfdaTransmissionRecord {
    /** Deterministic transmission ID (SHA-256 of date + facility + record hashes) */
    transmissionId: string;
    /** Report date this transmission covers */
    reportDate: string;
    /** Current transmission status */
    status: SfdaTransmissionStatus;
    /** Number of records in this batch */
    recordCount: number;
    /** Transmission attempt count */
    attempts: number;
    /** Last attempt timestamp */
    lastAttemptAt: string | null;
    /** SFDA acknowledgment reference (if acknowledged) */
    sfdaReference: string | null;
    /** Error message (if rejected or failed) */
    errorMessage: string | null;
    /** Created timestamp */
    createdAt: string;
}

// ── SFDA Configuration ───────────────────────────────────────────────────────

export interface SfdaConfig {
    /** SFDA Saudi-DI API endpoint */
    apiUrl: string;
    /** Facility registration ID */
    facilityId: string;
    /** Facility name */
    facilityName: string;
    /** API authentication token */
    apiToken: string;
    /** Export schedule (hour of day, 0-23) */
    scheduledHour: number;
    /** Maximum retry attempts for failed transmissions */
    maxRetries: number;
    /** Output format preference */
    format: 'xml' | 'csv' | 'both';
}

export const DEFAULT_SFDA_CONFIG: SfdaConfig = {
    apiUrl: 'https://saudi-di.sfda.gov.sa/api/v1/submissions',
    facilityId: '',
    facilityName: '',
    apiToken: '',
    scheduledHour: 23, // 11 PM local time
    maxRetries: 3,
    format: 'xml',
};
