/**
 * Recall Types – Query & Response Shapes
 *
 * For the one-click recall readiness feature.
 * Entering a Batch/UDI returns status across all warehouses in < 15s.
 */

// ── Inventory Status ─────────────────────────────────────────────────────────

export enum InventoryStatus {
    Active = 'ACTIVE',
    Quarantine = 'QUARANTINE',
    Released = 'RELEASED',
    Expired = 'EXPIRED',
}

export const INVENTORY_STATUS_INFO: Record<InventoryStatus, {
    label: string;
    color: string;
    icon: string;
}> = {
    [InventoryStatus.Active]: { label: 'Active', color: '#10B981', icon: '✅' },
    [InventoryStatus.Quarantine]: { label: 'Quarantine', color: '#F59E0B', icon: '🔒' },
    [InventoryStatus.Released]: { label: 'Released', color: '#3B82F6', icon: '🔓' },
    [InventoryStatus.Expired]: { label: 'Expired', color: '#EF4444', icon: '⏰' },
};

// ── Recall Query ─────────────────────────────────────────────────────────────

export interface RecallQuery {
    /** Batch/lot number to search */
    batchNo?: string;
    /** UDI Device Identifier to search */
    udiDi?: string;
    /** Warehouse codes to search across */
    warehouseCodes: string[];
}

// ── Recall Result ────────────────────────────────────────────────────────────

export interface WarehouseRecallResult {
    /** Warehouse code */
    warehouseCode: string;
    /** Warehouse name */
    warehouseName: string;
    /** Inventory status in this warehouse */
    status: InventoryStatus;
    /** Quantity on hand */
    quantity: number;
    /** Bin location(s) */
    binLocations: string[];
    /** Associated GRPO DocEntry(s) */
    grpoDocEntries: number[];
    /** QC inspection result (if inspected) */
    qcResult: 'P' | 'F' | 'C' | null;
    /** Last movement date */
    lastMovementDate: string | null;
}

export interface RecallResult {
    /** Search criteria used */
    query: RecallQuery;
    /** Timestamp of the query */
    queriedAt: string;
    /** Total query duration in ms */
    durationMs: number;
    /** Results per warehouse */
    warehouses: WarehouseRecallResult[];
    /** Aggregate totals */
    totals: {
        totalQuantity: number;
        activeQuantity: number;
        quarantineQuantity: number;
        warehouseCount: number;
    };
}
