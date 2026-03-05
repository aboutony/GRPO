/**
 * SAP Business One Service Layer – Session Management
 *
 * Reuses the established sapLogin pattern from THABAT connector.
 * Authenticates via POST /Login, returns B1SESSION cookie for all subsequent calls.
 */

import 'dotenv/config';

export interface SLSession {
    sessionId: string;
    baseUrl: string;
}

/**
 * Reads Service Layer connection config from environment variables.
 */
function getConfig() {
    const baseUrl = process.env.SL_BASE_URL;
    const companyDB = process.env.SL_COMPANY_DB;
    const username = process.env.SL_USERNAME;
    const password = process.env.SL_PASSWORD;

    if (!baseUrl || !companyDB || !username || !password) {
        throw new Error(
            'Missing SAP Service Layer configuration.\n' +
            'Required env vars: SL_BASE_URL, SL_COMPANY_DB, SL_USERNAME, SL_PASSWORD\n' +
            'Copy .env.example → .env and fill in your credentials.'
        );
    }

    return { baseUrl, companyDB, username, password };
}

/**
 * Authenticates with SAP Service Layer and returns a session.
 */
export async function createSession(): Promise<SLSession> {
    const config = getConfig();

    const res = await fetch(`${config.baseUrl}/Login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            CompanyDB: config.companyDB,
            UserName: config.username,
            Password: config.password,
        }),
    });

    if (!res.ok) {
        const body = await res.text();
        throw new Error(`SAP Login failed (${res.status}): ${body}`);
    }

    const data = await res.json();
    return {
        sessionId: data.SessionId,
        baseUrl: config.baseUrl,
    };
}

/**
 * Gracefully destroys a Service Layer session.
 */
export async function destroySession(session: SLSession): Promise<void> {
    try {
        await fetch(`${session.baseUrl}/Logout`, {
            method: 'POST',
            headers: { Cookie: `B1SESSION=${session.sessionId}` },
        });
    } catch {
        // Logout failures are non-critical; session will expire automatically
    }
}

/**
 * Makes a POST request to the Service Layer with the active session.
 * Returns { success, status, data } for the caller to interpret.
 */
export async function slPost(
    session: SLSession,
    endpoint: string,
    payload: unknown
): Promise<{ success: boolean; status: number; data: unknown }> {
    const res = await fetch(`${session.baseUrl}/${endpoint}`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            Cookie: `B1SESSION=${session.sessionId}`,
        },
        body: JSON.stringify(payload),
    });

    const data = await res.json().catch(() => ({}));
    return { success: res.ok, status: res.status, data };
}
