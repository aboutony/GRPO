/**
 * Inventory Lock – DI API "Locked" Status Payload Builder
 *
 * Ensures QC-held items cannot be picked for sales/delivery orders
 * until a QA Specialist clears them.
 *
 * Uses SAP DI API batch status: bsStatus_Locked
 * and header UDF: U_GRPO_QcStatus = 'P' (Pending)
 */

// ── SAP Batch Status Constants (mirrors SAPbobsCOM.BoItemBatchStatus) ────────

export enum SapBatchStatus {
    /** Not accessible — blocked from all transactions */
    Locked = 'bsStatus_Locked',
    /** Not accessible but reserved */
    NotAccessible = 'bsStatus_NotAccessible',
    /** Released — available for all transactions */
    Released = 'bsStatus_Released',
}

// ── Lock Payload ─────────────────────────────────────────────────────────────

export interface BatchLockPayload {
    /** Batch number to lock */
    batchNo: string;
    /** Item code this batch belongs to */
    itemCode: string;
    /** Warehouse code where the batch is stored */
    warehouseCode: string;
    /** Lock status to set */
    status: SapBatchStatus;
    /** Reason for locking */
    lockReason: string;
}

/**
 * Builds the DI API payload additions for locking a batch.
 *
 * When posting a GRPO via DI API, these fields are set on the
 * BatchNumbers collection of the document line:
 *   - BatchNumber.Status = 'bsStatus_Locked'
 *
 * And on the document header:
 *   - UserFields['U_GRPO_QcStatus'] = 'P' (Pending inspection)
 */
export function buildLockPayload(
    batchNo: string,
    itemCode: string,
    warehouseCode: string
): BatchLockPayload {
    return {
        batchNo,
        itemCode,
        warehouseCode,
        status: SapBatchStatus.Locked,
        lockReason: 'QC Hold — awaiting quality inspection',
    };
}

/**
 * Builds the DI API payload for unlocking a batch after QA clearance.
 *
 * Called by QA Specialist when inspection passes.
 * Sets batch status back to Released and updates QcStatus to 'A' (Approved).
 */
export function buildUnlockPayload(
    batchNo: string,
    itemCode: string,
    warehouseCode: string
): BatchLockPayload {
    return {
        batchNo,
        itemCode,
        warehouseCode,
        status: SapBatchStatus.Released,
        lockReason: 'QA cleared — released for distribution',
    };
}

/**
 * Returns the header UDF values for QC status.
 */
export function getQcHeaderFields(isQcHold: boolean): Record<string, string> {
    return {
        U_GRPO_QcStatus: isQcHold ? 'P' : 'A',
    };
}

/**
 * Generates the SAP Service Layer PATCH payload for batch status update.
 * Used for post-inspection unlock operations.
 */
export function buildBatchStatusPatch(payload: BatchLockPayload) {
    return {
        BatchNumber: payload.batchNo,
        ItemCode: payload.itemCode,
        Warehouse: payload.warehouseCode,
        Status: payload.status,
        Notes: payload.lockReason,
    };
}
