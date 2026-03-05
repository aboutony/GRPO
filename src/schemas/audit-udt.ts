/**
 * Audit Log UDT – @GRPO_AUDIT_LOG
 *
 * Immutable store for GRPO document lifecycle events.
 * Table type: bott_NoObject (standalone, no master/document object behavior).
 *
 * Columns:
 *   - U_GRPO_DocEntry   → GRPO document entry reference
 *   - U_GRPO_UserCode   → SAP user who performed the action
 *   - U_GRPO_Action     → Action type (CREATE/UPDATE/APPROVE/REJECT)
 *   - U_GRPO_BatchRef   → Associated batch number
 *   - U_GRPO_UdiRef     → Associated UDI reference
 *   - U_GRPO_Timestamp  → Action timestamp
 */

import type { UserTablePayload, UserFieldPayload } from '../types/grpo-schema';

export const AUDIT_LOG_TABLE: UserTablePayload = {
    TableName: 'GRPO_AUDIT_LOG',
    TableDescription: 'GRPO Audit Log – Immutable Compliance Store',
    TableType: 'bott_NoObject',
};

export const AUDIT_LOG_COLUMNS: UserFieldPayload[] = [
    {
        Name: 'GRPO_DocEntry',
        TableName: '@GRPO_AUDIT_LOG',
        Type: 'db_Numeric',
        EditSize: 11,
        Description: 'GRPO Document Entry Reference',
    },
    {
        Name: 'GRPO_UserCode',
        TableName: '@GRPO_AUDIT_LOG',
        Type: 'db_Alpha',
        EditSize: 50,
        Description: 'SAP User Code – Action Performer',
    },
    {
        Name: 'GRPO_Action',
        TableName: '@GRPO_AUDIT_LOG',
        Type: 'db_Alpha',
        EditSize: 20,
        Description: 'Action Performed',
        ValidValuesMD: [
            { Value: 'CREATE', Description: 'Document Created' },
            { Value: 'UPDATE', Description: 'Document Updated' },
            { Value: 'APPROVE', Description: 'QC Approved' },
            { Value: 'REJECT', Description: 'QC Rejected' },
        ],
    },
    {
        Name: 'GRPO_BatchRef',
        TableName: '@GRPO_AUDIT_LOG',
        Type: 'db_Alpha',
        EditSize: 30,
        Description: 'Associated Batch Number',
    },
    {
        Name: 'GRPO_UdiRef',
        TableName: '@GRPO_AUDIT_LOG',
        Type: 'db_Alpha',
        EditSize: 50,
        Description: 'Associated UDI Reference',
    },
    {
        Name: 'GRPO_Timestamp',
        TableName: '@GRPO_AUDIT_LOG',
        Type: 'db_Date',
        Description: 'Action Timestamp',
    },
];
