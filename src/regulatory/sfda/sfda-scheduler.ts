/**
 * SFDA Scheduler – Background Daily Export Job
 *
 * Runs daily at configurable time (default 23:00 local)
 * to aggregate, format, and transmit SFDA reports.
 *
 * Catch-up logic: if the device was off when the job was due,
 * runs immediately on next app launch.
 */

import type { SfdaConfig } from './sfda-types';
import type { ReceiptDataSource } from './sfda-export';
import type { TransmissionStore } from './sfda-transmitter';
import {
    aggregateDailyRecords,
    buildExportPayload,
    formatAsXml,
    formatAsCsv,
} from './sfda-export';
import { transmit } from './sfda-transmitter';

// ── Event Types ──────────────────────────────────────────────────────────────

export type SchedulerEvent =
    | { type: 'export_started'; reportDate: string }
    | { type: 'export_complete'; reportDate: string; recordCount: number; success: boolean }
    | { type: 'export_failed'; reportDate: string; error: string }
    | { type: 'catchup_triggered'; missedDates: string[] };

type EventListener = (event: SchedulerEvent) => void;

// ── Scheduler State ──────────────────────────────────────────────────────────

interface SchedulerState {
    running: boolean;
    lastRunDate: string | null;
    nextRunAt: Date | null;
    timerId: ReturnType<typeof setTimeout> | null;
}

// ── Scheduler ────────────────────────────────────────────────────────────────

/**
 * Creates an SFDA export scheduler.
 */
export function createSfdaScheduler(
    config: SfdaConfig,
    dataSource: ReceiptDataSource,
    transmissionStore: TransmissionStore
) {
    const listeners: EventListener[] = [];
    const state: SchedulerState = {
        running: false,
        lastRunDate: null,
        nextRunAt: null,
        timerId: null,
    };

    function emit(event: SchedulerEvent): void {
        for (const listener of listeners) {
            try { listener(event); } catch { /* observer safety */ }
        }
    }

    /**
     * Runs the export for a specific date.
     */
    async function runExport(reportDate: string): Promise<boolean> {
        emit({ type: 'export_started', reportDate });

        try {
            // 1. Aggregate daily records
            const records = await aggregateDailyRecords(dataSource, reportDate);

            if (records.length === 0) {
                emit({ type: 'export_complete', reportDate, recordCount: 0, success: true });
                state.lastRunDate = reportDate;
                return true;
            }

            // 2. Build payload
            const payload = await buildExportPayload(records, reportDate, config);

            // 3. Format
            const xmlContent = formatAsXml(payload);
            // Also generate CSV if configured
            if (config.format === 'csv' || config.format === 'both') {
                formatAsCsv(payload); // Stored locally for download
            }

            // 4. Transmit
            const result = await transmit(payload, xmlContent, transmissionStore, config);
            const success = result.status === 'ACKNOWLEDGED';

            emit({ type: 'export_complete', reportDate, recordCount: records.length, success });
            state.lastRunDate = reportDate;
            return success;

        } catch (error) {
            const errMsg = error instanceof Error ? error.message : String(error);
            emit({ type: 'export_failed', reportDate, error: errMsg });
            return false;
        }
    }

    /**
     * Checks for missed exports and catches up.
     */
    async function catchUp(): Promise<void> {
        if (!state.lastRunDate) return;

        const lastRun = new Date(state.lastRunDate);
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const missedDates: string[] = [];
        const cursor = new Date(lastRun);
        cursor.setDate(cursor.getDate() + 1);

        while (cursor < today) {
            missedDates.push(cursor.toISOString().split('T')[0]);
            cursor.setDate(cursor.getDate() + 1);
        }

        if (missedDates.length > 0) {
            emit({ type: 'catchup_triggered', missedDates });
            for (const date of missedDates) {
                await runExport(date);
            }
        }
    }

    /**
     * Schedules the next run.
     */
    function scheduleNext(): void {
        const now = new Date();
        const next = new Date(now);
        next.setHours(config.scheduledHour, 0, 0, 0);

        // If we've already passed the scheduled time today, schedule for tomorrow
        if (next <= now) {
            next.setDate(next.getDate() + 1);
        }

        const delay = next.getTime() - now.getTime();
        state.nextRunAt = next;

        state.timerId = setTimeout(async () => {
            const reportDate = new Date();
            reportDate.setDate(reportDate.getDate()); // Today's date
            await runExport(reportDate.toISOString().split('T')[0]);
            scheduleNext(); // Re-schedule for next day
        }, delay);
    }

    return {
        /**
         * Starts the scheduler. Checks for catch-ups and schedules next run.
         */
        async start() {
            if (state.running) return;
            state.running = true;
            await catchUp();
            scheduleNext();
        },

        /**
         * Stops the scheduler.
         */
        stop() {
            state.running = false;
            if (state.timerId) {
                clearTimeout(state.timerId);
                state.timerId = null;
            }
        },

        /**
         * Forces an immediate export for a given date.
         */
        async forceExport(reportDate: string): Promise<boolean> {
            return runExport(reportDate);
        },

        /**
         * Gets the current scheduler state.
         */
        getState: () => ({ ...state }),

        /**
         * Sets the last run date (for restoring from persistence).
         */
        setLastRunDate(date: string) {
            state.lastRunDate = date;
        },

        /**
         * Subscribe to scheduler events.
         */
        onEvent(listener: EventListener) {
            listeners.push(listener);
            return () => {
                const idx = listeners.indexOf(listener);
                if (idx >= 0) listeners.splice(idx, 1);
            };
        },
    };
}
