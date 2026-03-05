/**
 * Sync Status – State Machine for Receipt Lifecycle
 *
 * Every receipt transitions through these states:
 *   Draft → Pending → Syncing → Synced | Conflict | Retrying
 *
 * Color mapping for operator feedback:
 *   Synced   = Green
 *   Pending  = Yellow (pulsing)
 *   Syncing  = Yellow (animated)
 *   Retrying = Yellow (pulsing)
 *   Conflict = Red (badge count)
 *   Draft    = Gray
 */

export enum SyncStatus {
    /** Being composed, not yet committed to local store */
    Draft = 'DRAFT',
    /** Committed to local SQLite, awaiting sync */
    Pending = 'PENDING',
    /** Currently uploading to DI API adapter */
    Syncing = 'SYNCING',
    /** Confirmed in SAP — has DocEntry/DocNum */
    Synced = 'SYNCED',
    /** Fatal error from DI API — requires operator resolution */
    Conflict = 'CONFLICT',
    /** Transient error — will auto-retry with backoff */
    Retrying = 'RETRYING',
}

/** Color mapping for UI status indicators */
export const SYNC_STATUS_COLORS: Record<SyncStatus, string> = {
    [SyncStatus.Draft]: '#9CA3AF',    // Gray-400
    [SyncStatus.Pending]: '#F59E0B',  // Amber-500
    [SyncStatus.Syncing]: '#F59E0B',  // Amber-500
    [SyncStatus.Synced]: '#10B981',   // Emerald-500
    [SyncStatus.Conflict]: '#EF4444', // Red-500
    [SyncStatus.Retrying]: '#F59E0B', // Amber-500
};

/** Whether a status indicates the receipt needs attention */
export function needsAttention(status: SyncStatus): boolean {
    return status === SyncStatus.Conflict;
}

/** Whether a status indicates the receipt is in-flight */
export function isInFlight(status: SyncStatus): boolean {
    return status === SyncStatus.Syncing || status === SyncStatus.Retrying;
}

/** Whether a status indicates the receipt is terminal (no more transitions) */
export function isTerminal(status: SyncStatus): boolean {
    return status === SyncStatus.Synced;
}
