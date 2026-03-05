/**
 * Facility Registry – All 3 KSA Warehouse Hubs
 *
 * Central config for Riyadh, Jeddah, and Dammam.
 * Each facility has its own SAP instance, operator roster,
 * and schema sync status.
 */

// ── Types ────────────────────────────────────────────────────────────────────

export type Province = 'Central' | 'Western' | 'Eastern';
export type FacilityStatus = 'active' | 'provisioning' | 'maintenance' | 'offline';

export interface Facility {
    facilityId: string;
    name: string;
    code: string;
    city: string;
    province: Province;
    timezone: string;
    sap: {
        server: string;
        companyDb: string;
        licenseServer: string;
        serviceLayerUrl: string;
        dbType: 'MSSQL' | 'HANA';
    };
    warehouse: {
        code: string;
        zones: string[];
        totalBins: number;
        quarantineBin: string;
    };
    devices: {
        androidCount: number;
        iosCount: number;
        scannerCount: number;
    };
    operators: string[];
    status: FacilityStatus;
    schemaSynced: boolean;
    goLiveDate: string;
}

// ── Registry ─────────────────────────────────────────────────────────────────

export const FACILITIES: Facility[] = [
    // ── Riyadh Central (Pilot — Already Live) ──────────────────────────────
    {
        facilityId: 'UNIMED-RUH-WH01',
        name: 'UNIMED Riyadh Central Warehouse',
        code: 'RUH',
        city: 'Riyadh',
        province: 'Central',
        timezone: 'Asia/Riyadh',
        sap: {
            server: 'sap-b1.riyadh.unimed.local',
            companyDb: 'UNIMED_PROD',
            licenseServer: 'sap-lic.riyadh.unimed.local:40000',
            serviceLayerUrl: 'https://sap-sl.riyadh.unimed.local:50000/b1s/v1',
            dbType: 'HANA',
        },
        warehouse: {
            code: 'WH01',
            zones: ['A', 'B', 'QC', 'COLD'],
            totalBins: 450,
            quarantineBin: 'QC-WH01-HOLD',
        },
        devices: { androidCount: 5, iosCount: 5, scannerCount: 5 },
        operators: [
            'Mohammed Al-Rashid', 'Ahmed Al-Dosari', 'Khalid Al-Otaibi',
            'Omar Al-Harbi', 'Fahad Al-Qahtani', 'Sultan Al-Shehri',
            'Nasser Al-Ghamdi', 'Turki Al-Mutairi',
        ],
        status: 'active',
        schemaSynced: true,
        goLiveDate: '2026-03-05',
    },

    // ── Jeddah Western ─────────────────────────────────────────────────────
    {
        facilityId: 'UNIMED-JED-WH02',
        name: 'UNIMED Jeddah Distribution Center',
        code: 'JED',
        city: 'Jeddah',
        province: 'Western',
        timezone: 'Asia/Riyadh',
        sap: {
            server: 'sap-b1.jeddah.unimed.local',
            companyDb: 'UNIMED_JED',
            licenseServer: 'sap-lic.jeddah.unimed.local:40000',
            serviceLayerUrl: 'https://sap-sl.jeddah.unimed.local:50000/b1s/v1',
            dbType: 'HANA',
        },
        warehouse: {
            code: 'WH02',
            zones: ['A', 'B', 'C', 'QC'],
            totalBins: 380,
            quarantineBin: 'QC-WH02-HOLD',
        },
        devices: { androidCount: 4, iosCount: 4, scannerCount: 4 },
        operators: [
            'Abdulrahman Al-Zahrani', 'Hassan Al-Malki', 'Faisal Al-Ghamdi',
            'Majed Al-Harthy', 'Saad Al-Qahtani', 'Ibrahim Al-Ansari',
        ],
        status: 'provisioning',
        schemaSynced: false,
        goLiveDate: '2026-03-15',
    },

    // ── Dammam Eastern ─────────────────────────────────────────────────────
    {
        facilityId: 'UNIMED-DMM-WH03',
        name: 'UNIMED Dammam Logistics Hub',
        code: 'DMM',
        city: 'Dammam',
        province: 'Eastern',
        timezone: 'Asia/Riyadh',
        sap: {
            server: 'sap-b1.dammam.unimed.local',
            companyDb: 'UNIMED_DMM',
            licenseServer: 'sap-lic.dammam.unimed.local:40000',
            serviceLayerUrl: 'https://sap-sl.dammam.unimed.local:50000/b1s/v1',
            dbType: 'HANA',
        },
        warehouse: {
            code: 'WH03',
            zones: ['A', 'B', 'QC', 'HAZMAT'],
            totalBins: 320,
            quarantineBin: 'QC-WH03-HOLD',
        },
        devices: { androidCount: 3, iosCount: 3, scannerCount: 3 },
        operators: [
            'Ali Al-Dossary', 'Youssef Al-Shamrani', 'Waleed Al-Hajri',
            'Bader Al-Muraikhi', 'Rakan Al-Otaibi',
        ],
        status: 'provisioning',
        schemaSynced: false,
        goLiveDate: '2026-03-20',
    },
];

// ── Lookups ──────────────────────────────────────────────────────────────────

export function getFacilityByCode(code: string): Facility | undefined {
    return FACILITIES.find(f => f.code === code);
}

export function getFacilitiesByProvince(province: Province): Facility[] {
    return FACILITIES.filter(f => f.province === province);
}

export function getActiveFacilities(): Facility[] {
    return FACILITIES.filter(f => f.status === 'active');
}

export function getAllWarehouseCodes(): string[] {
    return FACILITIES.map(f => f.warehouse.code);
}

export function getTotalOperatorCount(): number {
    return FACILITIES.reduce((sum, f) => sum + f.operators.length, 0);
}

export function getTotalDeviceCount(): number {
    return FACILITIES.reduce((sum, f) =>
        sum + f.devices.androidCount + f.devices.iosCount, 0);
}
