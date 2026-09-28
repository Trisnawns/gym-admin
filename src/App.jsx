import React, { useEffect, useMemo, useRef, useState } from 'react';
import { 
  Activity, Briefcase, Check, ChevronLeft, ChevronRight, DoorOpen, 
  Eye, Filter, Plus, Search, SlidersHorizontal, Trash2, X, Pencil, Cpu, 
  Package as PackageIcon, Dumbbell, Clock, FileText, Layers,
  ShoppingCart, Users, CalendarCheck, QrCode
} from 'lucide-react';
import { read, write, STORAGE, seed, uid, nextCode } from './services/storage';
import MultiSelect from './components/MultiSelect.jsx';

// Auto-migrate old room codes in browser localStorage
(function migrateOldCodes() {
  try {
    const rooms = JSON.parse(localStorage.getItem('gym_master_ruangan') || '[]');
    let modified = false;
    const updated = rooms.map(r => {
      if (r.code && !r.code.startsWith('RNG-')) {
        modified = true;
        const numMatch = r.code.match(/\d+/);
        const num = numMatch ? String(numMatch[0]).padStart(4, '0') : '0000';
        return { ...r, code: `RNG-${num}` };
      }
      return r;
    });
    if (modified) localStorage.setItem('gym_master_ruangan', JSON.stringify(updated));

    // Auto-migrate old unit bisnis codes in browser localStorage
    let units = JSON.parse(localStorage.getItem('gym_master_unit_bisnis') || '[]');
    let unitModified = false;
    const unitUpdated = units.map(u => {
      if (u.code && !u.code.match(/^UB-\d{4}$/)) {
        unitModified = true;
        const numMatch = u.code.match(/\d+/);
        const num = numMatch ? String(numMatch[0]).padStart(4, '0') : '0000';
        return { ...u, code: `UB-${num}` };
      }
      return u;
    });
    if (unitModified) {
      localStorage.setItem('gym_master_unit_bisnis', JSON.stringify(unitUpdated));
    }

    // Auto-migrate old device codes in browser localStorage
    let devices = JSON.parse(localStorage.getItem('gym_master_device') || '[]');
    let devModified = false;
    const devUpdated = devices.map(d => {
      if (d.code && d.code.startsWith('D-') && !d.code.startsWith('DEV-')) {
        devModified = true;
        const numMatch = d.code.match(/\d+/);
        const num = numMatch ? String(numMatch[0]).padStart(4, '0') : '0000';
        return { ...d, code: `DEV-${num}` };
      }
      return d;
    });
    if (devModified) {
      devices = devUpdated;
      localStorage.setItem('gym_master_device', JSON.stringify(devUpdated));
    }
    if (devices.length <= 1) {
      const dummyDevices = [
        { id: 'dev-2', code: 'DEV-0002', name: 'Pintu Recovery', type: 'Sliding door', model: 'SD-100', clubId: 'club-1', roomId: 'room-2', status: 'Aktif', connection: 'Online', readers: [{ id: 'rdr-2', name: 'Scanner Face ID', method: 'Face ID', direction: 'Masuk', sn: 'SN-002' }] },
        { id: 'dev-3', code: 'DEV-0003', name: 'Pintu Loker VIP', type: 'Excel Door', model: 'EDL-200', clubId: 'club-2', roomId: 'room-2', status: 'Aktif', connection: 'Offline', readers: [{ id: 'rdr-3', name: 'Scanner Gelang', method: 'QR', direction: 'Masuk', sn: 'SN-003' }] }
      ];
      const newDevices = dummyDevices.filter(d => !devices.some(existing => existing.id === d.id));
      if (newDevices.length > 0) {
        localStorage.setItem('gym_master_device', JSON.stringify([...devices, ...newDevices]));
      }
    }
    
    // Inject dummy booking & log_akses for Case Standby testing
    let bookings = JSON.parse(localStorage.getItem('gym_booking_sewa') || '[]');
    if (bookings.length === 0) {
      localStorage.setItem('gym_booking_sewa', JSON.stringify([
        { id: 'book-test', roomId: 'room-1', date: 'Hari Ini', startTime: '10:00', endTime: '12:00', renter: 'Budi (Test Standby)', status: 'Confirmed' }
      ]));
    }
    
    let logs = JSON.parse(localStorage.getItem('gym_log_akses') || '[]');
    if (logs.length === 0) {
      localStorage.setItem('gym_log_akses', JSON.stringify([
        { id: 'log-test', roomId: 'room-2', memberName: 'Siti (Test Standby)', type: 'Masuk', time: '09:00' }
      ]));
    }
    
  } catch (e) {}
})();

const ACCESS = ['Turnstile', 'Sliding Door', 'Excel Door Lock', 'QR + Wristband', 'Booking + Lampu', 'Manual', 'Tanpa Gate'];
const STATUS = ['Aktif', 'Nonaktif'];
const DEVICE_TYPE = ['Turnstile', 'Sliding door', 'Excel Door'];
const DEVICE_STATUS = ['Aktif', 'Nonaktif', 'Maintenance'];

const SCHEMA = {
  ruangan: {
    title: 'Ruangan', icon: DoorOpen, prefix: 'RNG',
    columns: [['code', 'Kode Ruangan'], ['name', 'Nama Ruangan'], ['clubId', 'Club'], ['access', 'Mekanisme Akses'], ['capacity', 'Kapasitas'], ['groupAccess', 'Satu Akses Rombongan'], ['staffActivation', 'Perlu Aktivasi Staf'], ['status', 'Status']],
    filter: [['code', 'Kode Ruangan'], ['name', 'Nama Ruangan'], ['clubId', 'Club'], ['status', 'Status']]
  },
  device: {
    title: 'Device', icon: Cpu, prefix: 'DEV',
    columns: [['code', 'Kode Device'], ['name', 'Nama Device'], ['type', 'Jenis Device'], ['model', 'Merk/Model'], ['clubId', 'Club'], ['roomId', 'Ruangan'], ['status', 'Status'], ['connection', 'Koneksi']],
    filter: [['code', 'Kode Device'], ['name', 'Nama Device'], ['type', 'Jenis Device'], ['model', 'Merk/Model'], ['clubId', 'Club'], ['roomId', 'Ruangan'], ['status', 'Status'], ['connection', 'Koneksi']]
  },
  unit: {
    title: 'Unit Bisnis', icon: Briefcase, prefix: 'UB',
    columns: [['code', 'Kode Unit Bisnis'], ['name', 'Nama Unit Bisnis'], ['status', 'Status']],
    filter: [['code', 'Kode Unit Bisnis'], ['name', 'Nama Unit Bisnis'], ['status', 'Status']]
  },
  paket_membership: {
    title: 'Membership', icon: PackageIcon, prefix: 'MB',
    columns: [['code', 'Kode'], ['name', 'Nama Paket'], ['clubId', 'Club'], ['price', 'Harga'], ['activeValue', 'Masa Aktif'], ['status', 'Status']],
    filter: [['code', 'Kode'], ['name', 'Nama'], ['clubId', 'Club'], ['status', 'Status']]
  },
  paket_kelas: {
    title: 'Paket Kelas', icon: PackageIcon, prefix: 'PK',
    columns: [['code', 'Kode'], ['name', 'Nama Paket'], ['type', 'Tipe Paket'], ['quota', 'Kuota Sesi'], ['price', 'Harga'], ['status', 'Status']],
    filter: [['code', 'Kode'], ['name', 'Nama'], ['type', 'Tipe Paket'], ['status', 'Status']]
  },
  paket_trainer: {
    title: 'Paket Trainer', icon: PackageIcon, prefix: 'PT',
    columns: [['code', 'Kode'], ['name', 'Nama Paket'], ['unitId', 'Unit Bisnis'], ['sessionType', 'Tipe Sesi'], ['trainer', 'Trainer'], ['session', 'Total Sesi'], ['price', 'Harga Base'], ['status', 'Status']],
    filter: [['code', 'Kode'], ['name', 'Nama Paket'], ['unitId', 'Unit Bisnis'], ['sessionType', 'Tipe Sesi'], ['trainer', 'Trainer'], ['status', 'Status']]
  },
  paket_recovery: {
    title: 'Paket Recovery', icon: PackageIcon, prefix: 'PR',
    columns: [['code', 'Kode'], ['name', 'Nama Paket'], ['clubId', 'Club'], ['recoveryType', 'Jenis'], ['roomId', 'Ruangan'], ['quota', 'Kuota Sesi'], ['activeValue', 'Masa Aktif'], ['price', 'Harga'], ['status', 'Status']],
    filter: [['code', 'Kode'], ['name', 'Nama'], ['clubId', 'Club'], ['recoveryType', 'Jenis'], ['status', 'Status']]
  },
  paket_pool: {
    title: 'Paket Pool', icon: PackageIcon, prefix: 'PL',
    columns: [['code', 'Kode'], ['name', 'Nama Paket'], ['clubId', 'Club'], ['roomId', 'Ruangan'], ['quota', 'Kuota Sesi'], ['reset', 'Reset'], ['activeValue', 'Masa Aktif'], ['price', 'Harga'], ['status', 'Status']],
    filter: [['code', 'Kode'], ['name', 'Nama'], ['clubId', 'Club'], ['status', 'Status']]
  },
  paket_bundling: {
    title: 'Bundling', icon: Layers, prefix: 'BD',
    columns: [['code', 'Kode Bundling'], ['name', 'Nama'], ['clubs', 'Club'], ['components', 'Isi Komponen'], ['holder', 'Tipe Pemegang'], ['price', 'Harga'], ['activeValue', 'Masa Aktif'], ['status', 'Status']],
    filter: [['name', 'Nama'], ['clubs', 'Club'], ['components', 'Komponen'], ['holder', 'Tipe Pemegang'], ['priceRange', 'Rentang Harga'], ['status', 'Status']]
  },
  tarif_sewa: {
    title: 'Tarif Sewa', icon: Clock, prefix: 'SW',
    columns: [['roomId', 'Fasilitas'], ['day', 'Hari'], ['timeRange', 'Jam'], ['price', 'Tarif/Jam'], ['overtime', 'Toleransi'], ['status', 'Status']],
    filter: [['roomId', 'Fasilitas'], ['day', 'Hari'], ['status', 'Status']]
  },
  log_akses: {
    title: 'Log Akses', icon: FileText, prefix: 'LOG',
    columns: [['time', 'Waktu'], ['member', 'Member/Staf'], ['roomId', 'Ruangan'], ['deviceId', 'Device'], ['method', 'Metode'], ['direction', 'Arah'], ['result', 'Hasil'], ['cut', 'Sesi Dipotong'], ['staff', 'Staf Pengaktif']],
    filter: [['member', 'Member'], ['roomId', 'Ruangan']]
  },
  transaksi: {
    title: 'Transaksi POS', icon: ShoppingCart, prefix: 'TRX',
    columns: [['code', 'No. Transaksi'], ['date', 'Tanggal'], ['member', 'Member'], ['items', 'Produk'], ['total', 'Total'], ['paymentScheme', 'Skema Bayar'], ['status', 'Status']],
    filter: [['code', 'No. Transaksi'], ['member', 'Member'], ['status', 'Status']]
  },
  member: {
    title: 'Data & Saldo Member', icon: Users, prefix: 'MBR',
    columns: [['code', 'ID Member'], ['name', 'Nama Lengkap'], ['phone', 'Telepon'], ['activeBalances', 'Total Saldo Aktif']],
    filter: [['code', 'ID Member'], ['name', 'Nama'], ['phone', 'Telepon']]
  },
  booking_sewa: {
    title: 'Booking Sewa', icon: CalendarCheck, prefix: 'BOK',
    columns: [['code', 'No. Booking'], ['date', 'Tanggal'], ['time', 'Jam'], ['roomId', 'Fasilitas'], ['renter', 'Penyewa'], ['playersCount', 'Jml Pemain'], ['status', 'Status']],
    filter: [['date', 'Tanggal'], ['roomId', 'Fasilitas'], ['renter', 'Penyewa'], ['status', 'Status']]
  }
};

const ALL = (m, k) => read(STORAGE[m] || STORAGE[k]);

const text = (obj, k) => {
  if (k === 'clubId' || k === 'clubs') {
    const clubs = ALL('club');
    return (Array.isArray(obj[k]) ? obj[k] : [obj[k]]).map(id => clubs.find(c => c.id === id)?.name || '').filter(Boolean).join(', ');
  }
  if (k === 'roomId') return ALL('ruangan').find(x => x.id === obj[k])?.name || '';
  if (k === 'access') return (obj.access || []).map(a => `[${a}]`).join(' ');
  if (k === 'price' || k === 'total') return `Rp ${Number(obj[k] || 0).toLocaleString('id-ID')}`;
  if (k === 'activeValue') return `${obj.activeValue || ''} ${obj.activeUnit || ''}`;
  if (k === 'groupAccess' || k === 'staffActivation') return obj[k] ? 'Ya' : 'Tidak';
  if (k === 'components') {
    const allPkg = [...ALL('paket_membership'), ...ALL('paket_kelas'), ...ALL('paket_trainer'), ...ALL('paket_recovery'), ...ALL('paket_pool')];
    const names = (obj.details || []).map(d => allPkg.find(x => x.id === d.packageId)?.name || 'Unknown');
    return names.length > 2 ? `${names[0]}, ${names[1]} +${names.length - 2}` : (names.join(', ') || '—');
  }
  if (k === 'member') {
    const mem = ALL('member').find(m => m.id === obj[k]);
    return mem ? mem.name : (obj[k] || '—');
  }
  if (k === 'items') {
    const allPkg = [
      ...ALL('paket_bundling'), ...ALL('paket_membership'), ...ALL('paket_kelas'),
      ...ALL('paket_trainer'), ...ALL('paket_recovery'), ...ALL('paket_pool')
    ];
    const names = (obj.details || []).map(d => allPkg.find(x => x.id === d.packageId)?.name).filter(Boolean);
    if (!names.length) return '—';
    return names.length > 2 ? `${names[0]}, ${names[1]} +${names.length - 2}` : names.join(', ');
  }
  if (k === 'timeRange') {
    const label = obj.peakLabel ? `[${obj.peakLabel}] ` : '';
    if (obj.startTime && obj.endTime) return `${label}${obj.startTime} - ${obj.endTime}`;
    return obj.timeRange || '—';
  }
  if (k === 'overtime') {
    return obj.overtime !== undefined && obj.overtime !== '' ? `${obj.overtime} Menit` : '—';
  }
  if (k === 'activeBalances') return obj.balances ? `${obj.balances.length} Sesi/Paket Aktif` : '0 Paket';
  if (k === 'playersCount') return obj.players ? `${obj.players.length} Orang` : '0 Orang';
  if (k === 'time') return `${obj.startTime || '00:00'} - ${obj.endTime || '00:00'}`;
  return obj[k] ?? '';
};

function ChipOverflow({ items, max = 2 }) {
  const [open, setOpen] = useState(false);
  if (!items || items.length === 0) return <span style={{color:'#9CA3AF'}}>—</span>;
  const visible = open ? items : items.slice(0, max);
  const rest = items.length - max;
  return (
    <div className="chip-col">
      {visible.map(a => (
        <span className="chip chip-row" key={a}>{a}</span>
      ))}
      {!open && rest > 0 && (
        <button className="chip-expand-btn" onClick={() => setOpen(true)}>
          ...+{rest} lainnya
        </button>
      )}
      {open && rest > 0 && (
        <button className="chip-expand-btn" onClick={() => setOpen(false)}>
          Sembunyikan
        </button>
      )}
    </div>
  );
}

function DataTable({ columns, rows, onSort, sort, actions, moduleKey }) {
  return (
    <div className="table-scroll">
      <table>
        <thead>
          <tr>
            <th className="action-head" style={{ width: '1%', whiteSpace: 'nowrap' }}>Aksi</th>
            {columns.map(([key, label]) => (
              <th key={key}>
                <div className="th-wrap">
                  <span>{label}</span>
                  <div className="sort-arrows">
                    <button className={sort.key === key && sort.dir === 1 ? 'active' : ''} onClick={() => onSort(key, 1)}>▲</button>
                    <button className={sort.key === key && sort.dir === -1 ? 'active' : ''} onClick={() => onSort(key, -1)}>▼</button>
                  </div>
                </div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map(row => (
            <tr key={row.id}>
              <td className="action-cell">
                <div className="action-list">
                  <button title="View" className="view-action" onClick={() => actions.view(row)}><Eye size={15} /></button>
                  {moduleKey !== 'log_akses' && <button title="Edit" className="edit-action" onClick={() => actions.edit(row)}><Pencil size={15} /></button>}
                  {moduleKey !== 'log_akses' && <button title="Delete" className="delete-action" onClick={() => actions.remove(row)}><Trash2 size={15} /></button>}
                </div>
              </td>
              {columns.map(([key]) => (
                <td key={key}>
                  {key === 'status' ? <span className={`badge ${row.status === 'Aktif' || row.status === 'Confirmed' || row.status === 'Berhasil' ? 'green' : row.status === 'Pending' ? 'muted' : 'red'}`}>{row.status}</span>
                  : key === 'connection' ? <span className={`badge ${row.connection === 'Online' ? 'green' : 'red'}`}>{row.connection}</span>
                  : key === 'access' ? <ChipOverflow items={row.access} max={2} />
                  : <span className={key === 'code' ? 'code' : ''}>{text(row, key) || '—'}</span>}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      {!rows.length && (
        <div className="empty">
          <Activity size={27} />
          <b>Tidak ada data ditemukan</b>
        </div>
      )}
    </div>
  );
}

function App() {
  const [tab, setTab] = useState('ruangan');
  const [rows, setRows] = useState([]);
  const [query, setQuery] = useState('');
  const [filters, setFilters] = useState({});
  const [pending, setPending] = useState({});
  const [filterOpen, setFilterOpen] = useState(false);
  const [sort, setSort] = useState({ key: 'code', dir: 1 });
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(10);
  const [editor, setEditor] = useState(null);
  const [modal, setModal] = useState(null);
  const [toast, setToast] = useState('');

  useEffect(() => { seed(); load(); }, []);
  useEffect(() => { load(); setPage(1); setQuery(''); setFilters({}); setPending({}); setSort({ key: SCHEMA[tab].columns.some(([k]) => k === 'code') ? 'code' : SCHEMA[tab].columns[0][0], dir: 1 }); }, [tab]);

  const load = () => setRows(read(STORAGE[tab]));
  const tell = (msg) => {
    setToast(msg);
    window.clearTimeout(window.__toast);
    window.__toast = window.setTimeout(() => setToast(''), 4200);
  };

  const module = SCHEMA[tab];
  const filtered = useMemo(() => {
    let list = [...rows].filter(item => module.columns.some(([key]) => String(text(item, key)).toLowerCase().includes(query.toLowerCase())));
    list = list.filter(item => Object.entries(filters).every(([key, value]) => {
      if (!value) return true;
      if (key === 'access') return (item.access || []).some(a => a === value);
      if (key === 'clubId') return item.clubId === value;
      if (key === 'clubs') return (item.clubs || []).includes(value);
      if (key === 'roomId') return item.roomId === value;
      if (key === 'type') return item.type === value;
      if (key === 'sessionType') return item.sessionType === value;
      if (key === 'recoveryType') return item.recoveryType === value;
      if (key === 'holder') return item.holder === value;
      if (key === 'components') return (item.details || []).some(d => d.packageId === value);
      if (key === 'priceRange') {
        const p = Number(item.price || 0);
        if (value === '0-500k') return p <= 500000;
        if (value === '500k-1m') return p > 500000 && p <= 1000000;
        if (value === '1m-3m') return p > 1000000 && p <= 3000000;
        if (value === '>3m') return p > 3000000;
        return true;
      }
      if (key === 'day') return item.day === value;
      if (key === 'status') return item.status === value;
      return String(text(item, key)).toLowerCase().includes(value.toLowerCase());
    }));
    list.sort((a, b) => String(text(a, sort.key)).localeCompare(String(text(b, sort.key)), 'id', { numeric: true, sensitivity: 'base' }) * sort.dir);
    return list;
  }, [rows, query, filters, sort, tab]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / perPage));
  const shown = filtered.slice((page - 1) * perPage, page * perPage);

  const launch = (item) => setEditor({ item: item ? structuredClone(item) : newItem(tab) });

  function newItem(key) {
    if (key === 'device') {
      return { id: '', access: [], clubs: [], details: [], readers: [], sold: 0, activeMembers: 0 };
    }
    const base = {
      id: '', status: 'Aktif', connection: 'Offline', access: [], clubs: [], details: [], readers: [],
      sold: 0, activeMembers: 0
    };
    if (key === 'paket_membership') {
      return { ...base, roomIds: [], groupClassAccess: 'Tidak Termasuk', isActive: true, activeUnit: 'Bulan', activeValue: 1, bundlingValid: false };
    }
    if (key === 'paket_kelas') {
      return { ...base, type: 'Reguler', classScope: 'Semua Kelas Group', specificClasses: [], activeUnit: 'Hari', activeValue: 30, bundlingValid: true };
    }
    if (key === 'paket_trainer') {
      return { ...base, sessionType: 'Private', activeUnit: 'Bulan', activeValue: 1, tiers: [], bundlingValid: false };
    }
    if (key === 'paket_recovery') {
      return { ...base, reset: '', activeUnit: 'Hari', activeValue: 30, bundlingValid: false };
    }
    if (key === 'paket_pool') {
      return { ...base, reset: '', activeUnit: 'Bulan', activeValue: 1, bundlingValid: false };
    }
    if (key === 'paket_bundling') {
      return { ...base, holder: '', priceUnit: 'Per Paket', start: '', activeUnit: '', activeValue: '', kanalPOS: true, details: [] };
    }
    if (key === 'tarif_sewa') {
      return { ...base, day: 'Senin-Minggu', peakLabel: 'Peak', overtime: 15 };
    }
    if (key === 'booking_sewa') {
      return { ...base, status: 'Confirmed', players: [], approvalTier: '' };
    }
    if (key === 'transaksi') {
      return { ...base, date: new Date().toISOString().split('T')[0], paymentScheme: 'PIF', status: 'Berhasil', details: [] };
    }
    return base;
  }

  function save(item) {
    let values = read(STORAGE[tab]);
    
    if (tab === 'ruangan') {
      if (!item.name || !item.clubId || !item.access?.length) return tell('Nama Ruangan, Club, dan Akses wajib diisi.');
      if (item.groupAccess && !item.maxGuest) return tell('Maks Tamu wajib diisi jika Satu Akses Rombongan dicentang.');
      
      const existing = values.find(x => x.id === item.id);
      if (existing && existing.status === 'Aktif' && item.status === 'Nonaktif') {
        const ongoingBooking = ALL('booking_sewa').find(x => x.roomId === item.id && x.status === 'Confirmed');
        if (ongoingBooking) {
          return setModal({
            type: 'confirm',
            message: `Ruangan sedang dipakai jadwal yang sedang berjalan. Tidak dapat dinonaktifkan.`,
            confirm: () => setModal(null)
          });
        }
        
        // Cek log akses untuk melihat apakah ada member yang belum check-out
        const logs = ALL('log_akses').filter(x => x.roomId === item.id);
        const inside = logs.filter(l => l.type === 'Masuk').length > logs.filter(l => l.type === 'Keluar').length;
        if (inside) {
          return tell('Masih ada member di dalam ruangan (check-in tanpa check-out). Tidak dapat dinonaktifkan.');
        }
      }
    }
    
    if (tab === 'device') {
      if (!item.name || !item.type || !item.clubId || !item.roomId || !item.status || !item.connection) return tell('Semua field ber-bintang (*) pada Header Device wajib diisi.');
      for (const r of item.readers || []) {
        if (!r.name || !r.method || !r.direction || !r.model || !r.sn || !r.mode) return tell('Semua field ber-bintang (*) pada Reader harus diisi.');
        if (r.mac && !/^([0-9A-F]{2}:){5}[0-9A-F]{2}$/i.test(r.mac)) return tell('Format MAC Address salah (XX:XX:XX:XX:XX:XX).');
        const duplicate = values.filter(x => x.id !== item.id).flatMap(d => (d.readers || []).map(rd => ({...rd, deviceName: d.name}))).find(rd => (rd.sn||'').toLowerCase().trim() === (r.sn||'').toLowerCase().trim());
        if (duplicate) return tell(`Serial Number sudah terdaftar pada ${duplicate.name} - ${duplicate.deviceName}`);
        const dupInForm = (item.readers || []).find(x => x.id !== r.id && (x.sn||'').toLowerCase().trim() === (r.sn||'').toLowerCase().trim());
        if (dupInForm) return tell(`Serial Number sudah terdaftar pada ${dupInForm.name}`);
      }

      const existing = values.find(x => x.id === item.id);

      if (!item._forceSave) {
        // Case Standby 2: Pindah ruangan tanpa maintenance
        if (existing && existing.roomId !== item.roomId && item.status !== 'Maintenance') {
          return tell(`Ubah status ${item.name} menjadi maintenance sebelum memindahkan ke ruangan lain`);
        }

        // Case Standby 3: Aktifkan device di ruangan nonaktif
        if (item.status === 'Aktif') {
          const r = ALL('ruangan').find(x => x.id === item.roomId);
          if (r && r.status === 'Nonaktif') {
            return tell(`${r.name} berstatus nonaktif, aktifkan ruangan terlebih dahulu`);
          }
        }

        // Case Standby 1: Device dinonaktifkan saat kelas berlangsung
        if (existing && existing.status === 'Aktif' && item.status === 'Nonaktif') {
          const ongoingBooking = ALL('booking_sewa').find(x => x.roomId === item.roomId && x.status === 'Confirmed');
          if (ongoingBooking) {
            return setModal({
              type: 'confirm',
              message: `Jadwal sedang berlangsung di ruangan ini, akses peserta dialihkan ke metode lain (Manual/Staf), lanjutkan?`,
              confirm: () => {
                setModal(null);
                save({ ...item, _forceSave: true });
              }
            });
          }
        }
      }
      // Remove _forceSave before writing so it doesn't pollute DB
      delete item._forceSave;
    }

    if (tab === 'paket_membership') {
      if (!item.name || !item.clubId || !item.roomIds?.length || !item.groupClassAccess || item.price === undefined || item.price === '' || !item.activeValue) {
        return tell('Nama Paket, Club, Ruangan yang Diakses, Akses Kelas Group, Harga, dan Active Period wajib diisi.');
      }
      item.status = item.isActive !== false ? 'Aktif' : 'Nonaktif';
    }

    if (tab === 'paket_kelas') {
      if (!item.name || !item.clubId || !item.type || !item.roomId || !item.classScope || !item.quota || item.price === undefined || item.price === '' || !item.activeValue) {
        return tell('Package Name, Club, Tipe Paket, Ruangan, Cakupan Kelas, Kuota Sesi, Harga, dan Active Period wajib diisi.');
      }
      if (item.classScope === 'Kelas Tertentu' && (!item.specificClasses || !item.specificClasses.length)) {
        return tell('Pilih minimal satu kelas pada Cakupan Kelas Tertentu.');
      }
      item.bundlingValid = (item.type === 'Reguler');
      if (!item.status) item.status = 'Aktif';
    }

    if (tab === 'paket_trainer') {
      if (!item.name || !item.clubId || !item.sessionType || !item.session || item.price === undefined || item.price === '' || !item.activeValue) {
        return tell('Package Name, Club, Tipe Sesi, Total Sesi, Harga Base, dan Active Period wajib diisi.');
      }
      if (['Couple', 'Group'].includes(item.sessionType) && !item.holdersCount) {
        return tell('Jumlah Pemegang Roster wajib diisi untuk tipe Couple / Group.');
      }
      if (!item.status) item.status = 'Aktif';
    }

    if (tab === 'paket_recovery') {
      if (!item.name || !item.clubId || !item.recoveryType || !item.roomId || !item.quota || !item.reset || !item.activeValue || item.price === undefined || item.price === '') {
        return tell('Nama Paket, Club, Jenis Recovery, Ruangan, Kuota Sesi, Reset Kuota, Masa Aktif, dan Harga wajib diisi.');
      }
      if (!item.status) item.status = 'Aktif';
    }

    if (tab === 'paket_pool') {
      if (!item.name || !item.clubId || !item.roomId || !item.quota || !item.reset || !item.activeValue || item.price === undefined || item.price === '') {
        return tell('Nama Paket, Club, Ruangan (Kolam), Kuota Sesi, Reset Kuota, Masa Aktif, dan Harga wajib diisi.');
      }
      if (!item.status) item.status = 'Aktif';
    }

    if (tab === 'paket_bundling') {
      if (!item.name || !item.clubs?.length || !item.holder || !item.activeValue || !item.activeUnit || !item.start || item.price === undefined || item.price === '' || !item.details?.length) {
        return tell('Nama Bundling, Club Berlaku, Tipe Pemegang, Masa Aktif, Satuan, Mulai Aktif, Harga, dan minimal 1 Komponen wajib diisi.');
      }
      if (['Couple', 'Group'].includes(item.holder) && !item.holdersCount) {
        return tell('Jumlah Pemegang wajib diisi untuk Couple / Group.');
      }
      if (!item.kanalPOS && !item.kanalApps && !item.kanalB2B) {
        return tell('Pilih minimal satu Kanal Penjualan (POS / Apps Member / Voucher B2B).');
      }
      if (item.details.some(d => !d.packageId)) {
        return tell('Semua baris komponen wajib memilih paket.');
      }
      const totalAllocation = (item.details || []).reduce((sum, d) => sum + Number(d.allocation || 0), 0);
      if (Math.abs(totalAllocation - Number(item.price)) > 1) {
        return tell(`Total alokasi (Rp ${Number(totalAllocation).toLocaleString('id-ID')}) tidak sama dengan Harga Bundling (Rp ${Number(item.price).toLocaleString('id-ID')})`);
      }
      const allComp = [
        ...ALL('paket_membership'), ...ALL('paket_kelas'),
        ...ALL('paket_trainer'), ...ALL('paket_recovery'), ...ALL('paket_pool')
      ];
      item.details = item.details.map(d => {
        const found = allComp.find(p => p.id === d.packageId);
        return {
          ...d,
          packageName: found?.name || d.packageName || 'Unknown',
          originalPrice: found?.price ?? d.originalPrice ?? 0,
          unitId: found?.unitId || d.unitId || '',
          pkgType: found?.recoveryType || found?.type || found?.sessionType || 'Paket'
        };
      });
      if (!item.status) item.status = 'Aktif';
    }

    if (tab === 'tarif_sewa') {
      if (!item.roomId || !item.day || !item.startTime || !item.endTime || item.price === undefined || item.price === '') {
        return tell('Fasilitas, Hari, Jam Mulai, Jam Selesai, dan Tarif per Jam wajib diisi.');
      }
      if (item.startTime >= item.endTime) {
        return tell('Jam Mulai harus lebih awal daripada Jam Selesai.');
      }
      item.timeRange = `${item.peakLabel ? `[${item.peakLabel}] ` : ''}${item.startTime} - ${item.endTime}`;
      if (!item.status) item.status = 'Aktif';
    }

    if (tab === 'booking_sewa') {
      if (!item.roomId || !item.date || !item.startTime || !item.endTime || !item.renter) {
        return tell('Fasilitas, Tanggal, Jam Mulai, Jam Selesai, dan Nama Penyewa wajib diisi.');
      }
      if (item.startTime >= item.endTime) {
        return tell('Jam Mulai harus lebih awal daripada Jam Selesai.');
      }
      if (item.ayoBookingConflict) {
        return tell('Gagal menyimpan: Slot bentrok dengan jadwal dari Ayo Booking.');
      }
      const allBookings = read(STORAGE['booking_sewa']);
      const collision = allBookings.find(b =>
        b.id !== item.id &&
        b.roomId === item.roomId &&
        b.date === item.date &&
        b.status !== 'Canceled' &&
        (
          (item.startTime >= b.startTime && item.startTime < b.endTime) ||
          (item.endTime > b.startTime && item.endTime <= b.endTime) ||
          (item.startTime <= b.startTime && item.endTime >= b.endTime)
        )
      );
      if (collision) {
        return tell(`Slot bentrok: Fasilitas sudah dibooking pada ${collision.date} (${collision.startTime} - ${collision.endTime}) oleh ${collision.renter}.`);
      }
      if (item.players?.length) {
        item.players = item.players.map((p, idx) => ({
          ...p,
          id: p.id || uid(),
          qrCode: p.qrCode || `QR-${(p.name || `P${idx + 1}`).toUpperCase().replace(/[^A-Z0-9]/g, '')}-${uid().slice(0, 4)}`
        }));
      }
      if (!item.status) item.status = 'Confirmed';
    }

    if (tab === 'transaksi') {
      if (!item.date || !item.member || !item.paymentScheme || !item.details?.length) {
        return tell('Tanggal, Member, Skema Bayar, dan Keranjang Produk wajib diisi.');
      }
      if (item.details.some(d => !d.packageId)) {
        return tell('Semua item di keranjang belanja harus memilih produk.');
      }
    }

    const existing = values.find(x => x.id === item.id);
    let isNew = !existing;
    if (isNew) {
      item = { ...item, id: uid(), code: nextCode(module.prefix, values) };
    }

    if (tab === 'transaksi' && item.status === 'Berhasil' && !item.balancesProcessed) {
      const allPkg = [
        ...ALL('paket_bundling').map(x => ({...x, _type: 'Bundling'})),
        ...ALL('paket_membership').map(x => ({...x, _type: 'Paket Membership'})),
        ...ALL('paket_kelas').map(x => ({...x, _type: 'Paket Kelas'})),
        ...ALL('paket_trainer').map(x => ({...x, _type: 'Paket Trainer'})),
        ...ALL('paket_recovery').map(x => ({...x, _type: 'Paket Recovery'})),
        ...ALL('paket_pool').map(x => ({...x, _type: 'Paket Pool'}))
      ];
      const members = ALL('member');
      const buyerId = item.member;
      let memberUpdates = {};
      const getPkg = (id) => allPkg.find(x => x.id === id);

      (item.details || []).forEach(d => {
        const pkg = getPkg(d.packageId);
        if (!pkg) return;

        const addBalanceToMember = (memberId, componentPkg, sourceBundlingId = null, roster = null) => {
          if (!memberUpdates[memberId]) {
            memberUpdates[memberId] = members.find(m => m.id === memberId)?.balances || [];
          }
          let expiryDate = new Date();
          const activeVal = componentPkg.activeValue || pkg.activeValue || 30;
          const activeUnit = componentPkg.activeUnit || pkg.activeUnit || 'Hari';
          if (activeUnit === 'Hari') expiryDate.setDate(expiryDate.getDate() + Number(activeVal));
          if (activeUnit === 'Bulan') expiryDate.setMonth(expiryDate.getMonth() + Number(activeVal));

          let qty = componentPkg.quota || componentPkg.session || 1;
          if (componentPkg.isUnlimited) qty = 'Unlimited';

          const newBalance = {
            id: uid(),
            transactionId: item.id,
            packageId: componentPkg.id,
            name: componentPkg.name,
            type: componentPkg._type,
            qty: qty,
            expiry: expiryDate.toISOString().split('T')[0],
            sourceBundling: sourceBundlingId,
            roomId: componentPkg.roomId,
            roomIds: componentPkg.roomIds,
            classScope: componentPkg.classScope,
            specificClasses: componentPkg.specificClasses,
            sessionType: componentPkg.sessionType,
            groupClassAccess: componentPkg.groupClassAccess,
            roster: roster
          };
          memberUpdates[memberId].push(newBalance);
        };

        const isGroup = pkg.holder === 'Couple' || pkg.holder === 'Group' || pkg.sessionType === 'Couple' || pkg.sessionType === 'Group';
        let rosterData = isGroup ? d.roster : [];

        if (pkg._type === 'Bundling') {
           (pkg.details || []).forEach(bd => {
              const compPkg = getPkg(bd.packageId);
              if (compPkg) addBalanceToMember(buyerId, compPkg, pkg.id, rosterData);
           });
        } else {
           addBalanceToMember(buyerId, pkg, null, rosterData);
        }
      });

      let currentMembers = [...members];
      Object.keys(memberUpdates).forEach(mId => {
        const idx = currentMembers.findIndex(m => m.id === mId);
        if (idx > -1) {
          currentMembers[idx] = { ...currentMembers[idx], balances: memberUpdates[mId] };
        }
      });
      write(STORAGE['member'], currentMembers);
      item.balancesProcessed = true;
    }

    if (!isNew) {
      values = values.map(x => x.id === item.id ? item : x);
    } else {
      values = [...values, item];
    }
    write(STORAGE[tab], values);
    setEditor(null);
    setModal(null);
    load();
    tell('Data berhasil disimpan.');
  }

  function remove(item) {
    if (tab === 'ruangan') {
      const devs = ALL('device').filter(d => d.roomId === item.id);
      if (devs.length) return tell(`${item.name} memiliki device terpasang. Hapus device terlebih dahulu.`);
      const pm = ALL('paket_membership').some(x => x.roomIds?.includes(item.id));
      const pk = ALL('paket_kelas').some(x => x.roomId === item.id);
      const pr = ALL('paket_recovery').some(x => x.roomId === item.id);
      const pp = ALL('paket_pool').some(x => x.roomId === item.id);
      const ts = ALL('tarif_sewa').some(x => x.roomId === item.id);
      const bs = ALL('booking_sewa').some(x => x.roomId === item.id);
      if (pm || pk || pr || pp || ts || bs) return tell(`${item.name} masih dipanggil oleh paket/jadwal. Hapus relasinya terlebih dahulu.`);
    }
    if (tab === 'device') {
      if (item.roomId) {
        const roomName = ALL('ruangan').find(x => x.id === item.roomId)?.name || 'Ruangan';
        return tell(`[${item.name}] telah berelasi dengan [${roomName}], device tidak dapat dihapus`);
      }
    }
    if (tab === 'unit') {
      const pm = ALL('paket_membership').find(x => x.unitId === item.id);
      const pt = ALL('paket_trainer').find(x => x.unitId === item.id);
      const relasi = pm || pt;
      if (relasi) return tell(`[${item.name}] telah berelasi dengan [${relasi.name}], unit bisnis tidak dapat dihapus`);
    }
    if (tab.startsWith('paket_')) {
      const hasTransactions = ALL('transaksi').some(t => (t.details || []).some(d => d.packageId === item.id));
      const hasMemberBalances = ALL('member').some(m => (m.balances || []).some(b => b.packageId === item.id || b.sourceBundling === item.id));
      if (item.sold > 0 || hasTransactions || hasMemberBalances) {
        return tell('Paket yang sudah terjual tidak dapat dihapus.');
      }
    }

    setModal({
      type: 'confirm',
      message: `Yakin hapus ${item.name || item.code}?`,
      confirm: () => {
        write(STORAGE[tab], read(STORAGE[tab]).filter(x => x.id !== item.id));
        setModal(null);
        load();
        tell('Data berhasil dihapus.');
      }
    });
  }

  const actions = { view: item => setModal({ type: 'view', item }), edit: launch, remove };

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <span className="brand-mark"><Dumbbell size={19} /></span>
          <span>GYMFLOW<small>MANAGEMENT</small></span>
        </div>
        <div className="nav-caption">MASTER DATA</div>
        <button className={`nav-item ${tab === 'ruangan' ? 'active' : ''}`} onClick={() => setTab('ruangan')}><DoorOpen size={17} /><span>Master Ruangan</span></button>
        <button className={`nav-item ${tab === 'device' ? 'active' : ''}`} onClick={() => setTab('device')}><Cpu size={17} /><span>Master Device</span></button>
        <button className={`nav-item ${tab === 'unit' ? 'active' : ''}`} onClick={() => setTab('unit')}><Briefcase size={17} /><span>Master Unit Bisnis</span></button>
        
        <div className="nav-caption">MASTER PAKET</div>
        <button className={`nav-item ${tab === 'paket_membership' ? 'active' : ''}`} onClick={() => setTab('paket_membership')}><PackageIcon size={17} /><span>Paket Membership</span></button>
        <button className={`nav-item ${tab === 'paket_kelas' ? 'active' : ''}`} onClick={() => setTab('paket_kelas')}><PackageIcon size={17} /><span>Paket Kelas</span></button>
        <button className={`nav-item ${tab === 'paket_trainer' ? 'active' : ''}`} onClick={() => setTab('paket_trainer')}><PackageIcon size={17} /><span>Paket Trainer / Kelas Sesi</span></button>
        <button className={`nav-item ${tab === 'paket_recovery' ? 'active' : ''}`} onClick={() => setTab('paket_recovery')}><PackageIcon size={17} /><span>Paket Recovery</span></button>
        <button className={`nav-item ${tab === 'paket_pool' ? 'active' : ''}`} onClick={() => setTab('paket_pool')}><PackageIcon size={17} /><span>Paket Pool</span></button>
        <button className={`nav-item ${tab === 'paket_bundling' ? 'active' : ''}`} onClick={() => setTab('paket_bundling')}><Layers size={17} /><span>Paket Bundling</span></button>
        
        <div className="nav-caption">SEWA FASILITAS</div>
        <button className={`nav-item ${tab === 'tarif_sewa' ? 'active' : ''}`} onClick={() => setTab('tarif_sewa')}><Clock size={17} /><span>Master Tarif Sewa</span></button>
        <button className={`nav-item ${tab === 'booking_sewa' ? 'active' : ''}`} onClick={() => setTab('booking_sewa')}><CalendarCheck size={17} /><span>Booking Sewa</span></button>

        <div className="nav-caption">TRANSAKSI & OPERASIONAL</div>
        <button className={`nav-item ${tab === 'transaksi' ? 'active' : ''}`} onClick={() => setTab('transaksi')}><ShoppingCart size={17} /><span>Transaksi POS & Saldo</span></button>
        <button className={`nav-item ${tab === 'member' ? 'active' : ''}`} onClick={() => setTab('member')}><Users size={17} /><span>Data Member</span></button>
        
        <div className="nav-caption">REPORTING</div>
        <button className={`nav-item ${tab === 'log_akses' ? 'active' : ''}`} onClick={() => setTab('log_akses')}><FileText size={17} /><span>Log Akses</span></button>
        
        <div className="account">
          <div className="avatar">ZA</div>
          <div><b>Admin Gym</b><small>Administrator</small></div>
        </div>
      </aside>
      
      <main className="main">
        <header className="topbar">
          <div>Workspace <span>/</span> <b>{module.title}</b></div>
        </header>
        <div className="content">
          <div className="page-heading">
            <div>
              <div className="eyebrow">MODUL ADMIN</div>
              <h1>{module.title}</h1>
            </div>
            {tab !== 'log_akses' && (
              <button className="primary" onClick={() => launch()}>
                <Plus size={16} />Tambah {module.title}
              </button>
            )}
            {tab === 'log_akses' && (
              <button className="secondary" onClick={() => tell('File Excel sedang diunduh (Simulasi)')}>
                <FileText size={16} />Export Excel
              </button>
            )}
          </div>
          
          <section className="panel">
            <div className="panel-title-row">
              <div>
                <h2>Daftar {module.title}</h2>
                <p>{filtered.length} data ditemukan</p>
              </div>
              <div className="toolbar">
                <button className={`secondary ${filterOpen ? 'selected' : ''}`} onClick={() => setFilterOpen(!filterOpen)}>
                  <SlidersHorizontal size={15} /> Filter
                </button>
              </div>
            </div>

            <div className="controls-bar">
              <div className="perpage-inline">
                <span>Menampilkan</span>
                <select value={perPage} onChange={e => { setPerPage(Number(e.target.value)); setPage(1); }}>
                  <option value={10}>10</option>
                  <option value={25}>25</option>
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                </select>
                <span>baris</span>
              </div>
              <div className="search-box" style={{flex: 1, maxWidth: '360px'}}>
                <Search size={16} />
                <input value={query} placeholder="Cari nama / data..." onChange={e => { setQuery(e.target.value); setPage(1); }} />
              </div>
            </div>

            {filterOpen && (
              <div className="filter-panel-custom">
                {tab === 'ruangan' ? (
                  <>
                    <label>
                      <span>Nama Ruangan</span>
                      <input placeholder="Cari nama ruangan..." value={pending.name || ''} onChange={e => setPending({ ...pending, name: e.target.value })} />
                    </label>
                    <label>
                      <span>Club</span>
                      <MultiSelect multi={false} value={pending.clubId || ''} options={[['', 'Semua Club'], ...ALL('club').map(c => [c.id, c.name])]} onChange={v => setPending({ ...pending, clubId: v })} />
                    </label>
                    <label>
                      <span>Mekanisme Akses</span>
                      <MultiSelect multi={false} value={pending.access || ''} options={[['', 'Semua Akses'], ...ACCESS.map(a => [a, a])]} onChange={v => setPending({ ...pending, access: v })} />
                    </label>
                    <label>
                      <span>Status</span>
                      <MultiSelect multi={false} value={pending.status || ''} options={[['', 'Semua Status'], ['Aktif', 'Aktif'], ['Nonaktif', 'Nonaktif']]} onChange={v => setPending({ ...pending, status: v })} />
                    </label>
                    <div className="filter-actions">
                      <button className="primary" onClick={() => { setFilters({ ...pending }); setPage(1); }}>
                        <SlidersHorizontal size={14} /> Filter
                      </button>
                      <button className="secondary" onClick={() => { setFilters({}); setPending({}); setQuery(''); setPage(1); }}>
                        Reset
                      </button>
                    </div>
                  </>
                ) : tab === 'device' ? (
                  <>
                    <label>
                      <span>Kode Device</span>
                      <input placeholder="Cari kode..." value={pending.code || ''} onChange={e => setPending({ ...pending, code: e.target.value })} />
                    </label>
                    <label>
                      <span>Nama Device</span>
                      <input placeholder="Cari nama..." value={pending.name || ''} onChange={e => setPending({ ...pending, name: e.target.value })} />
                    </label>
                    <label>
                      <span>Jenis Device</span>
                      <MultiSelect multi={false} value={pending.type || ''} options={[['', 'Semua Jenis'], ...DEVICE_TYPE.map(x => [x, x])]} onChange={v => setPending({ ...pending, type: v })} />
                    </label>
                    <label>
                      <span>Merk/Model</span>
                      <input placeholder="Cari merk..." value={pending.model || ''} onChange={e => setPending({ ...pending, model: e.target.value })} />
                    </label>
                    <label>
                      <span>Club</span>
                      <MultiSelect multi={false} value={pending.clubId || ''} options={[['', 'Semua Club'], ...ALL('club').map(c => [c.id, c.name])]} onChange={v => setPending({ ...pending, clubId: v })} />
                    </label>
                    <label>
                      <span>Ruangan</span>
                      <MultiSelect multi={false} value={pending.roomId || ''} options={[['', 'Semua Ruangan'], ...ALL('ruangan').map(r => [r.id, r.name])]} onChange={v => setPending({ ...pending, roomId: v })} />
                    </label>
                    <label>
                      <span>Status</span>
                      <MultiSelect multi={false} value={pending.status || ''} options={[['', 'Semua Status'], ...DEVICE_STATUS.map(x => [x, x])]} onChange={v => setPending({ ...pending, status: v })} />
                    </label>
                    <label>
                      <span>Status Koneksi</span>
                      <MultiSelect multi={false} value={pending.connection || ''} options={[['', 'Semua Koneksi'], ['Online', 'Online'], ['Offline', 'Offline']]} onChange={v => setPending({ ...pending, connection: v })} />
                    </label>
                    <div className="filter-actions">
                      <button className="primary" onClick={() => { setFilters({ ...pending }); setPage(1); }}>
                        <SlidersHorizontal size={14} /> Filter
                      </button>
                      <button className="secondary" onClick={() => { setFilters({}); setPending({}); setQuery(''); setPage(1); }}>
                        Reset
                      </button>
                    </div>
                  </>
                ) : tab === 'paket_bundling' ? (
                  <>
                    <label><span>Nama</span><input value={pending.name || ''} onChange={e => setPending({ ...pending, name: e.target.value })} /></label>
                    <label><span>Club</span><MultiSelect multi={false} value={pending.clubs || ''} options={[['', 'Semua'], ...ALL('club').map(c => [c.id, c.name])]} onChange={v => setPending({ ...pending, clubs: v })} /></label>
                    <label><span>Komponen</span><MultiSelect multi={false} value={pending.components || ''} options={[['', 'Semua Komponen'], ...[...ALL('paket_membership'), ...ALL('paket_kelas'), ...ALL('paket_trainer'), ...ALL('paket_recovery'), ...ALL('paket_pool')].filter(x => x.status==='Aktif').map(p => [p.id, p.name])]} onChange={v => setPending({ ...pending, components: v })} /></label>
                    <label><span>Tipe Pemegang</span><MultiSelect multi={false} value={pending.holder || ''} options={[['', 'Semua Tipe'], ['Single', 'Single'], ['Couple', 'Couple'], ['Group', 'Group']]} onChange={v => setPending({ ...pending, holder: v })} /></label>
                    <label><span>Rentang Harga</span><MultiSelect multi={false} value={pending.priceRange || ''} options={[['', 'Semua Harga'], ['0-500k', '< Rp 500 Ribu'], ['500k-1m', 'Rp 500rb - 1 Juta'], ['1m-3m', 'Rp 1 Juta - 3 Juta'], ['>3m', '> Rp 3 Juta']]} onChange={v => setPending({ ...pending, priceRange: v })} /></label>
                    <label><span>Status</span><MultiSelect multi={false} value={pending.status || ''} options={[['', 'Semua'], ['Aktif', 'Aktif'], ['Nonaktif', 'Nonaktif']]} onChange={v => setPending({ ...pending, status: v })} /></label>
                    <div className="filter-actions">
                      <button className="primary" onClick={() => { setFilters({ ...pending }); setPage(1); }}><SlidersHorizontal size={14} /> Filter</button>
                      <button className="secondary" onClick={() => { setFilters({}); setPending({}); setQuery(''); setPage(1); }}>Reset</button>
                    </div>
                  </>
                ) : (
                  <>
                    {module.filter.map(([key, label]) => {
                      if (key === 'status') {
                        return (
                          <label key={key}>
                            <span>{label}</span>
                            <MultiSelect multi={false} value={pending[key] || ''} options={[['', 'Semua'], ['Aktif', 'Aktif'], ['Nonaktif', 'Nonaktif']]} onChange={v => setPending({ ...pending, [key]: v })} />
                          </label>
                        );
                      }
                      return (
                        <label key={key}>
                          <span>{label}</span>
                          <input value={pending[key] || ''} onChange={e => setPending({ ...pending, [key]: e.target.value })} />
                        </label>
                      );
                    })}
                    <div className="filter-actions">
                      <button className="primary" onClick={() => { setFilters({ ...pending }); setPage(1); }}><SlidersHorizontal size={14} /> Filter</button>
                      <button className="secondary" onClick={() => { setFilters({}); setPending({}); setQuery(''); setPage(1); }}>Reset</button>
                    </div>
                  </>
                )}
              </div>
            )}

            <DataTable columns={module.columns} rows={shown} sort={sort} onSort={(key, dir) => setSort({ key, dir })} actions={actions} moduleKey={tab} />

            <div className="pagination">
              <span>Menampilkan {filtered.length === 0 ? 0 : (page - 1) * perPage + 1} - {Math.min(page * perPage, filtered.length)} dari <b>{filtered.length}</b> data</span>
              <div>
                <button disabled={page === 1} onClick={() => setPage(page - 1)}><ChevronLeft size={14} /></button>
                <span><b>{page}</b> / {pageCount}</span>
                <button disabled={page === pageCount} onClick={() => setPage(page + 1)}><ChevronRight size={14} /></button>
              </div>
            </div>
          </section>
        </div>
      </main>
      
      {editor && <Editor module={tab} item={editor.item} onClose={() => setEditor(null)} onSave={save} tell={tell} setModal={setModal} />}
      {modal && <Modal value={modal} module={tab} close={() => setModal(null)} tell={tell} load={load} />}
      {toast && <div className="toast">{toast}</div>}
    </div>
  );
}

function Editor({ module: m, item, onClose, onSave, tell, setModal }) {
  const [v, setV] = useState(item);
  const upd = (key, val) => setV(old => ({ ...old, [key]: val }));
  
  const clubs = ALL('club');
  const units = ALL('unit');
  const rooms = ALL('ruangan');
  const staff = ALL('pegawai');
  
  const field = (key, label, type = 'text', options = [], required = false, disabled = false, spanTwo = false) => {
    let finalOptions = options;
    if (type === 'select' && options.length && options[0][0] !== '') {
      finalOptions = [['', 'Pilih...'], ...options];
    }
    return (
      <label key={key} className={spanTwo ? 'span-two' : ''}>
        <span className="field-label">{label}{required && <i className="req-star"> *</i>}</span>
        {type === 'select' ? (
          <MultiSelect disabled={disabled} value={v[key] ?? ''} options={finalOptions} onChange={value => upd(key, value)} multi={false} />
        ) : type === 'multi' ? (
          <MultiSelect disabled={disabled} value={v[key] || []} options={options} onChange={value => upd(key, value)} multi={true} />
        ) : type === 'check' ? (
          <span className="check-field">
            <input disabled={disabled} type="checkbox" checked={!!v[key]} onChange={e => upd(key, e.target.checked)} />
            {label}
          </span>
        ) : type === 'textarea' ? (
          <textarea disabled={disabled} value={v[key] || ''} onChange={e => upd(key, e.target.value)} />
        ) : type === 'currency' ? (
          <div className="currency-wrapper">
            <span className="prefix">Rp</span>
            <input 
              disabled={disabled} 
              type="text" 
              value={v[key] ? v[key].toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".") : ''} 
              onChange={e => {
                const raw = e.target.value.replace(/\D/g, '');
                upd(key, raw ? Number(raw) : '');
              }} 
            />
          </div>
        ) : (
          <input disabled={disabled} type={type === 'number' ? 'number' : type === 'date' ? 'date' : type === 'time' ? 'time' : 'text'} value={v[key] ?? ''} onChange={e => upd(key, e.target.value)} />
        )}
      </label>
    );
  };

  const submit = (e) => { e.preventDefault(); onSave(v); };

  let body;

  if (m === 'ruangan') {
    let roomInUse = false;
    if (item?.id) {
      const pm = ALL('paket_membership').some(x => x.roomIds?.includes(item.id));
      const pk = ALL('paket_kelas').some(x => x.roomId === item.id);
      const pr = ALL('paket_recovery').some(x => x.roomId === item.id);
      const pp = ALL('paket_pool').some(x => x.roomId === item.id);
      const ts = ALL('tarif_sewa').some(x => x.roomId === item.id);
      const bs = ALL('booking_sewa').some(x => x.roomId === item.id);
      roomInUse = pm || pk || pr || pp || ts || bs;
    }

    body = (
      <div className="form-grid">
        {field('name', 'Nama Ruangan', 'text', [], true)}
        {field('clubId', 'Club', 'select', clubs.map(c => [c.id, c.name]), true, roomInUse)}
        {field('access', 'Mekanisme Akses', 'multi', ACCESS.map(a => [a, a]), true)}
        {field('capacity', 'Kapasitas (Orang)', 'number')}
        
        {v.access?.includes('Excel Door Lock') && (
          <div className="span-two form-grid" style={{gap: '14px 17px', margin: 0}}>
            {field('groupAccess', 'Satu Akses Rombongan', 'check')}
            {v.groupAccess ? field('maxGuest', 'Maks Tamu', 'number') : <div></div>}
          </div>
        )}

        <div className="span-two form-grid" style={{gap: '14px 17px', margin: 0}}>
          {field('staffActivation', 'Perlu Aktivasi Staf', 'check')}
          {v.staffActivation ? field('picIds', 'PIC Aktivasi (Role)', 'multi', staff.map(s => [s.id, s.name])) : <div></div>}
        </div>

        {field('description', 'Deskripsi', 'textarea', [], false, false, true)}
        {item.id && (
          <label className="span-two">
            <span className="field-label">Status Ruangan</span>
            <span className="check-field">
              <input type="checkbox" checked={v.status === 'Nonaktif'} onChange={e => upd('status', e.target.checked ? 'Nonaktif' : 'Aktif')} />
              Nonaktifkan Ruangan
            </span>
          </label>
        )}
      </div>
    );
  } else if (m === 'device') {
    body = (
      <>
        <div className="form-grid">
          {field('name', 'Nama Device', 'text', [], true)}
          {field('type', 'Jenis Device', 'select', [['', 'Pilih...'], ...DEVICE_TYPE.map(x => [x, x])], true)}
          {field('model', 'Merk/Model')}
          {field('clubId', 'Club', 'select', [['', 'Pilih...'], ...clubs.map(c => [c.id, c.name])], true)}
          {field('roomId', 'Ruangan', 'select', [['', 'Pilih...'], ...rooms.map(r => [r.id, r.name])], true)}
          {field('status', 'Status', 'select', [['', 'Pilih...'], ...DEVICE_STATUS.map(x => [x, x])], true)}
          {field('connection', 'Status Koneksi', 'select', [['', 'Pilih...'], ['Online', 'Online'], ['Offline', 'Offline']], true)}
        </div>
        <div className="sub-heading">
          <h3>Reader</h3>
          <button type="button" className="secondary" onClick={() => upd('readers', [...(v.readers||[]), { id: uid(), name: '', method: '', direction: '', mode: '' }])}><Plus size={14} />Tambah Reader</button>
        </div>
        {(v.readers || []).map((r, i) => (
          <div className="reader-block" key={r.id}>
            <div className="reader-title">
              <b>Reader {i+1}</b>
              <button type="button" className="delete-action" onClick={() => upd('readers', v.readers.filter((_, idx) => idx !== i))}><Trash2 size={15} /></button>
            </div>
            <div className="form-grid compact">
              <label>Nama Reader * <input value={r.name||''} onChange={e => { const n=[...v.readers]; n[i].name=e.target.value; upd('readers', n); }}/></label>
              <label>Metode * <select value={r.method || ''} onChange={e => { const n=[...v.readers]; n[i].method=e.target.value; upd('readers', n); }}><option value="">Pilih...</option><option value="QR">QR</option><option value="Face ID">Face ID</option></select></label>
              <label>Arah * <select value={r.direction || ''} onChange={e => { const n=[...v.readers]; n[i].direction=e.target.value; upd('readers', n); }}><option value="">Pilih...</option><option value="Masuk">Masuk</option><option value="Keluar">Keluar</option></select></label>
              <label>Merk/Model * <input value={r.model||''} onChange={e => { const n=[...v.readers]; n[i].model=e.target.value; upd('readers', n); }}/></label>
              <label>SN * <input value={r.sn||''} onChange={e => { const n=[...v.readers]; n[i].sn=e.target.value; upd('readers', n); }} onBlur={e => {
                const val = e.target.value.toLowerCase().trim();
                if (!val) return;
                const devices = JSON.parse(localStorage.getItem('gym_master_device') || '[]');
                const duplicate = devices.filter(x => x.id !== v.id).flatMap(d => (d.readers || []).map(rd => ({...rd, deviceName: d.name}))).find(rd => (rd.sn||'').toLowerCase().trim() === val);
                if (duplicate) tell(`Serial Number sudah terdaftar pada ${duplicate.name} - ${duplicate.deviceName}`);
                else {
                  const dupInForm = (v.readers || []).find(x => x.id !== r.id && (x.sn||'').toLowerCase().trim() === val);
                  if (dupInForm) tell(`Serial Number sudah terdaftar pada ${dupInForm.name}`);
                }
              }}/></label>
              
              <label className="span-two">
                <span className="field-label">Mode Koneksi *</span>
                <div className="check-field" style={{gap: '15px', marginTop: '6px'}}>
                  <label style={{display: 'flex', gap: '5px', fontWeight: 'normal', flexDirection: 'row', alignItems: 'center', margin: 0}}>
                    <input type="checkbox" style={{margin: 0, width: 'auto'}} checked={r.mode === 'Via Controller'} onChange={() => { const n=[...v.readers]; n[i].mode='Via Controller'; upd('readers', n); }} /> Via Controller
                  </label>
                  <label style={{display: 'flex', gap: '5px', fontWeight: 'normal', flexDirection: 'row', alignItems: 'center', margin: 0}}>
                    <input type="checkbox" style={{margin: 0, width: 'auto'}} checked={r.mode === 'Langsung'} onChange={() => { const n=[...v.readers]; n[i].mode='Langsung'; upd('readers', n); }} /> Langsung
                  </label>
                </div>
              </label>

              <label>IP <input value={r.ip||''} onChange={e => { const n=[...v.readers]; n[i].ip=e.target.value; upd('readers', n); }}/></label>
              <label>Port <input type="number" value={r.port||''} onChange={e => { const n=[...v.readers]; n[i].port=e.target.value; upd('readers', n); }}/></label>
              <label className="span-two">MAC Address <input placeholder="XX:XX:XX:XX:XX:XX" value={r.mac||''} onChange={e => { const n=[...v.readers]; n[i].mac=e.target.value; upd('readers', n); }}/></label>
            </div>
          </div>
        ))}
      </>
    );
  } else if (m === 'unit') {
    body = (
      <div className="form-grid">
        {field('name', 'Nama Unit Bisnis', 'text', [], true)}
        <label className="span-two">
          <span className="field-label">Status Unit Bisnis</span>
          <span className="check-field">
            <input type="checkbox" checked={v.status === 'Nonaktif'} onChange={e => upd('status', e.target.checked ? 'Nonaktif' : 'Aktif')} />
            Nonaktifkan Unit Bisnis
          </span>
        </label>
      </div>
    );
  } else if (m === 'paket_membership') {
    body = (
      <div className="form-grid">
        {/* Field Lama Tetap */}
        {field('brand', 'Brand', 'select', [['Semua Brand', 'Semua Brand'], ['Brand A', 'Brand A']])}
        {field('clubId', 'Club', 'select', clubs.map(c => [c.id, c.name]))}
        {field('promo', 'Promo', 'text')}
        {field('paymentType', 'Payment Type', 'select', [['PIF', 'PIF'], ['Recurring', 'Recurring']])}
        {field('shift', 'Shift', 'select', [['All Day', 'All Day'], ['Morning', 'Morning'], ['Evening', 'Evening']])}
        {field('category', 'Category', 'text')}
        {field('name', 'Nama Paket', 'text', [], true)}
        
        {/* Field Baru */}
        {field('unitId', 'Unit Bisnis', 'select', units.map(u => [u.id, u.name]))}
        {field('roomIds', 'Ruangan yang Diakses', 'multi', rooms.map(r => [r.id, r.name]), true)}
        {field('groupClassAccess', 'Akses Kelas Group', 'select', [['Tidak Termasuk', 'Tidak Termasuk'], ['Termasuk', 'Termasuk (Unlimited)']], true)}
        
        <div className="span-two form-grid" style={{gap: '14px 17px', margin: 0}}>
          {field('session', 'Session (menit/unlimited)', 'text')}
          {field('quota', 'Quota', 'number')}
        </div>
        
        <div className="span-two form-grid" style={{gap: '14px 17px', margin: 0}}>
          {field('price', 'Harga', 'currency', [], true)}
          <div style={{display: 'flex', gap: '10px'}}>
            {field('activeValue', 'Active Period', 'number', [], true)}
            {field('activeUnit', 'Satuan', 'select', [['Hari', 'Hari'], ['Bulan', 'Bulan']])}
          </div>
        </div>

        <div className="span-two" style={{ display: 'flex', gap: '20px', flexWrap: 'wrap', marginTop: '10px' }}>
          {field('isUnlimited', 'Is Unlimited', 'check')}
          {field('isActive', 'Is Active', 'check')}
          {field('freeTrial', 'Free Trial', 'check')}
          {field('onMobile', 'On Mobile', 'check')}
          {field('bundlingValid', 'Bisa Masuk Bundling', 'check')}
        </div>
      </div>
    );
  } else if (m === 'paket_kelas') {
    body = (
      <div className="form-grid">
        {/* Field Lama */}
        {field('brand', 'Brand', 'select', [['Semua Brand', 'Semua Brand'], ['Brand A', 'Brand A']])}
        {field('clubId', 'Club', 'select', clubs.map(c => [c.id, c.name]))}
        {field('name', 'Package Name', 'text', [], true)}
        
        {/* Field Baru */}
        <label className="span-two">
          <span className="field-label">Tipe Paket *</span>
          <div className="check-field" style={{gap: '15px', marginTop: '6px'}}>
            <label style={{display: 'flex', gap: '5px', fontWeight: 'normal', flexDirection: 'row', alignItems: 'center', margin: 0}}><input type="checkbox" style={{margin: 0, width: 'auto'}} name="tipe-paket" checked={v.type === 'Reguler'} onChange={() => upd('type', 'Reguler')} /> Reguler</label>
            <label style={{display: 'flex', gap: '5px', fontWeight: 'normal', flexDirection: 'row', alignItems: 'center', margin: 0}}><input type="checkbox" style={{margin: 0, width: 'auto'}} name="tipe-paket" checked={v.type === 'Add-on'} onChange={() => upd('type', 'Add-on')} /> Add-on</label>
          </div>
        </label>

        {field('roomId', 'Ruangan', 'select', rooms.map(r => [r.id, r.name]), true)}
        
        <label className="span-two">
          <span className="field-label">Cakupan Kelas *</span>
          <div className="check-field" style={{gap: '15px', marginTop: '6px'}}>
            <label style={{display: 'flex', gap: '5px', fontWeight: 'normal', flexDirection: 'row', alignItems: 'center', margin: 0}}><input type="checkbox" style={{margin: 0, width: 'auto'}} name="cakupan-kelas" checked={v.classScope === 'Semua Kelas Group'} onChange={() => upd('classScope', 'Semua Kelas Group')} /> Semua Kelas Group</label>
            <label style={{display: 'flex', gap: '5px', fontWeight: 'normal', flexDirection: 'row', alignItems: 'center', margin: 0}}><input type="checkbox" style={{margin: 0, width: 'auto'}} name="cakupan-kelas" checked={v.classScope === 'Kelas Tertentu'} onChange={() => upd('classScope', 'Kelas Tertentu')} /> Kelas Tertentu</label>
          </div>
        </label>

        {v.classScope === 'Kelas Tertentu' && field('specificClasses', 'Pilih Kelas', 'multi', ['Yoga', 'Zumba', 'Pilates', 'Poundfit', 'BodyCombat'].map(x => [x, x]), true)}

        <div className="span-two form-grid" style={{gap: '14px 17px', margin: 0}}>
          {field('quota', 'Kuota Sesi', 'number', [], true)}
          {field('price', 'Harga (Rp)', 'currency', [], true)}
        </div>
        
        <div className="span-two form-grid" style={{gap: '14px 17px', margin: 0}}>
          {field('activeValue', 'Active Period', 'number', [], true)}
          {field('activeUnit', 'Satuan', 'select', [['Hari', 'Hari'], ['Bulan', 'Bulan']])}
        </div>
      </div>
    );
  } else if (m === 'paket_trainer') {
    body = (
      <>
        <div className="form-grid">
          {/* Field Lama */}
          {field('brand', 'Brand', 'select', [['Semua Brand', 'Semua Brand'], ['Brand A', 'Brand A']])}
          {field('clubId', 'Club', 'select', clubs.map(c => [c.id, c.name]))}
          {field('trainer', 'Trainer/Employee', 'select', [['Semua Trainer', 'Semua Trainer'], ['T-01 - Budi', 'T-01 - Budi']])}
          {field('name', 'Package Name', 'text', [], true)}
          
          <div className="span-two form-grid" style={{gap: '14px 17px', margin: 0}}>
            {field('session', 'Session (Total)', 'number', [], true)}
            {field('price', 'Harga Base (Rp)', 'currency', [], true)}
          </div>
          
          <div className="span-two form-grid" style={{gap: '14px 17px', margin: 0}}>
            {field('activeValue', 'Active Period', 'number', [], true)}
            {field('activeUnit', 'Satuan', 'select', [['Hari', 'Hari'], ['Bulan', 'Bulan']])}
          </div>

          <div className="span-two" style={{ display: 'flex', gap: '20px', flexWrap: 'wrap', marginTop: '10px' }}>
            {field('onMobile', 'On Mobile', 'check')}
          </div>

          <hr className="span-two" />

          {/* Field Baru */}
          {field('unitId', 'Unit Bisnis', 'select', units.map(u => [u.id, u.name]))}
          {field('maxParticipants', 'Maks Peserta per Sesi', 'number')}

          <label className="span-two">
            <span className="field-label">Tipe Sesi *</span>
            <div className="check-field" style={{gap: '15px', marginTop: '6px'}}>
              <label style={{display: 'flex', gap: '5px', fontWeight: 'normal', flexDirection: 'row', alignItems: 'center', margin: 0}}><input type="checkbox" style={{margin: 0, width: 'auto'}} name="tipe-sesi" checked={v.sessionType === 'Private'} onChange={() => upd('sessionType', 'Private')} /> Private</label>
              <label style={{display: 'flex', gap: '5px', fontWeight: 'normal', flexDirection: 'row', alignItems: 'center', margin: 0}}><input type="checkbox" style={{margin: 0, width: 'auto'}} name="tipe-sesi" checked={v.sessionType === 'Couple'} onChange={() => upd('sessionType', 'Couple')} /> Couple</label>
              <label style={{display: 'flex', gap: '5px', fontWeight: 'normal', flexDirection: 'row', alignItems: 'center', margin: 0}}><input type="checkbox" style={{margin: 0, width: 'auto'}} name="tipe-sesi" checked={v.sessionType === 'Group'} onChange={() => upd('sessionType', 'Group')} /> Group</label>
            </div>
          </label>
          
          {v.sessionType === 'Couple' ? field('holdersCount', 'Jumlah Pemegang (Otomatis 2)', 'number', [], false, true) : null}
          {v.sessionType === 'Group' ? field('holdersCount', 'Jumlah Pemegang (2/4/6)', 'number') : null}
        </div>

        {['Couple', 'Group'].includes(v.sessionType) && (
          <>
            <div className="sub-heading">
              <h3>Tabel Tier Harga</h3>
              <button type="button" className="secondary" onClick={() => upd('priceTiers', [...(v.priceTiers || []), { id: uid(), holders: 2, price: 0 }])}><Plus size={14} />Tambah Tier</button>
            </div>
            <div className="table-scroll" style={{border: '1px solid #edf0f0', borderRadius: '6px', marginBottom: '15px'}}>
              <table>
                <thead style={{position: 'sticky', top: 0, zIndex: 1}}>
                  <tr>
                    <th>Jml Pemegang (Group)</th>
                    <th>Harga Paket (Rp)</th>
                    <th style={{width: '50px'}}></th>
                  </tr>
                </thead>
                <tbody>
                  {(v.priceTiers || []).map((t, i) => (
                    <tr key={t.id}>
                      <td><input type="number" value={t.holders} onChange={e => { const n=[...v.priceTiers]; n[i].holders=Number(e.target.value); upd('priceTiers', n); }} /></td>
                      <td>
                        <div className="currency-wrapper">
                          <span className="prefix">Rp</span>
                          <input type="text" value={t.price ? t.price.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".") : ''} onChange={e => { const raw=e.target.value.replace(/\D/g,''); const n=[...v.priceTiers]; n[i].price=raw?Number(raw):0; upd('priceTiers', n); }} />
                        </div>
                      </td>
                      <td style={{textAlign: 'center'}}><button type="button" className="delete-action" onClick={() => upd('priceTiers', v.priceTiers.filter((_, idx) => idx !== i))}><Trash2 size={15} /></button></td>
                    </tr>
                  ))}
                  {!(v.priceTiers || []).length && <tr><td colSpan="3" style={{textAlign: 'center', color: '#999'}}>Belum ada tier harga. Klik Tambah Tier.</td></tr>}
                </tbody>
              </table>
            </div>

            <div className="sub-heading">
              <h3>Tabel Komisi per Tier</h3>
              <button type="button" className="secondary" onClick={() => upd('commissionTiers', [...(v.commissionTiers || []), { id: uid(), holders: 2, commission: 0 }])}><Plus size={14} />Tambah Tier</button>
            </div>
            <div className="table-scroll" style={{border: '1px solid #edf0f0', borderRadius: '6px', marginBottom: '15px'}}>
              <table>
                <thead style={{position: 'sticky', top: 0, zIndex: 1}}>
                  <tr>
                    <th>Jml Pemegang (Group)</th>
                    <th>Komisi Trainer per Sesi (Rp)</th>
                    <th style={{width: '50px'}}></th>
                  </tr>
                </thead>
                <tbody>
                  {(v.commissionTiers || []).map((t, i) => (
                    <tr key={t.id}>
                      <td><input type="number" value={t.holders} onChange={e => { const n=[...v.commissionTiers]; n[i].holders=Number(e.target.value); upd('commissionTiers', n); }} /></td>
                      <td>
                        <div className="currency-wrapper">
                          <span className="prefix">Rp</span>
                          <input type="text" value={t.commission ? t.commission.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".") : ''} onChange={e => { const raw=e.target.value.replace(/\D/g,''); const n=[...v.commissionTiers]; n[i].commission=raw?Number(raw):0; upd('commissionTiers', n); }} />
                        </div>
                      </td>
                      <td style={{textAlign: 'center'}}><button type="button" className="delete-action" onClick={() => upd('commissionTiers', v.commissionTiers.filter((_, idx) => idx !== i))}><Trash2 size={15} /></button></td>
                    </tr>
                  ))}
                  {!(v.commissionTiers || []).length && <tr><td colSpan="3" style={{textAlign: 'center', color: '#999'}}>Belum ada tier komisi. Klik Tambah Tier.</td></tr>}
                </tbody>
              </table>
            </div>

            <div className="simulation" style={{marginBottom: '15px'}}><p><i>Aturan: 1 Pembayar. Billing terpusat. Kuota sesi dipotong kolektif tiap kali 1 pertemuan grup/couple diadakan. Roster anggota dikunci permanen saat transaksi POS.</i></p></div>
          </>
        )}
      </>
    );
  } else if (m === 'paket_recovery') {
    body = (
      <>
        <div className="form-grid">
          {field('name', 'Nama Paket', 'text', [], true)}
          {field('clubId', 'Club', 'select', clubs.map(c => [c.id, c.name]), true)}
          {field('recoveryType', 'Jenis Recovery', 'select', ['Massage', 'Jacuzzi', 'Nail', 'Sauna', 'Cold Plunge', 'Hyperbaric', 'Infrared'].map(x => [x, x]), true)}
          {field('roomId', 'Ruangan', 'select', rooms.map(r => [r.id, r.name]), true)}
          
          <div className="span-two form-grid" style={{gap: '14px 17px', margin: 0}}>
            {field('quota', 'Kuota Sesi', 'number', [], true)}
            {field('reset', 'Reset Kuota', 'select', [['Tidak Reset', 'Tidak Reset'], ['Bulanan', 'Bulanan']])}
          </div>
          
          <div className="span-two form-grid" style={{gap: '14px 17px', margin: 0}}>
            {field('price', 'Harga (Rp)', 'currency', [], true)}
            <div style={{display: 'flex', gap: '10px'}}>
              {field('activeValue', 'Masa Aktif', 'number', [], true)}
              {field('activeUnit', 'Satuan', 'select', [['Hari', 'Hari'], ['Bulan', 'Bulan']])}
            </div>
          </div>
          
          <label className="span-two">Deskripsi <textarea value={v.description||''} onChange={e => upd('description', e.target.value)} rows="2"></textarea></label>

          <div className="span-two" style={{ marginTop: '10px' }}>
            {field('bundlingValid', 'Bisa Masuk Bundling', 'check')}
          </div>
        </div>
        <div className="simulation" style={{marginTop: '15px'}}><p><i>Aturan Khusus: Jika ruangan terkait diset "Perlu Aktivasi Staf", maka sesi recovery dari paket ini hanya bisa diaktifkan/dipotong manual oleh Staf melalui App Staff. Tip: Untuk membuat "60x Recovery/bulan" sebagai benefit bundling, set kuota = 60, reset = Bulanan, dan centang Bisa Masuk Bundling.</i></p></div>
      </>
    );
  } else if (m === 'paket_pool') {
    body = (
      <>
        <div className="form-grid">
          {field('name', 'Nama Paket', 'text', [], true)}
          {field('clubId', 'Club', 'select', clubs.map(c => [c.id, c.name]), true)}
          {field('roomId', 'Ruangan (Kolam)', 'select', rooms.map(r => [r.id, r.name]), true)}
          
          <div className="span-two form-grid" style={{gap: '14px 17px', margin: 0}}>
            {field('quota', 'Kuota Sesi', 'number', [], true)}
            {field('reset', 'Reset Kuota', 'select', [['Bulanan', 'Bulanan']], true)}
          </div>
          
          <div className="span-two form-grid" style={{gap: '14px 17px', margin: 0}}>
            {field('price', 'Harga (Rp)', 'currency', [], true)}
            <div style={{display: 'flex', gap: '10px'}}>
              {field('activeValue', 'Masa Aktif', 'number', [], true)}
              {field('activeUnit', 'Satuan', 'select', [['Hari', 'Hari'], ['Bulan', 'Bulan']])}
            </div>
          </div>
          
          <div className="span-two" style={{ marginTop: '10px' }}>
            {field('bundlingValid', 'Bisa Masuk Bundling', 'check')}
          </div>
        </div>
        <div className="simulation" style={{marginTop: '15px'}}>
          <p><i>SOP Pool: Akses kolam TIDAK menggunakan gate. Resepsionis scan QR member ➔ sistem cek kuota ➔ cetak wristband MERAH ➔ potong 1 sesi. Pengantar diberi wristband KUNING (bayar ±Rp10.000 via POS terpisah, bukan dipotong dari kuota ini). Wristband dikembalikan saat scan QR keluar.</i></p>
        </div>
      </>
    );
  } else if (m === 'paket_bundling') {
    const allPkg = [
      ...ALL('paket_membership').map(x => ({...x, _mod: 'paket_membership'})),
      ...ALL('paket_kelas').map(x => ({...x, _mod: 'paket_kelas'})),
      ...ALL('paket_trainer').map(x => ({...x, _mod: 'paket_trainer'})),
      ...ALL('paket_recovery').map(x => ({...x, _mod: 'paket_recovery'})),
      ...ALL('paket_pool').map(x => ({...x, _mod: 'paket_pool'}))
    ].filter(p => {
      if (p._mod === 'paket_membership' ? !p.isActive : p.status !== 'Aktif') return false;
      if (p.type === 'Add-on') return false;
      if (p._mod === 'paket_kelas') return p.type === 'Reguler';
      if (['paket_membership', 'paket_trainer'].includes(p._mod)) return true;
      return !!p.bundlingValid;
    });

    const getPkg = (id) => allPkg.find(x => x.id === id) || {};

    const recalcProportional = (details, customPrice = null) => {
      const targetPrice = customPrice !== null ? customPrice : Number(v.price || 0);
      if (!targetPrice || !details?.length) return details;
      const totalOrigin = details.reduce((acc, d) => acc + (Number(getPkg(d.packageId).price) || 0), 0);
      if (totalOrigin === 0) return details;
      let used = 0;
      const res = details.map((d, i) => {
        if (i === details.length - 1) return { ...d, allocation: targetPrice - used };
        const prop = Math.round(((Number(getPkg(d.packageId).price) || 0) / totalOrigin) * targetPrice);
        used += prop;
        return { ...d, allocation: prop };
      });
      return res;
    };

    body = (
      <>
        <div className="form-grid">
          {field('name', 'Nama Bundling', 'text', [], true)}
          {field('clubs', 'Club Berlaku', 'multi', clubs.map(c => [c.id, c.name]), true)}
          
          <label className="span-two">
            <span className="field-label">Tipe Pemegang *</span>
            <div className="check-field" style={{gap: '15px', marginTop: '6px'}}>
              <label style={{display: 'flex', gap: '5px', fontWeight: 'normal', flexDirection: 'row', alignItems: 'center', margin: 0}}><input type="checkbox" style={{margin: 0, width: 'auto'}} name="tipe-pemegang" checked={v.holder === 'Single'} onChange={() => upd('holder', 'Single')} /> Single</label>
              <label style={{display: 'flex', gap: '5px', fontWeight: 'normal', flexDirection: 'row', alignItems: 'center', margin: 0}}><input type="checkbox" style={{margin: 0, width: 'auto'}} name="tipe-pemegang" checked={v.holder === 'Couple'} onChange={() => upd('holder', 'Couple')} /> Couple</label>
              <label style={{display: 'flex', gap: '5px', fontWeight: 'normal', flexDirection: 'row', alignItems: 'center', margin: 0}}><input type="checkbox" style={{margin: 0, width: 'auto'}} name="tipe-pemegang" checked={v.holder === 'Group'} onChange={() => upd('holder', 'Group')} /> Group</label>
            </div>
          </label>

          {['Couple', 'Group'].includes(v.holder) && field('holdersCount', 'Jumlah Pemegang', 'number', [], true)}
          
          <div className="span-two" style={{ display: 'flex', gap: '20px', flexWrap: 'wrap', marginTop: '10px' }}>
            {v.holder === 'Group' && (
              <label style={{marginRight: '20px'}}>
                <span className="field-label">Satuan Harga *</span>
                <div className="check-field" style={{gap: '15px', marginTop: '6px'}}>
                  <label style={{display: 'flex', gap: '5px', fontWeight: 'normal', flexDirection: 'row', alignItems: 'center', margin: 0}}><input type="checkbox" style={{margin: 0, width: 'auto'}} name="satuan-harga" checked={v.priceUnit === 'Per Paket'} onChange={() => upd('priceUnit', 'Per Paket')} /> Per Paket</label>
                  <label style={{display: 'flex', gap: '5px', fontWeight: 'normal', flexDirection: 'row', alignItems: 'center', margin: 0}}><input type="checkbox" style={{margin: 0, width: 'auto'}} name="satuan-harga" checked={v.priceUnit === 'Per Orang'} onChange={() => upd('priceUnit', 'Per Orang')} /> Per Orang</label>
                </div>
              </label>
            )}
          </div>

          <div className="span-two form-grid" style={{gap: '14px 17px', margin: 0}}>
            <div style={{display: 'flex', gap: '10px'}}>
              {field('activeValue', 'Masa Aktif', 'number', [], true)}
              {field('activeUnit', 'Satuan', 'select', [['Hari', 'Hari'], ['Bulan', 'Bulan']])}
            </div>
            {field('start', 'Mulai Aktif', 'select', [['Sejak Pembelian', 'Sejak Pembelian'], ['Sejak Kunjungan Pertama', 'Sejak Kunjungan Pertama']], true)}
          </div>

          <div className="span-two form-grid" style={{gap: '14px 17px', margin: 0}}>
            {field('promoStart', 'Periode Promo Mulai', 'date')}
            {field('promoEnd', 'Periode Promo Selesai', 'date')}
          </div>

          <label className="span-two">
            <span className="field-label">Harga *</span>
            <div className="currency-wrapper">
              <span className="prefix">Rp</span>
              <input 
                type="text" 
                value={v.price ? v.price.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".") : ''} 
                onChange={e => {
                  const raw = e.target.value.replace(/\D/g, '');
                  const newPrice = raw ? Number(raw) : '';
                  setV(prev => {
                    const updated = {...prev, price: newPrice};
                    updated.details = recalcProportional(updated.details, newPrice);
                    return updated;
                  });
                }} 
              />
            </div>
          </label>

          <label className="span-two">Kanal Penjualan *
            <div style={{display: 'flex', gap: '15px', marginTop: '5px'}}>
              <label className="check-field" style={{margin: 0}}><input type="checkbox" checked={v.kanalPOS} onChange={e => upd('kanalPOS', e.target.checked)} /> POS</label>
              <label className="check-field" style={{margin: 0}}><input type="checkbox" checked={v.kanalApps} onChange={e => upd('kanalApps', e.target.checked)} /> Apps Member</label>
              <label className="check-field" style={{margin: 0}}><input type="checkbox" checked={v.kanalB2B} onChange={e => upd('kanalB2B', e.target.checked)} /> Voucher B2B</label>
            </div>
          </label>

          <label className="span-two">Deskripsi <textarea value={v.description||''} onChange={e => upd('description', e.target.value)} rows="2"></textarea></label>
        </div>

        <div className="sub-heading">
          <h3>Komponen Bundling</h3>
          <button type="button" className="secondary" onClick={() => {
            const arr = [...(v.details || []), { id: uid(), packageId: '', allocation: 0 }];
            upd('details', recalcProportional(arr));
          }}><Plus size={14} />Tambah Komponen</button>
        </div>
        {(v.details || []).map((d, i) => {
          const pkg = getPkg(d.packageId);
          const unit = ALL('unit').find(x => x.id === pkg.unitId);
          return (
            <div className="reader-block compact" key={d.id}>
              <div className="form-grid" style={{position: 'relative'}}>
                <label className="span-two">
                  <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '5px'}}>
                    <span style={{marginBottom: 0}}>Paket *</span>
                    <button type="button" className="delete-action" onClick={() => {
                      const n = v.details.filter((_, idx) => idx !== i);
                      upd('details', recalcProportional(n));
                    }}><Trash2 size={15} /></button>
                  </div>
                  <select value={d.packageId} onChange={e => {
                    const n=[...v.details]; 
                    n[i].packageId=e.target.value; 
                    upd('details', recalcProportional(n)); 
                  }}>
                    <option value="">-- Pilih Paket --</option>
                    {allPkg.map(x => {
                      const modLabel = {paket_membership: 'Membership', paket_kelas: 'Kelas Reguler', paket_trainer: 'Trainer', paket_recovery: 'Recovery', paket_pool: 'Pool'}[x._mod] || 'Paket';
                      return <option key={x.id} value={x.id}>[{modLabel}] {x.name} (Rp {Number(x.price || 0).toLocaleString('id-ID')})</option>;
                    })}
                  </select>
                </label>
                
                <label>Unit Bisnis <input readOnly value={unit?.name || '—'} style={{background: '#f9fafb', color: '#6b7280'}} /></label>
                <label>Harga Asal <input readOnly value={`Rp ${Number(pkg.price || 0).toLocaleString('id-ID')}`} style={{background: '#f9fafb', color: '#6b7280'}} /></label>
                
                <label className="span-two">
                  <span>Alokasi Harga (Rp)</span>
                  <div className="currency-wrapper">
                    <span className="prefix">Rp</span>
                    <input type="text" value={d.allocation ? d.allocation.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".") : ''} onChange={e => { const raw=e.target.value.replace(/\D/g,''); const n=[...v.details]; n[i].allocation=raw?Number(raw):0; upd('details', n); }} />
                  </div>
                </label>
              </div>
            </div>
          );
        })}
      </>
    );
  } else if (m === 'tarif_sewa') {
    body = (
      <div className="form-grid">
        {field('roomId', 'Fasilitas', 'select', rooms.map(r => [r.id, r.name]), true)}
        {field('day', 'Hari', 'select', [['Senin-Minggu', 'Senin-Minggu'], ['Weekday', 'Weekday'], ['Weekend', 'Weekend']], true)}
        {field('peakLabel', 'Label Peak/Off-Peak', 'select', [['Peak', 'Peak'], ['Off-Peak', 'Off-Peak']], true)}
        <div className="span-two form-grid" style={{gap: '14px 17px', margin: 0}}>
          {field('startTime', 'Jam Mulai', 'time', [], true)}
          {field('endTime', 'Jam Selesai', 'time', [], true)}
        </div>
        {field('price', 'Tarif per Jam', 'currency', [], true)}
        {field('overtime', 'Toleransi Overtime (menit)', 'number')}
        {field('status', 'Status', 'select', STATUS.map(x => [x, x]), true)}
      </div>
    );
  } else if (m === 'transaksi') {
    const members = ALL('member');
    const selectedMember = members.find(m => m.id === v.member);
    const hasActivePlan = selectedMember?.balances && selectedMember.balances.some(b => {
      if (b.qty === 0 || b.qty === '0') return false;
      if (b.expiry && new Date(b.expiry) < new Date(new Date().toDateString())) return false;
      return true;
    });
    
    // Combine all products for POS simulation
    const allPkg = [
      ...ALL('paket_bundling').map(x => ({...x, _type: 'Bundling'})),
      ...ALL('paket_membership').map(x => ({...x, _type: 'Paket Membership'})),
      ...ALL('paket_kelas').map(x => ({...x, _type: 'Paket Kelas'})),
      ...ALL('paket_trainer').map(x => ({...x, _type: 'Paket Trainer'})),
      ...ALL('paket_recovery').map(x => ({...x, _type: 'Paket Recovery'})),
      ...ALL('paket_pool').map(x => ({...x, _type: 'Paket Pool'}))
    ].filter(p => {
      if (p._type === 'Paket Membership' ? !p.isActive : p.status !== 'Aktif') return false;
      // Rule: Add-on tidak muncul di POS jika member belum punya paket aktif
      if (p.type === 'Add-on' && !hasActivePlan) return false;
      // Rule: Jika salah satu komponen bundling nonaktif, bundling tidak bisa dijual baru
      if (p._type === 'Bundling') {
        const allActivePackages = [
          ...ALL('paket_membership'), ...ALL('paket_kelas'),
          ...ALL('paket_trainer'), ...ALL('paket_recovery'), ...ALL('paket_pool')
        ].filter(x => x.status === 'Aktif');
        const hasInactiveComp = (p.details || []).some(d => !allActivePackages.some(ap => ap.id === d.packageId));
        if (hasInactiveComp) return false;
      }
      return true;
    });

    const getPkg = (id) => allPkg.find(x => x.id === id) || {};

    const updateCartDetails = (newDetails) => {
      const calcTotal = newDetails.reduce((sum, d) => {
        const p = getPkg(d.packageId);
        return sum + (Number(p.price) || 0);
      }, 0);
      setV(prev => ({ ...prev, details: newDetails, total: calcTotal }));
    };

    body = (
      <>
        <div className="form-grid">
          {field('date', 'Tanggal Transaksi', 'date', [], true)}
          {field('member', 'Member Utama (Pembayar)', 'select', members.map(m => [m.id, m.name]), true)}
          {field('paymentScheme', 'Skema Bayar', 'select', [['PIF', 'Paid In Full (PIF)'], ['DP', 'DP'], ['Cicilan', 'Cicilan'], ['Open Credit', 'Open Credit'], ['Free Trial', 'Free Trial']], true)}
          {field('total', 'Total Harga (Rp)', 'currency', [], true)}
          {field('status', 'Status', 'select', [['Berhasil', 'Berhasil'], ['Pending', 'Pending']], true)}
        </div>
        <div className="sub-heading">
          <h3>Keranjang Belanja (Produk)</h3>
          <button type="button" className="secondary" onClick={() => updateCartDetails([...(v.details || []), { id: uid(), packageId: '', roster: [] }])}><Plus size={14} />Tambah Produk</button>
        </div>
        {(v.details || []).map((d, i) => {
          const pkg = getPkg(d.packageId);
          const isGroup = pkg.holder === 'Couple' || pkg.holder === 'Group' || pkg.sessionType === 'Couple' || pkg.sessionType === 'Group';
          return (
            <div className="reader-block compact" key={d.id}>
              <div className="form-grid">
                <label className="span-two">Pilih Produk (Bundling / Paket Satuan) *
                  <select value={d.packageId} onChange={e => { 
                    const n=[...v.details]; 
                    n[i].packageId=e.target.value; 
                    if (!e.target.value) n[i].roster = [];
                    updateCartDetails(n); 
                  }}>
                    <option value="">-- Pilih Produk --</option>
                    {allPkg.map(x => <option key={x.id} value={x.id}>[{x._type}] {x.name} - Rp {Number(x.price || 0).toLocaleString('id-ID')}</option>)}
                  </select>
                </label>
                
                {isGroup && (
                  <div className="span-two" style={{background: '#fff', padding: '10px', borderRadius: '6px', border: '1px solid #e5e7eb'}}>
                    <p style={{fontSize: '13px', margin: '0 0 10px 0'}}><b>Roster Anggota {pkg.holder || pkg.sessionType}</b> (Pendaftaran anggota dilakukan sekarang dan akan dikunci permanen)</p>
                    {(d.roster || []).map((r, ri) => (
                      <div key={ri} style={{display: 'flex', gap: '10px', marginBottom: '5px'}}>
                        <input placeholder="Nama Anggota" value={r.name || ''} onChange={e => {
                           const n = [...v.details];
                           if (!n[i].roster) n[i].roster = [];
                           n[i].roster[ri] = { ...n[i].roster[ri], name: e.target.value };
                           upd('details', n);
                        }} style={{margin: 0}} />
                        <button type="button" className="delete-action" onClick={() => {
                          const n = [...v.details];
                          n[i].roster.splice(ri, 1);
                          upd('details', n);
                        }}><Trash2 size={15} /></button>
                      </div>
                    ))}
                    <button type="button" className="secondary" style={{padding: '5px 10px', fontSize: '12px'}} onClick={() => {
                       const n = [...v.details];
                       if (!n[i].roster) n[i].roster = [];
                       n[i].roster.push({ name: '' });
                       upd('details', n);
                    }}>+ Tambah Anggota Roster</button>
                  </div>
                )}
                
                <button type="button" className="delete-action" style={{position: 'absolute', top: '15px', right: '15px'}} onClick={() => updateCartDetails(v.details.filter((_, idx) => idx !== i))}><Trash2 size={15} /></button>
              </div>
            </div>
          );
        })}
        {v.details?.length > 0 && <div className="simulation">
          <p><i>SOP Saldo & Refund / Upgrade: Saat transaksi ini disimpan (Berhasil), sistem akan membedah komponen Bundling dan memberikan saldo secara proporsional ke member-member terkait sebagai <b>Total Gabungan (per-batch)</b>. Pemotongan saldo menganut prinsip FIFO by Expiry. Refund/Upgrade/Void Bundling akan memproses seluruh komponennya secara utuh (tidak bisa di-void parsial).</i></p>
        </div>}
      </>
    );
  } else if (m === 'member') {
    body = (
      <div className="form-grid">
        {field('name', 'Nama Lengkap', 'text', [], true)}
        {field('phone', 'Nomor Telepon', 'text', [], true)}
      </div>
    );
  } else if (m === 'booking_sewa') {
    body = (
      <>
        <div className="form-grid">
          {field('roomId', 'Fasilitas (Lapangan)', 'select', rooms.map(r => [r.id, r.name]), true)}
          {field('date', 'Tanggal Booking', 'date', [], true)}
          {field('startTime', 'Jam Mulai', 'time', [], true)}
          {field('endTime', 'Jam Selesai', 'time', [], true)}
          {field('renter', 'Nama Penyewa', 'text', [], true)}
          {field('status', 'Status', 'select', [['Confirmed', 'Confirmed'], ['Pending', 'Pending'], ['Canceled', 'Canceled']], true)}
        </div>
        <div className="sub-heading">
          <h3>Daftar Pemain yang Diajak</h3>
          <button type="button" className="secondary" onClick={() => upd('players', [...(v.players || []), { id: uid(), name: '' }])}><Plus size={14} />Tambah Pemain</button>
        </div>
        {(v.players || []).map((p, i) => (
          <div className="reader-block compact" key={p.id}>
            <div className="form-grid">
              <label>Nama Pemain <input value={p.name} onChange={e => { const n=[...v.players]; n[i].name=e.target.value; upd('players', n); }}/></label>
              <button type="button" className="delete-action" onClick={() => upd('players', v.players.filter((_, idx) => idx !== i))}><Trash2 size={15} /></button>
            </div>
          </div>
        ))}
        <div className="simulation">
          <b>Kontingensi & SOP Terpusat</b>
          <p style={{fontSize: '13px', color: '#666', marginTop: '5px'}}>
            * Sistem otomatis mencetak QR akses terpisah untuk SETIAP pemain yang diajak.<br/>
            * <b>Padel:</b> Dikelola in-house dan di-sync otomatis 2-arah dari Ayo Booking (Sistem menolak jika slot bentrok).<br/>
            * <b>Tenis/Mini Soccer:</b> Kontrol manual & lampu menyala otomatis per jadwal.<br/>
          </p>
          {field('ayoBookingConflict', 'Simulasikan Bentrok Ayo Booking', 'check')}
          {field('overtimeCharge', 'Tandai Overtime (Generate Charge)', 'check')}
          <label style={{marginTop: '10px', display: 'block'}}>Tier Approval Buka Gate Manual (Bila Sistem Down)
            <MultiSelect multi={false} value={v.approvalTier || ''} options={[['', 'Tier 1: Normal (QR / Face ID)'], ['tier2', 'Tier 2: Scan Apps Staff (Butuh Approval CS)'], ['tier3', 'Tier 3: Backdate Manual CRM (Sangat Ketat)']]} onChange={val => upd('approvalTier', val)} />
          </label>
        </div>
      </>
    );
  }

  return (
    <div className="overlay">
      <form className="editor" onSubmit={submit}>
        <header className="editor-header">
          <div>
            <div className="eyebrow">MASTER DATA / {SCHEMA[m].title.toUpperCase()}</div>
            <h2>{v.id ? 'Edit' : 'Tambah'} {SCHEMA[m].title}</h2>
          </div>
          <button type="button" className="close-button" onClick={onClose}><X size={20} /></button>
        </header>
        <div className="editor-body">{body}</div>
        <footer className="editor-footer">
          <button type="button" className="secondary" onClick={onClose}>Batal</button>
          <button className="primary"><Check size={15} />Simpan</button>
        </footer>
      </form>
    </div>
  );
}

function Modal({ value: m, module, close, tell, load }) {
  if (m.type === 'view') {
    const item = m.item;
    return (
      <div className="overlay">
        <div className="view-modal">
          <button className="close-button float-close" onClick={close}><X /></button>
          <div className="eyebrow">DETAIL {SCHEMA[module].title.toUpperCase()}</div>
          <h2>{item.name || item.code}</h2>
          <div className="view-grid">
            {SCHEMA[module].columns.map(([key, label]) => {
              if (module === 'unit' && key === 'status') return null;
              if (module === 'unit' && key === 'code') return null;
              if (module === 'device' && key === 'code') return null;
              return (
                <div key={key}>
                  <small>{label}</small>
                  <b>{text(item, key) || '—'}</b>
                </div>
              );
            })}
          </div>

          {module === 'unit' && (
            <div style={{ marginTop: '15px' }}>
              <label className="check-field" style={{ width: '100%', opacity: 0.8, pointerEvents: 'none' }}>
                <input type="checkbox" readOnly checked={item.status === 'Nonaktif'} />
                Nonaktifkan Unit Bisnis
              </label>
            </div>
          )}
          
          {module === 'member' && (() => {
            const grouped = (item.balances || []).reduce((acc, b) => {
              if (!acc[b.type]) acc[b.type] = { type: b.type, qty: 0, unlimited: false, batches: [] };
              acc[b.type].batches.push(b);
              if (b.qty === 'Unlimited' || acc[b.type].unlimited) {
                acc[b.type].unlimited = true;
                acc[b.type].qty = 'Unlimited';
              } else {
                acc[b.type].qty += Number(b.qty || 0);
              }
              return acc;
            }, {});
            const groups = Object.values(grouped);
            
            return (
              <>
                <div className="sub-heading"><h3>Total Saldo Gabungan</h3></div>
                {groups.map((g, i) => (
                  <div className="view-sub" key={i} style={{flexDirection: 'column', marginBottom: '10px', background: '#eff6ff', borderColor: '#bfdbfe'}}>
                    <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
                      <b style={{color: '#1d4ed8'}}>{g.type}</b>
                      <span style={{fontSize: '16px', fontWeight: 'bold', color: '#1e40af'}}>{g.qty} {g.unlimited ? '' : 'Sesi'}</span>
                    </div>
                    <div style={{marginTop: '5px', fontSize: '12px', color: '#3b82f6'}}>
                      Disimpan dalam {g.batches.length} batch (Sistem FIFO)
                    </div>
                  </div>
                ))}
                {groups.length === 0 && (
                  <div style={{padding: '12px', textAlign: 'center', color: '#9CA3AF'}}>Belum ada saldo aktif</div>
                )}
                
                <div className="sub-heading"><h3>Aksi Saldo</h3></div>
                <div style={{display: 'flex', gap: '10px', marginBottom: '15px'}}>
                  <button className="secondary" style={{flex: 1}} onClick={() => {
                    if (!item.balances?.length) return tell?.('Member tidak memiliki saldo untuk di-void.');
                    const latest = item.balances[item.balances.length - 1];
                    const mems = read(STORAGE['member']).map(x => ({
                       ...x, 
                       balances: (x.balances || []).filter(b => b.transactionId !== latest.transactionId)
                    }));
                    write(STORAGE['member'], mems);
                    if (latest.transactionId) {
                      const trxs = read(STORAGE['transaksi']).map(t => t.id === latest.transactionId ? { ...t, status: 'Void / Refund' } : t);
                      write(STORAGE['transaksi'], trxs);
                    }
                    load?.();
                    close();
                    tell?.(`Transaksi terbaru di-void. Seluruh saldo komponen dari transaksi ini ditarik dari semua member terkait.`);
                  }}>Void / Refund Transaksi Terbaru</button>
                  <button className="secondary" style={{flex: 1}} onClick={() => tell?.('Simulasi: Transfer/Upgrade memperlakukan transaksi (termasuk seluruh isi bundling) sebagai satu unit utuh yang terpusat.')}>Transfer / Upgrade</button>
                </div>
              </>
            );
          })()}

          {module === 'paket_membership' && (
            <>
              <div className="sub-heading"><h3>Ruangan yang Diakses</h3></div>
              <div style={{display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '15px'}}>
                {(item.roomIds || []).map(rId => {
                  const r = ALL('ruangan').find(x => x.id === rId);
                  return <span key={rId} className="chip">{r?.name || rId}</span>;
                })}
                {!(item.roomIds || []).length && <span style={{color: '#999'}}>Tidak ada ruangan terkait</span>}
              </div>
            </>
          )}

          {module === 'paket_kelas' && (
            <>
              <div className="sub-heading"><h3>Detail Cakupan &amp; Ruangan</h3></div>
              <div className="view-grid" style={{marginTop: 0, paddingTop: 0}}>
                <div>
                  <small>Studio Ruangan</small>
                  <b>{ALL('ruangan').find(x => x.id === item.roomId)?.name || '—'}</b>
                </div>
                <div>
                  <small>Cakupan Kelas</small>
                  <b>{item.classScope || '—'}</b>
                </div>
                {item.classScope === 'Kelas Tertentu' && item.specificClasses?.length > 0 && (
                  <div className="span-two">
                    <small>Kelas Terpilih</small>
                    <div style={{display: 'flex', gap: '6px', flexWrap: 'wrap', marginTop: '4px'}}>
                      {item.specificClasses.map(c => <span key={c} className="chip">{c}</span>)}
                    </div>
                  </div>
                )}
              </div>
            </>
          )}

          {module === 'paket_trainer' && item.tiers?.length > 0 && (
            <>
              <div className="sub-heading"><h3>Tabel Tier Harga &amp; Komisi Trainer</h3></div>
              <div className="table-scroll" style={{maxHeight: '150px', border: '1px solid #edf0f0', borderRadius: '6px', marginBottom: '15px'}}>
                <table>
                  <thead>
                    <tr>
                      <th>Jml Pemegang</th>
                      <th>Harga Paket</th>
                      <th>Komisi Trainer per Sesi</th>
                    </tr>
                  </thead>
                  <tbody>
                    {item.tiers.map((t, i) => (
                      <tr key={i}>
                        <td>{t.holders} Orang</td>
                        <td>Rp {Number(t.price || 0).toLocaleString('id-ID')}</td>
                        <td>Rp {Number(t.commission || 0).toLocaleString('id-ID')}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}

          {module === 'paket_bundling' && (
            <>
              <div className="sub-heading"><h3>Daftar Komponen &amp; Alokasi Harga</h3></div>
              <div className="table-scroll" style={{maxHeight: '200px', border: '1px solid #edf0f0', borderRadius: '6px', marginBottom: '15px'}}>
                <table>
                  <thead style={{position: 'sticky', top: 0, zIndex: 1}}>
                    <tr>
                      <th>Nama Komponen</th>
                      <th>Tipe</th>
                      <th>Unit Bisnis</th>
                      <th>Harga Asal</th>
                      <th>Alokasi Harga</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(item.details || []).map((d, i) => {
                      const allComp = [
                        ...ALL('paket_membership'), ...ALL('paket_kelas'),
                        ...ALL('paket_trainer'), ...ALL('paket_recovery'), ...ALL('paket_pool')
                      ];
                      const found = allComp.find(p => p.id === d.packageId);
                      const unit = ALL('unit').find(u => u.id === (found?.unitId || d.unitId));
                      return (
                        <tr key={i}>
                          <td><b>{found?.name || d.packageName || 'Unknown'}</b></td>
                          <td>{found?._type || d.pkgType || 'Paket'}</td>
                          <td>{unit?.name || '—'}</td>
                          <td>Rp {Number(found?.price ?? d.originalPrice ?? 0).toLocaleString('id-ID')}</td>
                          <td><b>Rp {Number(d.allocation || 0).toLocaleString('id-ID')}</b></td>
                        </tr>
                      );
                    })}
                    {!(item.details || []).length && <tr><td colSpan="5" style={{textAlign: 'center', color: '#999'}}>Tidak ada komponen</td></tr>}
                  </tbody>
                </table>
              </div>
              <div style={{display: 'flex', justifyContent: 'space-between', padding: '10px 14px', background: '#F8FAFC', borderRadius: '6px', fontSize: '13px', fontWeight: 'bold'}}>
                <span>Total Alokasi:</span>
                <span>Rp {((item.details || []).reduce((sum, d) => sum + Number(d.allocation || 0), 0)).toLocaleString('id-ID')}</span>
              </div>
            </>
          )}

          {module === 'booking_sewa' && (
            <>
              <div className="sub-heading"><h3>Daftar Pemain &amp; QR Akses</h3></div>
              <div className="table-scroll" style={{maxHeight: '180px', border: '1px solid #edf0f0', borderRadius: '6px', marginBottom: '15px'}}>
                <table>
                  <thead style={{position: 'sticky', top: 0, zIndex: 1}}>
                    <tr>
                      <th>No</th>
                      <th>Nama Pemain</th>
                      <th>Kode QR Akses</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(item.players || []).map((p, i) => (
                      <tr key={i}>
                        <td>{i + 1}</td>
                        <td><b>{p.name || `Pemain ${i + 1}`}</b></td>
                        <td>
                          <span className="code" style={{display: 'inline-flex', alignItems: 'center', gap: '6px'}}>
                            <QrCode size={13} /> {p.qrCode || `QR-${(p.name || `P${i + 1}`).toUpperCase().replace(/[^A-Z0-9]/g, '')}-${item.id?.slice(0, 4) || 'ACC'}`}
                          </span>
                        </td>
                      </tr>
                    ))}
                    {!(item.players || []).length && (
                      <tr>
                        <td>1</td>
                        <td><b>{item.renter} (Penyewa Utama)</b></td>
                        <td>
                          <span className="code" style={{display: 'inline-flex', alignItems: 'center', gap: '6px'}}>
                            <QrCode size={13} /> {`QR-${item.renter?.toUpperCase().replace(/[^A-Z0-9]/g, '') || 'RENTER'}-VIP`}
                          </span>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
              <div className="sub-heading"><h3>Status Kontingensi &amp; SOP Terpusat</h3></div>
              <div className="view-grid" style={{marginTop: 0, paddingTop: 0}}>
                <div>
                  <small>Kontingensi Gateway</small>
                  <b>{item.approvalTier === 'tier2' ? 'Tier 2: Scan Apps Staff (Approved CS)' : item.approvalTier === 'tier3' ? 'Tier 3: Superuser Backdate CRM' : 'Tier 1: Otomatis Hardware (QR / Face ID)'}</b>
                </div>
                <div>
                  <small>Sinkronisasi Ayo Booking</small>
                  <b>{item.ayoBookingConflict ? '⚠️ Bentrok Terdeteksi' : '✅ Sinkron 2-Arah Aktif'}</b>
                </div>
              </div>
            </>
          )}

          {module === 'transaksi' && (
            <>
              <div className="sub-heading"><h3>Rincian Produk Belanja</h3></div>
              <div className="table-scroll" style={{maxHeight: '180px', border: '1px solid #edf0f0', borderRadius: '6px', marginBottom: '15px'}}>
                <table>
                  <thead style={{position: 'sticky', top: 0, zIndex: 1}}>
                    <tr>
                      <th>Produk</th>
                      <th>Tipe</th>
                      <th>Roster Anggota</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(item.details || []).map((d, i) => {
                      const allPkg = [
                        ...ALL('paket_bundling').map(x => ({...x, _type: 'Bundling'})),
                        ...ALL('paket_membership').map(x => ({...x, _type: 'Paket Membership'})),
                        ...ALL('paket_kelas').map(x => ({...x, _type: 'Paket Kelas'})),
                        ...ALL('paket_trainer').map(x => ({...x, _type: 'Paket Trainer'})),
                        ...ALL('paket_recovery').map(x => ({...x, _type: 'Paket Recovery'})),
                        ...ALL('paket_pool').map(x => ({...x, _type: 'Paket Pool'}))
                      ];
                      const pkg = allPkg.find(p => p.id === d.packageId);
                      const rosterNames = (d.roster || []).map(r => r.name).filter(Boolean).join(', ');
                      return (
                        <tr key={i}>
                          <td><b>{pkg?.name || 'Produk'}</b></td>
                          <td>{pkg?._type || '—'}</td>
                          <td>{rosterNames || 'Individu'}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </>
          )}

          {module === 'ruangan' && (
            <>
              <div className="view-grid" style={{ marginTop: 0, paddingTop: 0 }}>
                <div className="span-two">
                  <small>Deskripsi</small>
                  <b>{item.description || '—'}</b>
                </div>
              </div>

              <div className="sub-heading"><h3>Paket / Jadwal yang Memanggil Ruangan</h3></div>
              <div className="table-scroll" style={{maxHeight: '150px', border: '1px solid #edf0f0', borderRadius: '6px', marginBottom: '15px'}}>
                <table>
                  <thead style={{position: 'sticky', top: 0, zIndex: 1}}>
                    <tr><th>Nama Paket/Jadwal</th><th>Jenis Relasi</th></tr>
                  </thead>
                  <tbody>
                    {ALL('paket_membership').filter(x => x.roomIds?.includes(item.id)).map(p => <tr key={p.id}><td>{p.name}</td><td>Membership</td></tr>)}
                    {ALL('paket_kelas').filter(x => x.roomId === item.id).map(p => <tr key={p.id}><td>{p.name}</td><td>Kelas</td></tr>)}
                    {ALL('paket_recovery').filter(x => x.roomId === item.id).map(p => <tr key={p.id}><td>{p.name}</td><td>Recovery</td></tr>)}
                    {ALL('paket_pool').filter(x => x.roomId === item.id).map(p => <tr key={p.id}><td>{p.name}</td><td>Pool</td></tr>)}
                    {ALL('tarif_sewa').filter(x => x.roomId === item.id).map(p => <tr key={p.id}><td>{p.name}</td><td>Sewa Ruangan</td></tr>)}
                    {ALL('booking_sewa').filter(x => x.roomId === item.id).map(p => <tr key={p.id}><td>Booking oleh {p.renter}</td><td>Booking Jadwal</td></tr>)}
                    {
                      !ALL('paket_membership').some(x => x.roomIds?.includes(item.id)) &&
                      !ALL('paket_kelas').some(x => x.roomId === item.id) &&
                      !ALL('paket_recovery').some(x => x.roomId === item.id) &&
                      !ALL('paket_pool').some(x => x.roomId === item.id) &&
                      !ALL('tarif_sewa').some(x => x.roomId === item.id) &&
                      !ALL('booking_sewa').some(x => x.roomId === item.id) &&
                      <tr><td colSpan="2" style={{textAlign: 'center', color: '#999'}}>Tidak ada paket/jadwal terkait</td></tr>
                    }
                  </tbody>
                </table>
              </div>

              <div className="sub-heading"><h3>Device Terpasang</h3></div>
              <div className="table-scroll" style={{maxHeight: '150px', border: '1px solid #edf0f0', borderRadius: '6px', marginBottom: '15px'}}>
                <table>
                  <thead style={{position: 'sticky', top: 0, zIndex: 1}}>
                    <tr><th>Nama Device</th><th>Tipe</th><th>Status</th></tr>
                  </thead>
                  <tbody>
                    {ALL('device').filter(d => d.roomId === item.id).map(d => (
                      <tr key={d.id}>
                        <td>{d.name}</td>
                        <td>{d.type}</td>
                        <td><span className={`badge ${d.status === 'Aktif' ? 'green' : 'muted'}`}>{d.status}</span></td>
                      </tr>
                    ))}
                    {!ALL('device').some(d => d.roomId === item.id) && <tr><td colSpan="3" style={{textAlign: 'center', color: '#999'}}>Tidak ada device terpasang</td></tr>}
                  </tbody>
                </table>
              </div>
            </>
          )}

          {module === 'device' && (
            <>
              <div className="sub-heading"><h3>Daftar Reader Terpasang</h3></div>
              <div className="table-scroll" style={{maxHeight: '200px', border: '1px solid #edf0f0', borderRadius: '6px', marginBottom: '15px'}}>
                <table>
                  <thead style={{position: 'sticky', top: 0, zIndex: 1}}>
                    <tr>
                      <th>Nama Reader</th>
                      <th>Metode</th>
                      <th>Arah</th>
                      <th>Merk/Model</th>
                      <th>SN</th>
                      <th>Mode Koneksi</th>
                      <th>IP</th>
                      <th>Port</th>
                      <th>MAC Address</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(item.readers || []).map((r, i) => (
                      <tr key={i}>
                        <td>{r.name}</td>
                        <td>{r.method}</td>
                        <td>{r.direction}</td>
                        <td>{r.model || '—'}</td>
                        <td className="code">{r.sn}</td>
                        <td>{r.mode}</td>
                        <td>{r.ip || '—'}</td>
                        <td>{r.port || '—'}</td>
                        <td className="code">{r.mac || '—'}</td>
                      </tr>
                    ))}
                    {!(item.readers || []).length && <tr><td colSpan="9" style={{textAlign: 'center', color: '#999'}}>Tidak ada reader terpasang</td></tr>}
                  </tbody>
                </table>
              </div>
              <div className="sub-heading"><h3>Simulasi Engine (Validasi Tap)</h3></div>
              <div style={{display: 'flex', gap: '10px', marginBottom: '15px'}}>
                <button className="secondary" style={{flex: 1}} onClick={() => alert('Simulasi: Tap ditolak. Member tidak memiliki jadwal aktif di ruangan ini.')}>Simulasi Tap (Tolak)</button>
                <button className="secondary" style={{flex: 1}} onClick={() => alert('Simulasi: Tap berhasil. Saldo/sesi FIFO dipotong. Gate terbuka.')}>Simulasi Tap (Buka Gate)</button>
              </div>
            </>
          )}

          <button className="primary full-width" onClick={close}>Tutup</button>
        </div>
      </div>
    );
  }
  return (
    <div className="overlay">
      <div className="confirm-modal">
        <div className="warning-symbol">!</div>
        <h2>Konfirmasi</h2>
        <p>{m.message}</p>
        <div className="modal-actions">
          <button className="secondary" onClick={close}>Tidak</button>
          <button className="primary" onClick={m.confirm}>Ya</button>
        </div>
      </div>
    </div>
  );
}

export default App;
