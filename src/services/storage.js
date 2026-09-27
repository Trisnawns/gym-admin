export const STORAGE = {
  ruangan: 'gym_master_ruangan',
  device: 'gym_master_device',
  unit: 'gym_master_unit_bisnis',
  layanan: 'gym_master_layanan',
  paket_membership: 'gym_master_paket_membership',
  paket_kelas: 'gym_master_paket_kelas',
  paket_trainer: 'gym_master_paket_trainer',
  paket_recovery: 'gym_master_paket_recovery',
  paket_pool: 'gym_master_paket_pool',
  paket_bundling: 'gym_master_paket_bundling',
  tarif_sewa: 'gym_master_tarif_sewa',
  log_akses: 'gym_log_akses',
  club: 'gym_master_club',
  pegawai: 'gym_master_pegawai',
  transaksi: 'gym_transaksi',
  member: 'gym_member',
  booking_sewa: 'gym_booking_sewa'
};

export const read = (key) => {
  try {
    const value = JSON.parse(localStorage.getItem(key));
    return Array.isArray(value) ? value : [];
  } catch {
    return [];
  }
};

export const write = (key, value) => localStorage.setItem(key, JSON.stringify(value));

export const uid = () => globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2)}`;

export const nextCode = (prefix, items) => {
  const nums = items.map(x => Number(String(x.code || '').match(/(\d+)$/)?.[1] || 0));
  return `${prefix}-${String(Math.max(0, ...nums) + 1).padStart(4, '0')}`;
};

const seedData = {
  club: [
    { id: 'club-1', name: 'Jakarta Central', status: 'Aktif' },
    { id: 'club-2', name: 'Bandung Point', status: 'Aktif' }
  ],
  pegawai: [
    { id: 'staff-1', name: 'Andi Pratama', clubId: 'club-1', status: 'Aktif' }
  ],
  unit: [
    { id: 'unit-1', code: 'UB-0001', name: 'Fitness', status: 'Aktif' },
    { id: 'unit-2', code: 'UB-0002', name: 'Group Class', status: 'Aktif' }
  ],
  ruangan: [
    { 
      id: 'room-1', code: 'RNG-0001', name: 'Main Gym', access: ['Turnstile'], 
      clubId: 'club-1', status: 'Aktif', capacity: 100, 
      groupAccess: false, staffActivation: false 
    },
    { 
      id: 'room-2', code: 'RNG-0002', name: 'Studio A', access: ['Booking + Lampu'], 
      clubId: 'club-1', status: 'Aktif', capacity: 20, 
      groupAccess: false, staffActivation: false 
    }
  ],
  device: [
    { 
      id: 'dev-1', code: 'DEV-001', name: 'Gate Utama', type: 'Turnstile', model: 'GPro 1', 
      clubId: 'club-1', roomId: 'room-1', status: 'Aktif', connection: 'Online', 
      readers: [
        { id: 'rdr-1', name: 'Scanner 1', method: 'QR', direction: 'Masuk', model: 'QRX', sn: 'SN-001', mode: 'Langsung' }
      ] 
    }
  ],
  paket_membership: [],
  paket_kelas: [],
  paket_trainer: [],
  paket_recovery: [],
  paket_pool: [],
  paket_bundling: [],
  tarif_sewa: [],
  log_akses: [],
  transaksi: [],
  member: [{ id: 'mem-1', code: 'MBR-001', name: 'Budi Santoso', phone: '081234567', balances: [{ id: 'b-1', type: 'gym', name: 'Open Gym', qty: 'Unlimited', expiry: '2026-12-31' }] }],
  booking_sewa: []
};

export function seed() {
  for (const [name, data] of Object.entries(seedData)) {
    const key = STORAGE[name];
    if (localStorage.getItem(key) === null) write(key, data);
  }
}
