/**
 * SQLite Schema – Local Persistence with WAL
 *
 * Write-Ahead Logging ensures crash-safe storage:
 *   - Concurrent reads during writes
 *   - No data loss on unexpected app termination
 *   - Every scan is committed BEFORE sync is attempted
 *
 * Tables:
 *   grpo_receipts  — Queued GRPO documents (header + JSON lines)
 *   grpo_sync_log  — Sync attempt history per receipt
 *   grpo_conflicts — Active conflicts awaiting resolution
 *   sync_meta      — Engine state (last sync, queue depth)
 */

export const SCHEMA_VERSION = 1;

/** SQL statements to initialize the local database */
export const INIT_PRAGMAS = [
    'PRAGMA journal_mode = WAL;',
    'PRAGMA synchronous = NORMAL;',
    'PRAGMA foreign_keys = ON;',
    'PRAGMA busy_timeout = 5000;',
] as const;

export const CREATE_TABLES = [
    // ── Receipts ─────────────────────────────────────────────────────────────
    `CREATE TABLE IF NOT EXISTS grpo_receipts (
    id               TEXT PRIMARY KEY,
    card_code        TEXT NOT NULL,
    doc_date         TEXT NOT NULL,
    tax_date         TEXT,
    comments         TEXT,
    sfda_sub_id      TEXT,
    received_by      TEXT,
    qc_status        TEXT NOT NULL DEFAULT 'P' CHECK(qc_status IN ('P','A','R')),
    lines_json       TEXT NOT NULL,
    status           TEXT NOT NULL DEFAULT 'PENDING'
                     CHECK(status IN ('DRAFT','PENDING','SYNCING','SYNCED','CONFLICT','RETRYING')),
    created_at       TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at       TEXT NOT NULL DEFAULT (datetime('now')),
    sync_attempts    INTEGER NOT NULL DEFAULT 0,
    last_sync_at     TEXT,
    next_retry_at    TEXT,
    sap_doc_entry    INTEGER,
    sap_doc_num      INTEGER,
    last_error_code  INTEGER,
    last_error_msg   TEXT,
    error_severity   TEXT CHECK(error_severity IN ('Fatal','Retryable'))
  );`,

    // ── Sync Log ─────────────────────────────────────────────────────────────
    `CREATE TABLE IF NOT EXISTS grpo_sync_log (
    id               INTEGER PRIMARY KEY AUTOINCREMENT,
    receipt_id       TEXT NOT NULL REFERENCES grpo_receipts(id),
    attempted_at     TEXT NOT NULL DEFAULT (datetime('now')),
    success          INTEGER NOT NULL DEFAULT 0,
    status_code      INTEGER,
    error_message    TEXT,
    error_severity   TEXT,
    duration_ms      INTEGER
  );`,

    // ── Conflicts ────────────────────────────────────────────────────────────
    `CREATE TABLE IF NOT EXISTS grpo_conflicts (
    id               INTEGER PRIMARY KEY AUTOINCREMENT,
    receipt_id       TEXT NOT NULL REFERENCES grpo_receipts(id),
    conflict_type    TEXT NOT NULL,
    sap_error_code   INTEGER,
    sap_error_msg    TEXT NOT NULL,
    detected_at      TEXT NOT NULL DEFAULT (datetime('now')),
    acknowledged     INTEGER NOT NULL DEFAULT 0,
    operator_notes   TEXT
  );`,

    // ── Engine Metadata ──────────────────────────────────────────────────────
    `CREATE TABLE IF NOT EXISTS sync_meta (
    key              TEXT PRIMARY KEY,
    value            TEXT NOT NULL,
    updated_at       TEXT NOT NULL DEFAULT (datetime('now'))
  );`,
] as const;

export const CREATE_INDEXES = [
    'CREATE INDEX IF NOT EXISTS idx_receipts_status ON grpo_receipts(status);',
    'CREATE INDEX IF NOT EXISTS idx_receipts_next_retry ON grpo_receipts(next_retry_at) WHERE status = \'RETRYING\';',
    'CREATE INDEX IF NOT EXISTS idx_sync_log_receipt ON grpo_sync_log(receipt_id);',
    'CREATE INDEX IF NOT EXISTS idx_conflicts_receipt ON grpo_conflicts(receipt_id);',
    'CREATE INDEX IF NOT EXISTS idx_conflicts_ack ON grpo_conflicts(acknowledged) WHERE acknowledged = 0;',
] as const;

/**
 * Initializes the SQLite database with WAL mode and schema tables.
 * Safe to call multiple times (uses IF NOT EXISTS).
 *
 * @param db - A database handle compatible with better-sqlite3 or expo-sqlite API
 */
export function initializeDatabase(db: {
    exec: (sql: string) => void;
    pragma: (pragma: string) => unknown;
}): void {
    // Enable WAL and safety pragmas
    for (const pragma of INIT_PRAGMAS) {
        db.exec(pragma);
    }

    // Create tables
    for (const ddl of CREATE_TABLES) {
        db.exec(ddl);
    }

    // Create indexes
    for (const idx of CREATE_INDEXES) {
        db.exec(idx);
    }

    // Seed engine metadata
    db.exec(`
    INSERT OR IGNORE INTO sync_meta (key, value) VALUES
      ('schema_version', '${SCHEMA_VERSION}'),
      ('last_sync_at', ''),
      ('queue_depth', '0');
  `);
}
