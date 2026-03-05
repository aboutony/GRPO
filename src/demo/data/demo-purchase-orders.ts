/**
 * Demo Purchase Orders – 5 Pre-loaded POs
 *
 * Realistic medical device procurement data for the demo sandbox.
 * PO-1001..1004 are Open (for demo scenes), PO-1005 is Closed
 * (for SABER Expired certificate demonstration).
 */

export interface DemoPOLine {
    lineNum: number;
    itemCode: string;
    quantity: number;
    receivedQty: number;
    openQty: number;
    warehouseCode: string;
    unitPrice: number;
    currency: string;
}

export interface DemoPO {
    docEntry: number;
    docNum: number;
    cardCode: string;
    cardName: string;
    docDate: string;
    status: 'Open' | 'Closed';
    lines: DemoPOLine[];
}

export const DEMO_VENDOR = {
    cardCode: 'V-MED-001',
    cardName: 'MedSupply International Ltd.',
    country: 'DE',
};

export const DEMO_PURCHASE_ORDERS: DemoPO[] = [
    // ── PO-1001: Scene 1 — Normal single-scan flow ────────────────────────
    {
        docEntry: 1001,
        docNum: 1001,
        cardCode: DEMO_VENDOR.cardCode,
        cardName: DEMO_VENDOR.cardName,
        docDate: '2026-03-01',
        status: 'Open',
        lines: [
            {
                lineNum: 0,
                itemCode: 'SUT-001',
                quantity: 100,
                receivedQty: 0,
                openQty: 100,
                warehouseCode: 'WH01',
                unitPrice: 45.00,
                currency: 'SAR',
            },
            {
                lineNum: 1,
                itemCode: 'GLV-001',
                quantity: 500,
                receivedQty: 0,
                openQty: 500,
                warehouseCode: 'WH01',
                unitPrice: 12.50,
                currency: 'SAR',
            },
        ],
    },

    // ── PO-1002: Scene 2 — QC Hold demonstration ──────────────────────────
    {
        docEntry: 1002,
        docNum: 1002,
        cardCode: DEMO_VENDOR.cardCode,
        cardName: DEMO_VENDOR.cardName,
        docDate: '2026-03-02',
        status: 'Open',
        lines: [
            {
                lineNum: 0,
                itemCode: 'IMP-001',
                quantity: 20,
                receivedQty: 0,
                openQty: 20,
                warehouseCode: 'WH02',
                unitPrice: 2850.00,
                currency: 'SAR',
            },
        ],
    },

    // ── PO-1003: Scene 3 — Close the loop with SAP post ───────────────────
    {
        docEntry: 1003,
        docNum: 1003,
        cardCode: DEMO_VENDOR.cardCode,
        cardName: DEMO_VENDOR.cardName,
        docDate: '2026-03-03',
        status: 'Open',
        lines: [
            {
                lineNum: 0,
                itemCode: 'SYR-001',
                quantity: 1000,
                receivedQty: 0,
                openQty: 1000,
                warehouseCode: 'WH01',
                unitPrice: 3.75,
                currency: 'SAR',
            },
        ],
    },

    // ── PO-1004: Backup demo ──────────────────────────────────────────────
    {
        docEntry: 1004,
        docNum: 1004,
        cardCode: DEMO_VENDOR.cardCode,
        cardName: DEMO_VENDOR.cardName,
        docDate: '2026-03-03',
        status: 'Open',
        lines: [
            {
                lineNum: 0,
                itemCode: 'BND-001',
                quantity: 200,
                receivedQty: 0,
                openQty: 200,
                warehouseCode: 'WH01',
                unitPrice: 8.25,
                currency: 'SAR',
            },
        ],
    },

    // ── PO-1005: SABER Expired certificate demo ───────────────────────────
    {
        docEntry: 1005,
        docNum: 1005,
        cardCode: DEMO_VENDOR.cardCode,
        cardName: DEMO_VENDOR.cardName,
        docDate: '2025-06-15',
        status: 'Closed',
        lines: [
            {
                lineNum: 0,
                itemCode: 'SUT-001',
                quantity: 50,
                receivedQty: 0,
                openQty: 50,
                warehouseCode: 'WH01',
                unitPrice: 45.00,
                currency: 'SAR',
            },
        ],
    },
];

/** Lookup PO by DocEntry */
export function getPOByEntry(entry: number): DemoPO | undefined {
    return DEMO_PURCHASE_ORDERS.find(po => po.docEntry === entry);
}

/** Get all open POs */
export function getOpenPOs(): DemoPO[] {
    return DEMO_PURCHASE_ORDERS.filter(po => po.status === 'Open');
}

/** Find PO line by item code across all open POs */
export function findPOLineByItem(itemCode: string): {
    po: DemoPO;
    line: DemoPOLine;
} | null {
    for (const po of DEMO_PURCHASE_ORDERS) {
        if (po.status !== 'Open') continue;
        const line = po.lines.find(l => l.itemCode === itemCode && l.openQty > 0);
        if (line) return { po, line };
    }
    return null;
}
