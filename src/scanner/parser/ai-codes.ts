/**
 * GS1 Application Identifier Registry
 *
 * Lookup table for decoding GS1-128 and DataMatrix barcode segments.
 * Each AI has a code, description, fixed/variable length, and target field mapping.
 *
 * Reference: GS1 General Specifications v24.0, Section 3
 */

export interface AIDefinition {
    /** Application Identifier code (e.g., '01', '10', '17') */
    code: string;
    /** Human-readable name */
    name: string;
    /** Fixed length of data content (null = variable length) */
    fixedLength: number | null;
    /** Maximum length for variable-length AIs */
    maxLength: number;
    /** Target field in QueuedReceiptLine */
    mapsTo: string | null;
    /** Data format hint */
    format: 'numeric' | 'alphanumeric' | 'date';
}

/**
 * GS1 Application Identifier definitions used in medical device labeling.
 * Ordered by AI code for binary search compatibility.
 */
export const AI_REGISTRY: Record<string, AIDefinition> = {
    // ── Primary Identifiers ────────────────────────────────────────────────────
    '01': {
        code: '01',
        name: 'GTIN (Global Trade Item Number)',
        fixedLength: 14,
        maxLength: 14,
        mapsTo: 'itemCode,udiDi',
        format: 'numeric',
    },
    '02': {
        code: '02',
        name: 'GTIN of contained trade items',
        fixedLength: 14,
        maxLength: 14,
        mapsTo: null,
        format: 'numeric',
    },

    // ── Batch, Serial, Dates ───────────────────────────────────────────────────
    '10': {
        code: '10',
        name: 'Batch/Lot Number',
        fixedLength: null,
        maxLength: 20,
        mapsTo: 'batchNo',
        format: 'alphanumeric',
    },
    '11': {
        code: '11',
        name: 'Production Date',
        fixedLength: 6,
        maxLength: 6,
        mapsTo: null,
        format: 'date',
    },
    '17': {
        code: '17',
        name: 'Expiry Date',
        fixedLength: 6,
        maxLength: 6,
        mapsTo: 'expiry',
        format: 'date',
    },
    '21': {
        code: '21',
        name: 'Serial Number',
        fixedLength: null,
        maxLength: 20,
        mapsTo: 'udiPi',
        format: 'alphanumeric',
    },

    // ── Additional Identifiers ─────────────────────────────────────────────────
    '240': {
        code: '240',
        name: 'Additional Product Identification',
        fixedLength: null,
        maxLength: 30,
        mapsTo: null,
        format: 'alphanumeric',
    },
    '30': {
        code: '30',
        name: 'Variable Count',
        fixedLength: null,
        maxLength: 8,
        mapsTo: 'quantity',
        format: 'numeric',
    },
    '37': {
        code: '37',
        name: 'Count of Trade Items',
        fixedLength: null,
        maxLength: 8,
        mapsTo: 'quantity',
        format: 'numeric',
    },
    '310': {
        code: '310',
        name: 'Net Weight (kg)',
        fixedLength: 6,
        maxLength: 6,
        mapsTo: null,
        format: 'numeric',
    },
};

/**
 * AIs with fixed-length data content — no FNC1/GS separator needed after these.
 * All others are variable-length and terminated by FNC1 or end-of-string.
 */
export const FIXED_LENGTH_AIS = new Set(
    Object.values(AI_REGISTRY)
        .filter(ai => ai.fixedLength !== null)
        .map(ai => ai.code)
);

/**
 * AI codes sorted by length descending for greedy prefix matching.
 * 3-digit AIs (e.g., '240', '310') must be checked before 2-digit (e.g., '24', '31').
 */
export const AI_CODES_BY_LENGTH = Object.keys(AI_REGISTRY)
    .sort((a, b) => b.length - a.length);
