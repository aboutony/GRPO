/**
 * ScannerHUD – Heads-Up Display Camera Overlay
 *
 * Full-screen camera interface optimized for speed:
 *   - Centered scan reticle with corner brackets
 *   - Real-time status bar (Scanning / Processing / Success / Error)
 *   - Torch toggle (top-right)
 *   - Manual entry toggle (bottom-left, non-intrusive)
 *   - Scanned item count badge (bottom-right)
 *
 * On barcode detection → parse via gs1-parser → show BoundingBox → emit result
 */

import React, { useState, useCallback, useRef, useEffect } from 'react';
import { parseGS1 } from '../parser/gs1-parser';
import { validateScanResult, looksLikeGS1 } from '../parser/barcode-validator';
import { BoundingBox, type BoundingBoxCoords } from './BoundingBox';
import { DEFAULT_CAMERA_CONFIG, type CameraConfig } from './camera-config';
import type { ScanResult } from '../models/scan-result';

type HUDStatus = 'scanning' | 'processing' | 'success' | 'error';

const STATUS_DISPLAY: Record<HUDStatus, { label: string; color: string; icon: string }> = {
    scanning: { label: 'Point at barcode', color: '#F59E0B', icon: '📷' },
    processing: { label: 'Reading...', color: '#3B82F6', icon: '⏳' },
    success: { label: 'Scan complete', color: '#10B981', icon: '✅' },
    error: { label: 'Scan failed — try again', color: '#EF4444', icon: '❌' },
};

interface ScannerHUDProps {
    /** Called when a barcode is successfully parsed */
    onScanResult: (result: ScanResult) => void;
    /** Called when user taps manual entry */
    onManualEntry: () => void;
    /** Number of items scanned this session */
    itemCount: number;
    /** Camera config override */
    cameraConfig?: CameraConfig;
    /** Called to close scanner */
    onClose?: () => void;
}

export const ScannerHUD: React.FC<ScannerHUDProps> = ({
    onScanResult,
    onManualEntry,
    itemCount,
    cameraConfig = DEFAULT_CAMERA_CONFIG,
    onClose,
}) => {
    const [status, setStatus] = useState<HUDStatus>('scanning');
    const [torchOn, setTorchOn] = useState(cameraConfig.torchEnabled);
    const [boundingBox, setBoundingBox] = useState<BoundingBoxCoords | null>(null);
    const [boxSuccess, setBoxSuccess] = useState(false);
    const [boxVisible, setBoxVisible] = useState(false);
    const lastScanRef = useRef<number>(0);
    const statusInfo = STATUS_DISPLAY[status];

    // Auto-timeout camera
    useEffect(() => {
        const timer = setTimeout(() => {
            onClose?.();
        }, cameraConfig.cameraTimeoutMs);
        return () => clearTimeout(timer);
    }, [cameraConfig.cameraTimeoutMs, onClose]);

    /**
     * Handle barcode detection from camera stream.
     * In production, this is called by the camera barcode detection API.
     * Here we define the interface for it.
     */
    const handleBarcodeDetected = useCallback((
        rawBarcode: string,
        coords?: BoundingBoxCoords
    ) => {
        // Debounce rapid scans
        const now = Date.now();
        if (now - lastScanRef.current < cameraConfig.scanDebounceMs) return;
        lastScanRef.current = now;

        // Quick check
        if (rawBarcode.length < cameraConfig.minBarcodeLength) return;

        setStatus('processing');

        // Show bounding box at detection coordinates
        if (coords) {
            setBoundingBox(coords);
            setBoxVisible(true);
        }

        // Parse
        const result = parseGS1(rawBarcode);
        const validation = validateScanResult(result);

        if (result.success && validation.valid) {
            setStatus('success');
            setBoxSuccess(true);
            onScanResult(result);

            // Reset after brief display
            setTimeout(() => {
                setStatus('scanning');
                setBoxVisible(false);
            }, 1200);
        } else {
            setStatus('error');
            setBoxSuccess(false);

            setTimeout(() => {
                setStatus('scanning');
                setBoxVisible(false);
            }, 2000);
        }
    }, [cameraConfig, onScanResult]);

    // Expose for external camera integration
    (window as any).__grpoHandleBarcodeDetected = handleBarcodeDetected;

    return (
        <div
            style={{
                position: 'fixed',
                inset: 0,
                backgroundColor: '#000',
                zIndex: 900,
                fontFamily: 'system-ui, -apple-system, sans-serif',
            }}
            role="application"
            aria-label="Barcode scanner"
        >
            {/* Camera feed placeholder — replaced by actual camera API in production */}
            <div
                style={{
                    position: 'absolute',
                    inset: 0,
                    background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                }}
            >
                <span style={{ color: '#4B5563', fontSize: 14 }}>
                    Camera feed active
                </span>
            </div>

            {/* ── Scan Reticle ──────────────────────────────────────────────────── */}
            <div
                style={{
                    position: 'absolute',
                    left: `${(100 - cameraConfig.scanRegion.widthPercent) / 2}%`,
                    top: `${(100 - cameraConfig.scanRegion.heightPercent) / 2}%`,
                    width: `${cameraConfig.scanRegion.widthPercent}%`,
                    height: `${cameraConfig.scanRegion.heightPercent}%`,
                    pointerEvents: 'none',
                }}
            >
                {/* Corner brackets */}
                {['topLeft', 'topRight', 'bottomLeft', 'bottomRight'].map((corner) => {
                    const isTop = corner.includes('top');
                    const isLeft = corner.includes('Left');
                    return (
                        <div
                            key={corner}
                            style={{
                                position: 'absolute',
                                [isTop ? 'top' : 'bottom']: -1,
                                [isLeft ? 'left' : 'right']: -1,
                                width: 24,
                                height: 24,
                                [isTop ? 'borderTop' : 'borderBottom']: '3px solid #F59E0B',
                                [isLeft ? 'borderLeft' : 'borderRight']: '3px solid #F59E0B',
                                borderRadius: corner === 'topLeft' ? '4px 0 0 0'
                                    : corner === 'topRight' ? '0 4px 0 0'
                                        : corner === 'bottomLeft' ? '0 0 0 4px'
                                            : '0 0 4px 0',
                            }}
                        />
                    );
                })}

                {/* Scan line animation */}
                {status === 'scanning' && (
                    <div
                        style={{
                            position: 'absolute',
                            left: 0,
                            right: 0,
                            height: 2,
                            background: 'linear-gradient(90deg, transparent, #F59E0B, transparent)',
                            animation: 'grpo-scanline 2s ease-in-out infinite',
                        }}
                    />
                )}
            </div>

            {/* ── Bounding Box ──────────────────────────────────────────────────── */}
            {boundingBox && (
                <BoundingBox
                    coords={boundingBox}
                    success={boxSuccess}
                    visible={boxVisible}
                />
            )}

            {/* ── Top Bar ───────────────────────────────────────────────────────── */}
            <div
                style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    padding: '12px 16px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    background: 'linear-gradient(180deg, rgba(0,0,0,0.7) 0%, transparent 100%)',
                }}
            >
                {/* Status */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 18 }}>{statusInfo.icon}</span>
                    <span style={{
                        fontSize: 14,
                        fontWeight: 600,
                        color: statusInfo.color,
                    }}>
                        {statusInfo.label}
                    </span>
                </div>

                {/* Torch toggle */}
                <button
                    onClick={() => setTorchOn(!torchOn)}
                    style={{
                        width: 44,
                        height: 44,
                        borderRadius: '50%',
                        border: 'none',
                        backgroundColor: torchOn ? '#F59E0B' : 'rgba(255,255,255,0.15)',
                        color: torchOn ? '#000' : '#FFF',
                        fontSize: 20,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                    }}
                    aria-label={torchOn ? 'Turn off flashlight' : 'Turn on flashlight'}
                >
                    🔦
                </button>
            </div>

            {/* ── Bottom Bar ────────────────────────────────────────────────────── */}
            <div
                style={{
                    position: 'absolute',
                    bottom: 0,
                    left: 0,
                    right: 0,
                    padding: '16px 20px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    background: 'linear-gradient(0deg, rgba(0,0,0,0.7) 0%, transparent 100%)',
                }}
            >
                {/* Manual entry */}
                <button
                    onClick={onManualEntry}
                    style={{
                        padding: '10px 20px',
                        borderRadius: 8,
                        border: '1px solid rgba(255,255,255,0.25)',
                        backgroundColor: 'rgba(255,255,255,0.1)',
                        color: '#D1D5DB',
                        fontSize: 13,
                        fontWeight: 500,
                        cursor: 'pointer',
                        backdropFilter: 'blur(8px)',
                    }}
                    aria-label="Enter barcode manually"
                >
                    ⌨️ Type Code
                </button>

                {/* Item count badge */}
                <div
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 6,
                        padding: '8px 14px',
                        borderRadius: 20,
                        backgroundColor: 'rgba(255,255,255,0.1)',
                        backdropFilter: 'blur(8px)',
                    }}
                >
                    <span style={{ fontSize: 16 }}>📦</span>
                    <span style={{ fontSize: 14, fontWeight: 700, color: '#FFF' }}>
                        {itemCount}
                    </span>
                    <span style={{ fontSize: 11, color: '#9CA3AF' }}>scanned</span>
                </div>
            </div>

            {/* ── Close button ──────────────────────────────────────────────────── */}
            {onClose && (
                <button
                    onClick={onClose}
                    style={{
                        position: 'absolute',
                        top: 12,
                        right: 70,
                        width: 36,
                        height: 36,
                        borderRadius: '50%',
                        border: 'none',
                        backgroundColor: 'rgba(255,255,255,0.1)',
                        color: '#FFF',
                        fontSize: 18,
                        cursor: 'pointer',
                    }}
                    aria-label="Close scanner"
                >
                    ✕
                </button>
            )}

            {/* ── Animations ────────────────────────────────────────────────────── */}
            <style>{`
        @keyframes grpo-scanline {
          0% { top: 0; }
          50% { top: 100%; }
          100% { top: 0; }
        }
      `}</style>
        </div>
    );
};

export default ScannerHUD;
