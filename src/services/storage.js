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
    { id: 'unit-2', code: 'UB-0002', name: 'Group Class', status: 'Aktif' },
    { id: 'unit-3', code: 'UB-0003', name: 'Recovery', status: 'Aktif' }
  ],
  ruangan: [
    { id: 'room-1', code: 'RNG-0001', name: 'Main Gym', access: ['Turnstile'], clubId: 'club-1', status: 'Aktif', capacity: 100, groupAccess: false, staffActivation: false },
    { id: 'room-2', code: 'RNG-0002', name: 'Studio A', access: ['Booking + Lampu'], clubId: 'club-1', status: 'Aktif', capacity: 20, groupAccess: false, staffActivation: false },
    { id: 'room-3', code: 'RNG-0003', name: 'Recovery Room', access: ['QR + Wristband'], clubId: 'club-1', status: 'Aktif', capacity: 10, groupAccess: false, staffActivation: true },
    { id: 'room-4', code: 'RNG-0004', name: 'Swimming Pool', access: ['Tanpa Gate'], clubId: 'club-1', status: 'Aktif', capacity: 50, groupAccess: false, staffActivation: false },
    { id: 'room-5', code: 'RNG-0005', name: 'Tennis Court', access: ['Excel Door Lock'], clubId: 'club-1', status: 'Aktif', capacity: 4, groupAccess: true, staffActivation: false }
  ],
  device: [
    { id: 'dev-1', code: 'DEV-0001', name: 'Gate Utama', type: 'Turnstile', model: 'GPro 1', clubId: 'club-1', roomId: 'room-1', status: 'Aktif', connection: 'Online', readers: [{ id: 'rdr-1', name: 'Scanner 1', method: 'QR', direction: 'Masuk', model: 'QRX', sn: 'SN-001', mode: 'Langsung' }] },
    { id: 'dev-2', code: 'DEV-0002', name: 'Pintu Loker VIP', type: 'Excel Door', model: 'EDL-200', clubId: 'club-2', roomId: 'room-2', status: 'Aktif', connection: 'Offline', readers: [{ id: 'rdr-2', name: 'Scanner Gelang', method: 'QR', direction: 'Masuk', sn: 'SN-002', mode: 'Langsung' }] }
  ],
  paket_membership: [
    { id: 'pkg-mem-1', code: 'MB-0001', name: 'Unlimited Monthly', clubId: 'club-1', price: 500000, activeValue: 1, activeUnit: 'Bulan', status: 'Aktif', unitId: 'unit-1', roomIds: ['room-1'], groupClassAccess: 'Termasuk', bundlingValid: true, isActive: true }
  ],
  paket_kelas: [
    { id: 'pkg-cls-1', code: 'PK-0001', name: 'Yoga 10 Sessions', clubId: 'club-1', type: 'Reguler', roomId: 'room-2', classScope: 'Semua Kelas Group', quota: 10, activeValue: 3, activeUnit: 'Bulan', price: 300000, status: 'Aktif', bundlingValid: true }
  ],
  paket_trainer: [
    { id: 'pkg-trn-1', code: 'PT-0001', name: 'PT Private 12x', clubId: 'club-1', unitId: 'unit-1', sessionType: 'Private', trainer: 'staff-1', session: 12, price: 1200000, activeValue: 1, activeUnit: 'Bulan', status: 'Aktif' }
  ],
  paket_recovery: [
    { id: 'pkg-rec-1', code: 'PR-0001', name: 'Massage 5x', clubId: 'club-1', recoveryType: 'Massage', roomId: 'room-3', quota: 5, reset: 'Tidak Reset', activeValue: 3, activeUnit: 'Bulan', price: 200000, status: 'Aktif', bundlingValid: true }
  ],
  paket_pool: [
    { id: 'pkg-pol-1', code: 'PL-0001', name: 'Pool Access 10x', clubId: 'club-1', roomId: 'room-4', quota: 10, reset: 'Bulanan', activeValue: 1, activeUnit: 'Bulan', price: 150000, status: 'Aktif', bundlingValid: true }
  ],
  paket_bundling: [
    { id: 'pkg-bun-1', code: 'BD-0001', name: 'Gym + Pool Bundle', clubs: ['club-1'], holder: 'Single', activeValue: 1, activeUnit: 'Bulan', start: 'Sejak Pembelian', channels: ['POS'], price: 600000, status: 'Aktif', details: [{packageId: 'pkg-mem-1', allocation: 450000}, {packageId: 'pkg-pol-1', allocation: 150000}] }
  ],
  tarif_sewa: [
    { id: 'ts-1', roomId: 'room-5', day: 'Weekday', startTime: '08:00', endTime: '12:00', price: 100000, overtime: 15, status: 'Aktif' }
  ],
  member: [
    { id: 'mem-1', code: 'MBR-0001', name: 'Budi Santoso', phone: '081234567', balances: [{ transactionId: 'trx-1', type: 'Paket Membership', name: 'Unlimited Monthly', qty: 'Unlimited', expiry: '2026-12-31' }, { transactionId: 'trx-1', type: 'Paket Pool', name: 'Pool Access 10x', qty: 10, expiry: '2026-12-31' }] }
  ],
  transaksi: [
    { id: 'trx-1', code: 'TRX-0001', date: new Date().toISOString(), member: 'mem-1', details: [{ packageId: 'pkg-bun-1', qty: 1, total: 600000 }], total: 600000, paymentScheme: 'PIF', status: 'Berhasil' }
  ],
  booking_sewa: [
    { id: 'book-1', code: 'BOK-0001', date: new Date().toISOString().split("T")[0], startTime: '10:00', endTime: '12:00', roomId: 'room-5', renter: 'Budi Santoso', status: 'Confirmed', players: [{ name: 'Budi Santoso', qrCode: 'QR-BUDI' }, { name: 'Andi', qrCode: 'QR-ANDI' }] }
  ],
  log_akses: [
    { id: 'log-1', time: new Date().toISOString(), member: 'Budi Santoso', roomId: 'room-1', deviceId: 'DEV-0001', method: 'QR', direction: 'Masuk', result: 'Buka', cut: '-', staff: '-' }
  ]
};

export function seed() {
  for (const [name, data] of Object.entries(seedData)) {
    const key = STORAGE[name];
    const existing = localStorage.getItem(key);
    if (existing === null || existing === '[]') write(key, data);
  }
}
