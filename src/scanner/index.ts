/**
 * Scanner Module – Public API Barrel Export
 *
 * Single import point for the entire scanning subsystem.
 *
 * @example
 * import {
 *   parseGS1,
 *   validateScanResult,
 *   ScannerHUD,
 *   ScanResultCard,
 *   PutawayScreen,
 *   ManualEntryModal,
 *   createFlowEngine,
 *   FlowState,
 * } from '../scanner';
 */

// ── Parser ───────────────────────────────────────────────────────────────────
export { parseGS1 } from './parser/gs1-parser';
export { validateScanResult, validateGTINCheckDigit, looksLikeGS1 } from './parser/barcode-validator';
export { AI_REGISTRY, FIXED_LENGTH_AIS, AI_CODES_BY_LENGTH } from './parser/ai-codes';
export type { AIDefinition } from './parser/ai-codes';

// ── Models ───────────────────────────────────────────────────────────────────
export type { ScanResult, ParsedSegment } from './models/scan-result';
export { emptyScanResult } from './models/scan-result';

// ── Camera ───────────────────────────────────────────────────────────────────
export { ScannerHUD } from './camera/ScannerHUD';
export { BoundingBox } from './camera/BoundingBox';
export type { BoundingBoxCoords } from './camera/BoundingBox';
export { DEFAULT_CAMERA_CONFIG, WAREHOUSE_CAMERA_CONFIG } from './camera/camera-config';
export type { CameraConfig } from './camera/camera-config';

// ── Flow ─────────────────────────────────────────────────────────────────────
export { createFlowEngine, flowReducer, FlowState } from './flow/scan-flow-engine';
export type { FlowStateData, FlowAction, PutawayInfo } from './flow/scan-flow-engine';
export { ScanResultCard } from './flow/ScanResultCard';
export { PutawayScreen } from './flow/PutawayScreen';
export { ManualEntryModal } from './flow/ManualEntryModal';
export type { POLineSuggestion } from './flow/ManualEntryModal';

// ── PO-Driven Receipting (Sprint 2.2b) ───────────────────────────────────────
export { createPOSessionManager } from './po/po-session';
export type { POHeader, POLine, POSession, PODataSource, SessionReceiptLine } from './po/po-session';

export { matchScanToPO, validateQuantity } from './po/po-item-matcher';
export type { MatchResult, MismatchReason } from './po/po-item-matcher';

export { buildDraftGRPO, validateDraft } from './po/draft-grpo-builder';
export type { GrpoPayload, GrpoPayloadLine, DraftValidation } from './po/draft-grpo-builder';

export { POSelectionScreen } from './po/POSelectionScreen';
export { POLineStatus } from './po/POLineStatus';
