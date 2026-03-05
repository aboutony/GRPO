/**
 * Demo Item Masters – Medical Device Catalog
 *
 * 5 batch-managed items with valid GTIN-14s for the demo sandbox.
 * These map to the Item Master in SAP B1.
 */

export interface DemoItem {
    itemCode: string;
    description: string;
    gtin14: string;
    batchManaged: boolean;
    qcRequired: boolean;
    sterility: 'S' | 'N' | 'T';
    sfdaSubId: string;
    defaultWarehouse: string;
    unitOfMeasure: string;
    category: string;
}

export const DEMO_ITEMS: DemoItem[] = [
    {
        itemCode: 'SUT-001',
        description: 'Suture Silk 3-0, 75cm, 26mm 1/2c Round Body',
        gtin14: '04150123456789',
        batchManaged: true,
        qcRequired: true,
        sterility: 'S',
        sfdaSubId: 'SFDA-SUT-2026-001',
        defaultWarehouse: 'WH01',
        unitOfMeasure: 'BOX',
        category: 'Surgical Sutures',
    },
    {
        itemCode: 'GLV-001',
        description: 'Latex Examination Gloves, Medium, Powder-Free',
        gtin14: '07612345678905',
        batchManaged: true,
        qcRequired: false,
        sterility: 'N',
        sfdaSubId: 'SFDA-GLV-2026-001',
        defaultWarehouse: 'WH01',
        unitOfMeasure: 'BOX',
        category: 'Personal Protective Equipment',
    },
    {
        itemCode: 'IMP-001',
        description: 'Titanium Bone Plate 3.5mm, 6-Hole, Straight',
        gtin14: '05412345678901',
        batchManaged: true,
        qcRequired: true,
        sterility: 'S',
        sfdaSubId: 'SFDA-IMP-2026-001',
        defaultWarehouse: 'WH02',
        unitOfMeasure: 'EACH',
        category: 'Orthopedic Implants',
    },
    {
        itemCode: 'SYR-001',
        description: 'Disposable Syringe 5ml, Luer Lock',
        gtin14: '08712345678907',
        batchManaged: true,
        qcRequired: false,
        sterility: 'S',
        sfdaSubId: 'SFDA-SYR-2026-001',
        defaultWarehouse: 'WH01',
        unitOfMeasure: 'BOX',
        category: 'Injection Supplies',
    },
    {
        itemCode: 'BND-001',
        description: 'Adhesive Bandage 10x20cm, Sterile',
        gtin14: '06212345678903',
        batchManaged: true,
        qcRequired: false,
        sterility: 'N',
        sfdaSubId: 'SFDA-BND-2026-001',
        defaultWarehouse: 'WH01',
        unitOfMeasure: 'BOX',
        category: 'Wound Care',
    },
];

/** Lookup item by code */
export function getItemByCode(code: string): DemoItem | undefined {
    return DEMO_ITEMS.find(i => i.itemCode === code);
}

/** Lookup item by GTIN */
export function getItemByGtin(gtin: string): DemoItem | undefined {
    return DEMO_ITEMS.find(i => i.gtin14 === gtin);
}
