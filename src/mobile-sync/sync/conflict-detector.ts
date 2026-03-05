/**
 * Conflict Detector – Maps DI API Errors to Human-Readable Conflicts
 *
 * Translates raw SAP error messages from the DI API adapter (Sprint 1.2)
 * into typed conflict records with operator guidance.
 *
 * This module bridges the gap between cryptic SAP error codes and
 * the warehouse operator's world — "The Storyteller."
 */

import { ConflictType, type ConflictRecord } from '../models/conflict-record';

/** Error classification result from the DI API adapter */
export interface SyncErrorResult {
    sapErrorCode: number | null;
    sapErrorMessage: string;
    errorSeverity: 'Fatal' | 'Retryable';
}

/**
 * Pattern-to-conflict mapping, ordered by specificity.
 * Each entry: [regex pattern, conflict type]
 */
const ERROR_PATTERNS: Array<[RegExp, ConflictType]> = [
    [/(PO|purchase\s+order)\s+(is\s+)?closed/i, ConflictType.PO_CLOSED],
    [/(already\s+been\s+)?fully\s+received/i, ConflictType.FULLY_RECEIVED],
    [/(invalid|malformed)\s+UDI/i, ConflictType.INVALID_UDI],
    [/batch\s+(is\s+)?mandatory/i, ConflictType.BATCH_MISSING],
    [/batch\s*.*\s*not\s+found/i, ConflictType.BATCH_NOT_FOUND],
    [/item\s*.*\s*(not\s+found|does\s+not\s+exist)/i, ConflictType.ITEM_NOT_FOUND],
    [/(quantity|qty)\s*(exceeds|greater\s+than|over)/i, ConflictType.QTY_EXCEEDED],
    [/(vendor|business\s+partner|BP)\s*(is\s+)?(inactive|frozen)/i, ConflictType.VENDOR_INACTIVE],
    [/warehouse\s*.*\s*(not\s+found|does\s+not\s+exist)/i, ConflictType.WAREHOUSE_NOT_FOUND],
    [/document\s*(has\s+been\s+)?cancel/i, ConflictType.DOCUMENT_CANCELLED],
];

/**
 * Detects the conflict type from a DI API error result.
 *
 * @param error - The error result from the sync attempt
 * @param receiptId - The local receipt ID this error belongs to
 * @returns A ConflictRecord ready for local persistence
 */
export function detectConflict(
    error: SyncErrorResult,
    receiptId: string
): ConflictRecord {
    const conflictType = classifyError(error.sapErrorMessage);

    return {
        receiptId,
        conflictType,
        sapErrorCode: error.sapErrorCode,
        sapErrorMessage: error.sapErrorMessage,
        detectedAt: new Date().toISOString(),
        acknowledged: false,
        operatorNotes: null,
    };
}

/**
 * Classifies a SAP error message into a ConflictType.
 * Returns UNKNOWN if no pattern matches.
 */
export function classifyError(errorMessage: string): ConflictType {
    if (!errorMessage) return ConflictType.UNKNOWN;

    for (const [pattern, type] of ERROR_PATTERNS) {
        if (pattern.test(errorMessage)) {
            return type;
        }
    }

    return ConflictType.UNKNOWN;
}

/**
 * Determines if an error is a genuine Fatal conflict (vs Retryable transient).
 * Only Fatal errors create conflict records — Retryable errors are auto-retried.
 */
export function isFatalConflict(error: SyncErrorResult): boolean {
    return error.errorSeverity === 'Fatal';
}
