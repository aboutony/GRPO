/**
 * Header-Level UDF Definitions (OPDN)
 *
 * Three User-Defined Fields on the Goods Receipt PO header table:
 *   - U_GRPO_SfdaSubId   → SFDA compliance tracking
 *   - U_GRPO_ReceivedBy   → Operator identity for audit trail
 *   - U_GRPO_QcStatus     → Quality control gate (P/A/R enum)
 */

import type { UserFieldPayload } from '../types/grpo-schema';

export const HEADER_UDFS: UserFieldPayload[] = [
    {
        Name: 'GRPO_SfdaSubId',
        TableName: 'OPDN',
        Type: 'db_Alpha',
        EditSize: 30,
        Description: 'SFDA Compliance Submission ID',
    },
    {
        Name: 'GRPO_ReceivedBy',
        TableName: 'OPDN',
        Type: 'db_Alpha',
        EditSize: 50,
        Description: 'Received By – Operator Identity',
    },
    {
        Name: 'GRPO_QcStatus',
        TableName: 'OPDN',
        Type: 'db_Alpha',
        EditSize: 1,
        Description: 'QC Status (Pending/Approved/Rejected)',
        DefaultValue: 'P',
        ValidValuesMD: [
            { Value: 'P', Description: 'Pending' },
            { Value: 'A', Description: 'Approved' },
            { Value: 'R', Description: 'Rejected' },
        ],
    },
];
