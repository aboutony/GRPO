/**
 * DefectCodePicker – Tappable Defect Code Grid
 *
 * Multi-select grid for identifying defects on incoming goods.
 * Each code has an icon, label, and severity indicator.
 * Selected codes highlighted with blue ring.
 */

import React from 'react';
import { DefectCode, DEFECT_CODE_INFO } from '../models/qc-types';

interface DefectCodePickerProps {
    selected: DefectCode[];
    onChange: (selected: DefectCode[]) => void;
}

const SEVERITY_COLORS = {
    critical: '#EF4444',
    major: '#F59E0B',
    minor: '#6B7280',
};

export const DefectCodePicker: React.FC<DefectCodePickerProps> = ({
    selected,
    onChange,
}) => {
    const toggle = (code: DefectCode) => {
        if (selected.includes(code)) {
            onChange(selected.filter(c => c !== code));
        } else {
            onChange([...selected, code]);
        }
    };

    return (
        <div
            style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(2, 1fr)',
                gap: 8,
            }}
            role="group"
            aria-label="Defect codes"
        >
            {Object.values(DefectCode).map((code) => {
                const info = DEFECT_CODE_INFO[code];
                const isSelected = selected.includes(code);

                return (
                    <button
                        key={code}
                        onClick={() => toggle(code)}
                        style={{
                            padding: '12px 10px',
                            borderRadius: 10,
                            border: isSelected ? '2px solid #3B82F6' : '1px solid #374151',
                            backgroundColor: isSelected ? '#1E3A5F' : '#1F2937',
                            cursor: 'pointer',
                            textAlign: 'left',
                            transition: 'all 0.15s ease',
                            boxShadow: isSelected ? '0 0 12px rgba(59, 130, 246, 0.2)' : 'none',
                        }}
                        aria-pressed={isSelected}
                        aria-label={`${info.label}: ${info.description}`}
                    >
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                            <span style={{ fontSize: 18 }}>{info.icon}</span>
                            <span style={{
                                fontSize: 13,
                                fontWeight: 700,
                                color: isSelected ? '#93C5FD' : '#E5E7EB',
                            }}>
                                {info.label}
                            </span>
                        </div>
                        <div style={{ fontSize: 10, color: '#9CA3AF', lineHeight: 1.3 }}>
                            {info.description}
                        </div>
                        {/* Severity dot */}
                        <div style={{
                            marginTop: 6,
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 4,
                            fontSize: 9,
                            color: SEVERITY_COLORS[info.severity],
                            textTransform: 'uppercase',
                            fontWeight: 600,
                        }}>
                            <span style={{
                                width: 5, height: 5, borderRadius: '50%',
                                backgroundColor: SEVERITY_COLORS[info.severity],
                            }} />
                            {info.severity}
                        </div>
                    </button>
                );
            })}
        </div>
    );
};

export default DefectCodePicker;
