/**
 * Compliance Handover – SHA-256 Verifier Toolkit for QA Team
 *
 * Packages the audit chain verifier for the QA/Compliance team's
 * monthly SFDA self-audits. Includes handover checklist and
 * formal sign-off.
 */

// ── Types ────────────────────────────────────────────────────────────────────

export type HandoverItemStatus = 'pending' | 'completed' | 'signed_off';

export interface HandoverChecklist {
    handoverId: string;
    facilityId: string;
    preparedBy: string;
    preparedAt: string;
    receivedBy: string | null;
    signedOffAt: string | null;
    items: HandoverItem[];
    allComplete: boolean;
}

export interface HandoverItem {
    id: string;
    category: string;
    title: string;
    description: string;
    status: HandoverItemStatus;
    evidence: string | null;
    completedAt: string | null;
}

export interface MonthlyAuditProtocol {
    step: number;
    action: string;
    tool: string;
    expectedOutcome: string;
    escalationIfFailed: string;
}

export interface SfdaAccuracyResult {
    reportDate: string;
    totalRecords: number;
    matchedRecords: number;
    mismatches: number;
    accuracyRate: number;
    details: Array<{
        field: string;
        expected: string;
        actual: string;
        docEntry: number;
    }>;
}

// ── Monthly Self-Audit Protocol ──────────────────────────────────────────────

export const MONTHLY_AUDIT_STEPS: MonthlyAuditProtocol[] = [
    {
        step: 1,
        action: 'Export the full audit chain from the GRPO system',
        tool: 'Audit Logger → getFullChain()',
        expectedOutcome: 'JSON array of all AuditLogEntry records',
        escalationIfFailed: 'Contact IT — database may be inaccessible',
    },
    {
        step: 2,
        action: 'Run the SHA-256 hash chain verifier',
        tool: 'Audit Verifier → verifyChain(entries, facilityId)',
        expectedOutcome: 'ChainVerificationResult.valid === true',
        escalationIfFailed: 'CRITICAL: Chain tampered. Escalate to SFDA compliance officer immediately',
    },
    {
        step: 3,
        action: 'Verify SFDA submission accuracy for the month',
        tool: 'Compliance Handover → verifySfdaAccuracy()',
        expectedOutcome: 'Accuracy rate ≥ 99.9%',
        escalationIfFailed: 'Investigate mismatches. Re-submit corrected records within 48 hours',
    },
    {
        step: 4,
        action: 'Check SABER certificate cache for expired entries',
        tool: 'Manual review of SABER validation log',
        expectedOutcome: 'No products received with expired certificates',
        escalationIfFailed: 'Quarantine affected batches. Alert procurement',
    },
    {
        step: 5,
        action: 'Archive the monthly audit report',
        tool: 'Save report to compliance file server',
        expectedOutcome: 'Report saved with timestamp and auditor signature',
        escalationIfFailed: 'Retry save. If persistent, print physical copy',
    },
];

// ── Handover Checklist Builder ───────────────────────────────────────────────

export function createHandoverChecklist(
    facilityId: string,
    preparedBy: string
): HandoverChecklist {
    return {
        handoverId: `HANDOVER-${Date.now()}`,
        facilityId,
        preparedBy,
        preparedAt: new Date().toISOString(),
        receivedBy: null,
        signedOffAt: null,
        items: [
            {
                id: 'H-001',
                category: 'Access',
                title: 'Audit Chain Read Access',
                description: 'QA team has read access to @GRPO_AUDIT_LOG via Service Layer',
                status: 'pending',
                evidence: null,
                completedAt: null,
            },
            {
                id: 'H-002',
                category: 'Access',
                title: 'SFDA Export Read Access',
                description: 'QA team can view sfda_transmissions table and export reports',
                status: 'pending',
                evidence: null,
                completedAt: null,
            },
            {
                id: 'H-003',
                category: 'Training',
                title: 'Hash Chain Verification Training',
                description: 'QA lead trained on running verifyChain() and interpreting results',
                status: 'pending',
                evidence: null,
                completedAt: null,
            },
            {
                id: 'H-004',
                category: 'Training',
                title: 'Monthly Audit Protocol Walkthrough',
                description: 'QA team walked through all 5 monthly audit steps with IT',
                status: 'pending',
                evidence: null,
                completedAt: null,
            },
            {
                id: 'H-005',
                category: 'Documentation',
                title: 'Audit Verifier User Guide',
                description: 'Written guide provided to QA team for hash chain verification',
                status: 'pending',
                evidence: null,
                completedAt: null,
            },
            {
                id: 'H-006',
                category: 'Documentation',
                title: 'Escalation Contact Sheet',
                description: 'IT and compliance contacts for each escalation scenario',
                status: 'pending',
                evidence: null,
                completedAt: null,
            },
            {
                id: 'H-007',
                category: 'Verification',
                title: 'Baseline Chain Verification',
                description: 'Initial full chain verification run with QA team observing',
                status: 'pending',
                evidence: null,
                completedAt: null,
            },
            {
                id: 'H-008',
                category: 'Verification',
                title: 'SFDA Accuracy Baseline',
                description: 'Confirm 100% SFDA data accuracy for the current month',
                status: 'pending',
                evidence: null,
                completedAt: null,
            },
        ],
        allComplete: false,
    };
}

/** Complete a handover item */
export function completeItem(
    checklist: HandoverChecklist,
    itemId: string,
    evidence: string
): void {
    const item = checklist.items.find(i => i.id === itemId);
    if (item) {
        item.status = 'completed';
        item.evidence = evidence;
        item.completedAt = new Date().toISOString();
        checklist.allComplete = checklist.items.every(i => i.status !== 'pending');
    }
}

/** Sign off the handover (QA team lead) */
export function signOff(
    checklist: HandoverChecklist,
    receivedBy: string
): boolean {
    if (!checklist.allComplete) return false;

    checklist.receivedBy = receivedBy;
    checklist.signedOffAt = new Date().toISOString();
    for (const item of checklist.items) {
        item.status = 'signed_off';
    }
    return true;
}
