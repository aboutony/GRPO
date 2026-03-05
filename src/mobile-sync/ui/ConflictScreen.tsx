/**
 * ConflictScreen – The Storyteller
 *
 * Full-screen conflict resolution view comparing local receipt data
 * vs SAP state. Presents clear next steps instead of cryptic error codes.
 *
 * Layout:
 *   ┌──────────────────────────────────┐
 *   │  Conflict Resolution    (n/total)│
 *   ├──────────────────────────────────┤
 *   │  ┌────────────┬────────────┐    │
 *   │  │ Local Data │  SAP State │    │
 *   │  ├────────────┼────────────┤    │
 *   │  │ PO: 45001  │ PO: CLOSED │ ← │ diff highlight
 *   │  │ Qty: 50    │ Open: 0    │    │
 *   │  └────────────┴────────────┘    │
 *   │                                  │
 *   │  [ConflictCard]                  │
 *   │                                  │
 *   │  [Card] [Card] [Card]           │
 *   └──────────────────────────────────┘
 */

import React from 'react';
import type { QueuedReceipt } from '../models/queued-receipt';
import type { ConflictRecord } from '../models/conflict-record';
import { ConflictCard } from './ConflictCard';

interface ConflictScreenProps {
    /** Receipts currently in conflict state */
    conflictReceipts: Array<{
        receipt: QueuedReceipt;
        conflict: ConflictRecord;
    }>;
    /** SAP state data for comparison (fetched on-demand via Service Layer) */
    sapData?: Record<string, {
        poStatus: string;
        openQty: number;
        lastModified: string;
    }>;
    /** Callback when operator acknowledges a conflict */
    onAcknowledge: (conflictId: string, notes?: string) => void;
    /** Callback to dismiss/close the screen */
    onClose: () => void;
}

export const ConflictScreen: React.FC<ConflictScreenProps> = ({
    conflictReceipts,
    sapData,
    onAcknowledge,
    onClose,
}) => {
    const total = conflictReceipts.length;
    const unresolved = conflictReceipts.filter(c => !c.conflict.acknowledged).length;

    return (
        <div
            style={{
                position: 'fixed',
                inset: 0,
                backgroundColor: '#111827',
                overflowY: 'auto',
                zIndex: 1000,
                fontFamily: 'system-ui, -apple-system, sans-serif',
            }}
            role="dialog"
            aria-label="Conflict Resolution"
        >
            {/* ── Header ────────────────────────────────────────────────────────── */}
            <div
                style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '16px 20px',
                    borderBottom: '1px solid #374151',
                    position: 'sticky',
                    top: 0,
                    backgroundColor: '#111827',
                    zIndex: 1001,
                }}
            >
                <div>
                    <h1 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: '#F9FAFB' }}>
                        ⚠️ Conflict Resolution
                    </h1>
                    <p style={{ margin: '4px 0 0', fontSize: 13, color: '#9CA3AF' }}>
                        {unresolved} of {total} conflict{total !== 1 ? 's' : ''} require attention
                    </p>
                </div>
                <button
                    onClick={onClose}
                    style={{
                        padding: '8px 16px',
                        borderRadius: 6,
                        border: '1px solid #4B5563',
                        backgroundColor: 'transparent',
                        color: '#D1D5DB',
                        fontSize: 13,
                        cursor: 'pointer',
                    }}
                    aria-label="Close conflict screen"
                >
                    Close
                </button>
            </div>

            {/* ── Conflict List ─────────────────────────────────────────────────── */}
            <div style={{ padding: 20 }}>
                {conflictReceipts.map(({ receipt, conflict }) => (
                    <div key={receipt.id} style={{ marginBottom: 24 }}>
                        {/* ── Side-by-Side Comparison ──────────────────────────────────── */}
                        {sapData?.[receipt.id] && (
                            <ComparisonTable
                                receipt={receipt}
                                sap={sapData[receipt.id]}
                            />
                        )}

                        {/* ── Conflict Card ───────────────────────────────────────────── */}
                        <ConflictCard
                            conflict={conflict}
                            onAcknowledge={onAcknowledge}
                        />
                    </div>
                ))}

                {total === 0 && (
                    <div
                        style={{
                            textAlign: 'center',
                            padding: 48,
                            color: '#6B7280',
                        }}
                    >
                        <span style={{ fontSize: 48 }}>✅</span>
                        <p style={{ fontSize: 16, marginTop: 16, fontWeight: 600 }}>
                            No conflicts — all receipts synced successfully
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
};

/** Side-by-side comparison of local data vs SAP state */
const ComparisonTable: React.FC<{
    receipt: QueuedReceipt;
    sap: { poStatus: string; openQty: number; lastModified: string };
}> = ({ receipt, sap }) => {
    const totalQty = receipt.lines.reduce((sum, l) => sum + l.quantity, 0);
    const poEntry = receipt.lines[0]?.baseEntry ?? '—';

    const rows: Array<{
        label: string;
        local: string;
        sap: string;
        mismatch: boolean;
    }> = [
            {
                label: 'PO Entry',
                local: String(poEntry),
                sap: `${poEntry} (${sap.poStatus})`,
                mismatch: sap.poStatus !== 'Open',
            },
            {
                label: 'Quantity',
                local: String(totalQty),
                sap: `Open: ${sap.openQty}`,
                mismatch: totalQty > sap.openQty,
            },
            {
                label: 'Lines',
                local: String(receipt.lines.length),
                sap: '—',
                mismatch: false,
            },
            {
                label: 'SAP Updated',
                local: '—',
                sap: new Date(sap.lastModified).toLocaleString(),
                mismatch: false,
            },
        ];

    return (
        <div
            style={{
                borderRadius: 8,
                overflow: 'hidden',
                marginBottom: 12,
                border: '1px solid #374151',
            }}
        >
            <table
                style={{
                    width: '100%',
                    borderCollapse: 'collapse',
                    fontSize: 13,
                }}
            >
                <thead>
                    <tr style={{ backgroundColor: '#1F2937' }}>
                        <th style={thStyle}>Field</th>
                        <th style={thStyle}>📱 Local Data</th>
                        <th style={thStyle}>🏢 SAP State</th>
                    </tr>
                </thead>
                <tbody>
                    {rows.map((row) => (
                        <tr
                            key={row.label}
                            style={{
                                backgroundColor: row.mismatch ? '#7F1D1D' : '#111827',
                            }}
                        >
                            <td style={tdStyle}>{row.label}</td>
                            <td style={tdStyle}>{row.local}</td>
                            <td style={{
                                ...tdStyle,
                                color: row.mismatch ? '#FCA5A5' : '#D1D5DB',
                                fontWeight: row.mismatch ? 700 : 400,
                            }}>
                                {row.sap}
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
};

const thStyle: React.CSSProperties = {
    padding: '8px 12px',
    textAlign: 'left',
    fontWeight: 600,
    color: '#9CA3AF',
    fontSize: 11,
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
};

const tdStyle: React.CSSProperties = {
    padding: '8px 12px',
    borderTop: '1px solid #1F2937',
    color: '#D1D5DB',
};

export default ConflictScreen;
