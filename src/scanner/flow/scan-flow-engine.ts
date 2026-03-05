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
    /** PO Selection — scanner LOCKED until a PO is chosen (Sprint 2.2b) */
    PoSelection = 'PO_SELECTION',
    /** Waiting to start — PO selected, ready to scan */
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
    /** Active PO context — null = scanner locked (Sprint 2.2b) */
    activePO: {
        docEntry: number;
        docNum: number;
        cardCode: string;
        cardName: string;
    } | null;
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
    | { type: 'SELECT_PO'; po: NonNullable<FlowStateData['activePO']> }  // Sprint 2.2b: PO gatekeeper
    | { type: 'DESELECT_PO' }       // Sprint 2.2b: Return to PO selection
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
    state: FlowState.PoSelection,  // Sprint 2.2b: Start locked
    scanResult: null,
    putawayInfo: null,
    validationErrors: [],
    activePO: null,  // Sprint 2.2b: No PO = scanner locked
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

        // Sprint 2.2b: PO gatekeeper actions
        case 'SELECT_PO':
            return {
                ...INITIAL_STATE,
                state: FlowState.Idle,
                activePO: action.po,
            };

        case 'DESELECT_PO':
            return INITIAL_STATE;  // Back to PO_SELECTION, scanner locked

        case 'START_SCAN':
            // Sprint 2.2b: BLOCKED without active PO
            if (!current.activePO) return current;
            return {
                ...current,
                state: FlowState.Scanning,
                scanResult: null,
                putawayInfo: null,
                validationErrors: [],
                poMatch: null,
                qcRequired: false,
                qcEvidenceCaptured: false,
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
                state: FlowState.Idle,  // Sprint 2.2b: Return to Idle (PO still active)
                activePO: current.activePO,  // Keep the PO context
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
