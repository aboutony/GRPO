/**
 * Story Script – 3-Scene Demo Orchestrator
 *
 * Drives the "Story Mode" walkthrough:
 *   Scene 1: Single-scan capture of a GS1-128 barcode
 *   Scene 2: Handling a "QC Required" item with evidence capture
 *   Scene 3: Closing the loop with a real-time SAP B1 document post
 *
 * Each scene has narrated steps that the StoryRunner advances through.
 */

import { getBarcodeForScene } from '../data/demo-barcodes';
import { getItemByCode } from '../data/demo-items';
import { findPOLineByItem } from '../data/demo-purchase-orders';

// ── Step Types ───────────────────────────────────────────────────────────────

export type StepComponent =
    | 'HUD'             // Camera HUD with scan reticle
    | 'SCAN_RESULT'     // Parsed barcode result card
    | 'SABER_CHECK'     // SABER validation indicator
    | 'PUTAWAY_GREEN'   // Green putaway screen
    | 'PUTAWAY_YELLOW'  // Yellow QC Hold putaway screen
    | 'EVIDENCE'        // QC evidence capture
    | 'SAP_POST'        // SAP posting confirmation
    | 'AUDIT_ENTRY'     // Audit log chain entry
    | 'SFDA_QUEUE'      // SFDA export queue confirmation
    | 'SABER_BLOCK'     // SABER certificate blocked
    | 'COMPLETE';       // Scene complete

export interface StoryStep {
    /** Step number within the scene */
    stepNum: number;
    /** Narrator text (displayed at top of screen) */
    narration: string;
    /** Which component to show in viewport */
    component: StepComponent;
    /** Haptic pattern to trigger */
    haptic: 'scan' | 'success' | 'warning' | 'none';
    /** Auto-advance delay in ms (0 = manual) */
    autoAdvanceMs: number;
    /** Step-specific data payload */
    data: Record<string, unknown>;
}

export interface StoryScene {
    sceneNum: number;
    title: string;
    subtitle: string;
    icon: string;
    steps: StoryStep[];
}

// ── Scene Builder ────────────────────────────────────────────────────────────

/**
 * Builds the complete 3-scene story script.
 */
export function buildStoryScript(): StoryScene[] {
    return [
        buildScene1(),
        buildScene2(),
        buildScene3(),
    ];
}

// ── Scene 1: Single-Scan Intelligence ────────────────────────────────────────

function buildScene1(): StoryScene {
    const barcode = getBarcodeForScene(1);
    const item = getItemByCode(barcode.itemCode)!;
    const poMatch = findPOLineByItem(barcode.itemCode)!;

    return {
        sceneNum: 1,
        title: 'Single-Scan Intelligence',
        subtitle: 'One barcode. Four fields. Zero keystrokes.',
        icon: '📷',
        steps: [
            {
                stepNum: 1,
                narration: 'The operator holds the device up to the shipment label. The camera activates with the HUD overlay.',
                component: 'HUD',
                haptic: 'none',
                autoAdvanceMs: 0,
                data: { itemDescription: item.description },
            },
            {
                stepNum: 2,
                narration: `A GS1-128 barcode is detected. The bounding box turns green as the parser extracts GTIN, Batch, Expiry, and Serial in under 50ms.`,
                component: 'SCAN_RESULT',
                haptic: 'scan',
                autoAdvanceMs: 0,
                data: {
                    barcode: barcode.parenthesized,
                    expected: barcode.expected,
                    itemDescription: item.description,
                },
            },
            {
                stepNum: 3,
                narration: 'SABER Certificate of Conformity is validated in real-time. Status: ✅ Valid. The item is cleared for receiving.',
                component: 'SABER_CHECK',
                haptic: 'none',
                autoAdvanceMs: 0,
                data: {
                    certificateId: 'SABER-2026-00001',
                    status: 'VALID',
                    issuingBody: 'SGS Saudi Arabia',
                },
            },
            {
                stepNum: 4,
                narration: `The putaway screen shows the exact bin location. Bin ${poMatch.line.warehouseCode}-A03-R02, Zone A, Aisle 3, Rack 02. The operator walks directly there.`,
                component: 'PUTAWAY_GREEN',
                haptic: 'success',
                autoAdvanceMs: 0,
                data: {
                    binCode: `${poMatch.line.warehouseCode}-A03-R02`,
                    zone: 'A', aisle: '3', rack: '02', level: '1',
                    storageNote: null,
                },
            },
            {
                stepNum: 5,
                narration: 'Scene 1 complete. Total time: under 10 seconds from scan to putaway instruction. The "Story Mode" flow — no friction.',
                component: 'COMPLETE',
                haptic: 'success',
                autoAdvanceMs: 0,
                data: { sceneTime: '< 10s' },
            },
        ],
    };
}

// ── Scene 2: QC Safety Gate ──────────────────────────────────────────────────

function buildScene2(): StoryScene {
    const barcode = getBarcodeForScene(2);
    const item = getItemByCode(barcode.itemCode)!;

    return {
        sceneNum: 2,
        title: 'QC Safety Gate',
        subtitle: 'Uninspected medical devices never enter active inventory.',
        icon: '🔬',
        steps: [
            {
                stepNum: 1,
                narration: 'A Titanium Bone Plate arrives. This is a Class II implantable device — QC inspection is mandatory.',
                component: 'HUD',
                haptic: 'none',
                autoAdvanceMs: 0,
                data: { itemDescription: item.description },
            },
            {
                stepNum: 2,
                narration: `Barcode scanned. GTIN: ${barcode.expected.gtin}, Batch: ${barcode.expected.batchNo}. The system detects QC Required = Yes.`,
                component: 'SCAN_RESULT',
                haptic: 'scan',
                autoAdvanceMs: 0,
                data: {
                    barcode: barcode.parenthesized,
                    expected: barcode.expected,
                    qcRequired: true,
                    itemDescription: item.description,
                },
            },
            {
                stepNum: 3,
                narration: 'The putaway screen shifts from Green to Yellow. Quarantine Bin assigned: QC-WH02-HOLD. The operator sees the warning: "Item requires inspection before distribution."',
                component: 'PUTAWAY_YELLOW',
                haptic: 'warning',
                autoAdvanceMs: 0,
                data: {
                    binCode: 'QC-WH02-HOLD',
                    zone: 'QC', aisle: 'HOLD', rack: '01', level: '01',
                    storageNote: '⚠️ QC HOLD — Do not distribute. Awaiting inspection.',
                    isQcHold: true,
                },
            },
            {
                stepNum: 4,
                narration: 'The operator taps "Capture Evidence." The camera opens for a photo of the packaging. Defect codes are selected: Label appears intact.',
                component: 'EVIDENCE',
                haptic: 'none',
                autoAdvanceMs: 0,
                data: {
                    itemDescription: item.description,
                    batchNo: barcode.expected.batchNo,
                },
            },
            {
                stepNum: 5,
                narration: 'Inspection submitted. Batch is LOCKED in SAP — it cannot be picked for sales or delivery until a QA Specialist clears it. Zero uninspected devices in active inventory.',
                component: 'SAP_POST',
                haptic: 'success',
                autoAdvanceMs: 0,
                data: {
                    batchLocked: true,
                    qcStatus: 'Pending',
                },
            },
            {
                stepNum: 6,
                narration: 'Scene 2 complete. The QC safety gate caught an implantable device and routed it to quarantine with a full digital inspection record.',
                component: 'COMPLETE',
                haptic: 'success',
                autoAdvanceMs: 0,
                data: {},
            },
        ],
    };
}

// ── Scene 3: Close the Loop ──────────────────────────────────────────────────

function buildScene3(): StoryScene {
    const barcode = getBarcodeForScene(3);
    const item = getItemByCode(barcode.itemCode)!;

    return {
        sceneNum: 3,
        title: 'Close the Loop',
        subtitle: 'From mobile HUD to SAP B1 Purchase Delivery Notes — one flow.',
        icon: '🔄',
        steps: [
            {
                stepNum: 1,
                narration: 'Final scene. A box of disposable syringes. Let\'s go from scan to SAP document in one seamless flow.',
                component: 'HUD',
                haptic: 'none',
                autoAdvanceMs: 0,
                data: { itemDescription: item.description },
            },
            {
                stepNum: 2,
                narration: `Barcode scanned: ${item.description}. Batch: ${barcode.expected.batchNo}. All fields auto-populated from the single scan.`,
                component: 'SCAN_RESULT',
                haptic: 'scan',
                autoAdvanceMs: 0,
                data: {
                    barcode: barcode.parenthesized,
                    expected: barcode.expected,
                    itemDescription: item.description,
                },
            },
            {
                stepNum: 3,
                narration: 'SABER validated ✅. Green putaway assigned. Operator confirms receipt.',
                component: 'PUTAWAY_GREEN',
                haptic: 'success',
                autoAdvanceMs: 0,
                data: {
                    binCode: 'WH01-B07-R01',
                    zone: 'B', aisle: '7', rack: '01', level: '2',
                    storageNote: null,
                },
            },
            {
                stepNum: 4,
                narration: 'The GRPO is posted to SAP Business One. Purchase Delivery Note created. DocEntry: 5003, DocNum: 5003. The red thread from PO → Receipt is complete.',
                component: 'SAP_POST',
                haptic: 'success',
                autoAdvanceMs: 0,
                data: {
                    docEntry: 5003,
                    docNum: 5003,
                    poDocNum: 1003,
                    cardName: 'MedSupply International Ltd.',
                },
            },
            {
                stepNum: 5,
                narration: 'The audit log records a new SHA-256 hash chain entry: GRPO_POSTED. This entry is tamper-proof for 10 years — ready for any SFDA inspection.',
                component: 'AUDIT_ENTRY',
                haptic: 'none',
                autoAdvanceMs: 0,
                data: {
                    action: 'GRPO_POSTED',
                    chainHash: 'a4f2c8...demo',
                },
            },
            {
                stepNum: 6,
                narration: 'The receipt is queued for the daily SFDA Saudi-DI export. UDI-DI, batch, and expiry will be transmitted tonight at 23:00. Regulatory compliance: automatic.',
                component: 'SFDA_QUEUE',
                haptic: 'none',
                autoAdvanceMs: 0,
                data: {
                    reportDate: new Date().toISOString().split('T')[0],
                    recordCount: 1,
                },
            },
            {
                stepNum: 7,
                narration: '🎉 Demo complete. From mobile HUD to SAP document — zero manual data entry, zero compliance gaps, under 10 seconds per item.',
                component: 'COMPLETE',
                haptic: 'success',
                autoAdvanceMs: 0,
                data: { totalScenes: 3 },
            },
        ],
    };
}
