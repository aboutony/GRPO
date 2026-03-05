/**
 * PO Line Status – Real-Time Fulfillment Progress
 *
 * Shows fulfilled vs remaining per PO line with color coding:
 *   🟢 Green  = Complete (received = ordered)
 *   🟡 Yellow = Partial  (some received)
 *   ⬜ Gray   = Pending  (nothing received yet)
 *
 * Updates in real-time as items are scanned within the session.
 */

import React from 'react';

interface LineStatusData {
    lineNum: number;
    itemCode: string;
    itemDescription: string;
    totalQty: number;
    alreadyReceived: number;
    sessionScanned: number;
    remaining: number;
    status: 'complete' | 'partial' | 'pending';
}

interface POLineStatusProps {
    poDocNum: number;
    lines: LineStatusData[];
    /** Compact mode (fewer details) */
    compact?: boolean;
}

const STATUS_COLORS = {
    complete: { bg: 'rgba(16, 185, 129, 0.12)', bar: '#10B981', text: '#10B981', icon: '✅' },
    partial: { bg: 'rgba(245, 158, 11, 0.12)', bar: '#F59E0B', text: '#F59E0B', icon: '🟡' },
    pending: { bg: 'rgba(107, 114, 128, 0.12)', bar: '#374151', text: '#6B7280', icon: '⬜' },
};

export const POLineStatus: React.FC<POLineStatusProps> = ({
    poDocNum,
    lines,
    compact = false,
}) => {
    const totalLines = lines.length;
    const completeLines = lines.filter(l => l.status === 'complete').length;
    const totalOrdered = lines.reduce((s, l) => s + l.totalQty, 0);
    const totalReceived = lines.reduce((s, l) => s + l.alreadyReceived + l.sessionScanned, 0);

    return (
        <div style={{
            borderRadius: 14, overflow: 'hidden',
            border: '1px solid #1E293B',
            backgroundColor: '#111827',
            fontFamily: 'system-ui, -apple-system, sans-serif',
        }}>
            {/* ── Header ─────────────────────────────────────────────────── */}
            <div style={{
                padding: '14px 16px',
                borderBottom: '1px solid #1E293B',
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            }}>
                <div>
                    <div style={{ fontSize: 14, fontWeight: 700, color: '#F9FAFB' }}>
                        PO-{poDocNum} Progress
                    </div>
                    <div style={{ fontSize: 11, color: '#6B7280', marginTop: 2 }}>
                        {completeLines}/{totalLines} lines · {totalReceived}/{totalOrdered} units
                    </div>
                </div>
                <div style={{
                    padding: '4px 10px', borderRadius: 8,
                    background: completeLines === totalLines
                        ? 'rgba(16, 185, 129, 0.15)' : 'rgba(59, 130, 246, 0.15)',
                    color: completeLines === totalLines ? '#10B981' : '#3B82F6',
                    fontSize: 11, fontWeight: 700,
                }}>
                    {Math.round((totalReceived / totalOrdered) * 100)}%
                </div>
            </div>

            {/* ── Line Items ─────────────────────────────────────────────── */}
            <div style={{ padding: compact ? '8px 16px' : '12px 16px' }}>
                {lines.map((line, idx) => {
                    const colors = STATUS_COLORS[line.status];
                    const receivedTotal = line.alreadyReceived + line.sessionScanned;
                    const pct = line.totalQty > 0 ? (receivedTotal / line.totalQty) * 100 : 0;

                    return (
                        <div
                            key={line.lineNum}
                            style={{
                                padding: compact ? '8px 0' : '10px 0',
                                borderBottom: idx < lines.length - 1 ? '1px solid #1E293B' : 'none',
                            }}
                        >
                            <div style={{
                                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                                marginBottom: 6,
                            }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                    <span style={{ fontSize: 14 }}>{colors.icon}</span>
                                    <div>
                                        <div style={{ fontSize: 13, fontWeight: 600, color: '#F9FAFB' }}>
                                            {line.itemCode}
                                        </div>
                                        {!compact && (
                                            <div style={{ fontSize: 11, color: '#6B7280', marginTop: 1 }}>
                                                {line.itemDescription.slice(0, 40)}
                                            </div>
                                        )}
                                    </div>
                                </div>
                                <div style={{
                                    fontSize: 13, fontWeight: 700, color: colors.text,
                                }}>
                                    {receivedTotal}/{line.totalQty}
                                </div>
                            </div>

                            {/* Progress bar */}
                            <div style={{
                                height: 6, borderRadius: 3,
                                backgroundColor: '#1E293B',
                                overflow: 'hidden',
                            }}>
                                <div style={{
                                    height: '100%',
                                    width: `${Math.min(pct, 100)}%`,
                                    backgroundColor: colors.bar,
                                    borderRadius: 3,
                                    transition: 'width 0.4s ease-out',
                                }} />
                            </div>

                            {/* Session detail */}
                            {!compact && line.sessionScanned > 0 && (
                                <div style={{
                                    fontSize: 11, color: '#3B82F6', marginTop: 4,
                                    fontWeight: 600,
                                }}>
                                    +{line.sessionScanned} scanned this session
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default POLineStatus;
