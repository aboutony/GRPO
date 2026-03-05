/**
 * Camera Configuration – Scanner Device Settings
 *
 * Centralized config for camera resolution, focus, torch,
 * and scan detection parameters.
 */

export interface CameraConfig {
    /** Preferred camera resolution */
    resolution: { width: number; height: number };
    /** Auto-focus mode */
    focusMode: 'continuous' | 'manual';
    /** Torch (flashlight) default state */
    torchEnabled: boolean;
    /** Scan detection debounce (ms) — prevents duplicate rapid scans */
    scanDebounceMs: number;
    /** Minimum barcode length to attempt parse */
    minBarcodeLength: number;
    /** Maximum time to hold camera open before auto-timeout (ms) */
    cameraTimeoutMs: number;
    /** Scan region aspect ratio (reticle area) */
    scanRegion: { widthPercent: number; heightPercent: number };
}

/** Default production configuration */
export const DEFAULT_CAMERA_CONFIG: CameraConfig = {
    resolution: { width: 1920, height: 1080 },
    focusMode: 'continuous',
    torchEnabled: false,
    scanDebounceMs: 1500,       // 1.5s between scans to prevent duplicates
    minBarcodeLength: 16,       // GTIN-14 + at least one AI
    cameraTimeoutMs: 120_000,   // 2 minutes before auto-close
    scanRegion: {
        widthPercent: 80,          // 80% of viewport width
        heightPercent: 30,         // 30% of viewport height
    },
};

/** Low-light / warehouse configuration */
export const WAREHOUSE_CAMERA_CONFIG: CameraConfig = {
    ...DEFAULT_CAMERA_CONFIG,
    torchEnabled: true,          // Always-on torch in dim environments
    scanDebounceMs: 2000,        // Slightly longer to avoid reflections
    resolution: { width: 1280, height: 720 }, // Lower res for faster processing
};
