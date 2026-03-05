/**
 * Receipt Store – Local SQLite CRUD
 *
 * Every scan is committed to local storage BEFORE sync is attempted.
 * This is the operator's safety net — no data is ever lost.
 *
 * All queries use prepared statements for performance and SQL-injection safety.
 */

import { SyncStatus } from '../models/sync-status';
import type { QueuedReceipt, QueuedReceiptLine, NewReceipt } from '../models/queued-receipt';
import type { ConflictRecord } from '../models/conflict-record';

/** Minimal database interface compatible with better-sqlite3 and expo-sqlite */
export interface DatabaseHandle {
    exec: (sql: string) => void;
    prepare: (sql: string) => {
        run: (...params: unknown[]) => { changes: number };
        get: (...params: unknown[]) => Record<string, unknown> | undefined;
        all: (...params: unknown[]) => Record<string, unknown>[];
    };
}

/**
 * Receipt store — CRUD operations for the local GRPO cache.
 */
export class ReceiptStore {
    private db: DatabaseHandle;
    private onInsertCallbacks: Array<(receipt: QueuedReceipt) => void> = [];

    constructor(db: DatabaseHandle) {
        this.db = db;
    }

    // ── Insert ───────────────────────────────────────────────────────────────

    /**
     * Commits a new receipt to local storage with Pending status.
     * This MUST complete before any sync attempt.
     */
    insert(data: NewReceipt): QueuedReceipt {
        const id = crypto.randomUUID();
        const now = new Date().toISOString();

        const receipt: QueuedReceipt = {
            ...data,
            id,
            status: SyncStatus.Pending,
            createdAt: now,
            updatedAt: now,
            syncAttempts: 0,
            lastSyncAt: null,
            nextRetryAt: null,
            sapDocEntry: null,
            sapDocNum: null,
            lastErrorCode: null,
            lastErrorMessage: null,
            errorSeverity: null,
        };

        this.db.prepare(`
      INSERT INTO grpo_receipts (
        id, card_code, doc_date, tax_date, comments,
        sfda_sub_id, received_by, qc_status, lines_json,
        status, created_at, updated_at, sync_attempts
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
            receipt.id,
            receipt.cardCode,
            receipt.docDate,
            receipt.taxDate,
            receipt.comments,
            receipt.sfdaSubId,
            receipt.receivedBy,
            receipt.qcStatus,
            JSON.stringify(receipt.lines),
            receipt.status,
            receipt.createdAt,
            receipt.updatedAt,
            receipt.syncAttempts
        );

        // Update queue depth
        this._updateQueueDepth();

        // Notify sync engine
        for (const cb of this.onInsertCallbacks) {
            try { cb(receipt); } catch { /* observer errors must not break insert */ }
        }

        return receipt;
    }

    // ── Status Updates ─────────────────────────────────────────────────────

    /** Transition a receipt to Syncing state */
    markSyncing(id: string): void {
        this._updateStatus(id, SyncStatus.Syncing, {
            syncAttempts: 'sync_attempts + 1',
            lastSyncAt: new Date().toISOString(),
        });
    }

    /** Mark receipt as successfully synced with SAP DocEntry/DocNum */
    markSynced(id: string, docEntry: number, docNum: number): void {
        const now = new Date().toISOString();
        this.db.prepare(`
      UPDATE grpo_receipts SET
        status = ?, updated_at = ?,
        sap_doc_entry = ?, sap_doc_num = ?,
        last_error_code = NULL, last_error_msg = NULL, error_severity = NULL
      WHERE id = ?
    `).run(SyncStatus.Synced, now, docEntry, docNum, id);

        this._logSync(id, true, null, null, null);
        this._updateQueueDepth();
    }

    /** Mark receipt as having a retryable error — schedule next attempt */
    markRetrying(id: string, errorCode: number | null, errorMessage: string, retryAt: string): void {
        const now = new Date().toISOString();
        this.db.prepare(`
      UPDATE grpo_receipts SET
        status = ?, updated_at = ?,
        last_error_code = ?, last_error_msg = ?, error_severity = 'Retryable',
        next_retry_at = ?
      WHERE id = ?
    `).run(SyncStatus.Retrying, now, errorCode, errorMessage, retryAt, id);

        this._logSync(id, false, errorCode, errorMessage, 'Retryable');
    }

    /** Mark receipt as having a fatal conflict — requires operator resolution */
    markConflict(id: string, errorCode: number | null, errorMessage: string): void {
        const now = new Date().toISOString();
        this.db.prepare(`
      UPDATE grpo_receipts SET
        status = ?, updated_at = ?,
        last_error_code = ?, last_error_msg = ?, error_severity = 'Fatal'
      WHERE id = ?
    `).run(SyncStatus.Conflict, now, errorCode, errorMessage, id);

        this._logSync(id, false, errorCode, errorMessage, 'Fatal');
        this._updateQueueDepth();
    }

    // ── Queries ────────────────────────────────────────────────────────────

    /** Get all pending receipts in FIFO order (oldest first) */
    getPending(): QueuedReceipt[] {
        const rows = this.db.prepare(
            `SELECT * FROM grpo_receipts WHERE status = ? ORDER BY created_at ASC`
        ).all(SyncStatus.Pending);
        return rows.map(this._rowToReceipt);
    }

    /** Get all receipts ready for retry (past their next_retry_at) */
    getRetryable(now: string): QueuedReceipt[] {
        const rows = this.db.prepare(
            `SELECT * FROM grpo_receipts
       WHERE status = ? AND next_retry_at <= ?
       ORDER BY next_retry_at ASC`
        ).all(SyncStatus.Retrying, now);
        return rows.map(this._rowToReceipt);
    }

    /** Get all receipts in conflict state */
    getConflicts(): QueuedReceipt[] {
        const rows = this.db.prepare(
            `SELECT * FROM grpo_receipts WHERE status = ? ORDER BY updated_at DESC`
        ).all(SyncStatus.Conflict);
        return rows.map(this._rowToReceipt);
    }

    /** Get a single receipt by ID */
    getById(id: string): QueuedReceipt | null {
        const row = this.db.prepare(
            `SELECT * FROM grpo_receipts WHERE id = ?`
        ).get(id);
        return row ? this._rowToReceipt(row as Record<string, unknown>) : null;
    }

    /** Get aggregate counts by status */
    getStatusCounts(): Record<SyncStatus, number> {
        const rows = this.db.prepare(
            `SELECT status, COUNT(*) as count FROM grpo_receipts GROUP BY status`
        ).all();

        const counts = Object.fromEntries(
            Object.values(SyncStatus).map(s => [s, 0])
        ) as Record<SyncStatus, number>;

        for (const row of rows) {
            const status = (row as { status: string; count: number }).status as SyncStatus;
            counts[status] = (row as { count: number }).count;
        }
        return counts;
    }

    // ── Conflict Records ───────────────────────────────────────────────────

    /** Insert a conflict record linked to a receipt */
    insertConflict(conflict: ConflictRecord): void {
        this.db.prepare(`
      INSERT INTO grpo_conflicts (
        receipt_id, conflict_type, sap_error_code,
        sap_error_msg, detected_at, acknowledged, operator_notes
      ) VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(
            conflict.receiptId,
            conflict.conflictType,
            conflict.sapErrorCode,
            conflict.sapErrorMessage,
            conflict.detectedAt,
            conflict.acknowledged ? 1 : 0,
            conflict.operatorNotes
        );
    }

    /** Get unacknowledged conflicts */
    getUnacknowledgedConflicts(): ConflictRecord[] {
        const rows = this.db.prepare(
            `SELECT * FROM grpo_conflicts WHERE acknowledged = 0 ORDER BY detected_at DESC`
        ).all();
        return rows.map(this._rowToConflict);
    }

    /** Mark a conflict as acknowledged by the operator */
    acknowledgeConflict(conflictId: number, notes?: string): void {
        this.db.prepare(`
      UPDATE grpo_conflicts SET acknowledged = 1, operator_notes = ? WHERE id = ?
    `).run(notes ?? null, conflictId);
    }

    // ── Observer Pattern (for Sync Engine) ─────────────────────────────────

    /** Register a callback for new receipt inserts */
    onInsert(callback: (receipt: QueuedReceipt) => void): void {
        this.onInsertCallbacks.push(callback);
    }

    // ── Private Helpers ────────────────────────────────────────────────────

    private _updateStatus(id: string, status: SyncStatus, extra: Record<string, string>): void {
        const sets = [`status = '${status}'`, `updated_at = '${new Date().toISOString()}'`];
        for (const [col, val] of Object.entries(extra)) {
            if (col === 'syncAttempts') {
                sets.push(`sync_attempts = ${val}`);
            } else {
                sets.push(`${col.replace(/([A-Z])/g, '_$1').toLowerCase()} = '${val}'`);
            }
        }
        this.db.exec(`UPDATE grpo_receipts SET ${sets.join(', ')} WHERE id = '${id}'`);
    }

    private _logSync(
        receiptId: string, success: boolean,
        errorCode: number | null, errorMessage: string | null,
        severity: string | null
    ): void {
        this.db.prepare(`
      INSERT INTO grpo_sync_log (receipt_id, success, status_code, error_message, error_severity)
      VALUES (?, ?, ?, ?, ?)
    `).run(receiptId, success ? 1 : 0, errorCode, errorMessage, severity);
    }

    private _updateQueueDepth(): void {
        const row = this.db.prepare(
            `SELECT COUNT(*) as depth FROM grpo_receipts WHERE status IN ('PENDING','SYNCING','RETRYING')`
        ).get() as { depth: number } | undefined;
        const depth = row?.depth ?? 0;
        this.db.exec(
            `UPDATE sync_meta SET value = '${depth}', updated_at = datetime('now') WHERE key = 'queue_depth'`
        );
    }

    private _rowToReceipt(row: Record<string, unknown>): QueuedReceipt {
        return {
            id: row.id as string,
            cardCode: row.card_code as string,
            docDate: row.doc_date as string,
            taxDate: (row.tax_date as string) || null,
            comments: (row.comments as string) || null,
            sfdaSubId: (row.sfda_sub_id as string) || null,
            receivedBy: (row.received_by as string) || null,
            qcStatus: row.qc_status as 'P' | 'A' | 'R',
            lines: JSON.parse(row.lines_json as string) as QueuedReceiptLine[],
            status: row.status as SyncStatus,
            createdAt: row.created_at as string,
            updatedAt: row.updated_at as string,
            syncAttempts: row.sync_attempts as number,
            lastSyncAt: (row.last_sync_at as string) || null,
            nextRetryAt: (row.next_retry_at as string) || null,
            sapDocEntry: (row.sap_doc_entry as number) || null,
            sapDocNum: (row.sap_doc_num as number) || null,
            lastErrorCode: (row.last_error_code as number) || null,
            lastErrorMessage: (row.last_error_msg as string) || null,
            errorSeverity: (row.error_severity as 'Fatal' | 'Retryable') || null,
        };
    }

    private _rowToConflict(row: Record<string, unknown>): ConflictRecord {
        return {
            receiptId: row.receipt_id as string,
            conflictType: row.conflict_type as ConflictRecord['conflictType'],
            sapErrorCode: (row.sap_error_code as number) || null,
            sapErrorMessage: row.sap_error_msg as string,
            detectedAt: row.detected_at as string,
            acknowledged: (row.acknowledged as number) === 1,
            operatorNotes: (row.operator_notes as string) || null,
        };
    }
}
