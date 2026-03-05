/**
 * SABER Types – Certificate Validation Shapes
 *
 * Types for the SABER (Saudi Standards, Metrology and Quality Org)
 * Platform API integration. Every imported medical device must have
 * a valid Certificate of Conformity before receiving.
 */

// ── Certificate Status ───────────────────────────────────────────────────────

export enum SaberCertificateStatus {
    Valid = 'VALID',
    Expired = 'EXPIRED',
    Revoked = 'REVOKED',
    NotFound = 'NOT_FOUND',
    Pending = 'PENDING',
}

export const SABER_STATUS_INFO: Record<SaberCertificateStatus, {
    label: string;
    icon: string;
    color: string;
    canProceed: boolean;
}> = {
    [SaberCertificateStatus.Valid]: {
        label: 'Certificate Valid',
        icon: '✅',
        color: '#10B981',
        canProceed: true,
    },
    [SaberCertificateStatus.Expired]: {
        label: 'Certificate Expired',
        icon: '⏰',
        color: '#EF4444',
        canProceed: false,
    },
    [SaberCertificateStatus.Revoked]: {
        label: 'Certificate Revoked',
        icon: '🚫',
        color: '#EF4444',
        canProceed: false,
    },
    [SaberCertificateStatus.NotFound]: {
        label: 'Certificate Not Found',
        icon: '❓',
        color: '#F59E0B',
        canProceed: false,
    },
    [SaberCertificateStatus.Pending]: {
        label: 'Certificate Pending Review',
        icon: '⏳',
        color: '#F59E0B',
        canProceed: false,
    },
};

// ── Validation Result ────────────────────────────────────────────────────────

export interface SaberValidationResult {
    /** Whether the certificate is valid and GRPO can proceed */
    approved: boolean;
    /** Certificate status */
    status: SaberCertificateStatus;
    /** SABER certificate ID (e.g., "SABER-2026-XXXXX") */
    certificateId: string | null;
    /** Product category on the certificate */
    productCategory: string | null;
    /** Certificate expiry date (ISO) */
    expiryDate: string | null;
    /** Issuing conformity assessment body */
    issuingBody: string | null;
    /** Raw SABER API response for audit trail */
    rawResponse: unknown;
    /** Validation timestamp */
    validatedAt: string;
    /** Time taken for API call in ms */
    responseTimeMs: number;
    /** Error message if API call failed */
    errorMessage: string | null;
}

// ── Configuration ────────────────────────────────────────────────────────────

export interface SaberConfig {
    /** SABER API base URL */
    baseUrl: string;
    /** OAuth2 client ID */
    clientId: string;
    /** OAuth2 client secret */
    clientSecret: string;
    /** OAuth2 token endpoint */
    tokenEndpoint: string;
    /** API request timeout in ms */
    timeoutMs: number;
    /** Cache TTL in ms (default: 4 hours = shift-length) */
    cacheTtlMs: number;
    /** Strict mode: block on SABER unreachable (true) or warn (false) */
    strictMode: boolean;
    /** Circuit breaker: failures before opening */
    cbFailureThreshold: number;
    /** Circuit breaker: half-open timeout in ms */
    cbRecoveryMs: number;
}

/** Default SABER configuration */
export const DEFAULT_SABER_CONFIG: SaberConfig = {
    baseUrl: 'https://api.saber.sa/v1',
    clientId: '',
    clientSecret: '',
    tokenEndpoint: 'https://api.saber.sa/oauth2/token',
    timeoutMs: 15_000,
    cacheTtlMs: 4 * 60 * 60 * 1000, // 4 hours
    strictMode: true,
    cbFailureThreshold: 3,
    cbRecoveryMs: 60_000, // 60 seconds
};
