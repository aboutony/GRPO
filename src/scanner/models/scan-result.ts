/**
 * Scan Result – Parsed Output Shape
 *
 * The typed output of a successful GS1 barcode parse.
 * Maps directly to QueuedReceiptLine fields from Sprint 2.1.
 */

/** Individual AI segment extracted from the barcode */
export interface ParsedSegment {
    /** Application Identifier code */
    ai: string;
    /** AI human-readable name */
    name: string;
    /** Raw extracted value */
    rawValue: string;
    /** Processed/normalized value */
    value: string;
    /** Confidence level */
    confidence: 'parsed' | 'inferred' | 'manual';
}

/** Complete scan result from a single barcode */
export interface ScanResult {
    /** Raw barcode string as scanned */
    rawBarcode: string;
    /** Barcode symbology (GS1-128, DataMatrix, QR, etc.) */
    symbology: string;

    // ── Extracted Fields (mapped from AIs) ─────────────────────────────────
    /** GTIN-14 from AI (01) */
    gtin: string | null;
    /** Item code (derived from GTIN or lookup) */
    itemCode: string | null;
    /** UDI Device Identifier from AI (01) */
    udiDi: string | null;
    /** Batch/Lot number from AI (10) */
    batchNo: string | null;
    /** Expiry date as ISO string from AI (17) */
    expiry: string | null;
    /** Serial number from AI (21) */
    serialNo: string | null;
    /** UDI Production Identifier (composite of batch+expiry+serial) */
    udiPi: string | null;
    /** Production date from AI (11) */
    productionDate: string | null;
    /** Quantity from AI (30) or (37) */
    quantity: number | null;

    // ── All segments ───────────────────────────────────────────────────────
    /** All parsed AI segments for reference */
    segments: ParsedSegment[];

    // ── Validation ─────────────────────────────────────────────────────────
    /** Whether the parse was successful (at least GTIN extracted) */
    success: boolean;
    /** Parse warnings (non-fatal issues) */
    warnings: string[];
    /** Parse errors (fatal issues preventing field extraction) */
    errors: string[];
    /** Time taken to parse in ms */
    parseTimeMs: number;
}

/** Empty scan result for initialization */
export function emptyScanResult(rawBarcode: string = ''): ScanResult {
    return {
        rawBarcode,
        symbology: 'unknown',
        gtin: null,
        itemCode: null,
        udiDi: null,
        batchNo: null,
        expiry: null,
        serialNo: null,
        udiPi: null,
        productionDate: null,
        quantity: null,
        segments: [],
        success: false,
        warnings: [],
        errors: [],
        parseTimeMs: 0,
    };
}
