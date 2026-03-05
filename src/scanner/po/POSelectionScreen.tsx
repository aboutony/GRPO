/**
 * PO Selection Screen – The Mandatory Entry Point
 *
 * The scanner is LOCKED until the operator selects an Open PO.
 * This is the only way to begin a receiving session.
 *
 * Layout:
 *   ┌────────────────────────────────┐
 *   │ 📋 Select Purchase Order      │
 *   │ [🔍 Search PO or vendor...  ] │
 *   ├────────────────────────────────┤
 *   │ PO-1001  MedSupply Intl       │
 *   │ 2 lines · 600 units open      │
 *   │ ────────────────────────────── │
 *   │ PO-1002  MedSupply Intl       │
 *   │ 1 line · 20 units open        │
 *   └────────────────────────────────┘
 */

import React, { useState, useEffect } from 'react';
import type { POHeader } from './po-session';

interface POSelectionScreenProps {
    /** Fetch open POs from the session manager */
    fetchOpenPOs: (filter?: { search?: string }) => Promise<POHeader[]>;
    /** Called when a PO is selected — starts the session */
    onSelectPO: (poDocEntry: number) => void;
    /** Loading state */
    loading?: boolean;
}

export const POSelectionScreen: React.FC<POSelectionScreenProps> = ({
    fetchOpenPOs,
    onSelectPO,
    loading = false,
}) => {
    const [pos, setPos] = useState<POHeader[]>([]);
    const [search, setSearch] = useState('');
    const [fetching, setFetching] = useState(true);

    useEffect(() => {
        let active = true;
        setFetching(true);
        fetchOpenPOs({ search: search || undefined })
            .then(data => { if (active) setPos(data); })
            .finally(() => { if (active) setFetching(false); });
        return () => { active = false; };
    }, [search, fetchOpenPOs]);

    return (
        <div style={{
            position: 'fixed', inset: 0,
            backgroundColor: '#0A0E1A',
            display: 'flex', flexDirection: 'column',
            fontFamily: 'system-ui, -apple-system, sans-serif',
            zIndex: 1000,
        }}>
            {/* ── Header ──────────────────────────────────────────────────── */}
            <div style={{
                padding: '20px 20px 16px',
                borderBottom: '1px solid #1E293B',
            }}>
                <div style={{
                    display: 'flex', alignItems: 'center', gap: 10,
                    marginBottom: 16,
                }}>
                    <div style={{
                        width: 40, height: 40, borderRadius: 12,
                        background: 'linear-gradient(135deg, #2563EB, #3B82F6)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 20,
                    }}>📋</div>
                    <div>
                        <div style={{ fontSize: 18, fontWeight: 800, color: '#F9FAFB' }}>
                            Select Purchase Order
                        </div>
                        <div style={{ fontSize: 12, color: '#6B7280' }}>
                            Scanner locked — select a PO to begin receiving
                        </div>
                    </div>
                </div>

                {/* Search */}
                <div style={{ position: 'relative' }}>
                    <span style={{
                        position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)',
                        fontSize: 16, color: '#6B7280', pointerEvents: 'none',
                    }}>🔍</span>
                    <input
                        type="text"
                        placeholder="Search PO number or vendor..."
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        style={{
                            width: '100%', padding: '14px 14px 14px 42px',
                            borderRadius: 12, border: '1px solid #374151',
                            backgroundColor: '#111827', color: '#F9FAFB',
                            fontSize: 14, outline: 'none',
                        }}
                    />
                </div>
            </div>

            {/* ── PO List ─────────────────────────────────────────────────── */}
            <div style={{ flex: 1, overflow: 'auto', padding: '12px 20px' }}>
                {fetching || loading ? (
                    <div style={{ textAlign: 'center', padding: 40, color: '#6B7280' }}>
                        <div style={{ fontSize: 32, marginBottom: 12, animation: 'spin 1s linear infinite' }}>⏳</div>
                        Loading Purchase Orders...
                    </div>
                ) : pos.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: 40, color: '#6B7280' }}>
                        <div style={{ fontSize: 32, marginBottom: 12 }}>📭</div>
                        No open Purchase Orders found
                    </div>
                ) : (
                    pos.map(po => {
                        const totalOpen = po.lines.reduce((s, l) => s + l.openQty, 0);
                        return (
                            <button
                                key={po.docEntry}
                                onClick={() => onSelectPO(po.docEntry)}
                                style={{
                                    width: '100%', textAlign: 'left',
                                    padding: 16, marginBottom: 10,
                                    borderRadius: 14, border: '1px solid #1E293B',
                                    backgroundColor: '#111827', cursor: 'pointer',
                                    transition: 'all 0.2s',
                                }}
                                onMouseEnter={e => {
                                    (e.currentTarget as HTMLElement).style.borderColor = '#3B82F6';
                                    (e.currentTarget as HTMLElement).style.backgroundColor = '#1E293B';
                                }}
                                onMouseLeave={e => {
                                    (e.currentTarget as HTMLElement).style.borderColor = '#1E293B';
                                    (e.currentTarget as HTMLElement).style.backgroundColor = '#111827';
                                }}
                            >
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                    <div>
                                        <div style={{ fontSize: 16, fontWeight: 700, color: '#F9FAFB' }}>
                                            PO-{po.docNum}
                                        </div>
                                        <div style={{ fontSize: 13, color: '#94A3B8', marginTop: 2 }}>
                                            {po.cardName}
                                        </div>
                                    </div>
                                    <div style={{
                                        padding: '4px 10px', borderRadius: 8,
                                        backgroundColor: 'rgba(59, 130, 246, 0.15)',
                                        color: '#3B82F6', fontSize: 11, fontWeight: 700,
                                    }}>
                                        {po.lines.length} line{po.lines.length !== 1 ? 's' : ''}
                                    </div>
                                </div>

                                <div style={{
                                    display: 'flex', gap: 16, marginTop: 10,
                                    fontSize: 12, color: '#6B7280',
                                }}>
                                    <span>📅 {po.docDate}</span>
                                    <span>📦 {totalOpen} units open</span>
                                </div>

                                {/* Item preview */}
                                <div style={{
                                    marginTop: 10, padding: '8px 10px',
                                    borderRadius: 8, backgroundColor: '#0A0E1A',
                                    fontSize: 11, color: '#94A3B8',
                                }}>
                                    {po.lines.slice(0, 3).map((line, i) => (
                                        <div key={i} style={{ marginBottom: i < po.lines.length - 1 ? 4 : 0 }}>
                                            {line.itemCode} — {line.itemDescription?.slice(0, 35) ?? 'Item'} ({line.openQty} open)
                                        </div>
                                    ))}
                                    {po.lines.length > 3 && (
                                        <div style={{ color: '#3B82F6', marginTop: 4 }}>
                                            + {po.lines.length - 3} more lines
                                        </div>
                                    )}
                                </div>
                            </button>
                        );
                    })
                )}
            </div>

            {/* ── Lock Banner ─────────────────────────────────────────────── */}
            <div style={{
                padding: '12px 20px',
                borderTop: '1px solid #1E293B',
                textAlign: 'center',
                fontSize: 12, color: '#EF4444', fontWeight: 600,
            }}>
                🔒 Scanner is locked — select a Purchase Order above to unlock
            </div>
        </div>
    );
};

export default POSelectionScreen;
