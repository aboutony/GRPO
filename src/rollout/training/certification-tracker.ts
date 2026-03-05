/**
 * Certification Tracker – Operator Certification Status
 *
 * Tracks pass/fail across all 5 training drills per operator.
 * 90-day recertification cycle. Target: 100% on Scan-to-Putaway < 10s.
 */

import type { DrillId } from './training-module';

// ── Types ────────────────────────────────────────────────────────────────────

export type CertStatus = 'not_started' | 'in_progress' | 'certified' | 'expired' | 'failed';

export interface OperatorCertification {
    operatorId: string;
    operatorName: string;
    facilityCode: string;
    drills: Record<DrillId, DrillCertification>;
    overallCertified: boolean;
    certifiedAt: string | null;
    expiresAt: string | null;
}

export interface DrillCertification {
    status: CertStatus;
    attempts: number;
    bestTimeSeconds: number | null;
    passedAt: string | null;
    targetTimeSeconds: number;
}

export interface CertificationSummary {
    totalOperators: number;
    certified: number;
    inProgress: number;
    notStarted: number;
    expired: number;
    certificationRate: number;
    scanToPutawayPassRate: number;
}

// ── Tracker ──────────────────────────────────────────────────────────────────

const CERTIFICATION_VALIDITY_DAYS = 90;

export function createCertificationTracker() {
    const operators = new Map<string, OperatorCertification>();

    return {
        /** Register an operator for certification */
        registerOperator(
            operatorId: string,
            operatorName: string,
            facilityCode: string
        ): OperatorCertification {
            const cert: OperatorCertification = {
                operatorId,
                operatorName,
                facilityCode,
                drills: {
                    SINGLE_SCAN: { status: 'not_started', attempts: 0, bestTimeSeconds: null, passedAt: null, targetTimeSeconds: 10 },
                    QC_HOLD: { status: 'not_started', attempts: 0, bestTimeSeconds: null, passedAt: null, targetTimeSeconds: 60 },
                    OFFLINE_SYNC: { status: 'not_started', attempts: 0, bestTimeSeconds: null, passedAt: null, targetTimeSeconds: 30 },
                    RECALL: { status: 'not_started', attempts: 0, bestTimeSeconds: null, passedAt: null, targetTimeSeconds: 120 },
                    SABER_CHECK: { status: 'not_started', attempts: 0, bestTimeSeconds: null, passedAt: null, targetTimeSeconds: 30 },
                },
                overallCertified: false,
                certifiedAt: null,
                expiresAt: null,
            };
            operators.set(operatorId, cert);
            return cert;
        },

        /** Record a drill attempt result */
        recordDrillResult(
            operatorId: string,
            drillId: DrillId,
            passed: boolean,
            timeSeconds: number
        ): void {
            const cert = operators.get(operatorId);
            if (!cert) return;

            const drill = cert.drills[drillId];
            drill.attempts++;
            drill.status = passed ? 'certified' : 'failed';

            if (passed) {
                drill.passedAt = new Date().toISOString();
                if (!drill.bestTimeSeconds || timeSeconds < drill.bestTimeSeconds) {
                    drill.bestTimeSeconds = timeSeconds;
                }
            }

            // Check overall certification
            const allPassed = Object.values(cert.drills).every(d => d.status === 'certified');
            if (allPassed && !cert.overallCertified) {
                cert.overallCertified = true;
                cert.certifiedAt = new Date().toISOString();
                const expiry = new Date();
                expiry.setDate(expiry.getDate() + CERTIFICATION_VALIDITY_DAYS);
                cert.expiresAt = expiry.toISOString();
            }
        },

        /** Check and expire stale certifications */
        checkExpirations(): string[] {
            const expired: string[] = [];
            const now = new Date();

            for (const [id, cert] of operators) {
                if (cert.overallCertified && cert.expiresAt) {
                    if (new Date(cert.expiresAt) < now) {
                        cert.overallCertified = false;
                        for (const drill of Object.values(cert.drills)) {
                            drill.status = 'expired';
                        }
                        expired.push(id);
                    }
                }
            }

            return expired;
        },

        /** Get operator certification */
        getOperator(operatorId: string): OperatorCertification | undefined {
            return operators.get(operatorId);
        },

        /** Get certification summary */
        getSummary(): CertificationSummary {
            const all = Array.from(operators.values());
            const certified = all.filter(o => o.overallCertified).length;
            const inProgress = all.filter(o =>
                !o.overallCertified && Object.values(o.drills).some(d => d.status === 'certified')
            ).length;
            const notStarted = all.filter(o =>
                Object.values(o.drills).every(d => d.status === 'not_started')
            ).length;
            const expired = all.filter(o =>
                Object.values(o.drills).some(d => d.status === 'expired')
            ).length;

            const scanPassed = all.filter(o => o.drills.SINGLE_SCAN.status === 'certified').length;

            return {
                totalOperators: all.length,
                certified,
                inProgress,
                notStarted,
                expired,
                certificationRate: all.length > 0 ? (certified / all.length) * 100 : 0,
                scanToPutawayPassRate: all.length > 0 ? (scanPassed / all.length) * 100 : 0,
            };
        },

        /** Get all operators for a facility */
        getByFacility(facilityCode: string): OperatorCertification[] {
            return Array.from(operators.values()).filter(o => o.facilityCode === facilityCode);
        },
    };
}
