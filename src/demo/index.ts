/**
 * Demo Module – Public API Barrel Export
 */

// ── Data ─────────────────────────────────────────────────────────────────────
export { DEMO_ITEMS, getItemByCode, getItemByGtin } from './data/demo-items';
export type { DemoItem } from './data/demo-items';

export {
    DEMO_PURCHASE_ORDERS, DEMO_VENDOR,
    getPOByEntry, getOpenPOs, findPOLineByItem,
} from './data/demo-purchase-orders';
export type { DemoPO, DemoPOLine } from './data/demo-purchase-orders';

export {
    DEMO_BARCODES, getBarcodeForScene, getBarcodesForPO,
} from './data/demo-barcodes';
export type { DemoBarcode } from './data/demo-barcodes';

// ── Mocks ────────────────────────────────────────────────────────────────────
export {
    mockValidateCertificate, mockValidateReceipt,
} from './mocks/saber-mock';

export {
    mockPostGRPO, getPostedDocuments, getPostedDocument,
    getPostedCount, resetMock,
} from './mocks/sap-mock';
export type { MockPostResult, PostedDocument } from './mocks/sap-mock';

// ── Story ────────────────────────────────────────────────────────────────────
export { buildStoryScript } from './story/story-script';
export type { StoryScene, StoryStep, StepComponent } from './story/story-script';

export { StoryRunner } from './story/StoryRunner';
