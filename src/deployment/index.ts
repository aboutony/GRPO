/**
 * Deployment Module – Public API Barrel Export
 */

// ── Server ───────────────────────────────────────────────────────────────────
export {
    DeployEnvironment,
    RIYADH_PRODUCTION,
    getEnvVars, validateConfig,
} from './server/deploy-config';
export type { ServerConfig } from './server/deploy-config';

export {
    REQUIRED_TABLES, REQUIRED_FIELDS, syncSchema,
} from './server/schema-sync';
export type { SchemaSyncReport, SchemaClient } from './server/schema-sync';

// ── Mobile ───────────────────────────────────────────────────────────────────
export {
    PILOT_FLEET,
    getActiveDevices, getDevicesByZone, getDeviceById,
    getAssignedOperators, generateHealthCheck,
} from './mobile/device-fleet';
export type { PilotDevice, DeviceHealthCheck } from './mobile/device-fleet';

export {
    PILOT_SCANNERS, DEFAULT_SCANNER_SETTINGS,
    getScannerById, getPairedScanners,
} from './mobile/scanner-config';
export type { ScannerProfile, ScannerSettings } from './mobile/scanner-config';

// ── UAT ──────────────────────────────────────────────────────────────────────
export {
    createUatTestSuite, getMustHaveStories, calculatePassRate,
} from './uat/uat-test-suite';
export type { UserStory, TestResult } from './uat/uat-test-suite';

export { createUatRunner } from './uat/uat-runner';
export type { UatReport, UatEvent } from './uat/uat-runner';

export { executeRecallDrill } from './uat/recall-drill';
export type { RecallDrillConfig, DrillResult, ComplianceReport } from './uat/recall-drill';

// ── Monitoring ───────────────────────────────────────────────────────────────
export {
    createPerformanceMonitor, PILOT_THRESHOLDS,
} from './monitoring/performance-monitor';
export type { PerformanceSnapshot, PerformanceAlert } from './monitoring/performance-monitor';

export { createAdoptionTracker } from './monitoring/adoption-tracker';
export type { AdoptionReport, DailyAdoptionSummary } from './monitoring/adoption-tracker';
