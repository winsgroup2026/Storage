# Sistem Gudang Barcode — KASUR BUSA 🛏️📦

Sistem internal logistik & gudang modern untuk toko/distributor kasur busa: mencatat alur barang dari pemesanan ke pabrik (PO) → barang datang & generate barcode otomatis → cetak label stiker/thermal → scan barang keluar ke pembeli dengan surat jalan resmi.

Dirancang sesuai **PRD Sistem Gudang Barcode KASUR BUSA (Versi 1.1)** dengan antarmuka Bahasa Indonesia, mobile-first, dan berjalan pada infrastruktur **Rp0 (Free Tier)**.

---

## 📑 Daftar Isi
1. [Fitur Utama](#-fitur-utama)
2. [Format Barcode & Aturan Alokasi FIFO](#-format-barcode--aturan-alokasi-fifo)
3. [Arsitektur & Tech Stack](#-arsitektur--tech-stack)
4. [Cara Cepat Menjalankan Lokal](#-cara-cepat-menjalankan-lokal)
5. [Panduan Setup Supabase](#-panduan-setup-supabase)
6. [Panduan Deploy ke Cloudflare Pages (Rp0)](#-panduan-deploy-ke-cloudflare-pages-rp0)
7. [GitHub Actions: Backup & Anti-Pause](#-github-actions-backup--anti-pause)
8. [Struktur Kode Project](#-struktur-kode-project)

---

## 🚀 Fitur Utama

- **F1 — Master Data**: Kelola ukuran kasur (panjang, lebar, tebal, kode unik), pabrik supplier (**UMKM Comet**), dan pihak logistik (supir/pengirim: **Rendy Handsome** & **Muji Keren**, koordinator wilayah, pembeli). Pembeli dan koordinator dapat dipilih dari daftar maupun diketik langsung saat transaksi tanpa harus buka menu master.
- **F2 — Purchase Order (PO) Pabrik**: Buat PO multi-item ukuran kasur, lacak status otomatis (*Draft* → *Dipesan* → *Sebagian Datang* → *Selesai*), dan pantau sisa pcs yang belum dikirim pabrik.
- **F3 — Penerimaan Barang**: Terima kiriman dari pabrik (mendukung parsial), buat record 1 baris per pcs dengan barcode `{UKURAN}-{DDMMYY}`, langsung muncul dialog cetak label.
- **F4 — Cetak Label PDF**:
  - **Preset 1 (A4 Stiker)**: 3 kolom × 8 baris (24 label/lembar). Cocok untuk printer kantor biasa.
  - **Preset 2 (Thermal 50×30 mm)**: Roll printer continuous untuk scanner kasir.
  - Gambar barcode Code 128 di-generate di browser (tidak memakan kuota storage cloud).
- **F5 — Scan Barang Keluar**:
  - Tiga mode input: **Scanner USB/Bluetooth** (berperilaku keyboard), **Kamera HP** (html5-qrcode), dan **Input Manual**.
  - **Debounce anti double-scan**: Pembacaan ganda barcode yang sama dalam kurun < 1 detik dianggap 1 scan. Scan setelah jeda 1 detik dihitung sebagai pcs baru.
  - **Feedback audio & haptic**: Nada beep renyah + getar HP saat scan sukses; nada rendah + getar panjang saat error/stok habis.
  - Validasi stok real-time (peringatan merah jika kode tidak dikenal atau stok habis).
  - Alokasi FIFO terproteksi balapan (*race condition*) dengan `FOR UPDATE SKIP LOCKED`.
  - Pilihan Supir (**Rendy Handsome** / **Muji Keren**), Koordinator (bisa pilih dari daftar atau **diketik sendiri**), dan Pembeli (bisa pilih atau **diketik baru**).
  - Terbit nomor Surat Jalan otomatis (`SJ-YYYYMMDD-XXXX`) dan unduh PDF resmi siap tanda tangan.
  - Fitur **Batalkan Transaksi**: Alasan pembatalan wajib diisi, kasur kembali ke status `di_gudang`, tercatat di log.
- **F6 — Dashboard Stok & Trace Barcode**:
  - KPI real-time: Total di gudang, keluar bulan ini, PO dalam perjalanan, kelompok aktif.
  - Tabel stok per ukuran.
  - **Global Barcode Search**: Ketik/scan barcode untuk melihat asal PO, tanggal masuk, sisa stok, dan daftar riwayat surat jalan keluar.
- **F7 — Laporan & Ekspor CSV**:
  - Ekspor CSV Stok Saat Ini.
  - Ekspor CSV Barang Keluar per Periode (filter tanggal, supir, pembeli).
  - Ekspor CSV Penerimaan per PO.
  - Menggunakan format UTF-8 BOM dan pemisah titik-koma (`;`) agar otomatis rapi saat dibuka di Microsoft Excel Indonesia.
- **F8 — Audit Log**: Setiap transaksi buat, ubah, terima, keluar, dan batal tercatat dengan user dan timestamp. Kasur tidak pernah dihapus permanen.
- **F9 — Hak Akses Berbasis Peran**:
  - `admin`: Akses penuh semua fitur, master data, dan pembatalan transaksi.
  - `staf_gudang`: Penerimaan barang, cetak label, scan barang keluar (tanpa hak hapus data).
  - `owner`: Read-only (melihat stok, riwayat surat jalan, dan laporan).

---

## 🏷️ Format Barcode & Aturan Alokasi FIFO

Format Barcode:
```text
{UKURAN}-{DDMMYY}
Contoh: 200-101026
```
- **200**: Kode ukuran kasur dari master data (misal King 200×200 cm).
- **101026**: Tanggal barang diterima di gudang (10 Oktober 2026, zona Asia/Jakarta).
- Semua pcs kasur ukuran sama yang tiba di tanggal yang sama memakai satu barcode kelompok.
- Di database, tiap pcs memiliki `id` (UUID) unik tersendiri.
- Saat scan barang keluar, fungsi RPC mengambil pcs yang **paling lama masuk** terlebih dahulu (FIFO) menggunakan query:
  ```sql
  SELECT id FROM barang 
  WHERE barcode = :code AND status = 'di_gudang'
  ORDER BY tanggal_masuk ASC, created_at ASC
  LIMIT 1
  FOR UPDATE SKIP LOCKED;
  ```
- Partial Unique Index memastikan 1 pcs barang hanya boleh berada di 1 surat jalan aktif:
  ```sql
  CREATE UNIQUE INDEX unique_active_pengeluaran_barang 
  ON pengeluaran_item(barang_id) 
  WHERE (NOT is_batal);
  ```

---

## 🛠️ Arsitektur & Tech Stack

- **Frontend**: React 19 + TypeScript + Vite + Tailwind CSS.
- **Icons & UI**: Lucide React + Tailwind custom color palette (Brand Blue & Warm Neutral).
- **Barcode & PDF**: JsBarcode (Code 128) + jsPDF (preset A4 stiker 3×8 & Thermal 50×30 mm).
- **Kamera Scanner**: html5-qrcode.
- **Audio Feedback**: Web Audio API oscillator synth + `navigator.vibrate`.
- **Database & Backend**: Supabase (PostgreSQL, Row Level Security, RPC Functions, Sequences).
- **Hosting**: Cloudflare Pages (100% gratis, bandwidth aset statis tanpa batas).

---

## 💻 Cara Cepat Menjalankan Lokal

Aplikasi memiliki **Dual Engine**: dapat langsung dicoba dengan data demo lokal (tanpa koneksi internet/Supabase) atau dihubungkan ke Supabase Live!

1. **Clone repository dan install dependensi**:
   ```bash
   cd d:/project/storage
   npm install
   ```

2. **Pengaturan `.env`**:
   File `.env` sudah disiapkan. Secara default:
   ```env
   VITE_SUPABASE_URL=
   VITE_SUPABASE_ANON_KEY=
   VITE_ENABLE_MOCK=true
   ```

3. **Jalankan development server**:
   ```bash
   npm run dev
   ```
   Buka browser di `http://localhost:5173`. Aplikasi langsung aktif dengan data seed (5 ukuran, 2 pabrik, 3 supir, 2 koordinator, dan PO aktif)!

4. **Uji coba pergantian peran**:
   Di header kanan atas terdapat dropdown peran (**Admin**, **Staf Gudang**, **Owner**). Anda dapat mengganti peran kapan saja untuk memvalidasi hak akses.

---

## 🗄️ Panduan Setup Supabase

Untuk beralih dari mode demo lokal ke database Supabase Live:

1. **Buat Project Supabase**:
   - Buka [supabase.com](https://supabase.com) dan buat akun (gratis).
   - Klik **New Project**, pilih Region terdekat (misal: *Singapore*).

2. **Eksekusi Migrasi SQL**:
   - Buka menu **SQL Editor** di dashboard Supabase Anda.
   - Buka file [`supabase/migrations/20261109000000_init_gudang_kasur_busa.sql`](file:///d:/project/storage/supabase/migrations/20261109000000_init_gudang_kasur_busa.sql), salin seluruh isinya, tempel ke SQL Editor, lalu klik **Run**.
   - Ini akan membuat seluruh tabel, view `stok_kelompok`, partial unique index, sequence surat jalan, RLS policies, dan 3 fungsi RPC (`terima_barang_batch`, `simpan_pengeluaran`, `batalkan_pengeluaran`).

3. **Eksekusi Seed Data Contoh**:
   - Di SQL Editor, buka tab baru.
   - Salin isi file [`supabase/seed.sql`](file:///d:/project/storage/supabase/seed.sql), tempel dan klik **Run**.
   - Database sekarang telah terisi 5 ukuran standar, 2 pabrik pemasok, 3 supir pengirim, 2 koordinator, dan contoh PO 50 pcs kasur ukuran 200 (datang 30 pcs tanggal 10/10/2026).

4. **Hubungkan Frontend ke Supabase**:
   - Di dashboard Supabase, buka **Project Settings** → **API**.
   - Salin **Project URL** dan **anon public key**.
   - Buka file `.env` di project lokal Anda:
     ```env
     VITE_SUPABASE_URL=https://xxxxxxxxxxxx.supabase.co
     VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6...
     VITE_ENABLE_MOCK=false
     ```
   - Restart server (`npm run dev`). Status di header akan otomatis berubah menjadi **Supabase Live** (hijau berkedip).

---

## ☁️ Panduan Deploy ke Cloudflare Pages (Rp0)

Cloudflare Pages menyediakan hosting statis gratis dengan bandwidth tanpa batas dan izin komersial.

1. **Push kode ke GitHub**:
   ```bash
   git init
   git add .
   git commit -m "feat: inisialisasi sistem gudang barcode kasur busa"
   git remote add origin https://github.com/USERNAME/REPO_NAME.git
   git branch -M main
   git push -u origin main
   ```

2. **Hubungkan ke Cloudflare Pages**:
   - Buka [dash.cloudflare.com](https://dash.cloudflare.com) → **Workers & Pages** → **Create application** → **Pages** → **Connect to Git**.
   - Pilih repository GitHub Anda.
   - Konfigurasi Build:
     - **Framework preset**: `Vite`
     - **Build command**: `npm run build`
     - **Build output directory**: `dist`
   - Pada bagian **Environment variables**, tambahkan:
     - `VITE_SUPABASE_URL`: URL project Supabase Anda
     - `VITE_SUPABASE_ANON_KEY`: Anon key project Supabase Anda
   - Klik **Save and Deploy**.

3. **Domain**:
   - Aplikasi langsung aktif di subdomain gratis, misalnya `gudang-kasurbusa.pages.dev`.
   - Jika nanti website marketplace live (misal `kasurbusa.com`), cukup tambahkan Custom Domain di Cloudflare Pages menjadi `gudang.kasurbusa.com` (tanpa biaya tambahan).

---

## 🤖 GitHub Actions: Backup & Anti-Pause

Supabase Free Tier memiliki dua batasan penting:
1. *Auto-pause* jika project tidak menerima traffic selama 7 hari (misal saat libur panjang).
2. Tidak ada automated daily backup bawaan pada paket gratis.

Untuk mengatasi ini, dua workflow otomatis sudah disertakan:

### 1. Ping Anti-Pause (`.github/workflows/anti-pause-ping.yml`)
- Berjalan otomatis setiap 3 hari via cron job GitHub Actions.
- Mengirimkan query ringan ke endpoint REST Supabase untuk memastikan database tetap aktif.

### 2. Backup Mingguan Database (`.github/workflows/weekly-backup.yml`)
- Berjalan otomatis setiap Minggu malam (23.00 WIB).
- Mengunduh snapshot seluruh tabel (ukuran, pabrik, pihak, PO, penerimaan, barang, pengeluaran, audit log) dalam format JSON dan menyimpannya ke folder `backups/` di repository privat Anda.

### Cara Mengaktifkan GitHub Actions:
1. Di repository GitHub Anda, buka **Settings** → **Secrets and variables** → **Actions**.
2. Klik **New repository secret**, tambahkan:
   - Name: `SUPABASE_URL` | Secret: `https://xxxxxxxx.supabase.co`
   - Name: `SUPABASE_ANON_KEY` | Secret: *anon public key Anda*

---

## 📂 Struktur Kode Project

```text
storage/
├── .github/
│   └── workflows/
│       ├── anti-pause-ping.yml    # Cron ping penjaga Supabase Free Tier
│       └── weekly-backup.yml      # Cron backup database mingguan
├── supabase/
│   ├── migrations/
│   │   └── 20261109000000_init_gudang_kasur_busa.sql  # Skema lengkap, RLS, & RPC
│   └── seed.sql                   # 5 Ukuran, 2 Pabrik, 3 Pengirim, 2 Koordinator, PO
├── src/
│   ├── components/
│   │   ├── CameraScanner.tsx      # Viewfinder kamera barcode (html5-qrcode)
│   │   └── CetakLabelModal.tsx    # Modal cetak PDF (A4 3x8 stiker & Thermal 50x30)
│   ├── hooks/
│   │   └── useBarcodeScanner.ts   # Listener scanner USB + debounce 1s
│   ├── lib/
│   │   └── supabase.ts            # Client Supabase & auto-detect koneksi
│   ├── services/
│   │   └── api.ts                 # Dual-engine API (Supabase RPC + Local Storage Fallback)
│   ├── types/
│   │   └── index.ts               # TypeScript interfaces
│   ├── utils/
│   │   ├── feedback.ts            # Web Audio API synth beep & haptic vibrate
│   │   ├── labelGenerator.ts      # Generator Code 128 & jsPDF preset
│   │   └── suratJalanPdf.ts       # Generator PDF Surat Jalan resmi
│   ├── views/
│   │   ├── DashboardView.tsx      # Ringkasan KPI, stok ukuran, & trace barcode
│   │   ├── BarangKeluarView.tsx   # Stasiun scan keluar, FIFO lock, Surat Jalan
│   │   ├── PenerimaanView.tsx     # Terima barang PO & generate barcode
│   │   ├── PurchaseOrderView.tsx  # CRUD PO pabrik & sisa pemenuhan
│   │   ├── MasterDataView.tsx     # Kelola Ukuran, Pabrik, & Pihak
│   │   ├── LaporanView.tsx        # Ekspor CSV (Stok, Mutasi Keluar, Penerimaan)
│   │   └── AuditLogView.tsx       # Audit trail aktivitas pengguna
│   ├── App.tsx                    # Main Layout, Header, Mobile Bottom Nav, Role Switcher
│   ├── main.tsx                   # Entry point React
│   └── index.css                  # Tailwind CSS styling & print rules
├── .env.example                   # Template environment variables
├── .env                           # Konfigurasi aktif lokal
├── tailwind.config.js             # Styling tema KASUR BUSA
├── vite.config.ts                 # Vite bundler config
└── package.json                   # Dependensi project
```

---

## 🎯 Kriteria Penerimaan Sesuai PRD — Terverifikasi

1. **PO 50 pcs ukuran 200, menerima 30 pcs pada 10 Oktober 2026**:
   - Status PO otomatis menjadi `Sebagian datang`.
   - Terbit 30 record pcs berkode `200-101026`.
   - Sisa 20 pcs tetap menggantung di PO.
2. **Menerima 10 pcs berikutnya di hari yang sama**:
   - Barcode tetap `200-101026` dan stok kode menjadi 40 pcs.
   - Bila diterima di hari lain (misal 11 Oktober 2026), kodenya otomatis `200-111026`.
3. **Scan `200-101026` tiga kali di Barang Keluar**:
   - Terhitung 3 pcs, stok berkurang 3, muncul di riwayat surat jalan.
4. **Scan kode yang stoknya habis / tidak dikenal**:
   - Ditolak dengan pesan merah dan nada beep error.
5. **Akses Berdasarkan Peran**:
   - Staf gudang tidak dapat menghapus data atau membatalkan surat jalan.
   - Owner hanya dapat membaca data (*read-only*).
6. **Ekspor CSV**:
   - Menghasilkan file CSV bersih yang kompatibel dengan Excel Indonesia.
7. **Anti Balapan (Race Condition)**:
   - Menggunakan query `SELECT ... FOR UPDATE SKIP LOCKED` di sisi database sehingga 2 admin yang scan bersamaan tidak akan mengambil pcs yang sama dan stok tidak pernah minus.

---

Disusun untuk: **Raka** · Versi 1.1 · 9 November 2026 · **KASUR BUSA**
