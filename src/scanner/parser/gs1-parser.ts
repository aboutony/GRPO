/**
 * GS1-128 / DataMatrix Parser
 *
 * Single-pass parser that extracts Application Identifier segments from
 * GS1-128 and GS1 DataMatrix barcode strings.
 *
 * A single scan decodes:
 *   (01) GTIN     → itemCode + udiDi
 *   (10) Batch    → batchNo
 *   (17) Expiry   → expiry (YYMMDD → ISO date)
 *   (21) Serial   → serialNo → udiPi composite
 *
 * Handles both FNC1 separator (ASCII 29 / \x1D) and parenthesized AI formats.
 */

import { AI_REGISTRY, FIXED_LENGTH_AIS, AI_CODES_BY_LENGTH } from './ai-codes';
import type { ScanResult, ParsedSegment } from '../models/scan-result';
import { emptyScanResult } from '../models/scan-result';

/** FNC1 Group Separator (ASCII 29) — used as delimiter in GS1-128 */
const GS = '\x1D';

/**
 * Parses a GS1-128 or DataMatrix barcode string into a typed ScanResult.
 *
 * @param rawBarcode - The raw string from the barcode scanner
 * @param symbology - Barcode type hint (optional, for metadata)
 * @returns Fully typed ScanResult with extracted fields
 */
export function parseGS1(rawBarcode: string, symbology: string = 'auto'): ScanResult {
    const start = performance.now();
    const result = emptyScanResult(rawBarcode);
    result.symbology = symbology;

    if (!rawBarcode || rawBarcode.trim().length === 0) {
        result.errors.push('Empty barcode string');
        result.parseTimeMs = performance.now() - start;
        return result;
    }

    // Normalize: remove leading FNC1 if present, trim whitespace
    let data = rawBarcode.trim();
    if (data.startsWith(GS)) data = data.substring(1);

    // Detect format: parenthesized (01)... or raw FNC1-delimited
    const isParenthesized = /^\(\d{2,4}\)/.test(data);

    const segments = isParenthesized
        ? parseParenthesized(data, result)
        : parseRawFNC1(data, result);

    result.segments = segments;

    // ── Map segments to result fields ──────────────────────────────────────
    for (const seg of segments) {
        mapSegmentToResult(seg, result);
    }

    // ── Compose UDI-PI (Production Identifier) ────────────────────────────
    // UDI-PI is a composite of batch + expiry + serial per FDA UDI guidance
    const piParts: string[] = [];
    if (result.batchNo) piParts.push(`B:${result.batchNo}`);
    if (result.expiry) piParts.push(`E:${result.expiry}`);
    if (result.serialNo) piParts.push(`S:${result.serialNo}`);
    if (piParts.length > 0) {
        result.udiPi = piParts.join('|');
    }

    // ── Set UDI-DI from GTIN ──────────────────────────────────────────────
    if (result.gtin) {
        result.udiDi = result.gtin;
        result.itemCode = result.gtin;
    }

    // ── Determine success ─────────────────────────────────────────────────
    result.success = segments.length > 0 && result.errors.length === 0;

    if (!result.gtin && result.success) {
        result.warnings.push('No GTIN (01) found — item code may need manual entry');
    }

    result.parseTimeMs = Math.round((performance.now() - start) * 100) / 100;
    return result;
}

// ─── Parenthesized Format Parser ─────────────────────────────────────────────
// Handles: (01)04150123456789(17)260301(10)ABC123(21)SN456

function parseParenthesized(data: string, result: ScanResult): ParsedSegment[] {
    const segments: ParsedSegment[] = [];
    const regex = /\((\d{2,4})\)([^(]*)/g;
    let match: RegExpExecArray | null;

    while ((match = regex.exec(data)) !== null) {
        const aiCode = match[1];
        let value = match[2];

        const aiDef = AI_REGISTRY[aiCode];
        if (!aiDef) {
            result.warnings.push(`Unknown AI (${aiCode}) — skipped`);
            continue;
        }

        // Trim FNC1 separators from value
        value = value.replace(new RegExp(GS, 'g'), '').trim();

        // Validate length
        if (aiDef.fixedLength && value.length !== aiDef.fixedLength) {
            result.warnings.push(
                `AI (${aiCode}) expected ${aiDef.fixedLength} chars, got ${value.length}`
            );
        }
        if (value.length > aiDef.maxLength) {
            value = value.substring(0, aiDef.maxLength);
            result.warnings.push(`AI (${aiCode}) truncated to ${aiDef.maxLength} chars`);
        }

        segments.push({
            ai: aiCode,
            name: aiDef.name,
            rawValue: match[2],
            value: aiDef.format === 'date' ? parseGS1Date(value, result) : value,
            confidence: 'parsed',
        });
    }

    return segments;
}

// ─── Raw FNC1-Delimited Format Parser ────────────────────────────────────────
// Handles: 010415012345678917260301\x1D10ABC123\x1D21SN456

function parseRawFNC1(data: string, result: ScanResult): ParsedSegment[] {
    const segments: ParsedSegment[] = [];
    let pos = 0;

    while (pos < data.length) {
        // Skip any FNC1 separator at current position
        if (data[pos] === GS) {
            pos++;
            continue;
        }

        // Try to match an AI code using greedy prefix matching (longest first)
        let matched = false;
        for (const aiCode of AI_CODES_BY_LENGTH) {
            if (data.startsWith(aiCode, pos)) {
                const aiDef = AI_REGISTRY[aiCode];
                if (!aiDef) continue;

                const dataStart = pos + aiCode.length;
                let value: string;

                if (FIXED_LENGTH_AIS.has(aiCode) && aiDef.fixedLength) {
                    // Fixed length — extract exactly N characters
                    value = data.substring(dataStart, dataStart + aiDef.fixedLength);
                    pos = dataStart + aiDef.fixedLength;
                } else {
                    // Variable length — extract until FNC1 or end-of-string
                    const gsPos = data.indexOf(GS, dataStart);
                    if (gsPos !== -1) {
                        value = data.substring(dataStart, gsPos);
                        pos = gsPos + 1; // Skip the GS
                    } else {
                        value = data.substring(dataStart);
                        pos = data.length;
                    }

                    // Enforce max length
                    if (value.length > aiDef.maxLength) {
                        value = value.substring(0, aiDef.maxLength);
                        result.warnings.push(`AI ${aiCode} truncated to ${aiDef.maxLength} chars`);
                    }
                }

                segments.push({
                    ai: aiCode,
                    name: aiDef.name,
                    rawValue: value,
                    value: aiDef.format === 'date' ? parseGS1Date(value, result) : value,
                    confidence: 'parsed',
                });

                matched = true;
                break;
            }
        }

        if (!matched) {
            // Cannot identify AI at this position — skip one character
            result.warnings.push(`Unrecognized data at position ${pos}: '${data[pos]}'`);
            pos++;
        }
    }

    return segments;
}

// ─── Date Parsing ────────────────────────────────────────────────────────────

/**
 * Converts GS1 date format (YYMMDD) to ISO date string.
 * Handles "00" in DD as end-of-month per GS1 spec.
 */
function parseGS1Date(raw: string, result: ScanResult): string {
    if (raw.length !== 6) {
        result.warnings.push(`Date value '${raw}' is not 6 digits — skipping conversion`);
        return raw;
    }

    const yy = parseInt(raw.substring(0, 2), 10);
    const mm = parseInt(raw.substring(2, 4), 10);
    const dd = parseInt(raw.substring(4, 6), 10);

    // GS1 century pivot: 00-49 → 2000-2049, 50-99 → 1950-1999
    const year = yy <= 49 ? 2000 + yy : 1900 + yy;

    if (mm < 1 || mm > 12) {
        result.warnings.push(`Invalid month ${mm} in date '${raw}'`);
        return raw;
    }

    // DD=00 means last day of month (GS1 spec)
    let day = dd;
    if (dd === 0) {
        day = new Date(year, mm, 0).getDate(); // Last day of month
    }

    const date = new Date(year, mm - 1, day);
    return date.toISOString().split('T')[0]; // YYYY-MM-DD
}
