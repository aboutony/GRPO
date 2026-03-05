/**
 * Schema Migrations – Versioned Database Evolution
 *
 * Each migration has a version number and an up() function.
 * On app start, run all migrations above the current schema_version.
 */

export interface Migration {
    version: number;
    description: string;
    up: string[];
}

/** All migrations in order. Add new migrations at the end. */
export const MIGRATIONS: Migration[] = [
    // Version 1 is the initial schema created by schema.ts.
    // Future migrations go here:
    //
    // {
    //   version: 2,
    //   description: 'Add photo evidence column to receipts',
    //   up: [
    //     `ALTER TABLE grpo_receipts ADD COLUMN photo_path TEXT;`,
    //   ],
    // },
];

/**
 * Applies pending migrations to the database.
 *
 * @param db - Database handle
 * @param currentVersion - Current schema version from sync_meta
 */
export function applyMigrations(
    db: { exec: (sql: string) => void },
    currentVersion: number
): number {
    let applied = 0;

    for (const migration of MIGRATIONS) {
        if (migration.version > currentVersion) {
            for (const sql of migration.up) {
                db.exec(sql);
            }

            db.exec(
                `UPDATE sync_meta SET value = '${migration.version}', updated_at = datetime('now')
         WHERE key = 'schema_version';`
            );

            applied++;
        }
    }

    return applied;
}
