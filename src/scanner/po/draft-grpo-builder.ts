/**
 * Draft GRPO Builder – BaseEntry/BaseLine ERP Linking
 *
 * Collects confirmed session lines and builds a complete
 * GrpoDocument with BaseType=22 (Purchase Order) references.
 *
 * The procurement cycle in SAP B1 is PERFECTLY closed:
 *   PO → GRPO → Inventory (BaseEntry → DocEntry link)
 */

import type { POSession, SessionReceiptLine } from './po-session';

// ── GRPO Payload (matches DI API structure) ──────────────────────────────────

export interface GrpoPayloadLine {
    /** Source PO base type (always 22 for Purchase Orders) */
    baseType: 22;
    /** Source PO DocEntry */
    baseEntry: number;
    /** Source PO line number */
    baseLine: number;
    /** Item code from master data */
    itemCode: string;
    /** Received quantity */
    quantity: number;
    /** Target warehouse code */
    warehouseCode: string;
    /** UDI Device Identifier */
    udiDi: string | null;
    /** UDI Production Identifier */
    udiPi: string | null;
    /** Batch / lot number */
    batchNo: string;
    /** Expiry date (ISO) */
    expiry: string | null;
    /** Sterility classification */
    sterility: 'S' | 'N' | 'T';
    /** QC required flag */
    qcRequired: boolean;
    /** Serial number */
    serialNo: string | null;
}

export interface GrpoPayload {
    /** Vendor business partner code */
    cardCode: string;
    /** Document date (ISO) */
    docDate: string;
    /** Operator who received */
    receivedBy: string;
    /** Document remarks */
    comments: string;
    /** Line items with BaseEntry/BaseLine references */
    lines: GrpoPayloadLine[];
}

export interface DraftValidation {
    valid: boolean;
    errors: string[];
    warnings: string[];
    lineCount: number;
    totalQuantity: number;
}

// ── Builder ──────────────────────────────────────────────────────────────────

/**
 * Builds a draft GRPO payload from the current PO session.
 * Every line references the source PO via BaseType=22 + BaseEntry + BaseLine.
 */
export function buildDraftGRPO(
    session: POSession,
    operatorId: string
): GrpoPayload {
    const { po, receiptLines } = session;

    // Group receipt lines by PO line number and consolidate
    const consolidatedLines = consolidateByPOLine(receiptLines, po.docEntry);

    return {
        cardCode: po.cardCode,
        docDate: new Date().toISOString().split('T')[0],
        receivedBy: operatorId,
        comments: `GRPO from PO-${po.docNum} via mobile receiving (Session: ${session.sessionId})`,
        lines: consolidatedLines,
    };
}

/**
 * Validates a draft GRPO before submission.
 */
export function validateDraft(draft: GrpoPayload): DraftValidation {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (!draft.cardCode) {
        errors.push('Missing vendor code (CardCode)');
    }

    if (draft.lines.length === 0) {
        errors.push('No receipt lines — scan at least one item before posting');
    }

    for (const line of draft.lines) {
        if (!line.baseEntry || line.baseLine === undefined) {
            errors.push(`Line ${line.itemCode}: missing BaseEntry/BaseLine PO reference`);
        }
        if (line.baseType !== 22) {
            errors.push(`Line ${line.itemCode}: BaseType must be 22 (Purchase Order)`);
        }
        if (line.quantity <= 0) {
            errors.push(`Line ${line.itemCode}: quantity must be > 0`);
        }
        if (!line.batchNo) {
            errors.push(`Line ${line.itemCode}: batch number required for batch-managed items`);
        }
        if (!line.expiry) {
            warnings.push(`Line ${line.itemCode}: no expiry date captured`);
        }
    }

    return {
        valid: errors.length === 0,
        errors,
        warnings,
        lineCount: draft.lines.length,
        totalQuantity: draft.lines.reduce((sum, l) => sum + l.quantity, 0),
    };
}

/**
 * Consolidates multiple scans of the same PO line into single payload lines.
 * Each unique PO line × batch combination becomes one payload line.
 */
function consolidateByPOLine(
    receiptLines: SessionReceiptLine[],
    poDocEntry: number
): GrpoPayloadLine[] {
    const lineMap = new Map<string, GrpoPayloadLine>();

    for (const rl of receiptLines) {
        // Key: PO line + batch (same batch on same line → aggregate qty)
        const key = `${rl.poLineNum}:${rl.batchNo}`;

        const existing = lineMap.get(key);
        if (existing) {
            existing.quantity += rl.quantity;
        } else {
            lineMap.set(key, {
                baseType: 22,
                baseEntry: poDocEntry,
                baseLine: rl.poLineNum,
                itemCode: rl.itemCode,
                quantity: rl.quantity,
                warehouseCode: '', // filled by putaway
                udiDi: rl.udiDi,
                udiPi: rl.udiPi,
                batchNo: rl.batchNo,
                expiry: rl.expiry,
                sterility: rl.sterility,
                serialNo: rl.serialNo,
                qcRequired: rl.qcRequired,
            });
        }
    }

    return Array.from(lineMap.values());
}
