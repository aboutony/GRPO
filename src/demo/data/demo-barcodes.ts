/**
 * Demo Barcodes – Pre-built GS1-128 Strings
 *
 * Each barcode matches a demo item and PO line.
 * Formatted in both parenthesized AI format and raw FNC1-delimited format
 * to test both parser paths.
 */

export interface DemoBarcode {
    /** Human label for the barcode */
    label: string;
    /** Item code this barcode maps to */
    itemCode: string;
    /** PO DocEntry this barcode is for */
    poDocEntry: number;
    /** Parenthesized GS1-128 format */
    parenthesized: string;
    /** Raw FNC1-delimited format (\x1D = GS separator) */
    raw: string;
    /** Expected parsed fields */
    expected: {
        gtin: string;
        batchNo: string;
        expiry: string;     // ISO date
        serialNo: string | null;
    };
}

/** FNC1 Group Separator character */
const GS = '\x1D';

export const DEMO_BARCODES: DemoBarcode[] = [
    // ── Scene 1: Suture-001 — Full GS1-128 with serial ────────────────────
    {
        label: 'Suture Silk 3-0 (Scene 1)',
        itemCode: 'SUT-001',
        poDocEntry: 1001,
        parenthesized: '(01)04150123456789(10)BATCH-A01(17)270601(21)SN-SUT-001',
        raw: `0104150123456789${GS}10BATCH-A01${GS}17270601${GS}21SN-SUT-001`,
        expected: {
            gtin: '04150123456789',
            batchNo: 'BATCH-A01',
            expiry: '2027-06-01',
            serialNo: 'SN-SUT-001',
        },
    },

    // ── Scene 1: Latex Gloves — No serial ─────────────────────────────────
    {
        label: 'Latex Exam Gloves M (Scene 1)',
        itemCode: 'GLV-001',
        poDocEntry: 1001,
        parenthesized: '(01)07612345678905(10)BATCH-G01(17)261201',
        raw: `0107612345678905${GS}10BATCH-G01${GS}17261201`,
        expected: {
            gtin: '07612345678905',
            batchNo: 'BATCH-G01',
            expiry: '2026-12-01',
            serialNo: null,
        },
    },

    // ── Scene 2: Titanium Bone Plate — QC Required item ────────────────────
    {
        label: 'Titanium Bone Plate 3.5mm (Scene 2 — QC Hold)',
        itemCode: 'IMP-001',
        poDocEntry: 1002,
        parenthesized: '(01)05412345678901(10)BATCH-T01(17)280301(21)SN-IMP-001',
        raw: `0105412345678901${GS}10BATCH-T01${GS}17280301${GS}21SN-IMP-001`,
        expected: {
            gtin: '05412345678901',
            batchNo: 'BATCH-T01',
            expiry: '2028-03-01',
            serialNo: 'SN-IMP-001',
        },
    },

    // ── Scene 3: Disposable Syringe — Close the loop ──────────────────────
    {
        label: 'Disposable Syringe 5ml (Scene 3 — SAP Post)',
        itemCode: 'SYR-001',
        poDocEntry: 1003,
        parenthesized: '(01)08712345678907(10)BATCH-S01(17)271201(21)SN-SYR-001',
        raw: `0108712345678907${GS}10BATCH-S01${GS}17271201${GS}21SN-SYR-001`,
        expected: {
            gtin: '08712345678907',
            batchNo: 'BATCH-S01',
            expiry: '2027-12-01',
            serialNo: 'SN-SYR-001',
        },
    },

    // ── SABER Expired demo: Suture from PO-1005 ──────────────────────────
    {
        label: 'Suture Silk 3-0 (SABER Expired)',
        itemCode: 'SUT-001',
        poDocEntry: 1005,
        parenthesized: '(01)04150123456789(10)BATCH-X99(17)250615(21)SN-EXP-001',
        raw: `0104150123456789${GS}10BATCH-X99${GS}17250615${GS}21SN-EXP-001`,
        expected: {
            gtin: '04150123456789',
            batchNo: 'BATCH-X99',
            expiry: '2025-06-15',
            serialNo: 'SN-EXP-001',
        },
    },
];

/** Get barcode for a specific scene */
export function getBarcodeForScene(sceneNum: 1 | 2 | 3): DemoBarcode {
    const sceneMap: Record<number, number> = { 1: 0, 2: 2, 3: 3 };
    return DEMO_BARCODES[sceneMap[sceneNum]];
}

/** Get all barcodes for a given PO */
export function getBarcodesForPO(poDocEntry: number): DemoBarcode[] {
    return DEMO_BARCODES.filter(b => b.poDocEntry === poDocEntry);
}
