-- ====================================================================
-- MIGRASI DATABASE: TABEL KARYAWAN & PAYROLL / SLIP GAJI
-- Versi: 1.0 (21 November 2026)
-- Sistem Manajemen Data Karyawan & Penggajian Win's Group
-- ====================================================================

-- 1. TABEL MASTER KARYAWAN
CREATE TABLE IF NOT EXISTS karyawan (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nik TEXT NOT NULL UNIQUE,
    nama TEXT NOT NULL,
    jabatan TEXT NOT NULL,
    tanggal_masuk DATE NOT NULL DEFAULT CURRENT_DATE,
    tanggal_resign DATE,
    gaji_pokok_standar NUMERIC NOT NULL DEFAULT 0,
    uang_makan_standar NUMERIC NOT NULL DEFAULT 0,
    transport_standar NUMERIC NOT NULL DEFAULT 0,
    tunjangan_jabatan_standar NUMERIC NOT NULL DEFAULT 0,
    tunjangan_operasional_standar NUMERIC NOT NULL DEFAULT 0,
    aktif BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_karyawan_nik ON karyawan(nik);
CREATE INDEX IF NOT EXISTS idx_karyawan_aktif ON karyawan(aktif);
CREATE INDEX IF NOT EXISTS idx_karyawan_nama ON karyawan(nama);

-- 2. TABEL PAYROLL (SLIP GAJI KARYAWAN)
CREATE TABLE IF NOT EXISTS payroll (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    no_slip TEXT NOT NULL UNIQUE,
    periode_bulan TEXT NOT NULL,
    tanggal_pembayaran DATE NOT NULL DEFAULT CURRENT_DATE,
    
    karyawan_id UUID REFERENCES karyawan(id) ON DELETE SET NULL,
    nik TEXT NOT NULL,
    nama TEXT NOT NULL,
    jabatan TEXT NOT NULL,
    tanggal_masuk DATE NOT NULL,
    tanggal_resign DATE,
    
    -- Komponen Pendapatan
    gaji_pokok NUMERIC NOT NULL DEFAULT 0,
    uang_makan NUMERIC NOT NULL DEFAULT 0,
    transport NUMERIC NOT NULL DEFAULT 0,
    tunjangan_jabatan NUMERIC NOT NULL DEFAULT 0,
    tunjangan_operasional NUMERIC NOT NULL DEFAULT 0,
    thr NUMERIC NOT NULL DEFAULT 0,
    lembur NUMERIC NOT NULL DEFAULT 0,
    jumlah_pendapatan NUMERIC NOT NULL DEFAULT 0,
    
    -- Komponen Potongan Absensi
    hari_alpha NUMERIC NOT NULL DEFAULT 0,
    potongan_alpha NUMERIC NOT NULL DEFAULT 0,
    hari_izin NUMERIC NOT NULL DEFAULT 0,
    potongan_izin NUMERIC NOT NULL DEFAULT 0,
    hari_sakit NUMERIC NOT NULL DEFAULT 0,
    potongan_sakit NUMERIC NOT NULL DEFAULT 0,
    hari_wfh NUMERIC NOT NULL DEFAULT 0,
    potongan_wfh NUMERIC NOT NULL DEFAULT 0,
    total_potongan_absensi NUMERIC NOT NULL DEFAULT 0,
    
    -- Komponen Potongan Lainnya
    jamsostek NUMERIC NOT NULL DEFAULT 0,
    bpjs NUMERIC NOT NULL DEFAULT 0,
    pinjaman NUMERIC NOT NULL DEFAULT 0,
    potongan_transport NUMERIC NOT NULL DEFAULT 0,
    total_potongan NUMERIC NOT NULL DEFAULT 0,
    
    -- Take Home Pay (THP)
    take_home_pay NUMERIC NOT NULL DEFAULT 0,
    
    catatan TEXT,
    status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'disetujui', 'dibayar')),
    dibuat_oleh TEXT DEFAULT 'Admin',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_payroll_periode ON payroll(periode_bulan);
CREATE INDEX IF NOT EXISTS idx_payroll_karyawan ON payroll(karyawan_id);
CREATE INDEX IF NOT EXISTS idx_payroll_no_slip ON payroll(no_slip);

-- 3. ROW LEVEL SECURITY (RLS) POLICIES
ALTER TABLE karyawan ENABLE ROW LEVEL SECURITY;
ALTER TABLE payroll ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Akses penuh karyawan untuk publik & terautentikasi" ON karyawan
    FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Akses penuh payroll untuk publik & terautentikasi" ON payroll
    FOR ALL USING (true) WITH CHECK (true);
