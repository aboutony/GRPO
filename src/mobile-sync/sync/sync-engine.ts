/**
 * Sync Engine – Core Orchestrator
 *
 * Coordinates the entire offline-first sync lifecycle:
 *   1. Monitors connectivity via ConnectivityMonitor
 *   2. Listens for new local inserts via ReceiptStore.onInsert()
 *   3. On connectivity restored → drains queue via QueueProcessor
 *   4. Emits status events for UI binding
 *
 * Zero ambiguity: the operator always knows if a receipt is
 * Pending (yellow), Synced (green), or in Conflict (red).
 */

import { ReceiptStore } from '../db/receipt-store';
import { SyncStatus } from '../models/sync-status';
import type { QueuedReceipt } from '../models/queued-receipt';
import { ConnectivityMonitor, type ConnectivityState } from './connectivity';
import { QueueProcessor, type PostToAdapter } from './queue-processor';
import { triggerHaptic, HapticEvent } from '../haptics/feedback';

export interface SyncEngineConfig {
    /** Function to post a receipt to the DI API adapter */
    postFn: PostToAdapter;
    /** URL for connectivity health checks */
    healthUrl: string;
    /** Retry check interval when online (ms, default: 30s) */
    retryCheckIntervalMs?: number;
}

export interface SyncEngineState {
    isOnline: boolean;
    isProcessing: boolean;
    counts: Record<SyncStatus, number>;
    lastDrainResult: { synced: number; retried: number; conflicts: number } | null;
}

type StateListener = (state: SyncEngineState) => void;

export class SyncEngine {
    private store: ReceiptStore;
    private connectivity: ConnectivityMonitor;
    private processor: QueueProcessor;
    private listeners: StateListener[] = [];
    private retryTimerId: ReturnType<typeof setInterval> | null = null;
    private retryCheckMs: number;
    private lastDrainResult: SyncEngineState['lastDrainResult'] = null;
    private _started = false;

    constructor(store: ReceiptStore, config: SyncEngineConfig) {
        this.store = store;
        this.retryCheckMs = config.retryCheckIntervalMs ?? 30_000;

        // Initialize connectivity monitor
        this.connectivity = new ConnectivityMonitor({
            healthUrl: config.healthUrl,
        });

        // Initialize queue processor (concurrency: 1 for SAP contention avoidance)
        this.processor = new QueueProcessor(store, {
            postFn: config.postFn,
            concurrency: 1,
        });
    }

    /** Current engine state snapshot */
    get state(): SyncEngineState {
        return {
            isOnline: this.connectivity.currentState.isOnline,
            isProcessing: this.processor.isProcessing,
            counts: this.store.getStatusCounts(),
            lastDrainResult: this.lastDrainResult,
        };
    }

    /**
     * Starts the sync engine.
     * - Begins connectivity monitoring
     * - Registers insert observer on receipt store
     * - Starts periodic retry check
     */
    start(): void {
        if (this._started) return;
        this._started = true;

        // ── Listen for connectivity changes ──────────────────────────────────
        this.connectivity.onChange((connState: ConnectivityState) => {
            if (connState.isOnline) {
                // Connection restored — drain the queue
                this._drainQueue();
            }
            this._notifyListeners();
        });

        // ── Listen for new local inserts ─────────────────────────────────────
        this.store.onInsert((receipt: QueuedReceipt) => {
            triggerHaptic(HapticEvent.ScanCaptured);

            // If online, attempt immediate sync
            if (this.connectivity.currentState.isOnline) {
                this._drainQueue();
            } else {
                triggerHaptic(HapticEvent.SyncPending);
            }

            this._notifyListeners();
        });

        // ── Periodic retry check ─────────────────────────────────────────────
        // Even when online, we need to check for due retries
        this.retryTimerId = setInterval(() => {
            if (this.connectivity.currentState.isOnline && !this.processor.isProcessing) {
                this._drainQueue();
            }
        }, this.retryCheckMs);

        // ── Start connectivity monitoring ────────────────────────────────────
        this.connectivity.start();
    }

    /**
     * Stops the sync engine and all background activity.
     */
    stop(): void {
        this._started = false;
        this.connectivity.stop();
        this.processor.abort();

        if (this.retryTimerId) {
            clearInterval(this.retryTimerId);
            this.retryTimerId = null;
        }
    }

    /**
     * Forces an immediate queue drain attempt.
     * Useful for manual "Sync Now" button.
     */
    async syncNow(): Promise<SyncEngineState> {
        const connState = await this.connectivity.checkNow();
        if (connState.isOnline) {
            await this._drainQueue();
        }
        return this.state;
    }

    /**
     * Registers a listener for engine state changes.
     * Returns an unsubscribe function.
     */
    onStateChange(listener: StateListener): () => void {
        this.listeners.push(listener);
        return () => {
            this.listeners = this.listeners.filter(l => l !== listener);
        };
    }

    // ── Private ────────────────────────────────────────────────────────────

    private async _drainQueue(): Promise<void> {
        if (this.processor.isProcessing) return;

        this._notifyListeners();

        const result = await this.processor.drain();
        this.lastDrainResult = result;

        this._notifyListeners();
    }

    private _notifyListeners(): void {
        const currentState = this.state;
        for (const listener of this.listeners) {
            try { listener(currentState); } catch { /* observer errors must not break engine */ }
        }
    }
}
