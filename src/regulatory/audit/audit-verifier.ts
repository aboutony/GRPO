/**
 * Audit Verifier – Hash Chain Integrity Verification
 *
 * Walks the SHA-256 chain and validates every link.
 * Reports the first broken link with expected vs actual hash.
 *
 * Used by SFDA inspectors or internal compliance audits
 * to prove 10-year data integrity.
 */

import type { AuditLogEntry } from './audit-types';
import { sha256, generateGenesisHash } from './audit-logger';

// ── Verification Result ──────────────────────────────────────────────────────

export interface ChainVerificationResult {
    /** Whether the entire chain is valid */
    valid: boolean;
    /** Total entries verified */
    totalEntries: number;
    /** Number of valid entries */
    validEntries: number;
    /** Index of first broken link (-1 if chain is valid) */
    firstBrokenAt: number;
    /** Details of the first broken link */
    breakDetails: {
        entryId: number;
        expectedChainHash: string;
        actualChainHash: string;
        expectedPreviousHash: string;
        actualPreviousHash: string;
    } | null;
    /** Verification timestamp */
    verifiedAt: string;
    /** Time taken for verification in ms */
    durationMs: number;
}

export interface SingleEntryVerification {
    valid: boolean;
    dataHashValid: boolean;
    previousHashValid: boolean;
    chainHashValid: boolean;
    errors: string[];
}

// ── Full Chain Verification ──────────────────────────────────────────────────

/**
 * Verifies the integrity of the entire audit hash chain.
 *
 * @param entries - All audit log entries in sequential order
 * @param facilityId - Facility ID to derive genesis hash
 * @returns ChainVerificationResult with details on any broken links
 */
export async function verifyChain(
    entries: AuditLogEntry[],
    facilityId: string
): Promise<ChainVerificationResult> {
    const start = performance.now();
    const genesisHash = await generateGenesisHash(facilityId);

    let validCount = 0;
    let firstBrokenAt = -1;
    let breakDetails: ChainVerificationResult['breakDetails'] = null;

    for (let i = 0; i < entries.length; i++) {
        const entry = entries[i];
        const expectedPreviousHash = i === 0 ? genesisHash : entries[i - 1].chainHash;

        // Verify previous hash link
        if (entry.previousHash !== expectedPreviousHash) {
            firstBrokenAt = i;
            breakDetails = {
                entryId: entry.entryId,
                expectedChainHash: '',
                actualChainHash: entry.chainHash,
                expectedPreviousHash,
                actualPreviousHash: entry.previousHash,
            };
            break;
        }

        // Verify data hash
        const expectedDataHash = await sha256(JSON.stringify(entry.data));
        if (entry.dataHash !== expectedDataHash) {
            firstBrokenAt = i;
            breakDetails = {
                entryId: entry.entryId,
                expectedChainHash: '',
                actualChainHash: entry.chainHash,
                expectedPreviousHash,
                actualPreviousHash: entry.previousHash,
            };
            break;
        }

        // Verify chain hash
        const expectedChainHash = await sha256(
            `${expectedPreviousHash}${expectedDataHash}${entry.timestamp}`
        );
        if (entry.chainHash !== expectedChainHash) {
            firstBrokenAt = i;
            breakDetails = {
                entryId: entry.entryId,
                expectedChainHash,
                actualChainHash: entry.chainHash,
                expectedPreviousHash,
                actualPreviousHash: entry.previousHash,
            };
            break;
        }

        validCount++;
    }

    return {
        valid: firstBrokenAt === -1,
        totalEntries: entries.length,
        validEntries: validCount,
        firstBrokenAt,
        breakDetails,
        verifiedAt: new Date().toISOString(),
        durationMs: Math.round(performance.now() - start),
    };
}

// ── Single Entry Verification ────────────────────────────────────────────────

/**
 * Verifies a single entry against its predecessor.
 *
 * @param entry - The entry to verify
 * @param previousEntry - The preceding entry (or null for first entry)
 * @param facilityId - Facility ID for genesis hash (used when previousEntry is null)
 */
export async function verifyEntry(
    entry: AuditLogEntry,
    previousEntry: AuditLogEntry | null,
    facilityId: string
): Promise<SingleEntryVerification> {
    const errors: string[] = [];

    // Expected previous hash
    const expectedPreviousHash = previousEntry
        ? previousEntry.chainHash
        : await generateGenesisHash(facilityId);

    const previousHashValid = entry.previousHash === expectedPreviousHash;
    if (!previousHashValid) {
        errors.push(
            `Previous hash mismatch: expected ${expectedPreviousHash.substring(0, 16)}..., got ${entry.previousHash.substring(0, 16)}...`
        );
    }

    // Verify data hash
    const expectedDataHash = await sha256(JSON.stringify(entry.data));
    const dataHashValid = entry.dataHash === expectedDataHash;
    if (!dataHashValid) {
        errors.push(
            `Data hash mismatch: data may have been tampered with`
        );
    }

    // Verify chain hash
    const expectedChainHash = await sha256(
        `${expectedPreviousHash}${expectedDataHash}${entry.timestamp}`
    );
    const chainHashValid = entry.chainHash === expectedChainHash;
    if (!chainHashValid) {
        errors.push(
            `Chain hash mismatch: expected ${expectedChainHash.substring(0, 16)}..., got ${entry.chainHash.substring(0, 16)}...`
        );
    }

    return {
        valid: previousHashValid && dataHashValid && chainHashValid,
        dataHashValid,
        previousHashValid,
        chainHashValid,
        errors,
    };
}
