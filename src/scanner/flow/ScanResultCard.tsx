/**
 * ScanResultCard – Post-Scan Field Display
 *
 * Slides up from bottom after a successful scan showing:
 *   - Extracted fields with confidence indicators
 *   - Editable fields for corrections
 *   - Confirm button → triggers haptic + local commit
 *
 * Color coding:
 *   🟢 Green  = parsed from barcode
 *   🟡 Yellow = inferred (calculated)
 *   ⚪ Gray   = needs manual input
 */

import React, { useState } from 'react';
import type { ScanResult } from '../models/scan-result';

interface ScanResultCardProps {
    result: ScanResult;
    validationErrors: string[];
    onConfirm: (edited: ScanResult) => void;
    onRescan: () => void;
}

interface FieldDisplay {
    label: string;
    key: keyof ScanResult;
    editable: boolean;
    required: boolean;
}

const FIELDS: FieldDisplay[] = [
    { label: 'Item Code (GTIN)', key: 'gtin', editable: true, required: true },
    { label: 'Batch / Lot', key: 'batchNo', editable: true, required: false },
    { label: 'Expiry Date', key: 'expiry', editable: true, required: false },
    { label: 'Serial Number', key: 'serialNo', editable: true, required: false },
    { label: 'UDI-DI', key: 'udiDi', editable: false, required: false },
    { label: 'UDI-PI', key: 'udiPi', editable: false, required: false },
];

export const ScanResultCard: React.FC<ScanResultCardProps> = ({
    result,
    validationErrors,
    onConfirm,
    onRescan,
}) => {
    const [editedValues, setEditedValues] = useState<Record<string, string>>({});

    const getValue = (key: keyof ScanResult): string => {
        if (editedValues[key] !== undefined) return editedValues[key];
        const val = result[key];
        return val != null ? String(val) : '';
    };

    const getConfidence = (key: keyof ScanResult): 'parsed' | 'inferred' | 'manual' => {
        if (editedValues[key] !== undefined) return 'manual';
        const seg = result.segments.find(s =>
            s.ai === '01' && (key === 'gtin' || key === 'udiDi' || key === 'itemCode') ||
            s.ai === '10' && key === 'batchNo' ||
            s.ai === '17' && key === 'expiry' ||
            s.ai === '21' && key === 'serialNo'
        );
        return seg ? seg.confidence : 'manual';
    };

    const confidenceColor = {
        parsed: '#10B981',   // Green
        inferred: '#F59E0B', // Yellow
        manual: '#9CA3AF',   // Gray
    };

    const handleConfirm = () => {
        const edited: ScanResult = {
            ...result,
            gtin: getValue('gtin') || null,
            itemCode: getValue('gtin') || null,
            udiDi: getValue('udiDi') || getValue('gtin') || null,
            batchNo: getValue('batchNo') || null,
            expiry: getValue('expiry') || null,
            serialNo: getValue('serialNo') || null,
        };
        onConfirm(edited);
    };

    return (
        <div
            style={{
                position: 'fixed',
                bottom: 0,
                left: 0,
                right: 0,
                backgroundColor: '#1F2937',
                borderTop: '1px solid #374151',
                borderRadius: '16px 16px 0 0',
                padding: '20px 16px',
                maxHeight: '60vh',
                overflowY: 'auto',
                zIndex: 950,
                animation: 'grpo-slide-up 0.3s ease-out',
                fontFamily: 'system-ui, -apple-system, sans-serif',
            }}
            role="region"
            aria-label="Scan result"
        >
            {/* ── Header ────────────────────────────────────────────────────────── */}
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
                <div>
                    <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: '#F9FAFB' }}>
                        Scan Result
                    </h3>
                    <span style={{ fontSize: 11, color: '#6B7280' }}>
                        Parsed in {result.parseTimeMs}ms · {result.segments.length} fields
                    </span>
                </div>
                <button
                    onClick={onRescan}
                    style={{
                        padding: '6px 14px', borderRadius: 6,
                        border: '1px solid #4B5563', backgroundColor: 'transparent',
                        color: '#9CA3AF', fontSize: 12, cursor: 'pointer',
                    }}
                >
                    ↻ Re-scan
                </button>
            </div>

            {/* ── Fields ────────────────────────────────────────────────────────── */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {FIELDS.map(({ label, key, editable, required }) => {
                    const value = getValue(key);
                    const confidence = getConfidence(key);
                    const isEmpty = !value;

                    return (
                        <div key={key}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                                <span style={{
                                    width: 6, height: 6, borderRadius: '50%',
                                    backgroundColor: isEmpty ? '#4B5563' : confidenceColor[confidence],
                                }} />
                                <label style={{ fontSize: 11, color: '#9CA3AF', fontWeight: 600, textTransform: 'uppercase' }}>
                                    {label} {required && <span style={{ color: '#EF4444' }}>*</span>}
                                </label>
                            </div>
                            {editable ? (
                                <input
                                    type={key === 'expiry' ? 'date' : 'text'}
                                    value={value}
                                    onChange={(e) => setEditedValues({ ...editedValues, [key]: e.target.value })}
                                    placeholder={`Enter ${label.toLowerCase()}`}
                                    style={{
                                        width: '100%',
                                        padding: '8px 12px',
                                        borderRadius: 6,
                                        border: `1px solid ${isEmpty && required ? '#EF4444' : '#374151'}`,
                                        backgroundColor: '#111827',
                                        color: '#F9FAFB',
                                        fontSize: 14,
                                        fontFamily: 'monospace',
                                        boxSizing: 'border-box',
                                    }}
                                    aria-label={label}
                                />
                            ) : (
                                <div style={{
                                    padding: '8px 12px',
                                    borderRadius: 6,
                                    backgroundColor: '#111827',
                                    border: '1px solid #374151',
                                    color: value ? '#D1D5DB' : '#4B5563',
                                    fontSize: 13,
                                    fontFamily: 'monospace',
                                }}>
                                    {value || '—'}
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>

            {/* ── Validation Errors ─────────────────────────────────────────────── */}
            {validationErrors.length > 0 && (
                <div style={{
                    marginTop: 12, padding: 10, backgroundColor: '#7F1D1D',
                    borderRadius: 6, fontSize: 12, color: '#FCA5A5',
                }}>
                    {validationErrors.map((err, i) => (
                        <div key={i}>⚠ {err}</div>
                    ))}
                </div>
            )}

            {/* ── Warnings ──────────────────────────────────────────────────────── */}
            {result.warnings.length > 0 && (
                <div style={{
                    marginTop: 8, padding: 8, backgroundColor: '#78350F',
                    borderRadius: 6, fontSize: 11, color: '#FDE68A',
                }}>
                    {result.warnings.map((w, i) => (
                        <div key={i}>ℹ {w}</div>
                    ))}
                </div>
            )}

            {/* ── Confirm Button ────────────────────────────────────────────────── */}
            <button
                onClick={handleConfirm}
                style={{
                    width: '100%',
                    marginTop: 16,
                    padding: '14px',
                    borderRadius: 10,
                    border: 'none',
                    background: 'linear-gradient(135deg, #059669, #10B981)',
                    color: '#FFF',
                    fontSize: 16,
                    fontWeight: 700,
                    cursor: 'pointer',
                    boxShadow: '0 4px 14px rgba(16, 185, 129, 0.3)',
                }}
                aria-label="Confirm scan"
            >
                ✓ Confirm & Continue
            </button>

            <style>{`
        @keyframes grpo-slide-up {
          from { transform: translateY(100%); }
          to { transform: translateY(0); }
        }
      `}</style>
        </div>
    );
};

export default ScanResultCard;
