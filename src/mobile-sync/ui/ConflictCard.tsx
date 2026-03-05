/**
 * ConflictCard – Individual Conflict Detail
 *
 * Renders a single conflict with:
 *   - Icon + conflict type title
 *   - Human-readable description
 *   - Clear actionable next step
 *   - Raw error details (expandable)
 *   - Acknowledge button
 */

import React, { useState } from 'react';
import { CONFLICT_GUIDANCE, type ConflictRecord, type ConflictType } from '../models/conflict-record';

interface ConflictCardProps {
    conflict: ConflictRecord;
    onAcknowledge: (conflictId: string, notes?: string) => void;
}

export const ConflictCard: React.FC<ConflictCardProps> = ({
    conflict,
    onAcknowledge,
}) => {
    const [expanded, setExpanded] = useState(false);
    const [notes, setNotes] = useState('');

    const guidance = CONFLICT_GUIDANCE[conflict.conflictType as ConflictType]
        ?? CONFLICT_GUIDANCE.UNKNOWN;

    return (
        <div
            style={{
                border: '1px solid #FCA5A5',
                borderRadius: 8,
                padding: 16,
                marginBottom: 12,
                backgroundColor: '#FEF2F2',
                fontFamily: 'system-ui, -apple-system, sans-serif',
            }}
            role="alert"
            aria-label={`Conflict: ${guidance.title}`}
        >
            {/* ── Header ────────────────────────────────────────────────────────── */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                <span style={{ fontSize: 24 }}>{guidance.icon}</span>
                <div>
                    <div style={{ fontWeight: 700, fontSize: 15, color: '#991B1B' }}>
                        {guidance.title}
                    </div>
                    <div style={{ fontSize: 11, color: '#9CA3AF' }}>
                        {new Date(conflict.detectedAt).toLocaleString()}
                    </div>
                </div>
            </div>

            {/* ── Description ───────────────────────────────────────────────────── */}
            <p style={{ fontSize: 13, color: '#374151', lineHeight: 1.5, margin: '8px 0' }}>
                {guidance.description}
            </p>

            {/* ── Action ────────────────────────────────────────────────────────── */}
            <div
                style={{
                    padding: '8px 12px',
                    backgroundColor: '#DBEAFE',
                    borderRadius: 6,
                    fontSize: 13,
                    fontWeight: 600,
                    color: '#1E40AF',
                    marginBottom: 12,
                }}
            >
                ↳ {guidance.action}
            </div>

            {/* ── Error Details (expandable) ────────────────────────────────────── */}
            <button
                onClick={() => setExpanded(!expanded)}
                style={{
                    background: 'none', border: 'none', padding: 0,
                    color: '#6B7280', fontSize: 12, cursor: 'pointer',
                    textDecoration: 'underline', marginBottom: 8,
                }}
            >
                {expanded ? 'Hide' : 'Show'} technical details
            </button>

            {expanded && (
                <div
                    style={{
                        padding: 8, backgroundColor: '#F9FAFB', borderRadius: 4,
                        fontSize: 11, fontFamily: 'monospace', color: '#6B7280',
                        marginBottom: 12, overflowX: 'auto',
                    }}
                >
                    <div>SAP Error Code: {conflict.sapErrorCode ?? 'N/A'}</div>
                    <div>Message: {conflict.sapErrorMessage}</div>
                    <div>Receipt ID: {conflict.receiptId}</div>
                    <div>Conflict Type: {conflict.conflictType}</div>
                </div>
            )}

            {/* ── Acknowledge ───────────────────────────────────────────────────── */}
            {!conflict.acknowledged && (
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <input
                        type="text"
                        placeholder="Optional notes..."
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        style={{
                            flex: 1, padding: '6px 10px', borderRadius: 4,
                            border: '1px solid #D1D5DB', fontSize: 12,
                        }}
                        aria-label="Operator notes"
                    />
                    <button
                        onClick={() => onAcknowledge(conflict.receiptId, notes || undefined)}
                        style={{
                            padding: '6px 16px', borderRadius: 4, border: 'none',
                            backgroundColor: '#DC2626', color: '#FFFFFF',
                            fontSize: 12, fontWeight: 600, cursor: 'pointer',
                        }}
                        aria-label="Acknowledge conflict"
                    >
                        Acknowledge
                    </button>
                </div>
            )}

            {conflict.acknowledged && (
                <div style={{ fontSize: 12, color: '#059669', fontWeight: 600 }}>
                    ✓ Acknowledged{conflict.operatorNotes ? `: ${conflict.operatorNotes}` : ''}
                </div>
            )}
        </div>
    );
};

export default ConflictCard;
