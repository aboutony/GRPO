/**
 * SABER REST API Client
 *
 * Real-time Certificate of Conformity validation against
 * the SABER Platform API (Saudi Standards, Metrology and Quality Org).
 *
 * Features:
 *   - OAuth2 client credentials authentication
 *   - Circuit breaker (3 failures / 60s recovery)
 *   - Response caching (4-hour TTL, shift-length)
 *   - Timeout enforcement (15s default)
 */

import {
    SaberCertificateStatus,
    type SaberConfig,
    type SaberValidationResult,
    DEFAULT_SABER_CONFIG,
} from './saber-types';

// ── OAuth2 Token Management ──────────────────────────────────────────────────

interface OAuthToken {
    accessToken: string;
    expiresAt: number;
}

let cachedToken: OAuthToken | null = null;

async function getAccessToken(config: SaberConfig): Promise<string> {
    // Return cached token if still valid (with 60s buffer)
    if (cachedToken && cachedToken.expiresAt > Date.now() + 60_000) {
        return cachedToken.accessToken;
    }

    const response = await fetchWithTimeout(config.tokenEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
            grant_type: 'client_credentials',
            client_id: config.clientId,
            client_secret: config.clientSecret,
            scope: 'certificate.read',
        }),
    }, config.timeoutMs);

    if (!response.ok) {
        throw new Error(`SABER OAuth2 failed: ${response.status} ${response.statusText}`);
    }

    const data = await response.json() as {
        access_token: string;
        expires_in: number;
    };

    cachedToken = {
        accessToken: data.access_token,
        expiresAt: Date.now() + (data.expires_in * 1000),
    };

    return cachedToken.accessToken;
}

// ── Circuit Breaker ──────────────────────────────────────────────────────────

interface CircuitState {
    failures: number;
    lastFailureAt: number;
    isOpen: boolean;
}

const circuitState: CircuitState = {
    failures: 0,
    lastFailureAt: 0,
    isOpen: false,
};

function checkCircuit(config: SaberConfig): void {
    if (!circuitState.isOpen) return;

    // Check if recovery window has passed (half-open)
    if (Date.now() - circuitState.lastFailureAt > config.cbRecoveryMs) {
        circuitState.isOpen = false;
        circuitState.failures = 0;
        return;
    }

    throw new Error('SABER circuit breaker OPEN — API temporarily unavailable');
}

function recordSuccess(): void {
    circuitState.failures = 0;
    circuitState.isOpen = false;
}

function recordFailure(config: SaberConfig): void {
    circuitState.failures++;
    circuitState.lastFailureAt = Date.now();
    if (circuitState.failures >= config.cbFailureThreshold) {
        circuitState.isOpen = true;
    }
}

// ── Response Cache ───────────────────────────────────────────────────────────

const responseCache = new Map<string, {
    result: SaberValidationResult;
    cachedAt: number;
}>();

function getCached(key: string, ttl: number): SaberValidationResult | null {
    const entry = responseCache.get(key);
    if (!entry) return null;
    if (Date.now() - entry.cachedAt > ttl) {
        responseCache.delete(key);
        return null;
    }
    return entry.result;
}

function setCache(key: string, result: SaberValidationResult): void {
    responseCache.set(key, { result, cachedAt: Date.now() });
}

/** Clears the entire SABER cache (e.g., on config change) */
export function clearSaberCache(): void {
    responseCache.clear();
}

// ── Public API ───────────────────────────────────────────────────────────────

/**
 * Validates a Certificate of Conformity against the SABER Platform API.
 *
 * @param itemCode - SAP item code (GTIN)
 * @param sfdaSubId - SFDA submission ID for the product
 * @param config - SABER API configuration
 * @returns SaberValidationResult with certificate status
 */
export async function validateCertificate(
    itemCode: string,
    sfdaSubId: string,
    config: SaberConfig = DEFAULT_SABER_CONFIG
): Promise<SaberValidationResult> {
    const start = performance.now();
    const cacheKey = `${itemCode}:${sfdaSubId}`;

    // Check cache first
    const cached = getCached(cacheKey, config.cacheTtlMs);
    if (cached) return cached;

    try {
        // Check circuit breaker
        checkCircuit(config);

        // Authenticate
        const token = await getAccessToken(config);

        // Call SABER API
        const response = await fetchWithTimeout(
            `${config.baseUrl}/certificates/validate`,
            {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                },
                body: JSON.stringify({
                    productCode: itemCode,
                    sfdaSubmissionId: sfdaSubId,
                }),
            },
            config.timeoutMs
        );

        const elapsed = Math.round(performance.now() - start);

        if (!response.ok) {
            recordFailure(config);

            if (response.status === 404) {
                const result = buildResult(
                    SaberCertificateStatus.NotFound, null, elapsed,
                    `Product ${itemCode} not found in SABER registry`
                );
                setCache(cacheKey, result);
                return result;
            }

            throw new Error(`SABER API error: ${response.status} ${response.statusText}`);
        }

        const data = await response.json() as {
            certificateId: string;
            status: string;
            productCategory: string;
            expiryDate: string;
            issuingBody: string;
        };

        recordSuccess();

        // Map SABER API status to our enum
        const status = mapSaberStatus(data.status);

        const result: SaberValidationResult = {
            approved: status === SaberCertificateStatus.Valid,
            status,
            certificateId: data.certificateId,
            productCategory: data.productCategory,
            expiryDate: data.expiryDate,
            issuingBody: data.issuingBody,
            rawResponse: data,
            validatedAt: new Date().toISOString(),
            responseTimeMs: elapsed,
            errorMessage: null,
        };

        setCache(cacheKey, result);
        return result;

    } catch (error) {
        const elapsed = Math.round(performance.now() - start);
        const errMsg = error instanceof Error ? error.message : String(error);

        recordFailure(config);

        // In lenient mode, allow proceeding with a warning
        if (!config.strictMode) {
            return buildResult(
                SaberCertificateStatus.Valid, null, elapsed,
                `SABER unreachable (lenient mode): ${errMsg}`
            );
        }

        return buildResult(
            SaberCertificateStatus.NotFound, null, elapsed,
            `SABER validation failed: ${errMsg}`
        );
    }
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function mapSaberStatus(raw: string): SaberCertificateStatus {
    const normalized = raw.toUpperCase().replace(/[\s-]/g, '_');
    switch (normalized) {
        case 'VALID':
        case 'ACTIVE':
        case 'APPROVED':
            return SaberCertificateStatus.Valid;
        case 'EXPIRED':
            return SaberCertificateStatus.Expired;
        case 'REVOKED':
        case 'CANCELLED':
        case 'SUSPENDED':
            return SaberCertificateStatus.Revoked;
        case 'PENDING':
        case 'UNDER_REVIEW':
            return SaberCertificateStatus.Pending;
        default:
            return SaberCertificateStatus.NotFound;
    }
}

function buildResult(
    status: SaberCertificateStatus,
    raw: unknown,
    elapsed: number,
    errorMessage: string | null
): SaberValidationResult {
    return {
        approved: status === SaberCertificateStatus.Valid,
        status,
        certificateId: null,
        productCategory: null,
        expiryDate: null,
        issuingBody: null,
        rawResponse: raw,
        validatedAt: new Date().toISOString(),
        responseTimeMs: elapsed,
        errorMessage,
    };
}

async function fetchWithTimeout(
    url: string,
    options: RequestInit,
    timeoutMs: number
): Promise<Response> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    try {
        return await fetch(url, { ...options, signal: controller.signal });
    } finally {
        clearTimeout(timer);
    }
}
