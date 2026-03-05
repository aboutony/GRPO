/**
 * BoundingBox – Animated Barcode Highlight
 *
 * Renders at barcode detection coordinates:
 *   - Green border + glow on successful parse
 *   - Red border + shake on failed parse
 *   - Fades out after 1.5s
 */

import React, { useEffect, useState } from 'react';

export interface BoundingBoxCoords {
    x: number;
    y: number;
    width: number;
    height: number;
}

interface BoundingBoxProps {
    coords: BoundingBoxCoords;
    success: boolean;
    visible: boolean;
    fadeDurationMs?: number;
}

export const BoundingBox: React.FC<BoundingBoxProps> = ({
    coords,
    success,
    visible,
    fadeDurationMs = 1500,
}) => {
    const [opacity, setOpacity] = useState(1);

    useEffect(() => {
        if (!visible) {
            setOpacity(0);
            return;
        }

        setOpacity(1);
        const timer = setTimeout(() => setOpacity(0), fadeDurationMs);
        return () => clearTimeout(timer);
    }, [visible, fadeDurationMs]);

    const borderColor = success ? '#10B981' : '#EF4444';
    const glowColor = success ? 'rgba(16, 185, 129, 0.3)' : 'rgba(239, 68, 68, 0.3)';

    return (
        <>
            <div
                style={{
                    position: 'absolute',
                    left: coords.x,
                    top: coords.y,
                    width: coords.width,
                    height: coords.height,
                    border: `2px solid ${borderColor}`,
                    borderRadius: 4,
                    boxShadow: `0 0 12px ${glowColor}, inset 0 0 8px ${glowColor}`,
                    opacity,
                    transition: `opacity ${fadeDurationMs}ms ease-out`,
                    pointerEvents: 'none',
                    animation: success ? undefined : 'grpo-shake 0.4s ease-in-out',
                    zIndex: 500,
                }}
                role="presentation"
                aria-hidden="true"
            />

            <style>{`
        @keyframes grpo-shake {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-4px); }
          50% { transform: translateX(4px); }
          75% { transform: translateX(-2px); }
        }
      `}</style>
        </>
    );
};

export default BoundingBox;
