/**
 * QC Router – Quarantine Bin Assignment
 *
 * If an item has U_GRPO_QcReq = 'Y', the router overrides the normal
 * putaway bin with a quarantine location. The PutawayScreen shifts
 * from Green (Active) to Yellow (QC Hold).
 *
 * Rule: 100% of QC-required items MUST route to QC Hold.
 * Zero uninspected medical devices enter active inventory.
 */

import type { PutawayInfo } from '../../scanner/flow/scan-flow-engine';

/** Extended putaway info with QC hold flag */
export interface QcPutawayInfo extends PutawayInfo {
    /** Whether this item is routed to QC Hold */
    isQcHold: boolean;
    /** Original putaway info (before QC override) */
    originalBin: PutawayInfo | null;
    /** Reason for QC hold */
    holdReason: string;
}

/** Quarantine bin naming convention per warehouse */
const QUARANTINE_BIN_PREFIX = 'QC';
const QUARANTINE_ZONE = 'QC';
const QUARANTINE_AISLE = 'HOLD';

/**
 * Configuration for QC routing per warehouse.
 * Maps warehouse codes to their quarantine bin locations.
 */
export interface QcWarehouseConfig {
    warehouseCode: string;
    quarantineBinCode: string;
    quarantineZone: string;
    quarantineAisle: string;
    quarantineRack: string;
    quarantineLevel: string;
}

/** Default quarantine config — generates bin from warehouse code */
function defaultQuarantineConfig(warehouseCode: string): QcWarehouseConfig {
    return {
        warehouseCode,
        quarantineBinCode: `${QUARANTINE_BIN_PREFIX}-${warehouseCode}-HOLD`,
        quarantineZone: QUARANTINE_ZONE,
        quarantineAisle: QUARANTINE_AISLE,
        quarantineRack: '01',
        quarantineLevel: '01',
    };
}

/**
 * Determines if an item requires QC hold and returns the appropriate putaway info.
 *
 * @param qcReq - The U_GRPO_QcReq value for this item ('Y' or 'N')
 * @param normalPutaway - The standard putaway bin assignment
 * @param warehouseCode - The target warehouse code
 * @param warehouseConfigs - Optional custom quarantine bin configs
 * @returns QcPutawayInfo with isQcHold flag and appropriate bin
 */
export function routeForQc(
    qcReq: 'Y' | 'N',
    normalPutaway: PutawayInfo,
    warehouseCode: string,
    warehouseConfigs?: QcWarehouseConfig[]
): QcPutawayInfo {
    // No QC required — pass through normal putaway
    if (qcReq !== 'Y') {
        return {
            ...normalPutaway,
            isQcHold: false,
            originalBin: null,
            holdReason: '',
        };
    }

    // QC Required — override to quarantine bin
    const config = warehouseConfigs?.find(c => c.warehouseCode === warehouseCode)
        ?? defaultQuarantineConfig(warehouseCode);

    return {
        binCode: config.quarantineBinCode,
        zone: config.quarantineZone,
        aisle: config.quarantineAisle,
        rack: config.quarantineRack,
        level: config.quarantineLevel,
        storageNote: '⚠️ QC HOLD — Do not distribute. Awaiting inspection.',
        isQcHold: true,
        originalBin: normalPutaway,
        holdReason: 'Item flagged for Quality Control inspection (U_GRPO_QcReq = Y)',
    };
}

/**
 * Checks if any items in a receipt batch require QC hold.
 * Returns the count of QC-required items.
 */
export function countQcItems(items: Array<{ qcReq: 'Y' | 'N' }>): number {
    return items.filter(i => i.qcReq === 'Y').length;
}
