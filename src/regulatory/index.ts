/**
 * Regulatory Module – Public API Barrel Export
 *
 * The "Diplomatic Layer" — connecting GRPO to Saudi government platforms.
 */

// ── SABER ────────────────────────────────────────────────────────────────────
export {
    SaberCertificateStatus, SABER_STATUS_INFO,
    DEFAULT_SABER_CONFIG,
} from './saber/saber-types';
export type { SaberValidationResult, SaberConfig } from './saber/saber-types';

export { validateCertificate, clearSaberCache } from './saber/saber-client';

export { validateReceipt, validateSingleItem } from './saber/saber-gate';
export type { SaberGateResult, SaberItemResult } from './saber/saber-gate';

// ── SFDA ─────────────────────────────────────────────────────────────────────
export {
    SfdaTransmissionStatus,
    DEFAULT_SFDA_CONFIG,
} from './sfda/sfda-types';
export type {
    SfdaReportRecord, SfdaExportPayload,
    SfdaTransmissionRecord, SfdaConfig,
} from './sfda/sfda-types';

export {
    aggregateDailyRecords, buildExportPayload,
    formatAsXml, formatAsCsv,
} from './sfda/sfda-export';
export type { ReceiptDataSource } from './sfda/sfda-export';

export { generateTransmissionId, transmit, retryPending } from './sfda/sfda-transmitter';
export type { TransmissionStore } from './sfda/sfda-transmitter';

export { createSfdaScheduler } from './sfda/sfda-scheduler';
export type { SchedulerEvent } from './sfda/sfda-scheduler';

// ── Audit ────────────────────────────────────────────────────────────────────
export {
    AuditAction, AUDIT_ACTION_INFO,
    GENESIS_HASH_PREFIX,
    buildAuditPayload,
} from './audit/audit-types';
export type { AuditLogEntry, NewAuditEntry } from './audit/audit-types';

export { createAuditLogger, sha256, generateGenesisHash } from './audit/audit-logger';
export type { AuditChainStore } from './audit/audit-logger';

export { verifyChain, verifyEntry } from './audit/audit-verifier';
export type { ChainVerificationResult, SingleEntryVerification } from './audit/audit-verifier';
