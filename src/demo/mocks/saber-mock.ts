/**
 * SABER Mock – Deterministic Certificate Responses
 *
 * Provides mock SABER validation for the demo environment.
 * PO-1001..1004 items → Valid certificate
 * PO-1005 items → Expired certificate (blocking demo)
 */

import {
    SaberCertificateStatus,
    type SaberValidationResult,
} from '../../regulatory/saber/saber-types';

// ── Mock Configuration ───────────────────────────────────────────────────────

/** Items linked to PO-1005 that should return Expired */
const EXPIRED_SCENARIO_BATCHES = new Set(['BATCH-X99']);

/** Simulated API delay in ms */
const MOCK_DELAY_MS = 200;

// ── Mock Certificates ────────────────────────────────────────────────────────

const VALID_CERTIFICATE: Omit<SaberValidationResult, 'validatedAt' | 'responseTimeMs'> = {
    approved: true,
    status: SaberCertificateStatus.Valid,
    certificateId: 'SABER-2026-00001',
    productCategory: 'Medical Devices Class II',
    expiryDate: '2027-12-31',
    issuingBody: 'SGS Saudi Arabia',
    rawResponse: { mock: true, scenario: 'valid' },
    errorMessage: null,
};

const EXPIRED_CERTIFICATE: Omit<SaberValidationResult, 'validatedAt' | 'responseTimeMs'> = {
    approved: false,
    status: SaberCertificateStatus.Expired,
    certificateId: 'SABER-2024-00099',
    productCategory: 'Medical Devices Class II',
    expiryDate: '2025-03-01',
    issuingBody: 'SGS Saudi Arabia',
    rawResponse: { mock: true, scenario: 'expired' },
    errorMessage: 'Certificate expired on 2025-03-01. Contact supplier for renewal.',
};

// ── Mock Implementation ──────────────────────────────────────────────────────

/**
 * Mock SABER certificate validation.
 * Replaces the real `validateCertificate` in demo mode.
 *
 * @param _itemCode - Item code (ignored in mock — scenario driven by batchNo)
 * @param _sfdaSubId - SFDA submission ID (used for logging)
 * @param batchNo - Batch number to determine scenario
 * @returns Deterministic SaberValidationResult
 */
export async function mockValidateCertificate(
    _itemCode: string,
    _sfdaSubId: string,
    batchNo?: string
): Promise<SaberValidationResult> {
    // Simulate API latency
    await delay(MOCK_DELAY_MS);

    const start = performance.now();
    const isExpired = batchNo ? EXPIRED_SCENARIO_BATCHES.has(batchNo) : false;

    const base = isExpired ? EXPIRED_CERTIFICATE : VALID_CERTIFICATE;

    return {
        ...base,
        validatedAt: new Date().toISOString(),
        responseTimeMs: Math.round(performance.now() - start) + MOCK_DELAY_MS,
    };
}

/**
 * Mock receipt-level SABER validation.
 * Returns per-item results matching the story scenarios.
 */
export async function mockValidateReceipt(
    items: Array<{ itemCode: string; sfdaSubId: string; batchNo?: string }>
): Promise<{
    approved: boolean;
    results: Array<{ itemCode: string; approved: boolean; status: SaberCertificateStatus }>;
}> {
    const results = [];
    let allApproved = true;

    for (const item of items) {
        const result = await mockValidateCertificate(item.itemCode, item.sfdaSubId, item.batchNo);
        results.push({
            itemCode: item.itemCode,
            approved: result.approved,
            status: result.status,
        });
        if (!result.approved) allApproved = false;
    }

    return { approved: allApproved, results };
}

function delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
}
