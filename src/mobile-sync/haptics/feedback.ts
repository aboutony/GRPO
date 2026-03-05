/**
 * Haptic Feedback – Physical Operator Guidance
 *
 * Provides distinct haptic pulse patterns for each sync event,
 * giving warehouse operators physical confirmation without
 * needing to look at the screen.
 *
 * Platform compatibility:
 *   - React Native: use expo-haptics or react-native-haptic-feedback
 *   - Web: use navigator.vibrate()
 *   - Fallback: no-op if haptics unavailable
 */

export enum HapticEvent {
    /** Single scan captured and committed to local store */
    ScanCaptured = 'SCAN_CAPTURED',
    /** Receipt synced to SAP successfully */
    SyncSuccess = 'SYNC_SUCCESS',
    /** Receipt queued offline — will sync when connected */
    SyncPending = 'SYNC_PENDING',
    /** Fatal conflict detected — requires operator attention */
    ConflictDetected = 'CONFLICT_DETECTED',
    /** Entire queue drained successfully */
    QueueDrainComplete = 'QUEUE_DRAIN_COMPLETE',
}

/** Haptic pulse definition: duration in ms */
interface HapticPulse {
    /** Vibration durations and gaps in ms [vibrate, gap, vibrate, gap, ...] */
    pattern: number[];
    /** Human description for documentation */
    description: string;
}

/** Pulse patterns per event */
const HAPTIC_PATTERNS: Record<HapticEvent, HapticPulse> = {
    [HapticEvent.ScanCaptured]: {
        pattern: [50],
        description: 'Single short pulse — scan confirmed',
    },
    [HapticEvent.SyncSuccess]: {
        pattern: [50, 30, 50],
        description: 'Double pulse — synced to SAP',
    },
    [HapticEvent.SyncPending]: {
        pattern: [100],
        description: 'Single medium pulse — queued offline',
    },
    [HapticEvent.ConflictDetected]: {
        pattern: [100, 50, 100, 50, 100],
        description: 'Triple heavy pulse — conflict, needs attention',
    },
    [HapticEvent.QueueDrainComplete]: {
        pattern: [50, 40, 75, 40, 100],
        description: 'Ascending chord — all receipts synced',
    },
};

/** Whether haptic feedback is available on this device */
let hapticAvailable: boolean | null = null;

function checkHapticSupport(): boolean {
    if (hapticAvailable !== null) return hapticAvailable;

    // Check for Web Vibration API
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
        hapticAvailable = true;
        return true;
    }

    // In React Native / Expo, haptics are provided by native modules
    // and would be injected via setHapticEngine()
    hapticAvailable = false;
    return false;
}

/**
 * Optional custom haptic engine for React Native / Expo.
 * Set this to use platform-specific haptic APIs.
 */
let customEngine: ((pattern: number[]) => void) | null = null;

/**
 * Inject a custom haptic engine (e.g., expo-haptics, react-native-haptic-feedback).
 *
 * @example
 * import * as Haptics from 'expo-haptics';
 * setHapticEngine((pattern) => {
 *   Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
 * });
 */
export function setHapticEngine(engine: (pattern: number[]) => void): void {
    customEngine = engine;
    hapticAvailable = true;
}

/**
 * Triggers the haptic pattern for the given event.
 * Falls back to no-op if haptics are unavailable.
 */
export function triggerHaptic(event: HapticEvent): void {
    const pulse = HAPTIC_PATTERNS[event];
    if (!pulse) return;

    // Custom engine takes priority (React Native / Expo)
    if (customEngine) {
        try { customEngine(pulse.pattern); } catch { /* non-critical */ }
        return;
    }

    // Web Vibration API fallback
    if (checkHapticSupport()) {
        try { navigator.vibrate(pulse.pattern); } catch { /* non-critical */ }
    }
}

/**
 * Returns the pattern info for a given event (for UI documentation).
 */
export function getHapticInfo(event: HapticEvent): HapticPulse {
    return HAPTIC_PATTERNS[event];
}
