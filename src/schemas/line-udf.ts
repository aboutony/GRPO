/**
 * Line-Level UDF Definitions (PDN1)
 *
 * Six User-Defined Fields on the Goods Receipt PO line table:
 *   - U_GRPO_UdiDi       → GS1 Device Identifier
 *   - U_GRPO_UdiPi       → Production Identifier composite
 *   - U_GRPO_BatchNo     → Manufacturer batch/lot number
 *   - U_GRPO_Expiry      → Product expiry date (FEFO)
 *   - U_GRPO_Sterility   → Sterility classification (S/N/T)
 *   - U_GRPO_QcReq       → Quarantine workflow trigger (Y/N)
 */

import type { UserFieldPayload } from '../types/grpo-schema';

export const LINE_UDFS: UserFieldPayload[] = [
    {
        Name: 'GRPO_UdiDi',
        TableName: 'PDN1',
        Type: 'db_Alpha',
        EditSize: 50,
        Description: 'UDI Device Identifier (GS1-compliant)',
    },
    {
        Name: 'GRPO_UdiPi',
        TableName: 'PDN1',
        Type: 'db_Alpha',
        EditSize: 50,
        Description: 'UDI Production Identifier (Batch/Serial/Expiry)',
    },
    {
        Name: 'GRPO_BatchNo',
        TableName: 'PDN1',
        Type: 'db_Alpha',
        EditSize: 30,
        Description: 'Manufacturer Batch/Lot Number',
    },
    {
        Name: 'GRPO_Expiry',
        TableName: 'PDN1',
        Type: 'db_Date',
        Description: 'Product Expiry Date (FEFO Enforcement)',
    },
    {
        Name: 'GRPO_Sterility',
        TableName: 'PDN1',
        Type: 'db_Alpha',
        EditSize: 1,
        Description: 'Sterility Classification',
        DefaultValue: 'N',
        ValidValuesMD: [
            { Value: 'S', Description: 'Sterile' },
            { Value: 'N', Description: 'Non-Sterile' },
            { Value: 'T', Description: 'To-Sterilize' },
        ],
    },
    {
        Name: 'GRPO_QcReq',
        TableName: 'PDN1',
        Type: 'db_Alpha',
        EditSize: 1,
        Description: 'QC Required – Quarantine Workflow Trigger',
        DefaultValue: 'N',
        ValidValuesMD: [
            { Value: 'Y', Description: 'Yes' },
            { Value: 'N', Description: 'No' },
        ],
    },
];
