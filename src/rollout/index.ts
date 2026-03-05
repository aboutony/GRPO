/**
 * Rollout Module – Public API Barrel Export
 */

// ── Facilities ───────────────────────────────────────────────────────────────
export {
    FACILITIES,
    getFacilityByCode, getFacilitiesByProvince, getActiveFacilities,
    getAllWarehouseCodes, getTotalOperatorCount, getTotalDeviceCount,
} from './facilities/facility-registry';
export type { Facility, Province } from './facilities/facility-registry';

export { executeGlobalRecall } from './facilities/cross-warehouse';
export type {
    CrossWarehouseQuery, CrossWarehouseResult, FacilityRecallResult,
} from './facilities/cross-warehouse';

// ── Training ─────────────────────────────────────────────────────────────────
export { TRAINING_DRILLS, getDrillById, evaluateAttempt } from './training/training-module';
export type { TrainingDrill, DrillStep, DrillAttempt, DrillId } from './training/training-module';

export { createCertificationTracker } from './training/certification-tracker';
export type { OperatorCertification, CertificationSummary } from './training/certification-tracker';

// ── Hypercare ────────────────────────────────────────────────────────────────
export {
    createHypercareMonitor, DEFAULT_HYPERCARE_CONFIG,
} from './hypercare/hypercare-monitor';
export type {
    DailyHealthSnapshot, EscalationAlert, HypercareConfig,
} from './hypercare/hypercare-monitor';

export { createIncidentLog } from './hypercare/incident-log';
export type { Incident, IncidentSeverity, IncidentCategory } from './hypercare/incident-log';

// ── Compliance ───────────────────────────────────────────────────────────────
export {
    MONTHLY_AUDIT_STEPS,
    createHandoverChecklist, completeItem, signOff,
} from './compliance/compliance-handover';
export type { HandoverChecklist, MonthlyAuditProtocol } from './compliance/compliance-handover';
