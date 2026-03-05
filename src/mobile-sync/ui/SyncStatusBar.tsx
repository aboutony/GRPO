/**
 * SyncStatusBar – Global Sync State Summary
 *
 * Persistent top bar showing aggregate sync state:
 *   "3 Synced · 2 Pending · 1 Conflict"
 * Plus a connection indicator (WiFi/Offline).
 */

import React from 'react';
import { SyncStatus, SYNC_STATUS_COLORS } from '../models/sync-status';

interface SyncStatusBarProps {
    counts: Record<SyncStatus, number>;
    isOnline: boolean;
    isProcessing: boolean;
    onSyncNow?: () => void;
}

export const SyncStatusBar: React.FC<SyncStatusBarProps> = ({
    counts,
    isOnline,
    isProcessing,
    onSyncNow,
}) => {
    const synced = counts[SyncStatus.Synced] || 0;
    const pending = (counts[SyncStatus.Pending] || 0) +
        (counts[SyncStatus.Syncing] || 0) +
        (counts[SyncStatus.Retrying] || 0);
    const conflicts = counts[SyncStatus.Conflict] || 0;

    return (
        <div
            style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '8px 16px',
                backgroundColor: '#1F2937',
                borderBottom: '1px solid #374151',
                fontFamily: 'system-ui, -apple-system, sans-serif',
                fontSize: 13,
                color: '#D1D5DB',
            }}
            role="banner"
            aria-label="Sync status summary"
        >
            {/* Left: Status counts */}
            <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
                <StatusPill count={synced} color={SYNC_STATUS_COLORS[SyncStatus.Synced]} label="Synced" />
                <StatusPill count={pending} color={SYNC_STATUS_COLORS[SyncStatus.Pending]} label="Pending" />
                <StatusPill count={conflicts} color={SYNC_STATUS_COLORS[SyncStatus.Conflict]} label="Conflict" />
            </div>

            {/* Right: Connection + Sync button */}
            <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                {/* Connection indicator */}
                <span
                    style={{ display: 'flex', alignItems: 'center', gap: 4 }}
                    title={isOnline ? 'Connected' : 'Offline'}
                >
                    <span style={{
                        width: 8, height: 8, borderRadius: '50%',
                        backgroundColor: isOnline ? '#10B981' : '#EF4444',
                    }} />
                    <span style={{ fontSize: 11, color: '#9CA3AF' }}>
                        {isOnline ? 'Online' : 'Offline'}
                    </span>
                </span>

                {/* Sync Now button (only when online and not processing) */}
                {isOnline && pending > 0 && (
                    <button
                        onClick={onSyncNow}
                        disabled={isProcessing}
                        style={{
                            padding: '4px 12px',
                            borderRadius: 4,
                            border: 'none',
                            backgroundColor: isProcessing ? '#374151' : '#3B82F6',
                            color: '#FFFFFF',
                            fontSize: 12,
                            fontWeight: 600,
                            cursor: isProcessing ? 'default' : 'pointer',
                            opacity: isProcessing ? 0.6 : 1,
                        }}
                        aria-label="Sync now"
                    >
                        {isProcessing ? 'Syncing...' : 'Sync Now'}
                    </button>
                )}
            </div>
        </div>
    );
};

/** Small count pill with colored dot */
const StatusPill: React.FC<{ count: number; color: string; label: string }> = ({
    count, color, label,
}) => (
    <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
        <span style={{
            width: 6, height: 6, borderRadius: '50%', backgroundColor: color,
        }} />
        <span style={{ fontWeight: 600 }}>{count}</span>
        <span style={{ color: '#9CA3AF' }}>{label}</span>
    </span>
);

export default SyncStatusBar;
