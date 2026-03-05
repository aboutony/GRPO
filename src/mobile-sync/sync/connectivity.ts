/**
 * Connectivity Monitor – Network State Detection
 *
 * Monitors network availability and emits online/offline events.
 * When connectivity is restored, triggers the sync engine to drain the queue.
 *
 * Uses a polling approach for broad compatibility (works on any platform
 * that supports fetch). Can be replaced with navigator.connection API
 * or platform-specific implementations (e.g., NetInfo in React Native).
 */

export type ConnectionQuality = 'good' | 'degraded' | 'offline';

export interface ConnectivityState {
    isOnline: boolean;
    quality: ConnectionQuality;
    latencyMs: number | null;
    lastCheckedAt: string;
}

type ConnectivityListener = (state: ConnectivityState) => void;

export interface ConnectivityConfig {
    /** URL to ping for connectivity check (DI API adapter health endpoint) */
    healthUrl: string;
    /** Polling interval when online (ms) */
    onlineIntervalMs: number;
    /** Polling interval when offline (ms) — faster to detect recovery */
    offlineIntervalMs: number;
    /** Timeout for health check request (ms) */
    timeoutMs: number;
    /** Latency threshold for "degraded" quality (ms) */
    degradedThresholdMs: number;
}

const DEFAULT_CONFIG: ConnectivityConfig = {
    healthUrl: '/api/health',
    onlineIntervalMs: 30_000,    // 30s when online
    offlineIntervalMs: 15_000,   // 15s when offline (faster recovery detection)
    timeoutMs: 5_000,            // 5s timeout
    degradedThresholdMs: 2_000,  // >2s = degraded
};

export class ConnectivityMonitor {
    private config: ConnectivityConfig;
    private state: ConnectivityState;
    private listeners: ConnectivityListener[] = [];
    private intervalId: ReturnType<typeof setInterval> | null = null;
    private running = false;

    constructor(config: Partial<ConnectivityConfig> = {}) {
        this.config = { ...DEFAULT_CONFIG, ...config };
        this.state = {
            isOnline: false,
            quality: 'offline',
            latencyMs: null,
            lastCheckedAt: new Date().toISOString(),
        };
    }

    /** Current connectivity state */
    get currentState(): ConnectivityState {
        return { ...this.state };
    }

    /** Start periodic connectivity monitoring */
    start(): void {
        if (this.running) return;
        this.running = true;
        this._scheduleCheck();
        // Run an immediate check
        this._check();
    }

    /** Stop monitoring */
    stop(): void {
        this.running = false;
        if (this.intervalId) {
            clearInterval(this.intervalId);
            this.intervalId = null;
        }
    }

    /** Register a listener for connectivity changes */
    onChange(listener: ConnectivityListener): () => void {
        this.listeners.push(listener);
        return () => {
            this.listeners = this.listeners.filter(l => l !== listener);
        };
    }

    /** Force an immediate connectivity check */
    async checkNow(): Promise<ConnectivityState> {
        await this._check();
        return this.currentState;
    }

    // ── Private ────────────────────────────────────────────────────────────

    private _scheduleCheck(): void {
        if (this.intervalId) clearInterval(this.intervalId);

        const interval = this.state.isOnline
            ? this.config.onlineIntervalMs
            : this.config.offlineIntervalMs;

        this.intervalId = setInterval(() => this._check(), interval);
    }

    private async _check(): Promise<void> {
        const prevOnline = this.state.isOnline;
        const start = Date.now();

        try {
            const controller = new AbortController();
            const timeout = setTimeout(() => controller.abort(), this.config.timeoutMs);

            const res = await fetch(this.config.healthUrl, {
                method: 'HEAD',
                signal: controller.signal,
                cache: 'no-store',
            });

            clearTimeout(timeout);

            const latency = Date.now() - start;
            const quality: ConnectionQuality = latency > this.config.degradedThresholdMs
                ? 'degraded'
                : 'good';

            this.state = {
                isOnline: res.ok,
                quality: res.ok ? quality : 'offline',
                latencyMs: latency,
                lastCheckedAt: new Date().toISOString(),
            };
        } catch {
            this.state = {
                isOnline: false,
                quality: 'offline',
                latencyMs: null,
                lastCheckedAt: new Date().toISOString(),
            };
        }

        // Reschedule if connectivity changed (different polling rate)
        if (prevOnline !== this.state.isOnline) {
            this._scheduleCheck();
        }

        // Notify listeners
        for (const listener of this.listeners) {
            try { listener(this.state); } catch { /* observer errors must not break monitor */ }
        }
    }
}
