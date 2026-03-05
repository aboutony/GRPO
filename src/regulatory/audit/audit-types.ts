/**
 * Audit Types – Log Entry Shapes for @GRPO_AUDIT_LOG
 *
 * Every auditable action generates an entry in the SHA-256 hash chain.
 * Maps to the @GRPO_AUDIT_LOG UDT provisioned in Sprint 1.1.
 */

// ── Audit Actions ────────────────────────────────────────────────────────────

export enum AuditAction {
    GRPO_POSTED = 'GRPO_POSTED',
    QC_INSPECTED = 'QC_INSPECTED',
    SABER_VALIDATED = 'SABER_VALIDATED',
    SFDA_EXPORTED = 'SFDA_EXPORTED',
    BATCH_LOCKED = 'BATCH_LOCKED',
    BATCH_RELEASED = 'BATCH_RELEASED',
    CONFLICT_RESOLVED = 'CONFLICT_RESOLVED',
}

export const AUDIT_ACTION_INFO: Record<AuditAction, {
    label: string;
    icon: string;
}> = {
    [AuditAction.GRPO_POSTED]: { label: 'GRPO Document Posted', icon: '📄' },
    [AuditAction.QC_INSPECTED]: { label: 'QC Inspection Completed', icon: '🔬' },
    [AuditAction.SABER_VALIDATED]: { label: 'SABER Certificate Validated', icon: '🛡️' },
    [AuditAction.SFDA_EXPORTED]: { label: 'SFDA Report Exported', icon: '📤' },
    [AuditAction.BATCH_LOCKED]: { label: 'Batch Locked (QC Hold)', icon: '🔒' },
    [AuditAction.BATCH_RELEASED]: { label: 'Batch Released (QA Cleared)', icon: '🔓' },
    [AuditAction.CONFLICT_RESOLVED]: { label: 'Sync Conflict Resolved', icon: '✅' },
};

// ── Audit Log Entry ──────────────────────────────────────────────────────────

export interface AuditLogEntry {
    /** Sequential entry ID */
    entryId: number;
    /** Action performed */
    action: AuditAction;
    /** Who performed the action (operator name / system) */
    actor: string;
    /** When the action was performed (ISO timestamp) */
    timestamp: string;
    /** Related document reference (DocEntry, receipt ID, etc.) */
    documentRef: string;
    /** Action-specific data payload (JSON) */
    data: Record<string, unknown>;

    // ── Hash Chain ─────────────────────────────────────────────────────────
    /** SHA-256 hash of the data payload */
    dataHash: string;
    /** Hash of the previous entry in the chain */
    previousHash: string;
    /** Chain integrity hash: SHA-256(previousHash + dataHash + timestamp) */
    chainHash: string;
}

/** Genesis hash seed = SHA-256 of the facility ID */
export const GENESIS_HASH_PREFIX = 'GRPO-GENESIS';

/** Shape for creating a new entry (before hashes are computed) */
export type NewAuditEntry = Omit<AuditLogEntry,
    'entryId' | 'dataHash' | 'previousHash' | 'chainHash'
>;

/**
 * Builds the @GRPO_AUDIT_LOG Service Layer payload.
 */
export function buildAuditPayload(entry: AuditLogEntry) {
    return {
        U_GRPO_EntryId: entry.entryId,
        U_GRPO_Action: entry.action,
        U_GRPO_Actor: entry.actor,
        U_GRPO_Timestamp: entry.timestamp,
        U_GRPO_DocRef: entry.documentRef,
        U_GRPO_DataHash: entry.dataHash,
        U_GRPO_PrevHash: entry.previousHash,
        U_GRPO_ChainHash: entry.chainHash,
    };
}
