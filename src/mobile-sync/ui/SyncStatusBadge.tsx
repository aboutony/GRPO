/**
 * SyncStatusBadge – Color-Coded Receipt Status Icon
 *
 * Visual indicator per receipt:
 *   🟢 Green  = Synced (has DocEntry)
 *   🟡 Yellow = Pending / Syncing / Retrying (pulsing animation)
 *   🔴 Red    = Conflict (requires attention)
 *   ⚪ Gray   = Draft (not yet committed)
 */

import React from 'react';
import { SyncStatus, SYNC_STATUS_COLORS } from '../models/sync-status';

interface SyncStatusBadgeProps {
    status: SyncStatus;
    size?: number;
    showLabel?: boolean;
}

const STATUS_LABELS: Record<SyncStatus, string> = {
    [SyncStatus.Draft]: 'Draft',
    [SyncStatus.Pending]: 'Pending',
    [SyncStatus.Syncing]: 'Syncing...',
    [SyncStatus.Synced]: 'Synced',
    [SyncStatus.Conflict]: 'Conflict',
    [SyncStatus.Retrying]: 'Retrying...',
};

const PULSING_STATUSES = new Set([
    SyncStatus.Pending,
    SyncStatus.Syncing,
    SyncStatus.Retrying,
]);

export const SyncStatusBadge: React.FC<SyncStatusBadgeProps> = ({
    status,
    size = 12,
    showLabel = false,
}) => {
    const color = SYNC_STATUS_COLORS[status];
    const isPulsing = PULSING_STATUSES.has(status);

    return (
        <span
            style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
            role="status"
            aria-label={`Sync status: ${STATUS_LABELS[status]}`}
        >
            <span
                style={{
                    width: size,
                    height: size,
                    borderRadius: '50%',
                    backgroundColor: color,
                    display: 'inline-block',
                    animation: isPulsing ? 'grpo-pulse 1.5s ease-in-out infinite' : undefined,
                }}
            />
            {showLabel && (
                <span style={{ fontSize: 12, color: '#6B7280', fontWeight: 500 }}>
                    {STATUS_LABELS[status]}
                </span>
            )}

            {/* Inject pulsing keyframes */}
            <style>{`
        @keyframes grpo-pulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.5; transform: scale(1.2); }
        }
      `}</style>
        </span>
    );
};

export default SyncStatusBadge;
