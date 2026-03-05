/**
 * SFDA Transmitter – Idempotent Transmission Service
 *
 * Ensures no duplicate records are sent to the Saudi-DI database.
 * Uses deterministic transmission IDs + ETag-based deduplication.
 */

import type {
    SfdaExportPayload,
    SfdaConfig,
    SfdaTransmissionRecord,
} from './sfda-types';
import { SfdaTransmissionStatus } from './sfda-types';

// ── Transmission Store (abstraction for SQLite persistence) ──────────────────

export interface TransmissionStore {
    getById(id: string): SfdaTransmissionRecord | null;
    save(record: SfdaTransmissionRecord): void;
    getPending(): SfdaTransmissionRecord[];
}

// ── Idempotent Transmission ──────────────────────────────────────────────────

/**
 * Generates a deterministic transmission ID from the payload.
 * Same date + facility + records → same ID = idempotent.
 */
export async function generateTransmissionId(payload: SfdaExportPayload): Promise<string> {
    const seed = `${payload.header.reportDate}:${payload.header.facilityId}:${payload.header.contentHash}`;
    const encoder = new TextEncoder();
    const data = encoder.encode(seed);

    if (typeof crypto !== 'undefined' && crypto.subtle) {
        const hash = await crypto.subtle.digest('SHA-256', data);
        const arr = Array.from(new Uint8Array(hash));
        return `SFDA-TX-${arr.slice(0, 12).map(b => b.toString(16).padStart(2, '0')).join('')}`;
    }

    // Fallback
    let h = 0;
    for (let i = 0; i < seed.length; i++) {
        h = ((h << 5) - h) + seed.charCodeAt(i);
        h |= 0;
    }
    return `SFDA-TX-${Math.abs(h).toString(16).padStart(24, '0')}`;
}

/**
 * Transmits the SFDA payload with idempotency enforcement.
 *
 * @param payload - The formatted export payload
 * @param xmlContent - XML-formatted content string
 * @param store - Local persistence for transmission records
 * @param config - SFDA configuration
 * @returns Updated transmission record
 */
export async function transmit(
    payload: SfdaExportPayload,
    xmlContent: string,
    store: TransmissionStore,
    config: SfdaConfig
): Promise<SfdaTransmissionRecord> {
    const txId = await generateTransmissionId(payload);

    // Check for existing transmission (idempotency)
    const existing = store.getById(txId);
    if (existing) {
        if (existing.status === SfdaTransmissionStatus.Acknowledged) {
            // Already successfully submitted — skip
            return existing;
        }
        if (existing.status === SfdaTransmissionStatus.Rejected) {
            // Permanently rejected — do not retry
            return existing;
        }
        if (existing.attempts >= config.maxRetries) {
            // Max retries exhausted
            return {
                ...existing,
                status: SfdaTransmissionStatus.Rejected,
                errorMessage: `Max retries (${config.maxRetries}) exhausted`,
            };
        }
    }

    // Create or update transmission record
    const record: SfdaTransmissionRecord = existing ? {
        ...existing,
        attempts: existing.attempts + 1,
        lastAttemptAt: new Date().toISOString(),
    } : {
        transmissionId: txId,
        reportDate: payload.header.reportDate,
        status: SfdaTransmissionStatus.Queued,
        recordCount: payload.header.recordCount,
        attempts: 1,
        lastAttemptAt: new Date().toISOString(),
        sfdaReference: null,
        errorMessage: null,
        createdAt: new Date().toISOString(),
    };

    try {
        // Transmit to SFDA Saudi-DI
        const response = await fetch(config.apiUrl, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${config.apiToken}`,
                'Content-Type': 'application/xml',
                'Accept': 'application/json',
                'If-None-Match': txId, // Idempotency via ETag
                'X-SFDA-Facility': config.facilityId,
                'X-SFDA-Report-Date': payload.header.reportDate,
                'X-Transmission-Id': txId,
            },
            body: xmlContent,
        });

        if (response.status === 304) {
            // Already received — idempotent success
            record.status = SfdaTransmissionStatus.Acknowledged;
            record.errorMessage = null;
            store.save(record);
            return record;
        }

        if (response.ok) {
            const result = await response.json() as {
                referenceId?: string;
                status: string;
            };
            record.status = SfdaTransmissionStatus.Acknowledged;
            record.sfdaReference = result.referenceId ?? null;
            record.errorMessage = null;
        } else if (response.status === 422) {
            // Validation error — permanent rejection
            const err = await response.text();
            record.status = SfdaTransmissionStatus.Rejected;
            record.errorMessage = `SFDA rejected: ${err}`;
        } else {
            // Transient error — retry
            record.status = SfdaTransmissionStatus.Retry;
            record.errorMessage = `HTTP ${response.status}: ${response.statusText}`;
        }
    } catch (error) {
        record.status = SfdaTransmissionStatus.Retry;
        record.errorMessage = error instanceof Error ? error.message : String(error);
    }

    store.save(record);
    return record;
}

/**
 * Retries all pending/retry transmissions.
 */
export async function retryPending(
    store: TransmissionStore,
    getXmlContent: (reportDate: string) => Promise<string>,
    getPayload: (reportDate: string) => Promise<SfdaExportPayload>,
    config: SfdaConfig
): Promise<SfdaTransmissionRecord[]> {
    const pending = store.getPending();
    const results: SfdaTransmissionRecord[] = [];

    for (const tx of pending) {
        const payload = await getPayload(tx.reportDate);
        const xml = await getXmlContent(tx.reportDate);
        const result = await transmit(payload, xml, store, config);
        results.push(result);
    }

    return results;
}
