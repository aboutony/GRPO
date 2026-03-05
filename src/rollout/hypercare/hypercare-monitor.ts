/**
 * Hypercare Monitor – 30-Day Post-Rollout Support
 *
 * Dedicated monitoring for edge-case network latencies
 * in the Western (Jeddah) and Eastern (Dammam) provinces.
 */

import type { Province } from '../facilities/facility-registry';

// ── Types ────────────────────────────────────────────────────────────────────

export interface DailyHealthSnapshot {
    date: string;
    dayNumber: number;
    province: Province;
    facilityCode: string;
    metrics: {
        syncLatencyP50: number;
        syncLatencyP95: number;
        syncLatencyP99: number;
        uiResponseP50: number;
        uiResponseP95: number;
        failedSyncs: number;
        totalSyncs: number;
        offlineGaps: number;
        avgOfflineGapSeconds: number;
    };
    networkQuality: 'excellent' | 'good' | 'degraded' | 'poor';
    incidents: number;
}

export interface HypercareConfig {
    durationDays: number;
    startDate: string;
    escalationThresholds: {
        syncP99MaxMs: number;
        failedSyncMaxPercent: number;
        offlineGapMaxSeconds: number;
    };
}

export interface EscalationAlert {
    alertId: string;
    severity: 'warning' | 'critical';
    facilityCode: string;
    province: Province;
    metric: string;
    threshold: number;
    actual: number;
    message: string;
    triggeredAt: string;
    acknowledged: boolean;
}

// ── Default Config ───────────────────────────────────────────────────────────

export const DEFAULT_HYPERCARE_CONFIG: HypercareConfig = {
    durationDays: 30,
    startDate: new Date().toISOString().split('T')[0],
    escalationThresholds: {
        syncP99MaxMs: 5_000,
        failedSyncMaxPercent: 2,
        offlineGapMaxSeconds: 300,
    },
};

// ── Monitor ──────────────────────────────────────────────────────────────────

export function createHypercareMonitor(config: HypercareConfig = DEFAULT_HYPERCARE_CONFIG) {
    const snapshots: DailyHealthSnapshot[] = [];
    const alerts: EscalationAlert[] = [];
    const alertListeners: Array<(alert: EscalationAlert) => void> = [];

    function emitAlert(alert: EscalationAlert): void {
        alerts.push(alert);
        alertListeners.forEach(fn => { try { fn(alert); } catch { /* safety */ } });
    }

    return {
        /** Record a daily health snapshot for a facility */
        recordSnapshot(snapshot: DailyHealthSnapshot): void {
            snapshots.push(snapshot);
            evaluateEscalation(snapshot, config, emitAlert);
        },

        /** Get the hypercare period status */
        getStatus(): {
            active: boolean;
            dayNumber: number;
            remainingDays: number;
            totalSnapshots: number;
            openAlerts: number;
        } {
            const start = new Date(config.startDate);
            const now = new Date();
            const dayNum = Math.ceil((now.getTime() - start.getTime()) / (24 * 60 * 60 * 1000));

            return {
                active: dayNum <= config.durationDays,
                dayNumber: Math.min(dayNum, config.durationDays),
                remainingDays: Math.max(0, config.durationDays - dayNum),
                totalSnapshots: snapshots.length,
                openAlerts: alerts.filter(a => !a.acknowledged).length,
            };
        },

        /** Get snapshots by province */
        getSnapshotsByProvince(province: Province): DailyHealthSnapshot[] {
            return snapshots.filter(s => s.province === province);
        },

        /** Get snapshots by facility */
        getSnapshotsByFacility(facilityCode: string): DailyHealthSnapshot[] {
            return snapshots.filter(s => s.facilityCode === facilityCode);
        },

        /** Acknowledge an alert */
        acknowledgeAlert(alertId: string): void {
            const alert = alerts.find(a => a.alertId === alertId);
            if (alert) alert.acknowledged = true;
        },

        /** Get all open alerts */
        getOpenAlerts(): EscalationAlert[] {
            return alerts.filter(a => !a.acknowledged);
        },

        /** Get province-level health summary */
        getProvinceSummary(): Array<{
            province: Province;
            avgSyncP95: number;
            totalIncidents: number;
            networkQuality: string;
        }> {
            const provinces: Province[] = ['Central', 'Western', 'Eastern'];
            return provinces.map(p => {
                const ps = snapshots.filter(s => s.province === p);
                const avgP95 = ps.length > 0
                    ? Math.round(ps.reduce((s, x) => s + x.metrics.syncLatencyP95, 0) / ps.length)
                    : 0;
                const incidents = ps.reduce((s, x) => s + x.incidents, 0);
                const latestQuality = ps.length > 0 ? ps[ps.length - 1].networkQuality : 'unknown';

                return { province: p, avgSyncP95: avgP95, totalIncidents: incidents, networkQuality: latestQuality };
            });
        },

        /** Subscribe to escalation alerts */
        onAlert(listener: (alert: EscalationAlert) => void) {
            alertListeners.push(listener);
            return () => {
                const idx = alertListeners.indexOf(listener);
                if (idx >= 0) alertListeners.splice(idx, 1);
            };
        },
    };
}

function evaluateEscalation(
    snapshot: DailyHealthSnapshot,
    config: HypercareConfig,
    emit: (alert: EscalationAlert) => void
): void {
    const { metrics } = snapshot;
    const { escalationThresholds: t } = config;

    if (metrics.syncLatencyP99 > t.syncP99MaxMs) {
        emit({
            alertId: `ESC-${Date.now()}-sync`,
            severity: metrics.syncLatencyP99 > t.syncP99MaxMs * 1.5 ? 'critical' : 'warning',
            facilityCode: snapshot.facilityCode,
            province: snapshot.province,
            metric: 'Sync Latency P99',
            threshold: t.syncP99MaxMs,
            actual: metrics.syncLatencyP99,
            message: `Sync P99 = ${metrics.syncLatencyP99}ms exceeds ${t.syncP99MaxMs}ms at ${snapshot.facilityCode}`,
            triggeredAt: new Date().toISOString(),
            acknowledged: false,
        });
    }

    const failRate = metrics.totalSyncs > 0
        ? (metrics.failedSyncs / metrics.totalSyncs) * 100 : 0;
    if (failRate > t.failedSyncMaxPercent) {
        emit({
            alertId: `ESC-${Date.now()}-fail`,
            severity: failRate > t.failedSyncMaxPercent * 2 ? 'critical' : 'warning',
            facilityCode: snapshot.facilityCode,
            province: snapshot.province,
            metric: 'Failed Sync Rate',
            threshold: t.failedSyncMaxPercent,
            actual: failRate,
            message: `Failed sync rate ${failRate.toFixed(1)}% exceeds ${t.failedSyncMaxPercent}% at ${snapshot.facilityCode}`,
            triggeredAt: new Date().toISOString(),
            acknowledged: false,
        });
    }

    if (metrics.avgOfflineGapSeconds > t.offlineGapMaxSeconds) {
        emit({
            alertId: `ESC-${Date.now()}-offline`,
            severity: 'warning',
            facilityCode: snapshot.facilityCode,
            province: snapshot.province,
            metric: 'Offline Gap Duration',
            threshold: t.offlineGapMaxSeconds,
            actual: metrics.avgOfflineGapSeconds,
            message: `Avg offline gap ${metrics.avgOfflineGapSeconds}s exceeds ${t.offlineGapMaxSeconds}s at ${snapshot.facilityCode}`,
            triggeredAt: new Date().toISOString(),
            acknowledged: false,
        });
    }
}
