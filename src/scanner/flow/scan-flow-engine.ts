/**
 * Scan Flow Engine – State Machine
 *
 * Manages the <10s story-mode flow:
 *   IDLE → SCANNING → PARSED → VALIDATING → CONFIRMED → PUTAWAY
 *    ↑                   ↓                        ↓
 *    └── MANUAL_ENTRY ──┘                   [back to SCANNING]
 *
 * Each state has defined transitions and associated data.
 */

import type { ScanResult } from '../models/scan-result';

// ── Flow States ──────────────────────────────────────────────────────────────

export enum FlowState {
    /** Waiting to start — initial state */
    Idle = 'IDLE',
    /** Camera active, waiting for barcode detection */
    Scanning = 'SCANNING',
    /** Barcode detected and parsed, fields populated */
    Parsed = 'PARSED',
    /** Validating against PO line match */
    Validating = 'VALIDATING',
    /** Operator confirmed — committing to local store */
    Confirmed = 'CONFIRMED',
    /** Showing putaway bin assignment */
    Putaway = 'PUTAWAY',
    /** QC inspection evidence capture (Sprint 2.3) */
    QcInspection = 'QC_INSPECTION',
    /** Manual entry mode for damaged barcodes */
    ManualEntry = 'MANUAL_ENTRY',
}

// ── Putaway Info ─────────────────────────────────────────────────────────────

export interface PutawayInfo {
    /** Target bin code (e.g., "BIN-A03-R02") */
    binCode: string;
    /** Warehouse zone */
    zone: string;
    /** Aisle number */
    aisle: string;
    /** Rack number */
    rack: string;
    /** Shelf level */
    level: string;
    /** Storage conditions note */
    storageNote: string | null;
}

// ── Flow State Data ──────────────────────────────────────────────────────────

export interface FlowStateData {
    state: FlowState;
    scanResult: ScanResult | null;
    putawayInfo: PutawayInfo | null;
    validationErrors: string[];
    /** PO line match results */
    poMatch: {
        poEntry: number;
        poLine: number;
        itemCode: string;
        openQty: number;
    } | null;
    /** Whether the current item requires QC inspection (Sprint 2.3) */
    qcRequired: boolean;
    /** Whether QC evidence has been captured */
    qcEvidenceCaptured: boolean;
}

// ── Flow Actions ─────────────────────────────────────────────────────────────

export type FlowAction =
    | { type: 'START_SCAN' }
    | { type: 'BARCODE_DETECTED'; result: ScanResult }
    | { type: 'MANUAL_SUBMIT'; result: ScanResult }
    | { type: 'ENTER_MANUAL' }
    | { type: 'EXIT_MANUAL' }
    | { type: 'VALIDATE_SUCCESS'; poMatch: FlowStateData['poMatch'] }
    | { type: 'VALIDATE_FAIL'; errors: string[] }
    | { type: 'CONFIRM'; putawayInfo: PutawayInfo; qcRequired?: boolean }
    | { type: 'PUTAWAY_DONE' }
    | { type: 'QC_EVIDENCE' }       // Sprint 2.3: Transition to QC evidence capture
    | { type: 'QC_COMPLETE' }       // Sprint 2.3: QC evidence captured, return to putaway
    | { type: 'RESET' };

// ── State Machine Reducer ────────────────────────────────────────────────────

const INITIAL_STATE: FlowStateData = {
    state: FlowState.Idle,
    scanResult: null,
    putawayInfo: null,
    validationErrors: [],
    poMatch: null,
    qcRequired: false,
    qcEvidenceCaptured: false,
};

/**
 * Pure state machine reducer for the scan flow.
 * Follows strict state → action → new state transitions.
 */
export function flowReducer(current: FlowStateData, action: FlowAction): FlowStateData {
    switch (action.type) {

        case 'START_SCAN':
            return {
                ...INITIAL_STATE,
                state: FlowState.Scanning,
            };

        case 'BARCODE_DETECTED':
            if (current.state !== FlowState.Scanning) return current;
            return {
                ...current,
                state: FlowState.Parsed,
                scanResult: action.result,
                validationErrors: [],
            };

        case 'ENTER_MANUAL':
            return {
                ...current,
                state: FlowState.ManualEntry,
            };

        case 'EXIT_MANUAL':
            return {
                ...current,
                state: FlowState.Scanning,
            };

        case 'MANUAL_SUBMIT':
            return {
                ...current,
                state: FlowState.Parsed,
                scanResult: action.result,
                validationErrors: [],
            };

        case 'VALIDATE_SUCCESS':
            if (current.state !== FlowState.Parsed) return current;
            return {
                ...current,
                state: FlowState.Validating,
                poMatch: action.poMatch,
            };

        case 'VALIDATE_FAIL':
            return {
                ...current,
                state: FlowState.Parsed,
                validationErrors: action.errors,
            };

        case 'CONFIRM':
            if (current.state !== FlowState.Validating && current.state !== FlowState.Parsed) {
                return current;
            }
            return {
                ...current,
                state: FlowState.Confirmed,
                putawayInfo: action.putawayInfo,
                qcRequired: action.qcRequired ?? false,
            };

        // Sprint 2.3: QC evidence capture flow
        case 'QC_EVIDENCE':
            if (current.state !== FlowState.Putaway) return current;
            return {
                ...current,
                state: FlowState.QcInspection,
            };

        case 'QC_COMPLETE':
            if (current.state !== FlowState.QcInspection) return current;
            return {
                ...current,
                state: FlowState.Putaway,
                qcEvidenceCaptured: true,
            };

        case 'PUTAWAY_DONE':
            return {
                ...INITIAL_STATE,
                state: FlowState.Scanning,
            };

        case 'RESET':
            return INITIAL_STATE;

        default:
            return current;
    }
}

/**
 * Creates a flow engine instance with dispatch and subscribe.
 */
export function createFlowEngine() {
    let state = INITIAL_STATE;
    const listeners: Array<(state: FlowStateData) => void> = [];

    return {
        getState: () => state,

        dispatch(action: FlowAction) {
            state = flowReducer(state, action);
            for (const listener of listeners) {
                try { listener(state); } catch { /* observer safety */ }
            }
        },

        subscribe(listener: (state: FlowStateData) => void) {
            listeners.push(listener);
            return () => {
                const idx = listeners.indexOf(listener);
                if (idx >= 0) listeners.splice(idx, 1);
            };
        },
    };
}
