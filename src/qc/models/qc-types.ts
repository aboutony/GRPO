/**
 * QC Types – Enums, Defect Codes, and Inspection Records
 *
 * Maps directly to the @GRPO_QC_RECORDS UDT provisioned in Sprint 1.1
 * and the U_GRPO_QcReq / U_GRPO_QcStatus UDFs.
 */

// ── Defect Codes ─────────────────────────────────────────────────────────────

export enum DefectCode {
    BROKEN_SEAL = 'BROKEN_SEAL',
    EXPIRED = 'EXPIRED',
    LABEL_MISMATCH = 'LABEL_MISMATCH',
    DAMAGED_PACKAGING = 'DAMAGED_PACKAGING',
    TEMPERATURE_EXCURSION = 'TEMPERATURE_EXCURSION',
    WRONG_ITEM = 'WRONG_ITEM',
    CONTAMINATION = 'CONTAMINATION',
    OTHER = 'OTHER',
}

/** Defect code metadata for the picker UI */
export const DEFECT_CODE_INFO: Record<DefectCode, {
    label: string;
    description: string;
    icon: string;
    severity: 'critical' | 'major' | 'minor';
}> = {
    [DefectCode.BROKEN_SEAL]: {
        label: 'Broken Seal',
        description: 'Tamper-evident seal is broken or missing',
        icon: '🔓',
        severity: 'critical',
    },
    [DefectCode.EXPIRED]: {
        label: 'Expired Product',
        description: 'Product is past its expiry date',
        icon: '⏰',
        severity: 'critical',
    },
    [DefectCode.LABEL_MISMATCH]: {
        label: 'Label Mismatch',
        description: 'Label does not match the scanned barcode data',
        icon: '🏷️',
        severity: 'major',
    },
    [DefectCode.DAMAGED_PACKAGING]: {
        label: 'Damaged Packaging',
        description: 'Outer packaging is torn, crushed, or wet',
        icon: '📦',
        severity: 'major',
    },
    [DefectCode.TEMPERATURE_EXCURSION]: {
        label: 'Temperature Excursion',
        description: 'Cold chain indicator shows deviation',
        icon: '🌡️',
        severity: 'critical',
    },
    [DefectCode.WRONG_ITEM]: {
        label: 'Wrong Item',
        description: 'Item received does not match PO line',
        icon: '❌',
        severity: 'critical',
    },
    [DefectCode.CONTAMINATION]: {
        label: 'Contamination',
        description: 'Visible contamination or foreign substances',
        icon: '☣️',
        severity: 'critical',
    },
    [DefectCode.OTHER]: {
        label: 'Other',
        description: 'Other defect — specify in notes',
        icon: '📝',
        severity: 'minor',
    },
};

// ── Inspection Result ────────────────────────────────────────────────────────

export enum InspectionResult {
    PASS = 'P',
    FAIL = 'F',
    CONDITIONAL = 'C',
}

export const INSPECTION_RESULT_INFO: Record<InspectionResult, {
    label: string;
    color: string;
    icon: string;
}> = {
    [InspectionResult.PASS]: { label: 'Pass', color: '#10B981', icon: '✅' },
    [InspectionResult.FAIL]: { label: 'Fail', color: '#EF4444', icon: '❌' },
    [InspectionResult.CONDITIONAL]: { label: 'Conditional', color: '#F59E0B', icon: '⚠️' },
};

// ── QC Inspection Record (maps to @GRPO_QC_RECORDS) ──────────────────────────

export interface QcInspectionRecord {
    /** GRPO DocEntry (populated after sync) */
    docEntry: number | null;
    /** Local receipt ID (for pre-sync correlation) */
    receiptId: string;
    /** Inspector name */
    inspector: string;
    /** Inspection result: P(ass), F(ail), C(onditional) */
    result: InspectionResult;
    /** Selected defect codes (multi-select) */
    defectCodes: DefectCode[];
    /** Serialized defect code string for SAP field */
    defectCodeString: string;
    /** Photo file path (local URI) */
    photoPath: string | null;
    /** Inspection timestamp */
    inspectionDate: string;
    /** Optional inspector notes */
    notes: string | null;
}

/** Shape for creating a new inspection (before docEntry is known) */
export type NewInspection = Omit<QcInspectionRecord, 'docEntry'>;

/**
 * Builds the @GRPO_QC_RECORDS payload for Service Layer insertion.
 */
export function buildQcRecordPayload(record: QcInspectionRecord) {
    return {
        U_GRPO_DocEntry: record.docEntry,
        U_GRPO_Inspector: record.inspector,
        U_GRPO_Result: record.result,
        U_GRPO_DefectCode: record.defectCodeString,
        U_GRPO_PhotoPath: record.photoPath ?? '',
        U_GRPO_InspDate: record.inspectionDate,
    };
}
