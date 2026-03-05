/**
 * GRPO Module – Generic Product Schema Type Definitions
 *
 * Client-agnostic types for SAP B1 GRPO (Goods Receipt PO) extensions.
 * All field names use the U_GRPO_ prefix for multi-tenant compatibility.
 */

// ─── Enums ───────────────────────────────────────────────────────────────────

/** QC Status for header-level quality control gate */
export enum QcStatus {
    Pending = 'P',
    Approved = 'A',
    Rejected = 'R',
}

/** Sterility classification per line item */
export enum SterilityType {
    Sterile = 'S',
    NonSterile = 'N',
    ToSterilize = 'T',
}

/** Boolean proxy for SAP (no native boolean in Service Layer) */
export enum QcRequired {
    Yes = 'Y',
    No = 'N',
}

/** QC inspection result */
export enum QcResult {
    Pass = 'P',
    Fail = 'F',
    Conditional = 'C',
}

/** Audit log action types */
export enum AuditAction {
    Create = 'CREATE',
    Update = 'UPDATE',
    Approve = 'APPROVE',
    Reject = 'REJECT',
}

// ─── Header Extensions (OPDN) ───────────────────────────────────────────────

/** Typed GRPO header with User-Defined Fields */
export interface GRPOHeader {
    /** GRPO document entry (SAP system key) */
    DocEntry: number;
    /** GRPO document number */
    DocNum: number;
    /** SFDA Compliance Submission ID */
    U_GRPO_SfdaSubId: string | null;
    /** Operator who physically received the goods */
    U_GRPO_ReceivedBy: string | null;
    /** Quality control gate status */
    U_GRPO_QcStatus: QcStatus;
}

// ─── Line Extensions (PDN1) ─────────────────────────────────────────────────

/** Typed GRPO line with User-Defined Fields */
export interface GRPOLine {
    /** Parent document entry */
    DocEntry: number;
    /** Line number */
    LineNum: number;
    /** Item code */
    ItemCode: string;
    /** GS1-compliant Unique Device Identifier – Device Identifier */
    U_GRPO_UdiDi: string | null;
    /** UDI Production Identifier (Batch/Serial/Expiry composite) */
    U_GRPO_UdiPi: string | null;
    /** Manufacturer batch/lot number */
    U_GRPO_BatchNo: string | null;
    /** Product expiry date for FEFO enforcement */
    U_GRPO_Expiry: string | null;
    /** Sterility classification */
    U_GRPO_Sterility: SterilityType | null;
    /** Whether automated quarantine workflow is triggered */
    U_GRPO_QcReq: QcRequired;
}

// ─── Audit Log (@GRPO_AUDIT_LOG) ────────────────────────────────────────────

/** Row shape for the immutable audit log UDT */
export interface GRPOAuditLogEntry {
    /** Auto-generated row code */
    Code: string;
    /** Row name (SAP UDT requirement) */
    Name: string;
    /** GRPO document entry reference */
    U_GRPO_DocEntry: number;
    /** SAP user code who performed the action */
    U_GRPO_UserCode: string;
    /** Action performed */
    U_GRPO_Action: AuditAction;
    /** Associated batch number */
    U_GRPO_BatchRef: string | null;
    /** Associated UDI reference */
    U_GRPO_UdiRef: string | null;
    /** Action timestamp */
    U_GRPO_Timestamp: string;
}

// ─── QC Records (@GRPO_QC_RECORDS) ──────────────────────────────────────────

/** Row shape for the QC inspection results UDT */
export interface GRPOQcRecord {
    /** Auto-generated row code */
    Code: string;
    /** Row name (SAP UDT requirement) */
    Name: string;
    /** GRPO document entry reference */
    U_GRPO_DocEntry: number;
    /** Inspector identity */
    U_GRPO_Inspector: string;
    /** Inspection result */
    U_GRPO_Result: QcResult;
    /** Defect classification code */
    U_GRPO_DefectCode: string | null;
    /** File path to evidence photograph */
    U_GRPO_PhotoPath: string | null;
    /** Inspection date */
    U_GRPO_InspDate: string;
}

// ─── Service Layer Payload Types ─────────────────────────────────────────────

/** Valid value entry for SAP ValidValuesMD array */
export interface SAPValidValue {
    Value: string;
    Description: string;
}

/** Service Layer UserFieldsMD payload */
export interface UserFieldPayload {
    Name: string;
    TableName: string;
    Type: 'db_Alpha' | 'db_Numeric' | 'db_Date' | 'db_Float' | 'db_Memo';
    SubType?: 'st_None' | 'st_Address' | 'st_Phone' | 'st_Time';
    EditSize?: number;
    Description: string;
    DefaultValue?: string;
    ValidValuesMD?: SAPValidValue[];
}

/** Service Layer UserTablesMD payload */
export interface UserTablePayload {
    TableName: string;
    TableDescription: string;
    TableType: 'bott_NoObject' | 'bott_MasterData' | 'bott_MasterDataLines' | 'bott_Document' | 'bott_DocumentLines';
}
