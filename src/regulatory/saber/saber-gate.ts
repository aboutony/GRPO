/**
 * SABER Gate – Pre-Receipt Validation Gate
 *
 * Inserted into the scan flow between VALIDATED and CONFIRMED.
 * Blocks GRPO posting for items without a valid Certificate of Conformity.
 *
 * Rule: 100% of imported items MUST have a validated SABER certificate.
 */

import { validateCertificate } from './saber-client';
import {
    SaberCertificateStatus,
    SABER_STATUS_INFO,
    type SaberConfig,
    type SaberValidationResult,
    DEFAULT_SABER_CONFIG,
} from './saber-types';

// ── Gate Result ──────────────────────────────────────────────────────────────

export interface SaberGateResult {
    /** Whether all items passed SABER validation */
    approved: boolean;
    /** Per-item validation results */
    itemResults: SaberItemResult[];
    /** Summary counts */
    summary: {
        total: number;
        valid: number;
        blocked: number;
        warnings: number;
    };
    /** Human-readable alert message (for procurement team) */
    alertMessage: string | null;
}

export interface SaberItemResult {
    itemCode: string;
    sfdaSubId: string;
    validation: SaberValidationResult;
    /** Whether this specific item can proceed */
    canProceed: boolean;
    /** User-facing guidance if blocked */
    guidance: string | null;
}

// ── Gate Logic ───────────────────────────────────────────────────────────────

/**
 * Validates all items in a receipt against the SABER Platform API.
 *
 * @param items - Items to validate (item code + SFDA submission ID)
 * @param config - SABER API configuration
 * @returns SaberGateResult with per-item results and overall approval
 */
export async function validateReceipt(
    items: Array<{ itemCode: string; sfdaSubId: string }>,
    config: SaberConfig = DEFAULT_SABER_CONFIG
): Promise<SaberGateResult> {
    const itemResults: SaberItemResult[] = [];
    let validCount = 0;
    let blockedCount = 0;
    let warningCount = 0;

    // Validate each item (sequential to respect API rate limits)
    for (const item of items) {
        // Skip items without SFDA submission ID (non-regulated)
        if (!item.sfdaSubId) {
            itemResults.push({
                itemCode: item.itemCode,
                sfdaSubId: '',
                validation: {
                    approved: true,
                    status: SaberCertificateStatus.Valid,
                    certificateId: null,
                    productCategory: null,
                    expiryDate: null,
                    issuingBody: null,
                    rawResponse: null,
                    validatedAt: new Date().toISOString(),
                    responseTimeMs: 0,
                    errorMessage: 'Non-regulated item — SABER validation skipped',
                },
                canProceed: true,
                guidance: null,
            });
            validCount++;
            continue;
        }

        const validation = await validateCertificate(item.itemCode, item.sfdaSubId, config);
        const statusInfo = SABER_STATUS_INFO[validation.status];

        let guidance: string | null = null;
        if (!validation.approved) {
            switch (validation.status) {
                case SaberCertificateStatus.Expired:
                    guidance = 'Certificate of Conformity has expired. Contact the supplier to renew the certificate before receiving.';
                    break;
                case SaberCertificateStatus.Revoked:
                    guidance = 'Certificate has been revoked by SABER. Do NOT receive this shipment. Alert procurement immediately.';
                    break;
                case SaberCertificateStatus.NotFound:
                    guidance = 'No SABER certificate found for this product. Register the product on the SABER portal before importing.';
                    break;
                case SaberCertificateStatus.Pending:
                    guidance = 'Certificate is under review by SABER. Receipt is on hold until approval is granted.';
                    break;
                default:
                    guidance = 'SABER validation failed. Contact compliance team.';
            }
        }

        const canProceed = statusInfo.canProceed;

        itemResults.push({
            itemCode: item.itemCode,
            sfdaSubId: item.sfdaSubId,
            validation,
            canProceed,
            guidance,
        });

        if (canProceed) {
            if (validation.errorMessage) warningCount++;
            else validCount++;
        } else {
            blockedCount++;
        }
    }

    // Overall approval: ALL items must pass
    const approved = blockedCount === 0;

    // Build alert message for procurement team
    let alertMessage: string | null = null;
    if (!approved) {
        const blockedItems = itemResults
            .filter(r => !r.canProceed)
            .map(r => `${r.itemCode} (${SABER_STATUS_INFO[r.validation.status].label})`)
            .join(', ');
        alertMessage = `⚠️ SABER BLOCK: ${blockedCount} item(s) failed certificate validation: ${blockedItems}. Receipt cannot proceed until resolved.`;
    }

    return {
        approved,
        itemResults,
        summary: {
            total: items.length,
            valid: validCount,
            blocked: blockedCount,
            warnings: warningCount,
        },
        alertMessage,
    };
}

/**
 * Quick single-item check — used during scan flow for immediate feedback.
 */
export async function validateSingleItem(
    itemCode: string,
    sfdaSubId: string,
    config: SaberConfig = DEFAULT_SABER_CONFIG
): Promise<SaberItemResult> {
    const result = await validateReceipt([{ itemCode, sfdaSubId }], config);
    return result.itemResults[0];
}
