/**
 * Queue Processor – Serialized FIFO Drain
 *
 * Processes queued receipts one-at-a-time to avoid SAP contention.
 * Posts to the DI API adapter endpoint and handles the response:
 *   - Success       → markSynced() + haptic success
 *   - Retryable     → markRetrying() + schedule backoff
 *   - Fatal         → markConflict() + create conflict record + haptic alert
 */

import { ReceiptStore } from '../db/receipt-store';
import type { QueuedReceipt } from '../models/queued-receipt';
import { detectConflict, isFatalConflict, type SyncErrorResult } from './conflict-detector';
import { triggerHaptic, HapticEvent } from '../haptics/feedback';

/** Response shape from the DI API adapter endpoint */
export interface AdapterPostResponse {
    success: boolean;
    docEntry?: number;
    docNum?: number;
    errorMessage?: string;
    sapErrorCode?: number;
    errorSeverity?: 'Fatal' | 'Retryable';
}

/** Function type for the actual HTTP call to the DI API adapter */
export type PostToAdapter = (receipt: QueuedReceipt) => Promise<AdapterPostResponse>;

/** Retry backoff schedule (seconds): 30s → 60s → 120s → 240s → 480s */
const RETRY_BACKOFF_SECONDS = [30, 60, 120, 240, 480];
const MAX_RETRY_ATTEMPTS = 5;

export interface QueueProcessorConfig {
    /** Function to post a receipt to the DI API adapter */
    postFn: PostToAdapter;
    /** Maximum concurrent posts (should be 1 for SAP contention avoidance) */
    concurrency: number;
}

export class QueueProcessor {
    private store: ReceiptStore;
    private postFn: PostToAdapter;
    private processing = false;
    private abortController: AbortController | null = null;

    constructor(store: ReceiptStore, config: QueueProcessorConfig) {
        this.store = store;
        this.postFn = config.postFn;
    }

    /** Whether the processor is currently draining the queue */
    get isProcessing(): boolean {
        return this.processing;
    }

    /**
     * Drains the queue: processes all Pending receipts, then all due Retryable receipts.
     * Processes one at a time (serialized) to avoid SAP contention.
     */
    async drain(): Promise<{ synced: number; retried: number; conflicts: number }> {
        if (this.processing) return { synced: 0, retried: 0, conflicts: 0 };

        this.processing = true;
        this.abortController = new AbortController();

        let synced = 0;
        let retried = 0;
        let conflicts = 0;

        try {
            // ── Phase 1: Process Pending receipts (FIFO) ───────────────────────
            const pending = this.store.getPending();
            for (const receipt of pending) {
                if (this.abortController.signal.aborted) break;

                const result = await this._processOne(receipt);
                if (result === 'synced') synced++;
                else if (result === 'retrying') retried++;
                else if (result === 'conflict') conflicts++;
            }

            // ── Phase 2: Process due Retryable receipts ────────────────────────
            const now = new Date().toISOString();
            const retryable = this.store.getRetryable(now);
            for (const receipt of retryable) {
                if (this.abortController.signal.aborted) break;

                const result = await this._processOne(receipt);
                if (result === 'synced') synced++;
                else if (result === 'retrying') retried++;
                else if (result === 'conflict') conflicts++;
            }

            // ── Haptic: Queue drain complete ───────────────────────────────────
            if (synced > 0) {
                triggerHaptic(HapticEvent.QueueDrainComplete);
            }

        } finally {
            this.processing = false;
            this.abortController = null;
        }

        return { synced, retried, conflicts };
    }

    /** Abort the current drain operation */
    abort(): void {
        this.abortController?.abort();
    }

    // ── Private ────────────────────────────────────────────────────────────

    private async _processOne(
        receipt: QueuedReceipt
    ): Promise<'synced' | 'retrying' | 'conflict'> {
        // Mark as syncing
        this.store.markSyncing(receipt.id);

        try {
            const response = await this.postFn(receipt);

            if (response.success && response.docEntry && response.docNum) {
                // ── SUCCESS ──────────────────────────────────────────────────────
                this.store.markSynced(receipt.id, response.docEntry, response.docNum);
                triggerHaptic(HapticEvent.SyncSuccess);
                return 'synced';
            }

            // ── FAILURE — classify ─────────────────────────────────────────────
            const error: SyncErrorResult = {
                sapErrorCode: response.sapErrorCode ?? null,
                sapErrorMessage: response.errorMessage ?? 'Unknown error',
                errorSeverity: response.errorSeverity ?? 'Fatal',
            };

            if (isFatalConflict(error)) {
                return this._handleFatal(receipt, error);
            } else {
                return this._handleRetryable(receipt, error);
            }

        } catch (ex) {
            // Network-level failure — treat as retryable
            const error: SyncErrorResult = {
                sapErrorCode: null,
                sapErrorMessage: ex instanceof Error ? ex.message : 'Network error',
                errorSeverity: 'Retryable',
            };
            return this._handleRetryable(receipt, error);
        }
    }

    private _handleFatal(
        receipt: QueuedReceipt,
        error: SyncErrorResult
    ): 'conflict' {
        // Create conflict record with human-readable guidance
        const conflict = detectConflict(error, receipt.id);
        this.store.markConflict(receipt.id, error.sapErrorCode, error.sapErrorMessage);
        this.store.insertConflict(conflict);

        triggerHaptic(HapticEvent.ConflictDetected);
        return 'conflict';
    }

    private _handleRetryable(
        receipt: QueuedReceipt,
        error: SyncErrorResult
    ): 'retrying' | 'conflict' {
        const attempts = receipt.syncAttempts + 1;

        if (attempts >= MAX_RETRY_ATTEMPTS) {
            // Exhausted retries — escalate to conflict
            return this._handleFatal(receipt, {
                ...error,
                sapErrorMessage: `Max retries (${MAX_RETRY_ATTEMPTS}) exhausted: ${error.sapErrorMessage}`,
                errorSeverity: 'Fatal',
            });
        }

        // Schedule next retry with exponential backoff
        const backoffIndex = Math.min(attempts - 1, RETRY_BACKOFF_SECONDS.length - 1);
        const backoffMs = RETRY_BACKOFF_SECONDS[backoffIndex] * 1000;
        const retryAt = new Date(Date.now() + backoffMs).toISOString();

        this.store.markRetrying(
            receipt.id,
            error.sapErrorCode,
            error.sapErrorMessage,
            retryAt
        );

        triggerHaptic(HapticEvent.SyncPending);
        return 'retrying';
    }
}
