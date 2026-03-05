/**
 * StoryRunner – Interactive Story Mode UI
 *
 * Drives the 3-scene demo walkthrough. An operator (or presenter)
 * steps through each scene with narrated guidance.
 *
 * Layout:
 *   ┌────────────────────────────────┐
 *   │ Scene 2 of 3: QC Safety Gate  │ ← Title
 *   │ "The putaway screen shifts..." │ ← Narration
 *   ├────────────────────────────────┤
 *   │                                │
 *   │    [Component Viewport]        │ ← HUD / Scan / Putaway / Evidence
 *   │                                │
 *   ├────────────────────────────────┤
 *   │ ●●○ Step 3 of 6               │ ← Progress
 *   │ [ ▶ Next Step ]               │ ← Advance button
 *   └────────────────────────────────┘
 */

import React, { useState, useMemo } from 'react';
import { buildStoryScript, type StoryScene, type StoryStep } from './story-script';

interface StoryRunnerProps {
    /** Called when the entire story is complete */
    onComplete?: () => void;
}

export const StoryRunner: React.FC<StoryRunnerProps> = ({ onComplete }) => {
    const scenes = useMemo(() => buildStoryScript(), []);
    const [sceneIdx, setSceneIdx] = useState(0);
    const [stepIdx, setStepIdx] = useState(0);

    const scene: StoryScene = scenes[sceneIdx];
    const step: StoryStep = scene.steps[stepIdx];

    const isLastStep = stepIdx === scene.steps.length - 1;
    const isLastScene = sceneIdx === scenes.length - 1;
    const isComplete = isLastScene && isLastStep && step.component === 'COMPLETE';

    const advance = () => {
        if (isLastStep) {
            if (isLastScene) {
                onComplete?.();
            } else {
                setSceneIdx(sceneIdx + 1);
                setStepIdx(0);
            }
        } else {
            setStepIdx(stepIdx + 1);
        }
    };

    // ── Progress dots ──────────────────────────────────────────────────────
    const progressDots = scene.steps.map((_, i) => (
        <span
            key={i}
            style={{
                width: 8, height: 8, borderRadius: '50%',
                backgroundColor: i <= stepIdx ? '#3B82F6' : '#374151',
                display: 'inline-block',
                margin: '0 3px',
                transition: 'background-color 0.2s',
            }}
        />
    ));

    return (
        <div
            style={{
                position: 'fixed',
                inset: 0,
                backgroundColor: '#0F172A',
                display: 'flex',
                flexDirection: 'column',
                fontFamily: 'system-ui, -apple-system, sans-serif',
                zIndex: 1000,
            }}
        >
            {/* ── Header ──────────────────────────────────────────────────────── */}
            <div style={{
                padding: '16px 20px',
                borderBottom: '1px solid #1E293B',
                flexShrink: 0,
            }}>
                {/* Scene indicator */}
                <div style={{
                    display: 'flex', alignItems: 'center', gap: 8,
                    marginBottom: 8,
                }}>
                    <span style={{ fontSize: 24 }}>{scene.icon}</span>
                    <div>
                        <div style={{
                            fontSize: 11, color: '#6B7280', textTransform: 'uppercase',
                            fontWeight: 700, letterSpacing: '0.05em',
                        }}>
                            Scene {scene.sceneNum} of {scenes.length}
                        </div>
                        <div style={{ fontSize: 16, fontWeight: 700, color: '#F9FAFB' }}>
                            {scene.title}
                        </div>
                    </div>
                </div>

                {/* Narration */}
                <div style={{
                    fontSize: 13,
                    color: '#94A3B8',
                    lineHeight: 1.5,
                    fontStyle: 'italic',
                    padding: '10px 12px',
                    borderRadius: 8,
                    backgroundColor: '#1E293B',
                    borderLeft: '3px solid #3B82F6',
                }}>
                    "{step.narration}"
                </div>
            </div>

            {/* ── Component Viewport ──────────────────────────────────────────── */}
            <div style={{
                flex: 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: 20,
                overflow: 'auto',
            }}>
                <ComponentViewport step={step} scene={scene} />
            </div>

            {/* ── Footer ──────────────────────────────────────────────────────── */}
            <div style={{
                padding: '16px 20px',
                borderTop: '1px solid #1E293B',
                flexShrink: 0,
            }}>
                {/* Progress dots */}
                <div style={{
                    textAlign: 'center',
                    marginBottom: 12,
                }}>
                    {progressDots}
                    <div style={{ fontSize: 11, color: '#6B7280', marginTop: 4 }}>
                        Step {step.stepNum} of {scene.steps.length}
                    </div>
                </div>

                {/* Advance button */}
                <button
                    onClick={advance}
                    style={{
                        width: '100%',
                        padding: 16,
                        borderRadius: 12,
                        border: 'none',
                        background: isComplete
                            ? 'linear-gradient(135deg, #10B981, #059669)'
                            : 'linear-gradient(135deg, #2563EB, #3B82F6)',
                        color: '#FFF',
                        fontSize: 16,
                        fontWeight: 700,
                        cursor: 'pointer',
                        boxShadow: '0 4px 14px rgba(59, 130, 246, 0.3)',
                    }}
                >
                    {isComplete
                        ? '🎉 Demo Complete'
                        : isLastStep
                            ? `▶ Scene ${sceneIdx + 2}: ${scenes[sceneIdx + 1]?.title ?? 'End'}`
                            : '▶ Next Step'}
                </button>
            </div>
        </div>
    );
};

// ── Component Viewport Renderer ──────────────────────────────────────────────

const ComponentViewport: React.FC<{ step: StoryStep; scene: StoryScene }> = ({ step, scene }) => {
    const { component, data } = step;

    const badge = (icon: string, label: string, color: string) => (
        <div style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12,
        }}>
            <div style={{
                fontSize: 64,
                animation: 'grpo-pop 0.4s ease-out',
            }}>{icon}</div>
            <div style={{
                fontSize: 18, fontWeight: 700, color,
                textAlign: 'center',
            }}>{label}</div>
            {data.itemDescription && (
                <div style={{ fontSize: 13, color: '#9CA3AF' }}>
                    {String(data.itemDescription)}
                </div>
            )}
        </div>
    );

    switch (component) {
        case 'HUD':
            return badge('📷', 'Camera HUD Active', '#3B82F6');

        case 'SCAN_RESULT':
            return (
                <div style={{ textAlign: 'center', maxWidth: 320 }}>
                    {badge('✅', 'Barcode Parsed', '#10B981')}
                    <div style={{
                        marginTop: 16, padding: 16, borderRadius: 10,
                        backgroundColor: '#1E293B', border: '1px solid #374151',
                        fontSize: 13, color: '#D1D5DB', textAlign: 'left',
                    }}>
                        <div><strong>GTIN:</strong> {String(data.expected && typeof data.expected === 'object' && 'gtin' in data.expected ? data.expected.gtin : '—')}</div>
                        <div><strong>Batch:</strong> {String(data.expected && typeof data.expected === 'object' && 'batchNo' in data.expected ? data.expected.batchNo : '—')}</div>
                        <div><strong>Expiry:</strong> {String(data.expected && typeof data.expected === 'object' && 'expiry' in data.expected ? data.expected.expiry : '—')}</div>
                        <div><strong>Serial:</strong> {String(data.expected && typeof data.expected === 'object' && 'serialNo' in data.expected ? data.expected.serialNo ?? 'N/A' : '—')}</div>
                        {data.qcRequired && (
                            <div style={{ marginTop: 8, color: '#F59E0B', fontWeight: 700 }}>
                                ⚠️ QC Required
                            </div>
                        )}
                    </div>
                </div>
            );

        case 'SABER_CHECK':
            return badge('🛡️', `SABER: ${String(data.status)}`, '#10B981');

        case 'SABER_BLOCK':
            return badge('🚫', 'SABER: BLOCKED', '#EF4444');

        case 'PUTAWAY_GREEN':
            return badge('🟢', `Putaway: ${String(data.binCode)}`, '#10B981');

        case 'PUTAWAY_YELLOW':
            return badge('🟡', `QC Hold: ${String(data.binCode)}`, '#F59E0B');

        case 'EVIDENCE':
            return badge('📸', 'Evidence Capture', '#F59E0B');

        case 'SAP_POST':
            return (
                <div style={{ textAlign: 'center' }}>
                    {badge('📄', 'SAP B1 Document Posted', '#10B981')}
                    {data.docEntry && (
                        <div style={{
                            marginTop: 16, padding: 12, borderRadius: 8,
                            backgroundColor: '#1E293B', border: '1px solid #374151',
                            fontSize: 13, color: '#D1D5DB',
                        }}>
                            <div><strong>DocEntry:</strong> {String(data.docEntry)}</div>
                            <div><strong>DocNum:</strong> {String(data.docNum)}</div>
                            {data.poDocNum && <div><strong>Source PO:</strong> {String(data.poDocNum)}</div>}
                        </div>
                    )}
                    {data.batchLocked && (
                        <div style={{ marginTop: 8, fontSize: 13, color: '#F59E0B', fontWeight: 700 }}>
                            🔒 Batch Locked — QC Status: {String(data.qcStatus)}
                        </div>
                    )}
                </div>
            );

        case 'AUDIT_ENTRY':
            return badge('📋', 'Audit Chain: GRPO_POSTED', '#8B5CF6');

        case 'SFDA_QUEUE':
            return badge('📤', 'SFDA Export Queued', '#3B82F6');

        case 'COMPLETE':
            return (
                <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: 64, animation: 'grpo-pop 0.4s ease-out' }}>🎉</div>
                    <div style={{ fontSize: 20, fontWeight: 700, color: '#10B981', marginTop: 12 }}>
                        {scene.title} — Complete
                    </div>
                    <div style={{ fontSize: 13, color: '#9CA3AF', marginTop: 8 }}>
                        {scene.subtitle}
                    </div>
                </div>
            );

        default:
            return badge('❓', String(component), '#6B7280');
    }
};

export default StoryRunner;
