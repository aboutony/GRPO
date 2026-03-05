/**
 * Incident Log – Issue Tracking During Hypercare
 *
 * Structured incident records with severity classification,
 * root cause analysis, and mean time to resolution.
 */

// ── Types ────────────────────────────────────────────────────────────────────

export type IncidentSeverity = 'P1_critical' | 'P2_major' | 'P3_minor' | 'P4_cosmetic';
export type IncidentStatus = 'open' | 'investigating' | 'resolved' | 'closed';

export type IncidentCategory =
    | 'sync_failure'
    | 'network_timeout'
    | 'scanner_disconnect'
    | 'saber_api_error'
    | 'sfda_export_failure'
    | 'data_mismatch'
    | 'ui_freeze'
    | 'device_crash'
    | 'other';

export interface Incident {
    incidentId: string;
    severity: IncidentSeverity;
    status: IncidentStatus;
    category: IncidentCategory;
    facilityCode: string;
    title: string;
    description: string;
    reportedBy: string;
    reportedAt: string;
    assignedTo: string | null;
    resolvedAt: string | null;
    resolutionNotes: string | null;
    rootCause: string | null;
    resolutionTimeMinutes: number | null;
    affectedDevices: string[];
    affectedOperators: string[];
}

// ── Incident Log ─────────────────────────────────────────────────────────────

export function createIncidentLog() {
    const incidents: Incident[] = [];
    let nextId = 1;

    return {
        /** Log a new incident */
        report(data: {
            severity: IncidentSeverity;
            category: IncidentCategory;
            facilityCode: string;
            title: string;
            description: string;
            reportedBy: string;
            affectedDevices?: string[];
            affectedOperators?: string[];
        }): Incident {
            const incident: Incident = {
                incidentId: `INC-${String(nextId++).padStart(4, '0')}`,
                severity: data.severity,
                status: 'open',
                category: data.category,
                facilityCode: data.facilityCode,
                title: data.title,
                description: data.description,
                reportedBy: data.reportedBy,
                reportedAt: new Date().toISOString(),
                assignedTo: null,
                resolvedAt: null,
                resolutionNotes: null,
                rootCause: null,
                resolutionTimeMinutes: null,
                affectedDevices: data.affectedDevices ?? [],
                affectedOperators: data.affectedOperators ?? [],
            };
            incidents.push(incident);
            return incident;
        },

        /** Assign an incident to a responder */
        assign(incidentId: string, assignedTo: string): void {
            const incident = incidents.find(i => i.incidentId === incidentId);
            if (incident) {
                incident.assignedTo = assignedTo;
                incident.status = 'investigating';
            }
        },

        /** Resolve an incident */
        resolve(incidentId: string, notes: string, rootCause: string): void {
            const incident = incidents.find(i => i.incidentId === incidentId);
            if (incident) {
                incident.status = 'resolved';
                incident.resolvedAt = new Date().toISOString();
                incident.resolutionNotes = notes;
                incident.rootCause = rootCause;
                incident.resolutionTimeMinutes = Math.round(
                    (new Date(incident.resolvedAt).getTime() - new Date(incident.reportedAt).getTime()) / 60_000
                );
            }
        },

        /** Close a resolved incident */
        close(incidentId: string): void {
            const incident = incidents.find(i => i.incidentId === incidentId);
            if (incident && incident.status === 'resolved') {
                incident.status = 'closed';
            }
        },

        /** Get open incidents */
        getOpen(): Incident[] {
            return incidents.filter(i => i.status === 'open' || i.status === 'investigating');
        },

        /** Get incidents by facility */
        getByFacility(facilityCode: string): Incident[] {
            return incidents.filter(i => i.facilityCode === facilityCode);
        },

        /** Calculate mean time to resolution (minutes) */
        getMTTR(): number {
            const resolved = incidents.filter(i => i.resolutionTimeMinutes !== null);
            if (resolved.length === 0) return 0;
            return Math.round(
                resolved.reduce((sum, i) => sum + i.resolutionTimeMinutes!, 0) / resolved.length
            );
        },

        /** Get incident count by category */
        getCategoryBreakdown(): Record<string, number> {
            const breakdown: Record<string, number> = {};
            for (const i of incidents) {
                breakdown[i.category] = (breakdown[i.category] ?? 0) + 1;
            }
            return breakdown;
        },

        /** Get summary stats */
        getSummary(): {
            total: number;
            open: number;
            resolved: number;
            closed: number;
            mttrMinutes: number;
            bySeverity: Record<string, number>;
        } {
            const bySeverity: Record<string, number> = {};
            for (const i of incidents) {
                bySeverity[i.severity] = (bySeverity[i.severity] ?? 0) + 1;
            }
            return {
                total: incidents.length,
                open: incidents.filter(i => i.status === 'open' || i.status === 'investigating').length,
                resolved: incidents.filter(i => i.status === 'resolved').length,
                closed: incidents.filter(i => i.status === 'closed').length,
                mttrMinutes: this.getMTTR(),
                bySeverity,
            };
        },
    };
}
