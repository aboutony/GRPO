/**
 * Cross-Warehouse Recall – Global Batch Query
 *
 * Spans all 3 KSA facilities simultaneously for instant
 * batch tracking. Returns per-facility breakdown with
 * geographic province mapping.
 */

import { FACILITIES, type Facility, type Province } from './facility-registry';

// ── Types ────────────────────────────────────────────────────────────────────

export interface CrossWarehouseQuery {
    batchNo: string;
    itemCode?: string;
    facilities?: string[];  // Optional filter — defaults to all
}

export interface FacilityRecallResult {
    facilityId: string;
    facilityName: string;
    city: string;
    province: Province;
    warehouseCode: string;
    found: boolean;
    quantity: number;
    status: 'Active' | 'Quarantine' | 'Released' | 'Not Found';
    binLocations: string[];
    qcStatus: string | null;
    grpoDocNums: number[];
    searchTimeMs: number;
}

export interface CrossWarehouseResult {
    queryId: string;
    batchNo: string;
    totalFacilities: number;
    facilitiesSearched: number;
    facilitiesWithBatch: number;
    totalQuantity: number;
    results: FacilityRecallResult[];
    provinceBreakdown: Array<{
        province: Province;
        totalQuantity: number;
        facilities: number;
        status: string;
    }>;
    totalSearchTimeMs: number;
    withinTarget: boolean;
    searchedAt: string;
}

// ── Data Source ───────────────────────────────────────────────────────────────

export interface FacilityRecallDataSource {
    searchBatch(
        facility: Facility,
        batchNo: string,
        itemCode?: string
    ): Promise<{
        found: boolean;
        quantity: number;
        status: string;
        bins: string[];
        qcStatus: string | null;
        grpoDocNums: number[];
    }>;
}

// ── Global Query ─────────────────────────────────────────────────────────────

const SEARCH_TIMEOUT_MS = 15_000;

/**
 * Searches for a batch across all KSA facilities simultaneously.
 */
export async function executeGlobalRecall(
    query: CrossWarehouseQuery,
    dataSource: FacilityRecallDataSource
): Promise<CrossWarehouseResult> {
    const startTime = performance.now();
    const queryId = `GLOBAL-RECALL-${Date.now()}`;

    // Determine target facilities
    const targets = query.facilities
        ? FACILITIES.filter(f => query.facilities!.includes(f.code))
        : FACILITIES.filter(f => f.status === 'active' || f.schemaSynced);

    // Parallel search with per-site timeout
    const searches = targets.map(async (facility): Promise<FacilityRecallResult> => {
        const siteStart = performance.now();

        try {
            const result = await Promise.race([
                dataSource.searchBatch(facility, query.batchNo, query.itemCode),
                timeout(SEARCH_TIMEOUT_MS),
            ]);

            if (!result) {
                return emptyResult(facility, Math.round(performance.now() - siteStart), 'Timeout');
            }

            return {
                facilityId: facility.facilityId,
                facilityName: facility.name,
                city: facility.city,
                province: facility.province,
                warehouseCode: facility.warehouse.code,
                found: result.found,
                quantity: result.quantity,
                status: mapStatus(result.status),
                binLocations: result.bins,
                qcStatus: result.qcStatus,
                grpoDocNums: result.grpoDocNums,
                searchTimeMs: Math.round(performance.now() - siteStart),
            };
        } catch {
            return emptyResult(facility, Math.round(performance.now() - siteStart), 'Error');
        }
    });

    const results = await Promise.all(searches);
    const totalSearchTimeMs = Math.round(performance.now() - startTime);

    // Province breakdown
    const provinceMap = new Map<Province, { qty: number; count: number; statuses: string[] }>();
    for (const r of results) {
        const existing = provinceMap.get(r.province) ?? { qty: 0, count: 0, statuses: [] };
        if (r.found) {
            existing.qty += r.quantity;
            existing.count++;
            existing.statuses.push(r.status);
        }
        provinceMap.set(r.province, existing);
    }

    const provinceBreakdown = Array.from(provinceMap.entries()).map(([province, data]) => ({
        province,
        totalQuantity: data.qty,
        facilities: data.count,
        status: data.statuses.length > 0 ? data.statuses.join(', ') : 'Not Found',
    }));

    return {
        queryId,
        batchNo: query.batchNo,
        totalFacilities: FACILITIES.length,
        facilitiesSearched: targets.length,
        facilitiesWithBatch: results.filter(r => r.found).length,
        totalQuantity: results.reduce((sum, r) => sum + r.quantity, 0),
        results,
        provinceBreakdown,
        totalSearchTimeMs,
        withinTarget: totalSearchTimeMs <= SEARCH_TIMEOUT_MS,
        searchedAt: new Date().toISOString(),
    };
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function mapStatus(raw: string): 'Active' | 'Quarantine' | 'Released' | 'Not Found' {
    switch (raw.toLowerCase()) {
        case 'active': return 'Active';
        case 'quarantine': case 'locked': return 'Quarantine';
        case 'released': return 'Released';
        default: return 'Not Found';
    }
}

function emptyResult(facility: Facility, timeMs: number, reason: string): FacilityRecallResult {
    return {
        facilityId: facility.facilityId,
        facilityName: facility.name,
        city: facility.city,
        province: facility.province,
        warehouseCode: facility.warehouse.code,
        found: false,
        quantity: 0,
        status: 'Not Found',
        binLocations: [],
        qcStatus: null,
        grpoDocNums: [],
        searchTimeMs: timeMs,
    };
}

function timeout(ms: number): Promise<null> {
    return new Promise(resolve => setTimeout(() => resolve(null), ms));
}
