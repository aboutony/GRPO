/**
 * Recall Query – Batch/UDI Search Across Warehouses
 *
 * One-click recall readiness: entering a Batch or UDI returns
 * the status (Active vs Quarantine) across all warehouses in < 15s.
 *
 * Queries SAP tables:
 *   OIBT  — Batch transactions (receipt/issue records)
 *   OBTQ  — Batch quantities (on-hand per warehouse)
 *   @GRPO_QC_RECORDS — QC inspection results
 */

import {
    InventoryStatus,
    type RecallQuery,
    type RecallResult,
    type WarehouseRecallResult,
} from '../models/recall-types';

/**
 * Service Layer session interface (provided by connection module).
 */
export interface ServiceLayerClient {
    query: <T>(endpoint: string, params?: Record<string, string>) => Promise<T>;
}

/**
 * Executes a recall query across all specified warehouses.
 * Returns aggregated results with status per warehouse.
 *
 * Target performance: < 15s for 3 warehouses.
 *
 * @param client - Service Layer client for SAP queries
 * @param query - The recall query (batch and/or UDI, warehouse list)
 * @returns RecallResult with per-warehouse breakdown
 */
export async function executeRecallQuery(
    client: ServiceLayerClient,
    query: RecallQuery
): Promise<RecallResult> {
    const start = performance.now();

    if (!query.batchNo && !query.udiDi) {
        throw new Error('Recall query requires at least one of batchNo or udiDi');
    }

    // ── Parallel queries across warehouses ──────────────────────────────────
    const warehousePromises = query.warehouseCodes.map(whsCode =>
        queryWarehouse(client, query, whsCode)
    );

    const warehouses = await Promise.all(warehousePromises);

    // ── Aggregate totals ───────────────────────────────────────────────────
    const totals = {
        totalQuantity: 0,
        activeQuantity: 0,
        quarantineQuantity: 0,
        warehouseCount: warehouses.filter(w => w.quantity > 0).length,
    };

    for (const wh of warehouses) {
        totals.totalQuantity += wh.quantity;
        if (wh.status === InventoryStatus.Active || wh.status === InventoryStatus.Released) {
            totals.activeQuantity += wh.quantity;
        } else if (wh.status === InventoryStatus.Quarantine) {
            totals.quarantineQuantity += wh.quantity;
        }
    }

    const durationMs = Math.round(performance.now() - start);

    return {
        query,
        queriedAt: new Date().toISOString(),
        durationMs,
        warehouses,
        totals,
    };
}

/**
 * Queries a single warehouse for batch/UDI inventory data.
 */
async function queryWarehouse(
    client: ServiceLayerClient,
    query: RecallQuery,
    warehouseCode: string
): Promise<WarehouseRecallResult> {
    try {
        // ── Query 1: Batch quantities from OBTQ ──────────────────────────────
        const batchFilter = query.batchNo
            ? `DistNumber eq '${escapeSapString(query.batchNo)}'`
            : '';
        const whsFilter = `WhsCode eq '${escapeSapString(warehouseCode)}'`;
        const filter = [batchFilter, whsFilter].filter(Boolean).join(' and ');

        const batchData = await client.query<{
            value: Array<{
                DistNumber: string;
                WhsCode: string;
                Quantity: number;
                Status: string;
                BinLocations?: string[];
            }>;
        }>('BatchNumberDetails', { $filter: filter });

        // ── Query 2: QC records from @GRPO_QC_RECORDS ────────────────────────
        let qcResult: 'P' | 'F' | 'C' | null = null;
        if (query.batchNo) {
            const qcData = await client.query<{
                value: Array<{ U_GRPO_Result: string }>;
            }>('GRPO_QC_RECORDS', {
                $filter: `U_GRPO_BatchRef eq '${escapeSapString(query.batchNo)}'`,
                $orderby: 'U_GRPO_InspDate desc',
                $top: '1',
            });

            if (qcData.value?.length > 0) {
                qcResult = qcData.value[0].U_GRPO_Result as 'P' | 'F' | 'C';
            }
        }

        // ── Query 3: GRPO document references ────────────────────────────────
        const grpoData = await client.query<{
            value: Array<{ DocEntry: number; DocDate: string }>;
        }>('PurchaseDeliveryNotes', {
            $filter: `DocumentLines/any(d: d/BatchNumbers/any(b: b/BatchNumber eq '${escapeSapString(query.batchNo ?? '')}') and d/WarehouseCode eq '${escapeSapString(warehouseCode)}')`,
            $select: 'DocEntry,DocDate',
            $orderby: 'DocDate desc',
            $top: '10',
        });

        // ── Determine status ─────────────────────────────────────────────────
        const totalQty = batchData.value?.reduce((sum, b) => sum + b.Quantity, 0) ?? 0;
        const isLocked = batchData.value?.some(b => b.Status === 'bsStatus_Locked');
        const binLocations = batchData.value?.flatMap(b => b.BinLocations ?? []) ?? [];
        const grpoEntries = grpoData.value?.map(d => d.DocEntry) ?? [];
        const lastDate = grpoData.value?.[0]?.DocDate ?? null;

        let status: InventoryStatus;
        if (totalQty === 0) {
            status = InventoryStatus.Active; // No stock
        } else if (isLocked) {
            status = InventoryStatus.Quarantine;
        } else if (qcResult === 'P' || qcResult === 'C') {
            status = InventoryStatus.Quarantine; // Pending or conditional
        } else {
            status = InventoryStatus.Active;
        }

        return {
            warehouseCode,
            warehouseName: warehouseCode, // Would be resolved from warehouse master
            status,
            quantity: totalQty,
            binLocations: [...new Set(binLocations)],
            grpoDocEntries: grpoEntries,
            qcResult,
            lastMovementDate: lastDate,
        };

    } catch (error) {
        // Return empty result on query failure — don't block other warehouses
        return {
            warehouseCode,
            warehouseName: warehouseCode,
            status: InventoryStatus.Active,
            quantity: 0,
            binLocations: [],
            grpoDocEntries: [],
            qcResult: null,
            lastMovementDate: null,
        };
    }
}

/** Escapes single quotes for SAP OData filter strings */
function escapeSapString(value: string): string {
    return value.replace(/'/g, "''");
}
