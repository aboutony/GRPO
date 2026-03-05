/**
 * QC Module – Public API Barrel Export
 */

// ── Models ───────────────────────────────────────────────────────────────────
export {
    DefectCode, DEFECT_CODE_INFO,
    InspectionResult, INSPECTION_RESULT_INFO,
    buildQcRecordPayload,
} from './models/qc-types';
export type { QcInspectionRecord, NewInspection } from './models/qc-types';

export {
    InventoryStatus, INVENTORY_STATUS_INFO,
} from './models/recall-types';
export type { RecallQuery, RecallResult, WarehouseRecallResult } from './models/recall-types';

// ── Routing ──────────────────────────────────────────────────────────────────
export { routeForQc, countQcItems } from './routing/qc-router';
export type { QcPutawayInfo, QcWarehouseConfig } from './routing/qc-router';

export {
    SapBatchStatus,
    buildLockPayload, buildUnlockPayload,
    getQcHeaderFields, buildBatchStatusPatch,
} from './routing/inventory-lock';
export type { BatchLockPayload } from './routing/inventory-lock';

// ── Evidence ─────────────────────────────────────────────────────────────────
export { EvidenceCapture } from './evidence/EvidenceCapture';
export { DefectCodePicker } from './evidence/DefectCodePicker';

// ── Recall ───────────────────────────────────────────────────────────────────
export { executeRecallQuery } from './recall/recall-query';
export type { ServiceLayerClient } from './recall/recall-query';
