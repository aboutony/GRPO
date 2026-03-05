/**
 * ManualEntryModal – Fallback for Damaged Barcodes
 *
 * Bottom-sheet modal for manual data entry.
 * Non-intrusive: the "story" never stops.
 *
 * Features:
 *   - Item Code auto-suggest from PO lines
 *   - Optional fields: Batch, Expiry, UDI-DI
 *   - On submit → same flow as scanned entry
 */

import React, { useState, useMemo } from 'react';
import { emptyScanResult, type ScanResult } from '../models/scan-result';

/** PO line for auto-suggest */
export interface POLineSuggestion {
    itemCode: string;
    itemName: string;
    openQty: number;
    batchManaged: boolean;
}

interface ManualEntryModalProps {
    /** Available PO lines for auto-suggest */
    poLines: POLineSuggestion[];
    /** Called when user submits manual entry */
    onSubmit: (result: ScanResult) => void;
    /** Called when user closes the modal */
    onClose: () => void;
}

export const ManualEntryModal: React.FC<ManualEntryModalProps> = ({
    poLines,
    onSubmit,
    onClose,
}) => {
    const [itemCode, setItemCode] = useState('');
    const [batchNo, setBatchNo] = useState('');
    const [expiry, setExpiry] = useState('');
    const [udiDi, setUdiDi] = useState('');
    const [showSuggestions, setShowSuggestions] = useState(false);

    // Filter PO lines by typed item code
    const suggestions = useMemo(() => {
        if (!itemCode || itemCode.length < 2) return [];
        const lower = itemCode.toLowerCase();
        return poLines.filter(
            l => l.itemCode.toLowerCase().includes(lower) ||
                l.itemName.toLowerCase().includes(lower)
        ).slice(0, 5);
    }, [itemCode, poLines]);

    const selectedPOLine = poLines.find(l => l.itemCode === itemCode);
    const isBatchRequired = selectedPOLine?.batchManaged ?? false;
    const canSubmit = itemCode.trim().length > 0 && (!isBatchRequired || batchNo.trim().length > 0);

    const handleSubmit = () => {
        if (!canSubmit) return;

        const result: ScanResult = {
            ...emptyScanResult('MANUAL_ENTRY'),
            symbology: 'manual',
            gtin: itemCode,
            itemCode: itemCode,
            udiDi: udiDi || itemCode,
            batchNo: batchNo || null,
            expiry: expiry || null,
            serialNo: null,
            udiPi: batchNo ? `B:${batchNo}${expiry ? `|E:${expiry}` : ''}` : null,
            segments: [
                {
                    ai: 'manual',
                    name: 'Manual Entry',
                    rawValue: itemCode,
                    value: itemCode,
                    confidence: 'manual',
                },
            ],
            success: true,
        };

        onSubmit(result);
    };

    return (
        <div
            style={{
                position: 'fixed',
                inset: 0,
                zIndex: 970,
                display: 'flex',
                alignItems: 'flex-end',
            }}
            role="dialog"
            aria-label="Manual barcode entry"
        >
            {/* Backdrop */}
            <div
                onClick={onClose}
                style={{
                    position: 'absolute',
                    inset: 0,
                    backgroundColor: 'rgba(0,0,0,0.6)',
                    backdropFilter: 'blur(4px)',
                }}
            />

            {/* Bottom Sheet */}
            <div
                style={{
                    position: 'relative',
                    width: '100%',
                    backgroundColor: '#1F2937',
                    borderRadius: '16px 16px 0 0',
                    padding: '20px 16px 32px',
                    animation: 'grpo-slide-up 0.3s ease-out',
                    fontFamily: 'system-ui, -apple-system, sans-serif',
                }}
            >
                {/* Drag handle */}
                <div style={{
                    width: 40, height: 4, borderRadius: 2,
                    backgroundColor: '#4B5563', margin: '0 auto 16px',
                }} />

                <h3 style={{ margin: '0 0 4px', fontSize: 16, fontWeight: 700, color: '#F9FAFB' }}>
                    ⌨️ Manual Entry
                </h3>
                <p style={{ margin: '0 0 16px', fontSize: 12, color: '#6B7280' }}>
                    Enter the barcode data for items with damaged labels
                </p>

                {/* ── Item Code (with auto-suggest) ───────────────────────────────── */}
                <div style={{ marginBottom: 12, position: 'relative' }}>
                    <label style={labelStyle}>
                        Item Code <span style={{ color: '#EF4444' }}>*</span>
                    </label>
                    <input
                        type="text"
                        value={itemCode}
                        onChange={(e) => {
                            setItemCode(e.target.value);
                            setShowSuggestions(true);
                        }}
                        onFocus={() => setShowSuggestions(true)}
                        placeholder="Scan or type item code"
                        style={inputStyle}
                        aria-label="Item code"
                        autoFocus
                    />

                    {/* Auto-suggest dropdown */}
                    {showSuggestions && suggestions.length > 0 && (
                        <div style={{
                            position: 'absolute',
                            top: '100%',
                            left: 0, right: 0,
                            backgroundColor: '#374151',
                            borderRadius: '0 0 8px 8px',
                            border: '1px solid #4B5563',
                            zIndex: 10,
                            maxHeight: 160,
                            overflowY: 'auto',
                        }}>
                            {suggestions.map((s) => (
                                <div
                                    key={s.itemCode}
                                    onClick={() => {
                                        setItemCode(s.itemCode);
                                        setShowSuggestions(false);
                                    }}
                                    style={{
                                        padding: '8px 12px',
                                        cursor: 'pointer',
                                        borderBottom: '1px solid #4B5563',
                                        fontSize: 13,
                                        color: '#E5E7EB',
                                    }}
                                >
                                    <div style={{ fontWeight: 600, fontFamily: 'monospace' }}>{s.itemCode}</div>
                                    <div style={{ fontSize: 11, color: '#9CA3AF' }}>
                                        {s.itemName} · Open: {s.openQty}
                                        {s.batchManaged && ' · 🏷️ Batch Required'}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* ── Batch ───────────────────────────────────────────────────────── */}
                <div style={{ marginBottom: 12 }}>
                    <label style={labelStyle}>
                        Batch / Lot {isBatchRequired && <span style={{ color: '#EF4444' }}>*</span>}
                    </label>
                    <input
                        type="text"
                        value={batchNo}
                        onChange={(e) => setBatchNo(e.target.value)}
                        placeholder="Enter batch number"
                        style={{
                            ...inputStyle,
                            borderColor: isBatchRequired && !batchNo ? '#EF4444' : '#374151',
                        }}
                        aria-label="Batch number"
                    />
                    {isBatchRequired && !batchNo && (
                        <div style={{ fontSize: 11, color: '#EF4444', marginTop: 2 }}>
                            Batch is required for this item
                        </div>
                    )}
                </div>

                {/* ── Expiry & UDI-DI row ─────────────────────────────────────────── */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
                    <div>
                        <label style={labelStyle}>Expiry Date</label>
                        <input
                            type="date"
                            value={expiry}
                            onChange={(e) => setExpiry(e.target.value)}
                            style={inputStyle}
                            aria-label="Expiry date"
                        />
                    </div>
                    <div>
                        <label style={labelStyle}>UDI-DI</label>
                        <input
                            type="text"
                            value={udiDi}
                            onChange={(e) => setUdiDi(e.target.value)}
                            placeholder="Optional"
                            style={inputStyle}
                            aria-label="UDI Device Identifier"
                        />
                    </div>
                </div>

                {/* ── Submit ──────────────────────────────────────────────────────── */}
                <button
                    onClick={handleSubmit}
                    disabled={!canSubmit}
                    style={{
                        width: '100%',
                        padding: 14,
                        borderRadius: 10,
                        border: 'none',
                        background: canSubmit
                            ? 'linear-gradient(135deg, #059669, #10B981)'
                            : '#374151',
                        color: canSubmit ? '#FFF' : '#6B7280',
                        fontSize: 16,
                        fontWeight: 700,
                        cursor: canSubmit ? 'pointer' : 'default',
                        opacity: canSubmit ? 1 : 0.6,
                    }}
                    aria-label="Submit manual entry"
                >
                    ✓ Submit Entry
                </button>
            </div>

            <style>{`
        @keyframes grpo-slide-up {
          from { transform: translateY(100%); }
          to { transform: translateY(0); }
        }
      `}</style>
        </div>
    );
};

const labelStyle: React.CSSProperties = {
    display: 'block',
    fontSize: 11,
    color: '#9CA3AF',
    fontWeight: 600,
    textTransform: 'uppercase',
    marginBottom: 4,
};

const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '10px 12px',
    borderRadius: 8,
    border: '1px solid #374151',
    backgroundColor: '#111827',
    color: '#F9FAFB',
    fontSize: 14,
    fontFamily: 'monospace',
    boxSizing: 'border-box',
};

export default ManualEntryModal;
