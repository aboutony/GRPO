/**
 * Device Fleet – Mobile Handset Provisioning Registry
 *
 * 10 pilot devices (5 Android + 5 iOS) for Riyadh warehouse.
 * Tracks assignment, health, and OTA update status.
 */

// ── Device Types ─────────────────────────────────────────────────────────────

export type Platform = 'android' | 'ios';
export type DeviceStatus = 'active' | 'inactive' | 'maintenance' | 'unassigned';

export interface PilotDevice {
    deviceId: string;
    platform: Platform;
    model: string;
    osVersion: string;
    operator: string | null;
    warehouseZone: string;
    pairedScannerId: string | null;
    appVersion: string;
    lastCheckIn: string | null;
    status: DeviceStatus;
}

export interface DeviceHealthCheck {
    deviceId: string;
    timestamp: string;
    batteryLevel: number;
    storageFreeMb: number;
    networkConnected: boolean;
    networkType: 'wifi' | 'cellular' | 'none';
    signalStrength: number;
    appVersion: string;
    pendingSyncCount: number;
}

// ── Fleet Registry ───────────────────────────────────────────────────────────

export const PILOT_FLEET: PilotDevice[] = [
    // ── Android Devices (Zebra TC52x) ──────────────────────────────────────
    { deviceId: 'RUH-AND-001', platform: 'android', model: 'Zebra TC52x', osVersion: 'Android 13', operator: 'Mohammed Al-Rashid', warehouseZone: 'A', pairedScannerId: 'SCN-001', appVersion: '1.0.0', lastCheckIn: null, status: 'active' },
    { deviceId: 'RUH-AND-002', platform: 'android', model: 'Zebra TC52x', osVersion: 'Android 13', operator: 'Ahmed Al-Dosari', warehouseZone: 'A', pairedScannerId: 'SCN-002', appVersion: '1.0.0', lastCheckIn: null, status: 'active' },
    { deviceId: 'RUH-AND-003', platform: 'android', model: 'Zebra TC52x', osVersion: 'Android 13', operator: 'Khalid Al-Otaibi', warehouseZone: 'B', pairedScannerId: 'SCN-003', appVersion: '1.0.0', lastCheckIn: null, status: 'active' },
    { deviceId: 'RUH-AND-004', platform: 'android', model: 'Samsung Galaxy XCover6 Pro', osVersion: 'Android 14', operator: 'Omar Al-Harbi', warehouseZone: 'B', pairedScannerId: null, appVersion: '1.0.0', lastCheckIn: null, status: 'active' },
    { deviceId: 'RUH-AND-005', platform: 'android', model: 'Samsung Galaxy XCover6 Pro', osVersion: 'Android 14', operator: null, warehouseZone: 'QC', pairedScannerId: null, appVersion: '1.0.0', lastCheckIn: null, status: 'unassigned' },
    // ── iOS Devices (iPhone 15 Pro) ────────────────────────────────────────
    { deviceId: 'RUH-IOS-001', platform: 'ios', model: 'iPhone 15 Pro', osVersion: 'iOS 17.4', operator: 'Fahad Al-Qahtani', warehouseZone: 'A', pairedScannerId: 'SCN-004', appVersion: '1.0.0', lastCheckIn: null, status: 'active' },
    { deviceId: 'RUH-IOS-002', platform: 'ios', model: 'iPhone 15 Pro', osVersion: 'iOS 17.4', operator: 'Sultan Al-Shehri', warehouseZone: 'B', pairedScannerId: 'SCN-005', appVersion: '1.0.0', lastCheckIn: null, status: 'active' },
    { deviceId: 'RUH-IOS-003', platform: 'ios', model: 'iPhone 15 Pro', osVersion: 'iOS 17.4', operator: 'Nasser Al-Ghamdi', warehouseZone: 'QC', pairedScannerId: null, appVersion: '1.0.0', lastCheckIn: null, status: 'active' },
    { deviceId: 'RUH-IOS-004', platform: 'ios', model: 'iPhone 14', osVersion: 'iOS 17.4', operator: 'Turki Al-Mutairi', warehouseZone: 'A', pairedScannerId: null, appVersion: '1.0.0', lastCheckIn: null, status: 'active' },
    { deviceId: 'RUH-IOS-005', platform: 'ios', model: 'iPhone 14', osVersion: 'iOS 17.4', operator: null, warehouseZone: 'QC', pairedScannerId: null, appVersion: '1.0.0', lastCheckIn: null, status: 'unassigned' },
];

// ── Fleet Operations ─────────────────────────────────────────────────────────

export function getActiveDevices(): PilotDevice[] {
    return PILOT_FLEET.filter(d => d.status === 'active');
}

export function getDevicesByZone(zone: string): PilotDevice[] {
    return PILOT_FLEET.filter(d => d.warehouseZone === zone);
}

export function getDeviceById(id: string): PilotDevice | undefined {
    return PILOT_FLEET.find(d => d.deviceId === id);
}

export function getAssignedOperators(): string[] {
    return PILOT_FLEET.filter(d => d.operator).map(d => d.operator!);
}

/**
 * Simulates a health check for a device.
 */
export function generateHealthCheck(device: PilotDevice): DeviceHealthCheck {
    return {
        deviceId: device.deviceId,
        timestamp: new Date().toISOString(),
        batteryLevel: 75 + Math.floor(Math.random() * 25),
        storageFreeMb: 2000 + Math.floor(Math.random() * 4000),
        networkConnected: true,
        networkType: 'wifi',
        signalStrength: -40 - Math.floor(Math.random() * 30),
        appVersion: device.appVersion,
        pendingSyncCount: Math.floor(Math.random() * 3),
    };
}
