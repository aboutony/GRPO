/**
 * Conflict Record – Human-Readable Error Resolution
 *
 * Maps DI API Fatal errors to actionable conflict types
 * with operator guidance.
 */

/** Conflict type codes mapped from DI API error patterns */
export enum ConflictType {
    PO_CLOSED = 'PO_CLOSED',
    FULLY_RECEIVED = 'FULLY_RECEIVED',
    INVALID_UDI = 'INVALID_UDI',
    BATCH_MISSING = 'BATCH_MISSING',
    BATCH_NOT_FOUND = 'BATCH_NOT_FOUND',
    ITEM_NOT_FOUND = 'ITEM_NOT_FOUND',
    QTY_EXCEEDED = 'QTY_EXCEEDED',
    VENDOR_INACTIVE = 'VENDOR_INACTIVE',
    WAREHOUSE_NOT_FOUND = 'WAREHOUSE_NOT_FOUND',
    DOCUMENT_CANCELLED = 'DOCUMENT_CANCELLED',
    UNKNOWN = 'UNKNOWN',
}

/** Human-readable guidance per conflict type */
export const CONFLICT_GUIDANCE: Record<ConflictType, {
    title: string;
    description: string;
    action: string;
    icon: string;
}> = {
    [ConflictType.PO_CLOSED]: {
        title: 'Purchase Order Closed',
        description: 'This PO was closed while you were offline. No further receipts can be posted against it.',
        action: 'Contact Procurement to reopen the PO',
        icon: '🔒',
    },
    [ConflictType.FULLY_RECEIVED]: {
        title: 'Fully Received',
        description: 'All quantities on this PO line have already been received by another operator.',
        action: 'Verify with warehouse supervisor',
        icon: '📦',
    },
    [ConflictType.INVALID_UDI]: {
        title: 'Invalid UDI',
        description: 'The scanned UDI Device Identifier is malformed or not recognized.',
        action: 'Re-scan the device label or enter UDI manually',
        icon: '⚠️',
    },
    [ConflictType.BATCH_MISSING]: {
        title: 'Batch Number Required',
        description: 'This item requires a batch/lot number but none was provided.',
        action: 'Scan the batch label on the packaging',
        icon: '🏷️',
    },
    [ConflictType.BATCH_NOT_FOUND]: {
        title: 'Batch Not Found',
        description: 'The batch number does not exist in SAP master data.',
        action: 'Contact master data team to create the batch',
        icon: '🔍',
    },
    [ConflictType.ITEM_NOT_FOUND]: {
        title: 'Item Not Found',
        description: 'The item code does not exist in the SAP item master.',
        action: 'Contact master data team to verify item setup',
        icon: '❓',
    },
    [ConflictType.QTY_EXCEEDED]: {
        title: 'Quantity Exceeded',
        description: 'The received quantity exceeds the remaining open quantity on the PO.',
        action: 'Adjust count or request a PO amendment',
        icon: '📊',
    },
    [ConflictType.VENDOR_INACTIVE]: {
        title: 'Vendor Inactive',
        description: 'The vendor business partner is frozen or blocked in SAP.',
        action: 'Contact procurement to reactivate the vendor',
        icon: '🚫',
    },
    [ConflictType.WAREHOUSE_NOT_FOUND]: {
        title: 'Warehouse Not Found',
        description: 'The target warehouse code does not exist in SAP.',
        action: 'Contact warehouse admin to verify setup',
        icon: '🏭',
    },
    [ConflictType.DOCUMENT_CANCELLED]: {
        title: 'Document Cancelled',
        description: 'The source document has been cancelled in SAP.',
        action: 'Contact procurement for a replacement PO',
        icon: '✖️',
    },
    [ConflictType.UNKNOWN]: {
        title: 'Unknown Error',
        description: 'An unrecognized SAP error occurred during posting.',
        action: 'Contact IT support with the error details below',
        icon: '🔧',
    },
};

/** Conflict record stored in local SQLite */
export interface ConflictRecord {
    /** Foreign key to grpo_receipts.id */
    receiptId: string;
    /** Classified conflict type */
    conflictType: ConflictType;
    /** Raw SAP error code */
    sapErrorCode: number | null;
    /** Raw SAP error message */
    sapErrorMessage: string;
    /** When the conflict was detected */
    detectedAt: string;
    /** Whether the operator has acknowledged this conflict */
    acknowledged: boolean;
    /** Optional operator notes */
    operatorNotes: string | null;
}
