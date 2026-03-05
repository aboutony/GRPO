/**
 * Barcode Validator – Post-Parse Integrity Checks
 *
 * Validates extracted scan data:
 *   - GTIN-14 check digit (mod-10 algorithm)
 *   - Expiry date sanity (not expired, not >10 years out)
 *   - Batch length within SAP field limits (30 chars)
 *   - Serial number length within limits (20 chars)
 */

import type { ScanResult } from '../models/scan-result';

export interface ValidationOutput {
    valid: boolean;
    errors: string[];
    warnings: string[];
}

/**
 * Validates a parsed ScanResult for data integrity.
 */
export function validateScanResult(result: ScanResult): ValidationOutput {
    const output: ValidationOutput = { valid: true, errors: [], warnings: [] };

    // ── GTIN-14 Check Digit ────────────────────────────────────────────────
    if (result.gtin) {
        if (!validateGTINCheckDigit(result.gtin)) {
            output.errors.push(`GTIN check digit invalid: ${result.gtin}`);
            output.valid = false;
        }
        if (result.gtin.length !== 14) {
            output.warnings.push(`GTIN is ${result.gtin.length} digits (expected 14)`);
        }
    }

    // ── Expiry Date Sanity ─────────────────────────────────────────────────
    if (result.expiry) {
        const expDate = new Date(result.expiry);
        const now = new Date();
        const tenYearsOut = new Date();
        tenYearsOut.setFullYear(tenYearsOut.getFullYear() + 10);

        if (isNaN(expDate.getTime())) {
            output.errors.push(`Invalid expiry date format: ${result.expiry}`);
            output.valid = false;
        } else if (expDate < now) {
            output.warnings.push(`Product expired on ${result.expiry} — FEFO alert`);
            // Not an error — operator may still need to receive expired goods
        } else if (expDate > tenYearsOut) {
            output.warnings.push(`Expiry date ${result.expiry} is over 10 years out — verify`);
        }
    }

    // ── Batch Length ───────────────────────────────────────────────────────
    if (result.batchNo) {
        if (result.batchNo.length > 30) {
            output.errors.push(`Batch number exceeds 30 characters (was ${result.batchNo.length})`);
            output.valid = false;
        }
        if (result.batchNo.length === 0) {
            output.errors.push('Batch number is empty');
            output.valid = false;
        }
    }

    // ── Serial Number Length ───────────────────────────────────────────────
    if (result.serialNo && result.serialNo.length > 20) {
        output.errors.push(`Serial number exceeds 20 characters (was ${result.serialNo.length})`);
        output.valid = false;
    }

    // ── UDI-DI Minimum Length ──────────────────────────────────────────────
    if (result.udiDi && result.udiDi.length < 8) {
        output.warnings.push(`UDI-DI is unusually short (${result.udiDi.length} chars)`);
    }

    return output;
}

/**
 * GTIN-14 Mod-10 Check Digit Verification
 *
 * Algorithm (GS1 Standard):
 * 1. From right to left, starting with position 2, double every other digit
 * 2. Sum all individual digits (split doubled digits if > 9)
 * 3. Check digit = (10 - (sum % 10)) % 10
 *
 * The last digit of the GTIN is the check digit.
 */
export function validateGTINCheckDigit(gtin: string): boolean {
    // Accept GTIN-8, GTIN-12, GTIN-13, or GTIN-14
    if (!/^\d{8,14}$/.test(gtin)) return false;

    const digits = gtin.split('').map(Number);
    const checkDigit = digits.pop()!;

    // Reverse for right-to-left processing
    digits.reverse();

    let sum = 0;
    for (let i = 0; i < digits.length; i++) {
        // Positions 0, 2, 4... (originally rightmost) get multiplied by 3
        // Positions 1, 3, 5... get multiplied by 1
        sum += digits[i] * (i % 2 === 0 ? 3 : 1);
    }

    const calculated = (10 - (sum % 10)) % 10;
    return calculated === checkDigit;
}

/**
 * Quick check: is this string potentially a GS1 barcode?
 * Used by the camera HUD to decide whether to attempt parsing.
 */
export function looksLikeGS1(raw: string): boolean {
    if (!raw || raw.length < 16) return false;

    // Parenthesized format
    if (/^\(\d{2,4}\)/.test(raw)) return true;

    // Starts with a known 2-digit AI followed by digits
    if (/^01\d{14}/.test(raw)) return true;

    // Contains FNC1 separator
    if (raw.includes('\x1D')) return true;

    return false;
}
