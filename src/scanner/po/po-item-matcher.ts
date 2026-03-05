/**
 * PO Item Matcher – Strict GTIN-to-PO Line Lookup
 *
 * Scanned products are validated ONLY against lines of the active PO.
 * If the item isn't on the PO → HARD BLOCK: "Item not on this PO — Reject Delivery"
 *
 * Zero tolerance for random product scanning.
 */

import type { ScanResult } from '../models/scan-result';
import type { POSession, POLine } from './po-session';

// ── Match Result ─────────────────────────────────────────────────────────────

export type MatchResult =
    | {
        matched: true;
        poLine: POLine;
        poEntry: number;
        poLineNum: number;
        itemCode: string;
        openQty: number;
        remainingInSession: number;
    }
    | {
        matched: false;
        reason: MismatchReason;
        message: string;
        guidance: string;
    };

export type MismatchReason =
    | 'NOT_ON_PO'       // GTIN not found on any PO line
    | 'LINE_FULFILLED'  // Line exists but fully received
    | 'GTIN_UNKNOWN'    // GTIN not recognized at all
    | 'NO_SESSION'      // No active PO session
    | 'PARSE_FAILED';   // Barcode parse failed — no GTIN

// ── Matcher ──────────────────────────────────────────────────────────────────

/**
 * Matches a scanned barcode against the active PO session.
 * Returns either a successful match or a hard block with reason.
 *
 * @param scanResult - Parsed barcode output
 * @param session - Active PO session (null = scanner locked)
 * @param getRemainingQty - Function to check remaining qty for a PO line
 */
export function matchScanToPO(
    scanResult: ScanResult,
    session: POSession | null,
    getRemainingQty: (poLineNum: number) => number
): MatchResult {
    // ── Guard: No session ──────────────────────────────────────────────────
    if (!session || !session.active) {
        return {
            matched: false,
            reason: 'NO_SESSION',
            message: '🔒 Scanner Locked',
            guidance: 'Select a Purchase Order to begin receiving.',
        };
    }

    // ── Guard: Parse failure ───────────────────────────────────────────────
    if (!scanResult.success || !scanResult.gtin) {
        return {
            matched: false,
            reason: 'PARSE_FAILED',
            message: '❌ Barcode Not Readable',
            guidance: 'Unable to extract GTIN. Try scanning again or use manual entry.',
        };
    }

    const gtin = scanResult.gtin;
    const po = session.po;

    // ── Lookup: GTIN against PO lines ──────────────────────────────────────
    const matchingLines = po.lines.filter(
        line => line.gtin === gtin || line.itemCode === scanResult.itemCode
    );

    // No matching line at all → HARD BLOCK
    if (matchingLines.length === 0) {
        return {
            matched: false,
            reason: 'NOT_ON_PO',
            message: `🚫 Item not on this PO — Reject Delivery`,
            guidance: `GTIN ${gtin} is not a line item on PO-${po.docNum}. This product cannot be received against this Purchase Order. Verify the shipment manifest.`,
        };
    }

    // Find a line with remaining open quantity
    for (const line of matchingLines) {
        const remaining = getRemainingQty(line.lineNum);
        if (remaining > 0) {
            return {
                matched: true,
                poLine: line,
                poEntry: po.docEntry,
                poLineNum: line.lineNum,
                itemCode: line.itemCode,
                openQty: line.openQty,
                remainingInSession: remaining,
            };
        }
    }

    // Line exists but fully received → BLOCK
    const fulfilledLine = matchingLines[0];
    return {
        matched: false,
        reason: 'LINE_FULFILLED',
        message: '⚠️ Line Fully Received',
        guidance: `${fulfilledLine.itemDescription} (${fulfilledLine.itemCode}) has already been fully received on PO-${po.docNum}. Received: ${fulfilledLine.quantity}/${fulfilledLine.quantity}. No additional quantity expected.`,
    };
}

/**
 * Validates that a quantity doesn't exceed the remaining open qty.
 */
export function validateQuantity(
    quantity: number,
    remainingQty: number
): { valid: boolean; message: string } {
    if (quantity <= 0) {
        return { valid: false, message: 'Quantity must be greater than zero.' };
    }
    if (quantity > remainingQty) {
        return {
            valid: false,
            message: `Cannot receive ${quantity} — only ${remainingQty} remaining on this PO line.`,
        };
    }
    return { valid: true, message: '' };
}
