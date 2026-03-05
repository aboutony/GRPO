/**
 * EvidenceCapture – Photo & Defect Code Capture Screen
 *
 * Full-screen evidence capture for damaged or non-conforming goods.
 * Captures:
 *   - Photo attachment (camera or gallery)
 *   - Defect code(s) via DefectCodePicker
 *   - Inspector name (pre-filled from login)
 *   - Optional notes
 *
 * On submit → builds QcInspectionRecord for @GRPO_QC_RECORDS
 */

import React, { useState, useRef } from 'react';
import { DefectCodePicker } from './DefectCodePicker';
import {
    DefectCode,
    InspectionResult,
    INSPECTION_RESULT_INFO,
    type QcInspectionRecord,
} from '../models/qc-types';

interface EvidenceCaptureProps {
    /** Local receipt ID for correlation */
    receiptId: string;
    /** Item description for context */
    itemDescription: string;
    /** Batch number for context */
    batchNo: string | null;
    /** Pre-filled inspector name from device login */
    inspectorName: string;
    /** Called when evidence is captured and submitted */
    onSubmit: (record: QcInspectionRecord) => void;
    /** Called when user cancels */
    onCancel: () => void;
}

export const EvidenceCapture: React.FC<EvidenceCaptureProps> = ({
    receiptId,
    itemDescription,
    batchNo,
    inspectorName,
    onSubmit,
    onCancel,
}) => {
    const [defectCodes, setDefectCodes] = useState<DefectCode[]>([]);
    const [result, setResult] = useState<InspectionResult>(InspectionResult.FAIL);
    const [notes, setNotes] = useState('');
    const [photoDataUrl, setPhotoDataUrl] = useState<string | null>(null);
    const [inspector, setInspector] = useState(inspectorName);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const canSubmit = defectCodes.length > 0 || result === InspectionResult.PASS;

    const handlePhotoCapture = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = () => setPhotoDataUrl(reader.result as string);
        reader.readAsDataURL(file);
    };

    const handleSubmit = () => {
        if (!canSubmit) return;

        const record: QcInspectionRecord = {
            docEntry: null, // Populated after GRPO sync
            receiptId,
            inspector,
            result,
            defectCodes,
            defectCodeString: defectCodes.join(';'),
            photoPath: photoDataUrl, // In production: upload and store URI
            inspectionDate: new Date().toISOString(),
            notes: notes || null,
        };

        onSubmit(record);
    };

    return (
        <div
            style={{
                position: 'fixed',
                inset: 0,
                backgroundColor: '#111827',
                overflowY: 'auto',
                zIndex: 980,
                fontFamily: 'system-ui, -apple-system, sans-serif',
            }}
            role="dialog"
            aria-label="QC Evidence Capture"
        >
            {/* ── Header ────────────────────────────────────────────────────────── */}
            <div style={{
                position: 'sticky',
                top: 0,
                backgroundColor: '#111827',
                borderBottom: '1px solid #374151',
                padding: '16px 20px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                zIndex: 1,
            }}>
                <div>
                    <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: '#F59E0B' }}>
                        🔬 QC Inspection
                    </h2>
                    <p style={{ margin: '4px 0 0', fontSize: 12, color: '#9CA3AF' }}>
                        {itemDescription} {batchNo ? `· Batch: ${batchNo}` : ''}
                    </p>
                </div>
                <button
                    onClick={onCancel}
                    style={{
                        padding: '6px 14px', borderRadius: 6,
                        border: '1px solid #4B5563', backgroundColor: 'transparent',
                        color: '#9CA3AF', fontSize: 12, cursor: 'pointer',
                    }}
                >
                    Cancel
                </button>
            </div>

            <div style={{ padding: 20 }}>
                {/* ── Photo Capture ───────────────────────────────────────────────── */}
                <section style={{ marginBottom: 24 }}>
                    <h3 style={sectionTitle}>📸 Photo Evidence</h3>

                    {photoDataUrl ? (
                        <div style={{ position: 'relative' }}>
                            <img
                                src={photoDataUrl}
                                alt="Captured evidence"
                                style={{
                                    width: '100%',
                                    maxHeight: 240,
                                    objectFit: 'cover',
                                    borderRadius: 10,
                                    border: '1px solid #374151',
                                }}
                            />
                            <button
                                onClick={() => {
                                    setPhotoDataUrl(null);
                                    if (fileInputRef.current) fileInputRef.current.value = '';
                                }}
                                style={{
                                    position: 'absolute',
                                    top: 8,
                                    right: 8,
                                    width: 30,
                                    height: 30,
                                    borderRadius: '50%',
                                    border: 'none',
                                    backgroundColor: 'rgba(0,0,0,0.6)',
                                    color: '#FFF',
                                    cursor: 'pointer',
                                    fontSize: 14,
                                }}
                            >
                                ✕
                            </button>
                        </div>
                    ) : (
                        <button
                            onClick={() => fileInputRef.current?.click()}
                            style={{
                                width: '100%',
                                padding: 32,
                                borderRadius: 10,
                                border: '2px dashed #374151',
                                backgroundColor: '#1F2937',
                                color: '#6B7280',
                                fontSize: 14,
                                cursor: 'pointer',
                                textAlign: 'center',
                            }}
                        >
                            <div style={{ fontSize: 32, marginBottom: 8 }}>📷</div>
                            Tap to capture photo of damage
                        </button>
                    )}

                    <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        capture="environment"
                        onChange={handlePhotoCapture}
                        style={{ display: 'none' }}
                        aria-label="Capture photo"
                    />
                </section>

                {/* ── Inspection Result ────────────────────────────────────────────── */}
                <section style={{ marginBottom: 24 }}>
                    <h3 style={sectionTitle}>📋 Inspection Result</h3>
                    <div style={{ display: 'flex', gap: 8 }}>
                        {Object.values(InspectionResult).map((r) => {
                            const info = INSPECTION_RESULT_INFO[r];
                            const isActive = result === r;
                            return (
                                <button
                                    key={r}
                                    onClick={() => setResult(r)}
                                    style={{
                                        flex: 1,
                                        padding: '12px 8px',
                                        borderRadius: 8,
                                        border: isActive ? `2px solid ${info.color}` : '1px solid #374151',
                                        backgroundColor: isActive ? `${info.color}15` : '#1F2937',
                                        color: isActive ? info.color : '#9CA3AF',
                                        fontSize: 13,
                                        fontWeight: 700,
                                        cursor: 'pointer',
                                        textAlign: 'center',
                                    }}
                                    aria-pressed={isActive}
                                >
                                    <div style={{ fontSize: 20, marginBottom: 4 }}>{info.icon}</div>
                                    {info.label}
                                </button>
                            );
                        })}
                    </div>
                </section>

                {/* ── Defect Codes ─────────────────────────────────────────────────── */}
                {result !== InspectionResult.PASS && (
                    <section style={{ marginBottom: 24 }}>
                        <h3 style={sectionTitle}>
                            🏷️ Defect Codes
                            <span style={{ fontSize: 11, color: '#6B7280', fontWeight: 400, marginLeft: 8 }}>
                                Select all that apply
                            </span>
                        </h3>
                        <DefectCodePicker selected={defectCodes} onChange={setDefectCodes} />
                    </section>
                )}

                {/* ── Inspector & Notes ────────────────────────────────────────────── */}
                <section style={{ marginBottom: 24 }}>
                    <h3 style={sectionTitle}>👤 Inspector</h3>
                    <input
                        type="text"
                        value={inspector}
                        onChange={(e) => setInspector(e.target.value)}
                        style={inputStyle}
                        aria-label="Inspector name"
                    />
                </section>

                <section style={{ marginBottom: 32 }}>
                    <h3 style={sectionTitle}>📝 Notes</h3>
                    <textarea
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        placeholder="Additional observations..."
                        rows={3}
                        style={{
                            ...inputStyle,
                            resize: 'vertical',
                            fontFamily: 'inherit',
                        }}
                        aria-label="Inspector notes"
                    />
                </section>

                {/* ── Submit ──────────────────────────────────────────────────────── */}
                <button
                    onClick={handleSubmit}
                    disabled={!canSubmit}
                    style={{
                        width: '100%',
                        padding: 16,
                        borderRadius: 12,
                        border: 'none',
                        background: canSubmit
                            ? 'linear-gradient(135deg, #D97706, #F59E0B)'
                            : '#374151',
                        color: canSubmit ? '#FFF' : '#6B7280',
                        fontSize: 16,
                        fontWeight: 700,
                        cursor: canSubmit ? 'pointer' : 'default',
                        opacity: canSubmit ? 1 : 0.6,
                        boxShadow: canSubmit ? '0 4px 14px rgba(245, 158, 11, 0.3)' : 'none',
                    }}
                    aria-label="Submit QC inspection"
                >
                    🔬 Submit Inspection Record
                </button>
            </div>
        </div>
    );
};

const sectionTitle: React.CSSProperties = {
    margin: '0 0 10px',
    fontSize: 14,
    fontWeight: 700,
    color: '#D1D5DB',
};

const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '10px 12px',
    borderRadius: 8,
    border: '1px solid #374151',
    backgroundColor: '#1F2937',
    color: '#F9FAFB',
    fontSize: 14,
    boxSizing: 'border-box',
};

export default EvidenceCapture;
