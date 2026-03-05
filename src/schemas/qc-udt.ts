/**
 * QC Records UDT – @GRPO_QC_RECORDS
 *
 * Inspection results store for quality control workflows.
 * Table type: bott_NoObject (standalone, no master/document object behavior).
 *
 * Columns:
 *   - U_GRPO_DocEntry    → GRPO document entry reference
 *   - U_GRPO_Inspector   → Inspector identity
 *   - U_GRPO_Result      → Inspection result (P/F/C)
 *   - U_GRPO_DefectCode  → Defect classification code
 *   - U_GRPO_PhotoPath   → Evidence photo file path
 *   - U_GRPO_InspDate    → Inspection date
 */

import type { UserTablePayload, UserFieldPayload } from '../types/grpo-schema';

export const QC_RECORDS_TABLE: UserTablePayload = {
    TableName: 'GRPO_QC_RECORDS',
    TableDescription: 'GRPO QC Records – Inspection Results Store',
    TableType: 'bott_NoObject',
};

export const QC_RECORDS_COLUMNS: UserFieldPayload[] = [
    {
        Name: 'GRPO_DocEntry',
        TableName: '@GRPO_QC_RECORDS',
        Type: 'db_Numeric',
        EditSize: 11,
        Description: 'GRPO Document Entry Reference',
    },
    {
        Name: 'GRPO_Inspector',
        TableName: '@GRPO_QC_RECORDS',
        Type: 'db_Alpha',
        EditSize: 50,
        Description: 'Inspector Identity',
    },
    {
        Name: 'GRPO_Result',
        TableName: '@GRPO_QC_RECORDS',
        Type: 'db_Alpha',
        EditSize: 1,
        Description: 'Inspection Result',
        ValidValuesMD: [
            { Value: 'P', Description: 'Pass' },
            { Value: 'F', Description: 'Fail' },
            { Value: 'C', Description: 'Conditional' },
        ],
    },
    {
        Name: 'GRPO_DefectCode',
        TableName: '@GRPO_QC_RECORDS',
        Type: 'db_Alpha',
        EditSize: 20,
        Description: 'Defect Classification Code',
    },
    {
        Name: 'GRPO_PhotoPath',
        TableName: '@GRPO_QC_RECORDS',
        Type: 'db_Alpha',
        EditSize: 254,
        Description: 'Evidence Photo File Path',
    },
    {
        Name: 'GRPO_InspDate',
        TableName: '@GRPO_QC_RECORDS',
        Type: 'db_Date',
        Description: 'Inspection Date',
    },
];
