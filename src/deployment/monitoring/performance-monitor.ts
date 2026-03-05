/**
 * Performance Monitor – Sync Latency & UI Response Tracking
 *
 * Tracks real-time performance metrics against pilot targets:
 *   - Sync latency: < 5 seconds
 *   - UI response: < 2 seconds
 *
 * Rolling 5-minute averages with P50/P95/P99 percentiles.
 */

// ── Metric Types ─────────────────────────────────────────────────────────────

export interface PerformanceMetric {
    name: string;
    value: number;
    unit: 'ms' | 'count' | 'percent';
    timestamp: string;
    operatorId: string | null;
    deviceId: string | null;
}

export interface PercentileBreakdown {
    p50: number;
    p95: number;
    p99: number;
    min: number;
    max: number;
    avg: number;
    count: number;
}

export interface PerformanceSnapshot {
    timestamp: string;
    windowMs: number;
    syncLatency: PercentileBreakdown;
    uiResponse: PercentileBreakdown;
    activeOperators: number;
    totalScans: number;
    failedSyncs: number;
    alerts: PerformanceAlert[];
}

export interface PerformanceAlert {
    metric: string;
    threshold: number;
    actual: number;
    severity: 'warning' | 'critical';
    message: string;
    triggeredAt: string;
}

// ── Thresholds ───────────────────────────────────────────────────────────────

export interface PerformanceThresholds {
    syncLatencyWarningMs: number;
    syncLatencyCriticalMs: number;
    uiResponseWarningMs: number;
    uiResponseCriticalMs: number;
}

export const PILOT_THRESHOLDS: PerformanceThresholds = {
    syncLatencyWarningMs: 4_000,
    syncLatencyCriticalMs: 5_000,
    uiResponseWarningMs: 1_500,
    uiResponseCriticalMs: 2_000,
};

// ── Monitor ──────────────────────────────────────────────────────────────────

export function createPerformanceMonitor(
    thresholds: PerformanceThresholds = PILOT_THRESHOLDS,
    windowMs: number = 5 * 60 * 1000
) {
    const syncSamples: Array<{ value: number; time: number }> = [];
    const uiSamples: Array<{ value: number; time: number }> = [];
    const activeOps = new Set<string>();
    let totalScans = 0;
    let failedSyncs = 0;
    const alertListeners: Array<(alert: PerformanceAlert) => void> = [];

    function pruneOld(samples: Array<{ value: number; time: number }>): void {
        const cutoff = Date.now() - windowMs;
        while (samples.length > 0 && samples[0].time < cutoff) {
            samples.shift();
        }
    }

    function percentiles(samples: Array<{ value: number; time: number }>): PercentileBreakdown {
        if (samples.length === 0) {
            return { p50: 0, p95: 0, p99: 0, min: 0, max: 0, avg: 0, count: 0 };
        }
        const sorted = samples.map(s => s.value).sort((a, b) => a - b);
        const n = sorted.length;
        return {
            p50: sorted[Math.floor(n * 0.50)],
            p95: sorted[Math.floor(n * 0.95)],
            p99: sorted[Math.floor(n * 0.99)],
            min: sorted[0],
            max: sorted[n - 1],
            avg: Math.round(sorted.reduce((a, b) => a + b, 0) / n),
            count: n,
        };
    }

    function checkAlerts(name: string, value: number, warn: number, crit: number): void {
        if (value >= crit) {
            const alert: PerformanceAlert = {
                metric: name,
                threshold: crit,
                actual: value,
                severity: 'critical',
                message: `🚨 ${name} = ${value}ms exceeds critical threshold (${crit}ms)`,
                triggeredAt: new Date().toISOString(),
            };
            alertListeners.forEach(fn => { try { fn(alert); } catch { /* safety */ } });
        } else if (value >= warn) {
            const alert: PerformanceAlert = {
                metric: name,
                threshold: warn,
                actual: value,
                severity: 'warning',
                message: `⚠️ ${name} = ${value}ms approaching threshold (${crit}ms)`,
                triggeredAt: new Date().toISOString(),
            };
            alertListeners.forEach(fn => { try { fn(alert); } catch { /* safety */ } });
        }
    }

    return {
        /** Record a sync latency measurement */
        recordSync(latencyMs: number, operatorId?: string): void {
            syncSamples.push({ value: latencyMs, time: Date.now() });
            totalScans++;
            if (operatorId) activeOps.add(operatorId);
            checkAlerts('Sync Latency', latencyMs,
                thresholds.syncLatencyWarningMs, thresholds.syncLatencyCriticalMs);
        },

        /** Record a UI response measurement */
        recordUiResponse(responseMs: number): void {
            uiSamples.push({ value: responseMs, time: Date.now() });
            checkAlerts('UI Response', responseMs,
                thresholds.uiResponseWarningMs, thresholds.uiResponseCriticalMs);
        },

        /** Record a failed sync attempt */
        recordSyncFailure(): void {
            failedSyncs++;
        },

        /** Get current performance snapshot */
        getSnapshot(): PerformanceSnapshot {
            pruneOld(syncSamples);
            pruneOld(uiSamples);

            return {
                timestamp: new Date().toISOString(),
                windowMs,
                syncLatency: percentiles(syncSamples),
                uiResponse: percentiles(uiSamples),
                activeOperators: activeOps.size,
                totalScans,
                failedSyncs,
                alerts: [],
            };
        },

        /** Subscribe to performance alerts */
        onAlert(listener: (alert: PerformanceAlert) => void) {
            alertListeners.push(listener);
            return () => {
                const idx = alertListeners.indexOf(listener);
                if (idx >= 0) alertListeners.splice(idx, 1);
            };
        },

        /** Reset all counters */
        reset(): void {
            syncSamples.length = 0;
            uiSamples.length = 0;
            activeOps.clear();
            totalScans = 0;
            failedSyncs = 0;
        },
    };
}
