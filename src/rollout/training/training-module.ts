/**
 * Training Module – Immersive Flow Certification Drills
 *
 * 5 guided drills for warehouse supervisors and operators.
 * Each drill simulates a real workflow with timed checkpoints.
 */

// ── Types ────────────────────────────────────────────────────────────────────

export type DrillId = 'SINGLE_SCAN' | 'QC_HOLD' | 'OFFLINE_SYNC' | 'RECALL' | 'SABER_CHECK';
export type DrillDifficulty = 'beginner' | 'intermediate' | 'advanced';

export interface TrainingDrill {
    id: DrillId;
    title: string;
    description: string;
    difficulty: DrillDifficulty;
    targetTimeSeconds: number;
    passingCriteria: string[];
    steps: DrillStep[];
    icon: string;
}

export interface DrillStep {
    stepNum: number;
    instruction: string;
    expectedAction: string;
    hintText: string;
    hapticCheckpoint: boolean;
    maxTimeSeconds: number;
}

export interface DrillAttempt {
    drillId: DrillId;
    operatorId: string;
    startedAt: string;
    completedAt: string | null;
    totalTimeSeconds: number;
    stepResults: Array<{
        stepNum: number;
        completed: boolean;
        timeSeconds: number;
        withinTarget: boolean;
    }>;
    passed: boolean;
    attemptNumber: number;
}

// ── Drill Library ────────────────────────────────────────────────────────────

export const TRAINING_DRILLS: TrainingDrill[] = [
    {
        id: 'SINGLE_SCAN',
        title: 'Scan-to-Putaway Sprint',
        description: 'Complete a full single-scan receive in under 10 seconds. This is the core certification requirement.',
        difficulty: 'beginner',
        targetTimeSeconds: 10,
        passingCriteria: ['Complete in < 10 seconds', 'All 4 GS1 fields extracted', 'Correct bin assigned'],
        icon: '📷',
        steps: [
            { stepNum: 1, instruction: 'Aim scanner at the barcode label on the carton.', expectedAction: 'Trigger scan', hintText: 'Hold device 15-20cm from the label', hapticCheckpoint: true, maxTimeSeconds: 3 },
            { stepNum: 2, instruction: 'Verify all 4 fields auto-populated: GTIN, Batch, Expiry, Serial.', expectedAction: 'Confirm fields', hintText: 'Tap the green checkmark if all correct', hapticCheckpoint: false, maxTimeSeconds: 2 },
            { stepNum: 3, instruction: 'Read the putaway bin assignment and walk to the location.', expectedAction: 'Acknowledge putaway', hintText: 'Zone-Aisle-Rack-Level', hapticCheckpoint: true, maxTimeSeconds: 3 },
            { stepNum: 4, instruction: 'Confirm item placed in correct bin.', expectedAction: 'Tap Confirm', hintText: 'Item should be placed label-forward', hapticCheckpoint: true, maxTimeSeconds: 2 },
        ],
    },
    {
        id: 'QC_HOLD',
        title: 'QC Safety Gate',
        description: 'Handle a QC-required item: quarantine routing, evidence capture, and batch locking.',
        difficulty: 'intermediate',
        targetTimeSeconds: 60,
        passingCriteria: ['Yellow QC Hold identified', 'Photo captured', 'Defect code selected', 'Batch locked confirmed'],
        icon: '🔬',
        steps: [
            { stepNum: 1, instruction: 'Scan the QC-required item barcode.', expectedAction: 'Trigger scan', hintText: 'Screen should turn Yellow', hapticCheckpoint: true, maxTimeSeconds: 5 },
            { stepNum: 2, instruction: 'Verify quarantine bin assignment (QC-XX-HOLD).', expectedAction: 'Read bin', hintText: 'Do NOT put in active bins', hapticCheckpoint: false, maxTimeSeconds: 5 },
            { stepNum: 3, instruction: 'Tap "Capture Evidence" and take a photo of the packaging.', expectedAction: 'Open camera, take photo', hintText: 'Include the label in the photo', hapticCheckpoint: true, maxTimeSeconds: 20 },
            { stepNum: 4, instruction: 'Select the appropriate defect code (or "No Defect" if intact).', expectedAction: 'Pick defect code', hintText: 'Multiple codes can be selected', hapticCheckpoint: false, maxTimeSeconds: 10 },
            { stepNum: 5, instruction: 'Submit the inspection record and confirm batch is locked.', expectedAction: 'Tap Submit', hintText: 'You should see the 🔒 icon', hapticCheckpoint: true, maxTimeSeconds: 10 },
        ],
    },
    {
        id: 'OFFLINE_SYNC',
        title: 'Offline Resilience',
        description: 'Scan items while offline, then verify automatic sync on reconnection.',
        difficulty: 'intermediate',
        targetTimeSeconds: 30,
        passingCriteria: ['Scan succeeds offline', 'Offline indicator visible', 'Auto-sync on reconnect', 'Sync < 5 seconds'],
        icon: '📡',
        steps: [
            { stepNum: 1, instruction: 'Enable Airplane Mode on the device.', expectedAction: 'Toggle airplane mode', hintText: 'The offline indicator should appear', hapticCheckpoint: false, maxTimeSeconds: 5 },
            { stepNum: 2, instruction: 'Scan a barcode — it should succeed locally.', expectedAction: 'Trigger scan', hintText: 'Data is saved to local SQLite', hapticCheckpoint: true, maxTimeSeconds: 5 },
            { stepNum: 3, instruction: 'Disable Airplane Mode to restore connectivity.', expectedAction: 'Toggle airplane mode off', hintText: 'Watch for the sync indicator', hapticCheckpoint: false, maxTimeSeconds: 5 },
            { stepNum: 4, instruction: 'Verify the receipt syncs automatically within 5 seconds.', expectedAction: 'Observe sync', hintText: 'Status should change from PENDING to SYNCED', hapticCheckpoint: true, maxTimeSeconds: 10 },
        ],
    },
    {
        id: 'RECALL',
        title: 'Recall Drill',
        description: 'Execute a batch recall search and verify full traceability.',
        difficulty: 'advanced',
        targetTimeSeconds: 120,
        passingCriteria: ['Search initiated', 'Results from all warehouses', 'Status per warehouse', 'Complete in < 2 minutes'],
        icon: '🔍',
        steps: [
            { stepNum: 1, instruction: 'Navigate to the Recall Search screen.', expectedAction: 'Open recall', hintText: 'Found in the compliance menu', hapticCheckpoint: false, maxTimeSeconds: 10 },
            { stepNum: 2, instruction: 'Enter the batch number and initiate search.', expectedAction: 'Enter batch, tap Search', hintText: 'Use the test batch from training data', hapticCheckpoint: true, maxTimeSeconds: 15 },
            { stepNum: 3, instruction: 'Review results — verify status per warehouse.', expectedAction: 'Read results', hintText: 'Active, Quarantine, or Not Found', hapticCheckpoint: false, maxTimeSeconds: 30 },
            { stepNum: 4, instruction: 'Confirm bin locations and quantities match expectations.', expectedAction: 'Verify details', hintText: 'Cross-reference with physical inventory', hapticCheckpoint: true, maxTimeSeconds: 45 },
        ],
    },
    {
        id: 'SABER_CHECK',
        title: 'SABER Validation',
        description: 'Verify the SABER certificate gate works: valid proceeds, expired blocks.',
        difficulty: 'beginner',
        targetTimeSeconds: 30,
        passingCriteria: ['Valid certificate → green proceed', 'Expired certificate → red block', 'Alert message shown'],
        icon: '🛡️',
        steps: [
            { stepNum: 1, instruction: 'Scan the item with a VALID SABER certificate.', expectedAction: 'Trigger scan', hintText: 'Green SABER indicator should appear', hapticCheckpoint: true, maxTimeSeconds: 10 },
            { stepNum: 2, instruction: 'Verify the green ✅ SABER badge and proceed.', expectedAction: 'Confirm valid', hintText: 'Certificate ID shown on screen', hapticCheckpoint: false, maxTimeSeconds: 5 },
            { stepNum: 3, instruction: 'Now scan the item with an EXPIRED certificate.', expectedAction: 'Trigger scan', hintText: 'Red indicator should appear', hapticCheckpoint: true, maxTimeSeconds: 10 },
            { stepNum: 4, instruction: 'Verify the block message and procurement alert.', expectedAction: 'Read alert', hintText: 'Do NOT proceed with receiving', hapticCheckpoint: true, maxTimeSeconds: 5 },
        ],
    },
];

/** Get drill by ID */
export function getDrillById(id: DrillId): TrainingDrill | undefined {
    return TRAINING_DRILLS.find(d => d.id === id);
}

/** Evaluate a drill attempt */
export function evaluateAttempt(drill: TrainingDrill, attempt: DrillAttempt): boolean {
    return attempt.totalTimeSeconds <= drill.targetTimeSeconds &&
        attempt.stepResults.every(s => s.completed);
}
