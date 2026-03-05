/**
 * PO Session Manager – The Gatekeeper
 *
 * Fetches PO lines via DI API, caches for the current session.
 * The scanner is PHYSICALLY LOCKED until startSession() is called.
 *
 * Rule: No scan, no putaway, no GRPO without an active PO session.
 */

import type { ScanResult } from '../models/scan-result';

// ── PO Line (from SAP B1) ────────────────────────────────────────────────────

export interface POLine {
    lineNum: number;
    itemCode: string;
    itemDescription: string;
    gtin: string;
    quantity: number;
    receivedQty: number;
    openQty: number;
    warehouseCode: string;
    unitPrice: number;
    currency: string;
    uomCode: string;
    qcRequired: boolean;
}

export interface POHeader {
    docEntry: number;
    docNum: number;
    cardCode: string;
    cardName: string;
    docDate: string;
    status: 'Open' | 'Closed';
    lines: POLine[];
}

// ── Session State ────────────────────────────────────────────────────────────

export interface SessionReceiptLine {
    poLineNum: number;
    itemCode: string;
    gtin: string;
    batchNo: string;
    expiry: string | null;
    serialNo: string | null;
    udiDi: string | null;
    udiPi: string | null;
    sterility: 'S' | 'N' | 'T';
    quantity: number;
    qcRequired: boolean;
    scanResult: ScanResult;
    scannedAt: string;
}

export interface POSession {
    /** Session ID */
    sessionId: string;
    /** Active PO header and lines */
    po: POHeader;
    /** Accumulated receipt lines for this session */
    receiptLines: SessionReceiptLine[];
    /** Started at timestamp */
    startedAt: string;
    /** Whether the session is active */
    active: boolean;
}

// ── DI API Data Source ───────────────────────────────────────────────────────

export interface PODataSource {
    /** Fetch open POs (optionally filtered) */
    fetchOpenPOs(filter?: { cardCode?: string; search?: string }): Promise<POHeader[]>;
    /** Fetch a single PO with full lines */
    fetchPO(docEntry: number): Promise<POHeader>;
}

// ── Session Manager ──────────────────────────────────────────────────────────

export function createPOSessionManager(dataSource: PODataSource) {
    let currentSession: POSession | null = null;
    const listeners: Array<(session: POSession | null) => void> = [];

    function notify(): void {
        for (const fn of listeners) {
            try { fn(currentSession); } catch { /* observer safety */ }
        }
    }

    return {
        /** Check if a session is active — scanner is LOCKED if false */
        isActive(): boolean {
            return currentSession !== null && currentSession.active;
        },

        /** Get the current session (null = scanner locked) */
        getSession(): POSession | null {
            return currentSession;
        },

        /** Fetch available Open POs for the selection screen */
        async fetchOpenPOs(filter?: { cardCode?: string; search?: string }): Promise<POHeader[]> {
            const pos = await dataSource.fetchOpenPOs(filter);
            return pos.filter(po => po.status === 'Open');
        },

        /**
         * Start a session — this is the ONLY way to unlock the scanner.
         * Fetches the PO, caches lines, and activates the session.
         */
        async startSession(poDocEntry: number): Promise<POSession> {
            const po = await dataSource.fetchPO(poDocEntry);

            if (po.status !== 'Open') {
                throw new Error(`PO ${po.docNum} is not Open — cannot start receiving session`);
            }

            currentSession = {
                sessionId: `SESSION-${Date.now()}`,
                po,
                receiptLines: [],
                startedAt: new Date().toISOString(),
                active: true,
            };

            notify();
            return currentSession;
        },

        /**
         * Add a confirmed receipt line to the session.
         * Called after scan → match → confirm.
         */
        addReceiptLine(line: SessionReceiptLine): void {
            if (!currentSession) throw new Error('No active session — scanner is locked');
            currentSession.receiptLines.push(line);
            notify();
        },

        /**
         * Get remaining open quantity for a PO line (factoring in session scans).
         */
        getRemainingQty(poLineNum: number): number {
            if (!currentSession) return 0;
            const poLine = currentSession.po.lines.find(l => l.lineNum === poLineNum);
            if (!poLine) return 0;
            const scanned = currentSession.receiptLines
                .filter(r => r.poLineNum === poLineNum)
                .reduce((sum, r) => sum + r.quantity, 0);
            return poLine.openQty - scanned;
        },

        /**
         * Get fulfillment status for all PO lines.
         */
        getLineStatuses(): Array<{
            lineNum: number;
            itemCode: string;
            itemDescription: string;
            totalQty: number;
            alreadyReceived: number;
            sessionScanned: number;
            remaining: number;
            status: 'complete' | 'partial' | 'pending';
        }> {
            if (!currentSession) return [];

            return currentSession.po.lines.map(line => {
                const sessionScanned = currentSession!.receiptLines
                    .filter(r => r.poLineNum === line.lineNum)
                    .reduce((sum, r) => sum + r.quantity, 0);
                const remaining = line.openQty - sessionScanned;

                let status: 'complete' | 'partial' | 'pending';
                if (remaining <= 0) status = 'complete';
                else if (sessionScanned > 0) status = 'partial';
                else status = 'pending';

                return {
                    lineNum: line.lineNum,
                    itemCode: line.itemCode,
                    itemDescription: line.itemDescription,
                    totalQty: line.quantity,
                    alreadyReceived: line.receivedQty,
                    sessionScanned,
                    remaining: Math.max(0, remaining),
                    status,
                };
            });
        },

        /** End the session — locks the scanner again */
        endSession(): SessionReceiptLine[] {
            if (!currentSession) return [];
            const lines = [...currentSession.receiptLines];
            currentSession.active = false;
            currentSession = null;
            notify();
            return lines;
        },

        /** Subscribe to session changes */
        onSessionChange(listener: (session: POSession | null) => void) {
            listeners.push(listener);
            return () => {
                const idx = listeners.indexOf(listener);
                if (idx >= 0) listeners.splice(idx, 1);
            };
        },
    };
}
