/**
 * Deploy Config – Riyadh On-Premise Server Settings
 *
 * Production-ready configuration for the Riyadh warehouse
 * pilot deployment. Connects to the live UNIMED SAP B1 instance.
 */

// ── Environment ──────────────────────────────────────────────────────────────

export enum DeployEnvironment {
    Development = 'development',
    Staging = 'staging',
    Production = 'production',
}

// ── Server Configuration ─────────────────────────────────────────────────────

export interface ServerConfig {
    environment: DeployEnvironment;
    sap: {
        /** SAP SLD server hostname */
        server: string;
        /** SAP B1 company database name */
        companyDb: string;
        /** SAP License server */
        licenseServer: string;
        /** DI API connection pool max */
        maxConnections: number;
        /** Service Layer base URL */
        serviceLayerUrl: string;
        /** DB type: MSSQL or HANA */
        dbType: 'MSSQL' | 'HANA';
    };
    regulatory: {
        /** SABER API mode */
        saberStrictMode: boolean;
        /** SABER API base URL */
        saberUrl: string;
        /** SFDA Saudi-DI endpoint */
        sfdaUrl: string;
        /** SFDA export schedule hour (0-23) */
        sfdaExportHour: number;
    };
    sync: {
        /** Maximum sync latency target (ms) */
        maxSyncLatencyMs: number;
        /** Maximum UI response target (ms) */
        maxUiResponseMs: number;
        /** Background sync interval (ms) */
        syncIntervalMs: number;
        /** Max concurrent sync operations */
        maxConcurrentSync: number;
    };
    audit: {
        /** Facility ID for audit hash chain genesis */
        facilityId: string;
        /** Facility name */
        facilityName: string;
    };
}

// ── Riyadh Production Config ─────────────────────────────────────────────────

export const RIYADH_PRODUCTION: ServerConfig = {
    environment: DeployEnvironment.Production,
    sap: {
        server: 'sap-b1.riyadh.unimed.local',
        companyDb: 'UNIMED_PROD',
        licenseServer: 'sap-lic.riyadh.unimed.local:40000',
        maxConnections: 5,
        serviceLayerUrl: 'https://sap-sl.riyadh.unimed.local:50000/b1s/v1',
        dbType: 'HANA',
    },
    regulatory: {
        saberStrictMode: true,
        saberUrl: 'https://api.saber.sa/v1',
        sfdaUrl: 'https://saudi-di.sfda.gov.sa/api/v1/submissions',
        sfdaExportHour: 23,
    },
    sync: {
        maxSyncLatencyMs: 5_000,
        maxUiResponseMs: 2_000,
        syncIntervalMs: 30_000,
        maxConcurrentSync: 1,
    },
    audit: {
        facilityId: 'UNIMED-RUH-WH01',
        facilityName: 'UNIMED Riyadh Central Warehouse',
    },
};

// ── Environment Variables Map ────────────────────────────────────────────────

/**
 * Generates environment variables for the deployment.
 */
export function getEnvVars(config: ServerConfig): Record<string, string> {
    return {
        GRPO_ENV: config.environment,
        SAP_SERVER: config.sap.server,
        SAP_DB: config.sap.companyDb,
        SAP_LICENSE_SERVER: config.sap.licenseServer,
        SAP_MAX_CONNECTIONS: String(config.sap.maxConnections),
        SAP_SERVICE_LAYER_URL: config.sap.serviceLayerUrl,
        SAP_DB_TYPE: config.sap.dbType,
        SABER_STRICT_MODE: String(config.regulatory.saberStrictMode),
        SABER_API_URL: config.regulatory.saberUrl,
        SFDA_API_URL: config.regulatory.sfdaUrl,
        SFDA_EXPORT_HOUR: String(config.regulatory.sfdaExportHour),
        SYNC_MAX_LATENCY_MS: String(config.sync.maxSyncLatencyMs),
        UI_MAX_RESPONSE_MS: String(config.sync.maxUiResponseMs),
        FACILITY_ID: config.audit.facilityId,
        FACILITY_NAME: config.audit.facilityName,
    };
}

/**
 * Validates configuration for production readiness.
 */
export function validateConfig(config: ServerConfig): string[] {
    const errors: string[] = [];

    if (!config.sap.server) errors.push('SAP server hostname is required');
    if (!config.sap.companyDb) errors.push('SAP company database name is required');
    if (!config.sap.licenseServer) errors.push('SAP license server is required');
    if (config.sap.maxConnections < 1) errors.push('Max connections must be >= 1');
    if (config.sap.maxConnections > 10) errors.push('Max connections > 10 may overload SAP');
    if (!config.audit.facilityId) errors.push('Facility ID required for audit chain');
    if (config.environment !== DeployEnvironment.Production) {
        errors.push('Warning: Not in production mode');
    }

    return errors;
}
