/**
 * Queued Receipt – Local Cache Shape
 *
 * Represents a GRPO document stored in the local SQLite database.
 * Contains the scan data payload plus sync metadata.
 */

import { SyncStatus } from './sync-status';

/** Line item within a queued receipt */
export interface QueuedReceiptLine {
    itemCode: string;
    quantity: number;
    warehouseCode: string;
    baseEntry: number;
    baseLine: number;
    udiDi: string | null;
    udiPi: string | null;
    batchNo: string | null;
    expiry: string | null;        // ISO date string
    sterility: 'S' | 'N' | 'T';
    qcReq: 'Y' | 'N';
    isBatchManaged: boolean;
}

/** Full queued receipt with sync metadata */
export interface QueuedReceipt {
    /** Local UUID — primary key in SQLite */
    id: string;

    // ── Header Data ────────────────────────────────────────────────────────────
    cardCode: string;
    docDate: string;              // ISO date string
    taxDate: string | null;
    comments: string | null;
    sfdaSubId: string | null;
    receivedBy: string | null;
    qcStatus: 'P' | 'A' | 'R';

    // ── Lines ──────────────────────────────────────────────────────────────────
    /** JSON-serialized for SQLite storage */
    lines: QueuedReceiptLine[];

    // ── Sync Metadata ──────────────────────────────────────────────────────────
    status: SyncStatus;
    createdAt: string;            // ISO timestamp — when scan was captured
    updatedAt: string;            // ISO timestamp — last status change
    syncAttempts: number;         // Number of push attempts
    lastSyncAt: string | null;    // ISO timestamp — last attempt
    nextRetryAt: string | null;   // ISO timestamp — scheduled retry (for Retrying)

    // ── SAP Response (populated on success) ────────────────────────────────────
    sapDocEntry: number | null;
    sapDocNum: number | null;

    // ── Error (populated on failure) ───────────────────────────────────────────
    lastErrorCode: number | null;
    lastErrorMessage: string | null;
    errorSeverity: 'Fatal' | 'Retryable' | null;
}

/** Shape for creating a new receipt (before sync metadata is assigned) */
export type NewReceipt = Omit<QueuedReceipt,
    'id' | 'status' | 'createdAt' | 'updatedAt' | 'syncAttempts' |
    'lastSyncAt' | 'nextRetryAt' | 'sapDocEntry' | 'sapDocNum' |
    'lastErrorCode' | 'lastErrorMessage' | 'errorSeverity'
>;
