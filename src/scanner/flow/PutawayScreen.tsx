/**
 * PutawayScreen – Bin Assignment & Story-Mode Transition
 *
 * After scan confirmation, shows the operator exactly
 * where to put the received item — the story never stops.
 *
 * Layout:
 *   ┌────────────────────────────┐
 *   │    ✅ Item Received        │
 *   │                            │
 *   │    ┌──────────────────┐    │
 *   │    │  BIN-A03-R02     │    │ ← Large bin code
 *   │    │  Zone A · Aisle 3│    │
 *   │    │  Rack 02 · Lvl 1 │    │
 *   │    └──────────────────┘    │
 *   │                            │
 *   │    🌡️ Cold Storage         │ ← Storage note
 *   │                            │
 *   │    [ Scan Next Item ]      │
 *   └────────────────────────────┘
 */

import React from 'react';
import type { PutawayInfo } from './scan-flow-engine';
import type { ScanResult } from '../models/scan-result';

interface PutawayScreenProps {
    scanResult: ScanResult;
    putawayInfo: PutawayInfo;
    onDone: () => void;
    /** Whether this item is routed to QC Hold */
    isQcHold?: boolean;
    /** Called when operator taps "Capture Evidence" in QC Hold mode */
    onCaptureEvidence?: () => void;
}

export const PutawayScreen: React.FC<PutawayScreenProps> = ({
    scanResult,
    putawayInfo,
    onDone,
    isQcHold = false,
    onCaptureEvidence,
}) => {
    // Color scheme: Green (Active) vs Yellow (QC Hold)
    const theme = isQcHold
        ? { accent: '#F59E0B', glow: 'rgba(245, 158, 11, 0.15)', gradient: 'linear-gradient(135deg, #D97706, #F59E0B)' }
        : { accent: '#10B981', glow: 'rgba(59, 130, 246, 0.15)', gradient: 'linear-gradient(135deg, #2563EB, #3B82F6)' };
    return (
        <div
            style={{
                position: 'fixed',
                inset: 0,
                backgroundColor: '#111827',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                padding: 24,
                zIndex: 960,
                animation: 'grpo-putaway-in 0.35s ease-out',
                fontFamily: 'system-ui, -apple-system, sans-serif',
            }}
            role="dialog"
            aria-label="Putaway instruction"
        >
            {/* ── QC Hold Banner ─────────────────────────────────────────────── */}
            {isQcHold && (
                <div style={{
                    padding: '10px 20px',
                    borderRadius: 8,
                    backgroundColor: '#78350F',
                    border: '1px solid #F59E0B',
                    marginBottom: 16,
                    textAlign: 'center',
                    width: '100%',
                    maxWidth: 320,
                    animation: 'grpo-pop 0.4s ease-out',
                }}>
                    <div style={{ fontSize: 14, fontWeight: 700, color: '#FDE68A' }}>
                        ⚠️ QC HOLD — Quarantine Bin
                    </div>
                    <div style={{ fontSize: 11, color: '#FBBF24', marginTop: 4 }}>
                        Item requires inspection before distribution
                    </div>
                </div>
            )}

            {/* ── Status Badge ─────────────────────────────────────────────────── */}
            <div style={{
                fontSize: 48,
                marginBottom: 8,
                animation: 'grpo-pop 0.4s ease-out',
            }}>
                {isQcHold ? '🔒' : '✅'}
            </div>
            <h2 style={{
                margin: '0 0 4px',
                fontSize: 20,
                fontWeight: 700,
                color: theme.accent,
            }}>
                {isQcHold ? 'QC Hold — Quarantine' : 'Item Received'}
            </h2>
            <p style={{ margin: '0 0 24px', fontSize: 13, color: '#6B7280' }}>
                {scanResult.gtin ?? 'Manual'} · Batch {scanResult.batchNo ?? '—'}
            </p>

            {/* ── Bin Card ──────────────────────────────────────────────────────── */}
            <div
                style={{
                    width: '100%',
                    maxWidth: 320,
                    border: `2px solid ${isQcHold ? '#F59E0B' : '#3B82F6'}`,
                    borderRadius: 16,
                    padding: 24,
                    backgroundColor: '#1E293B',
                    textAlign: 'center',
                    boxShadow: `0 0 30px ${theme.glow}`,
                }}
            >
                {/* Bin code — large and unmissable */}
                <div style={{
                    fontSize: 36,
                    fontWeight: 800,
                    color: '#F9FAFB',
                    letterSpacing: '0.05em',
                    fontFamily: 'monospace',
                    marginBottom: 16,
                }}>
                    {putawayInfo.binCode}
                </div>

                {/* Location details */}
                <div style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 1fr',
                    gap: 8,
                    fontSize: 13,
                    color: '#9CA3AF',
                }}>
                    <LocationPill label="Zone" value={putawayInfo.zone} />
                    <LocationPill label="Aisle" value={putawayInfo.aisle} />
                    <LocationPill label="Rack" value={putawayInfo.rack} />
                    <LocationPill label="Level" value={putawayInfo.level} />
                </div>
            </div>

            {/* ── Storage Note ──────────────────────────────────────────────────── */}
            {putawayInfo.storageNote && (
                <div style={{
                    marginTop: 16,
                    padding: '10px 16px',
                    borderRadius: 8,
                    backgroundColor: '#1E293B',
                    border: '1px solid #374151',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    maxWidth: 320,
                    width: '100%',
                }}>
                    <span style={{ fontSize: 20 }}>🌡️</span>
                    <span style={{ fontSize: 13, color: '#FBBF24', fontWeight: 600 }}>
                        {putawayInfo.storageNote}
                    </span>
                </div>
            )}

            {/* ── Expiry Alert ──────────────────────────────────────────────────── */}
            {scanResult.expiry && (
                <div style={{
                    marginTop: 8,
                    fontSize: 12,
                    color: '#6B7280',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 4,
                }}>
                    <span>📅</span>
                    <span>Expiry: {scanResult.expiry}</span>
                    <span style={{ color: '#9CA3AF' }}>· FEFO tracked</span>
                </div>
            )}

            {/* ── Evidence Capture Button (QC Hold only) ─────────────────────── */}
            {isQcHold && onCaptureEvidence && (
                <button
                    onClick={onCaptureEvidence}
                    style={{
                        marginTop: 24,
                        width: '100%',
                        maxWidth: 320,
                        padding: 14,
                        borderRadius: 12,
                        border: '2px solid #F59E0B',
                        background: 'transparent',
                        color: '#FDE68A',
                        fontSize: 15,
                        fontWeight: 700,
                        cursor: 'pointer',
                    }}
                    aria-label="Capture QC evidence"
                >
                    📸 Capture Evidence
                </button>
            )}

            {/* ── Action Button ─────────────────────────────────────────────────── */}
            <button
                onClick={onDone}
                style={{
                    marginTop: isQcHold ? 12 : 32,
                    width: '100%',
                    maxWidth: 320,
                    padding: 16,
                    borderRadius: 12,
                    border: 'none',
                    background: theme.gradient,
                    color: '#FFF',
                    fontSize: 16,
                    fontWeight: 700,
                    cursor: 'pointer',
                    boxShadow: `0 4px 14px ${theme.glow}`,
                }}
                aria-label="Scan next item"
            >
                📷 Scan Next Item
            </button>

            {/* ── Animations ────────────────────────────────────────────────────── */}
            <style>{`
        @keyframes grpo-putaway-in {
          from { opacity: 0; transform: translateX(100%); }
          to { opacity: 1; transform: translateX(0); }
        }
        @keyframes grpo-pop {
          0% { transform: scale(0); }
          70% { transform: scale(1.2); }
          100% { transform: scale(1); }
        }
      `}</style>
        </div>
    );
};

/** Small location detail pill */
const LocationPill: React.FC<{ label: string; value: string }> = ({ label, value }) => (
    <div style={{
        padding: '6px 8px',
        borderRadius: 6,
        backgroundColor: '#111827',
        border: '1px solid #374151',
    }}>
        <div style={{ fontSize: 10, color: '#6B7280', textTransform: 'uppercase', marginBottom: 2 }}>
            {label}
        </div>
        <div style={{ fontSize: 15, fontWeight: 700, color: '#E5E7EB' }}>
            {value}
        </div>
    </div>
);

export default PutawayScreen;
