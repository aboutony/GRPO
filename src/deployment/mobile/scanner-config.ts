/**
 * Scanner Config – Bluetooth HID Barcode Scanner Profiles
 *
 * 5 warehouse scanners for the Riyadh pilot.
 * Configured for GS1-128 + DataMatrix symbologies.
 */

export interface ScannerProfile {
    scannerId: string;
    model: string;
    manufacturer: 'Zebra' | 'Honeywell';
    connectionType: 'bluetooth_hid' | 'bluetooth_spp' | 'usb';
    pairedDeviceId: string | null;
    symbologies: string[];
    firmwareVersion: string;
    batteryLevel: number | null;
    status: 'paired' | 'unpaired' | 'charging' | 'offline';
}

export interface ScannerSettings {
    /** Signal strength threshold for reliable scanning (dBm) */
    minSignalStrength: number;
    /** Auto-reconnect after disconnect */
    autoReconnect: boolean;
    /** Reconnect attempt interval (ms) */
    reconnectIntervalMs: number;
    /** Max reconnect attempts before alerting */
    maxReconnectAttempts: number;
    /** Scan confirmation beep */
    beepOnScan: boolean;
    /** LED flash on successful scan */
    ledFlash: boolean;
    /** Continuous scan mode (vs trigger mode) */
    continuousMode: boolean;
    /** GS1 FNC1 handling enabled */
    gs1Mode: boolean;
    /** AIM identifier prefix enabled */
    aimIdPrefix: boolean;
}

// ── Scanner Fleet ────────────────────────────────────────────────────────────

export const PILOT_SCANNERS: ScannerProfile[] = [
    {
        scannerId: 'SCN-001',
        model: 'DS3678-SR',
        manufacturer: 'Zebra',
        connectionType: 'bluetooth_hid',
        pairedDeviceId: 'RUH-AND-001',
        symbologies: ['GS1-128', 'DataMatrix', 'QR', 'Code128', 'EAN-13'],
        firmwareVersion: 'PAABLS00-006-R02',
        batteryLevel: 95,
        status: 'paired',
    },
    {
        scannerId: 'SCN-002',
        model: 'DS3678-SR',
        manufacturer: 'Zebra',
        connectionType: 'bluetooth_hid',
        pairedDeviceId: 'RUH-AND-002',
        symbologies: ['GS1-128', 'DataMatrix', 'QR', 'Code128', 'EAN-13'],
        firmwareVersion: 'PAABLS00-006-R02',
        batteryLevel: 88,
        status: 'paired',
    },
    {
        scannerId: 'SCN-003',
        model: 'DS3678-SR',
        manufacturer: 'Zebra',
        connectionType: 'bluetooth_hid',
        pairedDeviceId: 'RUH-AND-003',
        symbologies: ['GS1-128', 'DataMatrix', 'QR', 'Code128', 'EAN-13'],
        firmwareVersion: 'PAABLS00-006-R02',
        batteryLevel: 72,
        status: 'paired',
    },
    {
        scannerId: 'SCN-004',
        model: 'Voyager 1602g',
        manufacturer: 'Honeywell',
        connectionType: 'bluetooth_hid',
        pairedDeviceId: 'RUH-IOS-001',
        symbologies: ['GS1-128', 'DataMatrix', 'QR', 'Code128', 'EAN-13', 'PDF417'],
        firmwareVersion: 'BT001808BAA',
        batteryLevel: 100,
        status: 'paired',
    },
    {
        scannerId: 'SCN-005',
        model: 'Voyager 1602g',
        manufacturer: 'Honeywell',
        connectionType: 'bluetooth_hid',
        pairedDeviceId: 'RUH-IOS-002',
        symbologies: ['GS1-128', 'DataMatrix', 'QR', 'Code128', 'EAN-13', 'PDF417'],
        firmwareVersion: 'BT001808BAA',
        batteryLevel: 91,
        status: 'paired',
    },
];

/** Default scanner settings for the pilot */
export const DEFAULT_SCANNER_SETTINGS: ScannerSettings = {
    minSignalStrength: -70,
    autoReconnect: true,
    reconnectIntervalMs: 5_000,
    maxReconnectAttempts: 10,
    beepOnScan: true,
    ledFlash: true,
    continuousMode: false,
    gs1Mode: true,
    aimIdPrefix: false,
};

export function getScannerById(id: string): ScannerProfile | undefined {
    return PILOT_SCANNERS.find(s => s.scannerId === id);
}

export function getPairedScanners(): ScannerProfile[] {
    return PILOT_SCANNERS.filter(s => s.status === 'paired');
}
