/**
 * Audit Logger – SHA-256 Hash Chain Writer
 *
 * Append-only hash chain guaranteeing 10-year data integrity
 * for SFDA inspector audits.
 *
 * Each entry: chainHash = SHA-256(previousHash + dataHash + timestamp)
 * First entry uses genesis hash derived from facility ID.
 */

import {
    type AuditLogEntry,
    type NewAuditEntry,
    GENESIS_HASH_PREFIX,
} from './audit-types';

// ── SHA-256 Hashing ──────────────────────────────────────────────────────────

/**
 * Computes SHA-256 hash of a string.
 * Uses Web Crypto API (available in browsers and Node 18+).
 */
export async function sha256(input: string): Promise<string> {
    const encoder = new TextEncoder();
    const data = encoder.encode(input);

    if (typeof crypto !== 'undefined' && crypto.subtle) {
        const hashBuffer = await crypto.subtle.digest('SHA-256', data);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    }

    // Fallback for environments without crypto.subtle
    // In production, this should never be reached
    throw new Error('SHA-256 requires crypto.subtle (Web Crypto API)');
}

// ── Genesis Hash ─────────────────────────────────────────────────────────────

/**
 * Generates the genesis hash for a facility.
 * This is the "previous hash" for the very first entry in the chain.
 */
export async function generateGenesisHash(facilityId: string): Promise<string> {
    return sha256(`${GENESIS_HASH_PREFIX}:${facilityId}`);
}

// ── Chain Persistence Interface ──────────────────────────────────────────────

export interface AuditChainStore {
    /** Get the last entry in the chain (for previousHash) */
    getLastEntry(): AuditLogEntry | null;
    /** Get the next sequential entry ID */
    getNextEntryId(): number;
    /** Append an entry to the chain (must be sequential and immutable) */
    appendEntry(entry: AuditLogEntry): void;
    /** Get all entries (for verification) */
    getAllEntries(): AuditLogEntry[];
    /** Get entries by date range */
    getEntriesByDateRange(from: string, to: string): AuditLogEntry[];
}

// ── Logger ───────────────────────────────────────────────────────────────────

/**
 * Creates an audit logger instance bound to a facility.
 */
export function createAuditLogger(
    facilityId: string,
    store: AuditChainStore
) {
    let genesisHash: string | null = null;

    async function ensureGenesis(): Promise<string> {
        if (!genesisHash) {
            genesisHash = await generateGenesisHash(facilityId);
        }
        return genesisHash;
    }

    return {
        /**
         * Logs an auditable action to the hash chain.
         *
         * @param entry - The action to log (without hash fields)
         * @returns The complete entry with computed hashes
         */
        async log(entry: NewAuditEntry): Promise<AuditLogEntry> {
            const genesis = await ensureGenesis();

            // Get previous hash from chain
            const lastEntry = store.getLastEntry();
            const previousHash = lastEntry ? lastEntry.chainHash : genesis;

            // Compute data hash
            const dataHash = await sha256(JSON.stringify(entry.data));

            // Compute chain hash: SHA-256(previousHash + dataHash + timestamp)
            const chainHash = await sha256(
                `${previousHash}${dataHash}${entry.timestamp}`
            );

            // Build complete entry
            const complete: AuditLogEntry = {
                entryId: store.getNextEntryId(),
                action: entry.action,
                actor: entry.actor,
                timestamp: entry.timestamp,
                documentRef: entry.documentRef,
                data: entry.data,
                dataHash,
                previousHash,
                chainHash,
            };

            // Append to chain (immutable)
            store.appendEntry(complete);

            return complete;
        },

        /**
         * Retrieves the full audit chain for export to SFDA inspectors.
         */
        getFullChain(): AuditLogEntry[] {
            return store.getAllEntries();
        },

        /**
         * Retrieves audit entries within a date range.
         */
        getByDateRange(from: string, to: string): AuditLogEntry[] {
            return store.getEntriesByDateRange(from, to);
        },

        /**
         * Gets the current chain tip (last entry hash).
         */
        async getChainTip(): Promise<string> {
            const last = store.getLastEntry();
            if (last) return last.chainHash;
            return ensureGenesis();
        },
    };
}
