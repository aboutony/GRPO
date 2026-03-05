/**
 * SAP Mock – DI API Document Posting Simulator
 *
 * Simulates GRPO document posting for the demo environment.
 * Returns sequential DocEntry/DocNum, validates batch management,
 * and tracks posted documents for "close the loop" verification.
 */

import { getItemByCode } from '../data/demo-items';
import type { DemoPO, DemoPOLine } from '../data/demo-purchase-orders';

// ── Post Result ──────────────────────────────────────────────────────────────

export interface MockPostResult {
    success: boolean;
    docEntry: number | null;
    docNum: number | null;
    errorMessage: string | null;
    postedAt: string;
    processingTimeMs: number;
}

// ── Posted Documents Tracker ─────────────────────────────────────────────────

export interface PostedDocument {
    docEntry: number;
    docNum: number;
    poDocEntry: number;
    cardCode: string;
    lines: Array<{
        itemCode: string;
        batchNo: string;
        quantity: number;
        warehouseCode: string;
        qcStatus: 'P' | 'A' | 'R';
        batchLocked: boolean;
    }>;
    postedAt: string;
}

let nextDocEntry = 5001;
let nextDocNum = 5001;
const postedDocuments: PostedDocument[] = [];

// ── Mock Post ────────────────────────────────────────────────────────────────

/**
 * Simulates posting a GRPO document to SAP B1.
 *
 * Validates:
 * - Batch number is provided for batch-managed items
 * - PO is open
 * - Item exists in master data
 *
 * @param po - Source Purchase Order
 * @param lines - Lines to receive
 * @returns MockPostResult with DocEntry/DocNum
 */
export async function mockPostGRPO(
    po: DemoPO,
    lines: Array<{
        lineNum: number;
        itemCode: string;
        quantity: number;
        batchNo: string | null;
        warehouseCode: string;
        udiDi: string | null;
        udiPi: string | null;
        expiry: string | null;
        sterility: 'S' | 'N' | 'T';
        qcRequired: boolean;
    }>
): Promise<MockPostResult> {
    const start = performance.now();

    // Simulate API latency
    await delay(300);

    // ── Validation ─────────────────────────────────────────────────────────
    if (po.status === 'Closed') {
        return {
            success: false,
            docEntry: null,
            docNum: null,
            errorMessage: `PO ${po.docNum} is closed — cannot receive`,
            postedAt: new Date().toISOString(),
            processingTimeMs: Math.round(performance.now() - start),
        };
    }

    for (const line of lines) {
        const item = getItemByCode(line.itemCode);
        if (!item) {
            return {
                success: false,
                docEntry: null,
                docNum: null,
                errorMessage: `Item ${line.itemCode} not found in Item Master`,
                postedAt: new Date().toISOString(),
                processingTimeMs: Math.round(performance.now() - start),
            };
        }

        if (item.batchManaged && !line.batchNo) {
            return {
                success: false,
                docEntry: null,
                docNum: null,
                errorMessage: `Batch number required for item ${line.itemCode} (batch-managed)`,
                postedAt: new Date().toISOString(),
                processingTimeMs: Math.round(performance.now() - start),
            };
        }
    }

    // ── Post Success ───────────────────────────────────────────────────────
    const docEntry = nextDocEntry++;
    const docNum = nextDocNum++;

    const posted: PostedDocument = {
        docEntry,
        docNum,
        poDocEntry: po.docEntry,
        cardCode: po.cardCode,
        lines: lines.map(l => ({
            itemCode: l.itemCode,
            batchNo: l.batchNo ?? '',
            quantity: l.quantity,
            warehouseCode: l.warehouseCode,
            qcStatus: l.qcRequired ? 'P' as const : 'A' as const,
            batchLocked: l.qcRequired,
        })),
        postedAt: new Date().toISOString(),
    };

    postedDocuments.push(posted);

    return {
        success: true,
        docEntry,
        docNum,
        errorMessage: null,
        postedAt: posted.postedAt,
        processingTimeMs: Math.round(performance.now() - start),
    };
}

// ── Query Posted Documents ───────────────────────────────────────────────────

/** Get all posted GRPO documents */
export function getPostedDocuments(): PostedDocument[] {
    return [...postedDocuments];
}

/** Get a specific posted document by DocEntry */
export function getPostedDocument(docEntry: number): PostedDocument | undefined {
    return postedDocuments.find(d => d.docEntry === docEntry);
}

/** Get count of posted documents */
export function getPostedCount(): number {
    return postedDocuments.length;
}

/** Reset the mock (for test reruns) */
export function resetMock(): void {
    nextDocEntry = 5001;
    nextDocNum = 5001;
    postedDocuments.length = 0;
}

function delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
}
