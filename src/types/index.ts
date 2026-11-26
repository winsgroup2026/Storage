export type UserRole = 'admin' | 'staf_gudang' | 'owner';

export interface UserAccount {
  id: string;
  nama: string;
  email: string;
  role: UserRole;
  jabatan: string;
  password?: string;
  avatar?: string;
}

export const OFFICIAL_ACCOUNTS: UserAccount[] = [
  {
    id: 'usr-admin-1',
    nama: 'Sukesti',
    email: 'sukesti@wins.com',
    role: 'admin',
    jabatan: 'Admin 1 — Win\'s Group',
    password: 'wins123',
  },
  {
    id: 'usr-admin-2',
    nama: 'Deva',
    email: 'deva@wins.com',
    role: 'admin',
    jabatan: 'Admin 2 — Win\'s Group',
    password: 'wins123',
  },
  {
    id: 'usr-owner-1',
    nama: 'Wiwin',
    email: 'wiwin@wins.com',
    role: 'owner',
    jabatan: 'Owner — Win\'s Group',
    password: 'wins123',
  },
  {
    id: 'usr-dev-1',
    nama: 'Raka',
    email: 'raka@wins.com',
    role: 'admin',
    jabatan: 'Developer — Win\'s Group',
    password: 'wins123',
  },
];

export interface Ukuran {
  id: string;
  kode: string; // e.g. '80', '90', '100', '120', '140', '160', '200', atau custom
  nama: string; // e.g. 'Kasur Busa Ukuran 200 (200×200 cm)'
  panjang_cm: number;
  lebar_cm: number;
  tebal_cm?: number;
  aktif: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface Pabrik {
  id: string;
  nama: string;
  kontak: string;
  alamat: string;
  aktif: boolean;
  created_at?: string;
  updated_at?: string;
}

export type PihakTipe = 'pengirim' | 'koordinator' | 'pembeli';

export interface Pihak {
  id: string;
  nama: string;
  telepon: string;
  tipe: PihakTipe;
  aktif: boolean;
  created_at?: string;
  updated_at?: string;
}

export type POStatus = 'draft' | 'dipesan' | 'sebagian_datang' | 'selesai' | 'batal';

export interface POItem {
  id: string;
  po_id: string;
  ukuran_id: string;
  qty_pesan: number;
  qty_diterima: number;
  created_at?: string;
  ukuran?: Ukuran;
}

export interface PurchaseOrder {
  id: string;
  no_po: string;
  pabrik_id: string;
  tanggal_pesan: string;
  status: POStatus;
  catatan?: string;
  dibuat_oleh: string;
  created_at?: string;
  updated_at?: string;
  items?: POItem[];
  pabrik?: Pabrik;
}

export interface Penerimaan {
  id: string;
  po_id?: string;
  no_po?: string;
  tanggal_po?: string;
  tanggal_terima: string;
  penerima: string;
  pabrik_nama?: string;
  pabrik_alamat?: string;
  pabrik_telepon?: string;
  tipe_kasur?: string;
  pembayaran?: string;
  kepada_yth?: string;
  kepada_alamat?: string;
  catatan?: string;
  created_at?: string;
  po?: PurchaseOrder;
  total_pcs?: number;
  total_nominal?: number;
  barcodes?: {
    barcode: string;
    kode_ukuran: string;
    qty: number;
    nama_ukuran?: string;
    tipe?: string;
    harga_satuan?: number;
    subtotal?: number;
  }[];
}

export type BarangStatus = 'di_gudang' | 'keluar' | 'rusak';

export interface Barang {
  id: string;
  barcode: string; // e.g. '200-101126'
  ukuran_id: string;
  po_item_id?: string;
  penerimaan_id: string;
  tanggal_masuk: string;
  status: BarangStatus;
  created_at?: string;
  updated_at?: string;
  ukuran?: Ukuran;
}

export interface StokKelompok {
  barcode: string;
  ukuran_id: string;
  kode_ukuran: string;
  nama_ukuran: string;
  panjang_cm?: number;
  lebar_cm?: number;
  tebal_cm?: number;
  tanggal_masuk: string;
  jumlah_masuk: number;
  sisa_di_gudang: number;
  jumlah_keluar: number;
  jumlah_rusak: number;
  pertama_masuk?: string;
  terakhir_masuk?: string;
}

export type PengeluaranStatus = 'aktif' | 'batal';

export interface PengeluaranItem {
  id: string;
  pengeluaran_id: string;
  barang_id: string;
  barcode_scan: string;
  waktu_scan: string;
  is_batal: boolean;
  pembeli_nama?: string;
  barang?: Barang;
}

export interface Pengeluaran {
  id: string;
  no_surat_jalan: string;
  tanggal: string;
  pengirim_id?: string;
  koordinator_id?: string;
  koordinator_nama?: string;
  pembeli_id?: string;
  pembeli_nama: string;
  keterangan?: string;
  status: PengeluaranStatus;
  alasan_batal?: string;
  dibuat_oleh: string;
  created_at?: string;
  updated_at?: string;
  items?: PengeluaranItem[];
  pengirim?: Pihak;
  koordinator?: Pihak;
  pembeli?: Pihak;
}

// Model untuk Pengembalian Barang (Retur Batal Beli -> Masuk Stok Kembali)
export interface PengembalianItem {
  id: string;
  pengembalian_id: string;
  barcode: string;
  kode_ukuran?: string;
  nama_ukuran?: string;
  qty: number;
}

export interface Pengembalian {
  id: string;
  no_retur: string;
  tanggal: string;
  pembeli_nama: string;
  no_surat_jalan?: string;
  alasan: string;
  petugas: string;
  total_pcs: number;
  items?: PengembalianItem[];
  created_at?: string;
}

export interface AuditLog {
  id: string;
  user_id?: string;
  user_email?: string;
  aksi: string;
  tabel: string;
  record_id?: string;
  data_sebelum?: any;
  data_sesudah?: any;
  waktu: string;
}

export interface ScanItemSummary {
  barcode: string;
  kode_ukuran: string;
  nama_ukuran: string;
  qty: number;
  sisa_stok: number;
  tanggal_masuk: string;
}

// Master Daftar Harga Kasur Busa (HPP) Sesuai Standar Resmi Pabrik Win's Group
export const MASTER_HPP_KASUR: Record<string, number> = {
  '80': 225000,
  '90': 244000,
  '100': 271700,
  '120': 307800,
  '140': 359500,
  '160': 395500,
  '180': 446800,
  '200': 515820,
};

export function getHppKasur(kodeUkuran: string): number {
  if (!kodeUkuran) return 0;
  const clean = kodeUkuran.trim().toUpperCase();
  if (MASTER_HPP_KASUR[clean] !== undefined) {
    return MASTER_HPP_KASUR[clean];
  }
  // Cek jika formatnya "200x80" atau "80x200"
  const digits = clean.match(/(\d+)/g);
  if (digits) {
    for (const d of digits) {
      if (MASTER_HPP_KASUR[d] !== undefined) return MASTER_HPP_KASUR[d];
    }
  }
  return 0;
}

// Preset Ukuran Standar Kasur Sesuai Permintaan User: 80, 90, 100, 120, 140, 160, 180, 200
export const UKURAN_STANDAR_KASUR = [
  { kode: '80', nama: 'Kasur Busa No. 6 (80×200 cm)', panjang_cm: 200, lebar_cm: 80, tebal_cm: 15, hpp: 225000 },
  { kode: '90', nama: 'Kasur Busa No. 5 Single (90×200 cm)', panjang_cm: 200, lebar_cm: 90, tebal_cm: 15, hpp: 244000 },
  { kode: '100', nama: 'Kasur Busa No. 4B (100×200 cm)', panjang_cm: 200, lebar_cm: 100, tebal_cm: 15, hpp: 271700 },
  { kode: '120', nama: 'Kasur Busa No. 4 Super Single (120×200 cm)', panjang_cm: 200, lebar_cm: 120, tebal_cm: 15, hpp: 307800 },
  { kode: '140', nama: 'Kasur Busa No. 3B Double (140×200 cm)', panjang_cm: 200, lebar_cm: 140, tebal_cm: 20, hpp: 359500 },
  { kode: '160', nama: 'Kasur Busa No. 3 Queen (160×200 cm)', panjang_cm: 200, lebar_cm: 160, tebal_cm: 20, hpp: 395500 },
  { kode: '180', nama: 'Kasur Busa No. 2 Queen Extra (180×200 cm)', panjang_cm: 200, lebar_cm: 180, tebal_cm: 20, hpp: 446800 },
  { kode: '200', nama: 'Kasur Busa No. 1 King (200×200 cm)', panjang_cm: 200, lebar_cm: 200, tebal_cm: 20, hpp: 515820 },
] as const;

// ----------------------------------------------------------------------------
// SISTEM PAYROLL & SLIP GAJI KARYAWAN
// ----------------------------------------------------------------------------
export interface Karyawan {
  id: string;
  nik: string;
  nama: string;
  jabatan: string;
  tanggal_masuk: string;
  tanggal_resign?: string;
  gaji_pokok_standar?: number;
  uang_makan_standar?: number;
  transport_standar?: number;
  tunjangan_jabatan_standar?: number;
  tunjangan_operasional_standar?: number;
  aktif: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface PayrollRecord {
  id: string;
  no_slip: string; // mis. SLIP-202611-0001
  periode_bulan: string; // mis. "November 2026"
  tanggal_pembayaran: string; // YYYY-MM-DD

  // Identitas Karyawan
  karyawan_id?: string;
  nik: string;
  nama: string;
  jabatan: string;
  tanggal_masuk: string;
  tanggal_resign?: string;

  // Variabel Pendapatan
  gaji_pokok: number;
  uang_makan: number;
  transport: number;
  tunjangan_jabatan: number;
  tunjangan_operasional: number;
  thr: number;
  lembur: number;
  jumlah_pendapatan: number; // calculated: gjpokok + makan + trans + tjab + topr + thr + lembur

  // Variabel Potongan Absensi
  hari_alpha: number;
  potongan_alpha: number;
  hari_izin: number;
  potongan_izin: number;
  hari_sakit: number;
  potongan_sakit: number;
  hari_wfh: number;
  potongan_wfh: number;
  total_potongan_absensi: number; // alpha + izin + sakit + wfh

  // Variabel Potongan Lainnya
  jamsostek: number;
  bpjs: number;
  pinjaman: number;
  potongan_transport: number;
  total_potongan: number; // total_potongan_absensi + jamsostek + bpjs + pinjaman + potongan_transport

  // Take Home Pay (THP)
  take_home_pay: number; // jumlah_pendapatan - total_potongan

  catatan?: string;
  status: 'draft' | 'disetujui' | 'dibayar';
  dibuat_oleh: string;
  created_at?: string;
  updated_at?: string;
}
