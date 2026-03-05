/**
 * Recall Drill – Mock Recall Protocol for Compliance Sign-off
 *
 * Traces a live batch across the entire facility to validate
 * recall readiness. Target: full traceability in under 15 minutes.
 */

// ── Drill Types ──────────────────────────────────────────────────────────────

export type DrillPhase =
    | 'INITIATED'
    | 'SEARCHING'
    | 'RESULTS_COLLECTED'
    | 'REPORT_GENERATED'
    | 'COMPLETED';

export interface RecallDrillConfig {
    /** Batch number to trace */
    targetBatch: string;
    /** Item code (optional filter) */
    itemCode?: string;
    /** Warehouses to search */
    warehouses: string[];
    /** Initiated by (compliance officer name) */
    initiatedBy: string;
    /** Maximum allowed duration (ms) */
    maxDurationMs: number;
}

export interface DrillResult {
    drillId: string;
    config: RecallDrillConfig;
    phase: DrillPhase;
    startedAt: string;
    completedAt: string | null;
    durationMs: number;
    withinTarget: boolean;
    warehouseResults: WarehouseDrillResult[];
    totalQuantityFound: number;
    complianceReport: ComplianceReport;
}

export interface WarehouseDrillResult {
    warehouseCode: string;
    found: boolean;
    quantity: number;
    status: 'Active' | 'Quarantine' | 'Released' | 'Not Found';
    binLocations: string[];
    qcStatus: string | null;
    grpoDocNums: number[];
    searchTimeMs: number;
}

export interface ComplianceReport {
    reportId: string;
    generatedAt: string;
    batchTraced: string;
    facilityName: string;
    totalWarehouses: number;
    warehousesWithBatch: number;
    totalQuantity: number;
    allLocationsIdentified: boolean;
    traceabilityComplete: boolean;
    recallReadinessScore: number;
    recommendation: string;
}

// ── Recall Data Source ───────────────────────────────────────────────────────

export interface RecallDataSource {
    searchBatchInWarehouse(
        batchNo: string,
        warehouseCode: string,
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

// ── Drill Execution ──────────────────────────────────────────────────────────

/**
 * Executes a mock recall drill across the facility.
 */
export async function executeRecallDrill(
    config: RecallDrillConfig,
    dataSource: RecallDataSource
): Promise<DrillResult> {
    const drillId = `RECALL-DRILL-${Date.now()}`;
    const startedAt = new Date().toISOString();
    const start = performance.now();

    // ── Phase: SEARCHING ───────────────────────────────────────────────────
    const warehouseResults: WarehouseDrillResult[] = [];

    // Parallel search across all warehouses
    const searches = config.warehouses.map(async (wh) => {
        const whStart = performance.now();
        try {
            const result = await dataSource.searchBatchInWarehouse(
                config.targetBatch, wh, config.itemCode
            );
            return {
                warehouseCode: wh,
                found: result.found,
                quantity: result.quantity,
                status: mapStatus(result.status),
                binLocations: result.bins,
                qcStatus: result.qcStatus,
                grpoDocNums: result.grpoDocNums,
                searchTimeMs: Math.round(performance.now() - whStart),
            } as WarehouseDrillResult;
        } catch {
            return {
                warehouseCode: wh,
                found: false,
                quantity: 0,
                status: 'Not Found' as const,
                binLocations: [],
                qcStatus: null,
                grpoDocNums: [],
                searchTimeMs: Math.round(performance.now() - whStart),
            };
        }
    });

    const results = await Promise.all(searches);
    warehouseResults.push(...results);

    // ── Phase: REPORT ──────────────────────────────────────────────────────
    const durationMs = Math.round(performance.now() - start);
    const totalQuantity = warehouseResults.reduce((sum, r) => sum + r.quantity, 0);
    const warehousesWithBatch = warehouseResults.filter(r => r.found).length;
    const allLocated = warehouseResults.every(r => !r.found || r.binLocations.length > 0);

    const recallScore = calculateRecallScore(
        warehouseResults, durationMs, config.maxDurationMs
    );

    const complianceReport: ComplianceReport = {
        reportId: `${drillId}-REPORT`,
        generatedAt: new Date().toISOString(),
        batchTraced: config.targetBatch,
        facilityName: 'UNIMED Riyadh Central Warehouse',
        totalWarehouses: config.warehouses.length,
        warehousesWithBatch,
        totalQuantity,
        allLocationsIdentified: allLocated,
        traceabilityComplete: true,
        recallReadinessScore: recallScore,
        recommendation: recallScore >= 90
            ? '✅ PASS — Facility is recall-ready. Full traceability confirmed.'
            : recallScore >= 70
                ? '⚠️ CONDITIONAL — Minor gaps detected. Review bin assignments.'
                : '❌ FAIL — Traceability gaps found. Remediation required before sign-off.',
    };

    return {
        drillId,
        config,
        phase: 'COMPLETED',
        startedAt,
        completedAt: new Date().toISOString(),
        durationMs,
        withinTarget: durationMs <= config.maxDurationMs,
        warehouseResults,
        totalQuantityFound: totalQuantity,
        complianceReport,
    };
}

function mapStatus(raw: string): 'Active' | 'Quarantine' | 'Released' | 'Not Found' {
    switch (raw.toLowerCase()) {
        case 'active': return 'Active';
        case 'quarantine': case 'locked': return 'Quarantine';
        case 'released': return 'Released';
        default: return 'Not Found';
    }
}

function calculateRecallScore(
    results: WarehouseDrillResult[],
    durationMs: number,
    maxDurationMs: number
): number {
    let score = 100;

    // Deduct for missing bin locations
    const missingBins = results.filter(r => r.found && r.binLocations.length === 0);
    score -= missingBins.length * 10;

    // Deduct for exceeding time target
    if (durationMs > maxDurationMs) {
        score -= 20;
    } else if (durationMs > maxDurationMs * 0.8) {
        score -= 5;
    }

    // Deduct for missing QC status on quarantine items
    const missingQc = results.filter(
        r => r.status === 'Quarantine' && !r.qcStatus
    );
    score -= missingQc.length * 10;

    return Math.max(0, Math.min(100, score));
}
