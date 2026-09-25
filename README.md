# GymFlow Admin

Frontend React untuk Master Ruangan, Device, Unit Bisnis, Layanan, dan Paket. Data disimpan pada localStorage browser; tidak ada API/backend.

## Menjalankan aplikasi

```powershell
cd D:\download\gym-admin
npm run dev
```

Buka alamat lokal yang ditampilkan Vite. Untuk build production:

```powershell
npm run build
npm run preview
```

## Uji alur utama

- Buat Ruangan, pilih beberapa akses, dan cek checkbox kondisional untuk Manual atau Excel Door Lock. Edit simulasi standby, lalu coba nonaktifkan ruangan.
- Buat Device dan reader. Coba SN sama pada dua reader, MAC dengan format salah, pemindahan ruangan, dan penonaktifan saat layanan memiliki sesi aktif.
- Buat Unit Bisnis. Unit `Fitness` pada data awal sudah berelasi dengan Layanan sehingga penghapusan ditolak.
- Buat/edit Layanan. Ganti metode booking untuk melihat field kondisional; ubah simulasi member aktif/sesi/jadwal lalu uji penonaktifan atau perubahan ruangan.
- Buat Paket Tunggal atau Bundling, pilih layanan, dan sesuaikan alokasi dengan harga. `Gym Basic` pada data awal sudah terjual, sehingga dapat dipakai untuk memeriksa batas edit dan penolakan delete.
- Coba search, filter, reset, klik judul kolom untuk sorting, dan pagination. Refresh halaman untuk memastikan perubahan tersimpan.

Seed hanya dibuat untuk key localStorage yang belum ada. Untuk mengulang dari data awal, hapus key `gym_master_*` dari localStorage browser lalu refresh.

## Batas simulasi

Master Club dan Pegawai menggunakan data seed. Status sesi, member aktif, jadwal mendatang, jumlah terjual, dan koneksi device adalah data simulasi frontend. Tidak ada transaksi penjualan, jadwal kelas, atau identitas member; karena itu aturan yang memerlukan data transaksi/member nyata hanya dapat dicoba memakai nilai simulasi tersimpan. LocalStorage berlaku untuk browser/profil yang sama dan bukan pengganti penyimpanan backend bersama.
