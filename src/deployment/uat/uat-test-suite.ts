/**
 * UAT Test Suite – 12 User Stories for Riyadh Pilot
 *
 * Each story has acceptance criteria, expected outcomes,
 * and pass/fail evaluation logic.
 */

// ── Test Types ───────────────────────────────────────────────────────────────

export type StoryPriority = 'must-have' | 'nice-to-have';
export type TestStatus = 'pending' | 'running' | 'passed' | 'failed' | 'skipped';

export interface UserStory {
    id: string;
    title: string;
    description: string;
    priority: StoryPriority;
    acceptanceCriteria: string[];
    maxDurationMs: number;
    status: TestStatus;
    result: TestResult | null;
}

export interface TestResult {
    passed: boolean;
    durationMs: number;
    criteriaResults: Array<{
        criterion: string;
        passed: boolean;
        actual: string;
    }>;
    notes: string;
    testedBy: string;
    testedAt: string;
}

// ── Test Suite ───────────────────────────────────────────────────────────────

export function createUatTestSuite(): UserStory[] {
    return [
        {
            id: 'UAT-001',
            title: 'Single-Scan GS1 Parse',
            description: 'Scan a GS1-128 barcode and verify all 4 fields are extracted',
            priority: 'must-have',
            acceptanceCriteria: [
                'GTIN-14 extracted correctly',
                'Batch number extracted correctly',
                'Expiry date extracted and formatted as ISO date',
                'Serial number extracted (if present)',
                'Total parse time < 2 seconds',
            ],
            maxDurationMs: 2_000,
            status: 'pending',
            result: null,
        },
        {
            id: 'UAT-002',
            title: 'SABER Certificate Validation',
            description: 'Verify SABER gate blocks invalid certificates and passes valid ones',
            priority: 'must-have',
            acceptanceCriteria: [
                'Valid certificate → green indicator, proceed to putaway',
                'Expired certificate → red indicator, GRPO blocked',
                'Procurement alert generated for blocked items',
                'Certificate ID displayed on screen',
            ],
            maxDurationMs: 5_000,
            status: 'pending',
            result: null,
        },
        {
            id: 'UAT-003',
            title: 'Putaway Bin Assignment',
            description: 'Correct bin location shown after successful scan',
            priority: 'must-have',
            acceptanceCriteria: [
                'Bin code displayed within 1 second of scan',
                'Zone, aisle, rack, level shown clearly',
                'Green color scheme for active putaway',
                'Correct warehouse code matches PO line',
            ],
            maxDurationMs: 1_000,
            status: 'pending',
            result: null,
        },
        {
            id: 'UAT-004',
            title: 'QC Hold Routing',
            description: 'Items with QcReq=Y routed to quarantine bin',
            priority: 'must-have',
            acceptanceCriteria: [
                'Screen shifts to yellow QC Hold theme',
                'Quarantine bin code shown (QC-{WH}-HOLD)',
                'Warning banner visible: "Item requires inspection"',
                '"Capture Evidence" button enabled',
            ],
            maxDurationMs: 2_000,
            status: 'pending',
            result: null,
        },
        {
            id: 'UAT-005',
            title: 'Evidence Photo Capture',
            description: 'Operator can take photo and select defect codes for QC items',
            priority: 'must-have',
            acceptanceCriteria: [
                'Camera opens and photo is captured',
                'Photo thumbnail appears on screen',
                'Defect code picker shows all 8 codes',
                'Multiple defect codes can be selected',
                'Submission creates @GRPO_QC_RECORDS entry',
            ],
            maxDurationMs: 30_000,
            status: 'pending',
            result: null,
        },
        {
            id: 'UAT-006',
            title: 'Batch Lock on QC Item',
            description: 'QC-held items posted with locked batch status in SAP',
            priority: 'must-have',
            acceptanceCriteria: [
                'Batch status = bsStatus_Locked in SAP',
                'U_GRPO_QcStatus = P (Pending) on GRPO header',
                'Item cannot be allocated to sales orders',
                'Item cannot appear in delivery note picking',
            ],
            maxDurationMs: 10_000,
            status: 'pending',
            result: null,
        },
        {
            id: 'UAT-007',
            title: 'SAP GRPO Document Posting',
            description: 'Complete GRPO posts to SAP B1 with DocEntry/DocNum returned',
            priority: 'must-have',
            acceptanceCriteria: [
                'DocEntry and DocNum returned from SAP',
                'PO open quantity reduced by received amount',
                'All UDFs populated (UDI-DI, Batch, Expiry, Sterility)',
                'BaseType/BaseEntry/BaseLine link to source PO',
                'Transaction was atomic (no partial data)',
            ],
            maxDurationMs: 10_000,
            status: 'pending',
            result: null,
        },
        {
            id: 'UAT-008',
            title: 'Offline Scan & Auto-Sync',
            description: 'Scans work offline and sync automatically when reconnected',
            priority: 'must-have',
            acceptanceCriteria: [
                'Scan succeeds while device is offline',
                'Receipt saved to local SQLite (WAL mode)',
                'Offline indicator visible to operator',
                'Automatic sync triggers on reconnection',
                'Sync completes within 5 seconds',
            ],
            maxDurationMs: 15_000,
            status: 'pending',
            result: null,
        },
        {
            id: 'UAT-009',
            title: 'Conflict Resolution',
            description: 'Failed syncs show human-readable resolution guidance',
            priority: 'must-have',
            acceptanceCriteria: [
                'Conflict screen shows local vs SAP data comparison',
                'Clear next-step guidance displayed (not just error code)',
                'Operator can acknowledge the conflict',
                'Retryable errors auto-retry up to max attempts',
            ],
            maxDurationMs: 10_000,
            status: 'pending',
            result: null,
        },
        {
            id: 'UAT-010',
            title: 'Mock Recall Drill',
            description: 'Full batch traceability across facility in under 15 minutes',
            priority: 'must-have',
            acceptanceCriteria: [
                'Batch search initiated from recall screen',
                'Results return within 15 seconds per warehouse',
                'Status shown per warehouse (Active/Quarantine)',
                'Quantity, bin location, QC result displayed',
                'Total drill completed within 15 minutes',
            ],
            maxDurationMs: 15 * 60 * 1_000,
            status: 'pending',
            result: null,
        },
        {
            id: 'UAT-011',
            title: 'Manual Fallback Entry',
            description: 'Operator can manually enter fields when scanner fails',
            priority: 'nice-to-have',
            acceptanceCriteria: [
                'Manual entry fields accessible from scan screen',
                'All required fields enterable (item, batch, expiry)',
                'Same flow continues after manual entry',
            ],
            maxDurationMs: 60_000,
            status: 'pending',
            result: null,
        },
        {
            id: 'UAT-012',
            title: 'Multi-User Concurrent Operations',
            description: '3 operators scanning simultaneously with stable performance',
            priority: 'nice-to-have',
            acceptanceCriteria: [
                '3 devices scanning concurrently',
                'Sync latency remains under 5 seconds',
                'No document collision or data corruption',
                'All 3 GRPOs post successfully',
            ],
            maxDurationMs: 30_000,
            status: 'pending',
            result: null,
        },
    ];
}

/** Get must-have stories only */
export function getMustHaveStories(suite: UserStory[]): UserStory[] {
    return suite.filter(s => s.priority === 'must-have');
}

/** Calculate overall pass rate */
export function calculatePassRate(suite: UserStory[]): {
    total: number;
    passed: number;
    failed: number;
    rate: number;
    mustHaveRate: number;
} {
    const tested = suite.filter(s => s.result !== null);
    const passed = tested.filter(s => s.result!.passed);
    const mustHave = suite.filter(s => s.priority === 'must-have');
    const mustHavePassed = mustHave.filter(s => s.result?.passed);

    return {
        total: tested.length,
        passed: passed.length,
        failed: tested.length - passed.length,
        rate: tested.length > 0 ? (passed.length / tested.length) * 100 : 0,
        mustHaveRate: mustHave.length > 0 ? (mustHavePassed.length / mustHave.length) * 100 : 0,
    };
}
