/**
 * Adoption Tracker – Staff Usage & Adoption Metrics
 *
 * Tracks per-operator usage over the 7-day pilot.
 * Target: 90% staff adoption by day 7.
 */

// ── Types ────────────────────────────────────────────────────────────────────

export interface OperatorActivity {
    operatorId: string;
    operatorName: string;
    deviceId: string;
    date: string;
    scansCompleted: number;
    grposPosted: number;
    qcInspections: number;
    sessionDurationMin: number;
    errors: number;
    firstScanAt: string | null;
    lastScanAt: string | null;
}

export interface DailyAdoptionSummary {
    date: string;
    dayNumber: number;
    totalOperators: number;
    activeOperators: number;
    adoptionRate: number;
    totalScans: number;
    totalGrpos: number;
    avgSessionMin: number;
    avgScansPerOperator: number;
    errorRate: number;
}

export interface FeatureUsage {
    feature: string;
    usageCount: number;
    uniqueOperators: number;
    avgDurationMs: number;
}

export interface AdoptionReport {
    reportId: string;
    generatedAt: string;
    pilotStartDate: string;
    pilotDayCount: number;
    totalOperators: number;
    currentAdoptionRate: number;
    targetAdoptionRate: number;
    onTrack: boolean;
    dailySummaries: DailyAdoptionSummary[];
    featureUsage: FeatureUsage[];
    topPerformers: Array<{ name: string; scans: number }>;
    recommendation: string;
}

// ── Tracker ──────────────────────────────────────────────────────────────────

export function createAdoptionTracker(
    totalOperators: number,
    pilotStartDate: string,
    targetAdoptionRate: number = 90
) {
    const activities: OperatorActivity[] = [];
    const featureEvents: Array<{ feature: string; operatorId: string; durationMs: number; date: string }> = [];

    return {
        /** Record operator activity for a day */
        recordActivity(activity: OperatorActivity): void {
            activities.push(activity);
        },

        /** Record a feature usage event */
        recordFeatureUsage(feature: string, operatorId: string, durationMs: number): void {
            featureEvents.push({
                feature,
                operatorId,
                durationMs,
                date: new Date().toISOString().split('T')[0],
            });
        },

        /** Get daily adoption summary */
        getDailySummary(date: string, dayNumber: number): DailyAdoptionSummary {
            const dayActivities = activities.filter(a => a.date === date);
            const activeOps = new Set(dayActivities.map(a => a.operatorId)).size;
            const totalScans = dayActivities.reduce((s, a) => s + a.scansCompleted, 0);
            const totalGrpos = dayActivities.reduce((s, a) => s + a.grposPosted, 0);
            const totalErrors = dayActivities.reduce((s, a) => s + a.errors, 0);
            const avgSession = dayActivities.length > 0
                ? dayActivities.reduce((s, a) => s + a.sessionDurationMin, 0) / dayActivities.length
                : 0;

            return {
                date,
                dayNumber,
                totalOperators,
                activeOperators: activeOps,
                adoptionRate: (activeOps / totalOperators) * 100,
                totalScans,
                totalGrpos,
                avgSessionMin: Math.round(avgSession),
                avgScansPerOperator: activeOps > 0 ? Math.round(totalScans / activeOps) : 0,
                errorRate: totalScans > 0 ? (totalErrors / totalScans) * 100 : 0,
            };
        },

        /** Get feature usage heatmap */
        getFeatureUsage(): FeatureUsage[] {
            const featureMap = new Map<string, {
                count: number;
                operators: Set<string>;
                totalMs: number;
            }>();

            for (const event of featureEvents) {
                const existing = featureMap.get(event.feature) ?? {
                    count: 0,
                    operators: new Set<string>(),
                    totalMs: 0,
                };
                existing.count++;
                existing.operators.add(event.operatorId);
                existing.totalMs += event.durationMs;
                featureMap.set(event.feature, existing);
            }

            return Array.from(featureMap.entries()).map(([feature, data]) => ({
                feature,
                usageCount: data.count,
                uniqueOperators: data.operators.size,
                avgDurationMs: data.count > 0 ? Math.round(data.totalMs / data.count) : 0,
            })).sort((a, b) => b.usageCount - a.usageCount);
        },

        /** Generate full adoption report */
        generateReport(): AdoptionReport {
            const start = new Date(pilotStartDate);
            const now = new Date();
            const dayCount = Math.ceil((now.getTime() - start.getTime()) / (24 * 60 * 60 * 1000));

            const dailySummaries: DailyAdoptionSummary[] = [];
            for (let d = 0; d < Math.min(dayCount, 7); d++) {
                const date = new Date(start);
                date.setDate(date.getDate() + d);
                dailySummaries.push(this.getDailySummary(
                    date.toISOString().split('T')[0], d + 1
                ));
            }

            const currentRate = dailySummaries.length > 0
                ? dailySummaries[dailySummaries.length - 1].adoptionRate
                : 0;

            // Top performers
            const operatorScans = new Map<string, { name: string; scans: number }>();
            for (const a of activities) {
                const existing = operatorScans.get(a.operatorId) ?? { name: a.operatorName, scans: 0 };
                existing.scans += a.scansCompleted;
                operatorScans.set(a.operatorId, existing);
            }
            const topPerformers = Array.from(operatorScans.values())
                .sort((a, b) => b.scans - a.scans)
                .slice(0, 5);

            const onTrack = currentRate >= targetAdoptionRate ||
                (dayCount <= 3 && currentRate >= targetAdoptionRate * 0.6);

            return {
                reportId: `ADOPT-${Date.now()}`,
                generatedAt: new Date().toISOString(),
                pilotStartDate,
                pilotDayCount: dayCount,
                totalOperators,
                currentAdoptionRate: Math.round(currentRate),
                targetAdoptionRate,
                onTrack,
                dailySummaries,
                featureUsage: this.getFeatureUsage(),
                topPerformers,
                recommendation: onTrack
                    ? '✅ Adoption on track. Continue monitoring.'
                    : '⚠️ Adoption below target. Consider additional training sessions.',
            };
        },
    };
}
