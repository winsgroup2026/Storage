-- ====================================================================
-- MIGRASI DATABASE: SISTEM GUDANG BARCODE KASUR BUSA
-- Versi: 1.1
-- Sesuai PRD Sistem Gudang Barcode — KASUR BUSA (9 November 2026)
-- ====================================================================

-- 1. EXTENSIONS & SEQUENCES
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE SEQUENCE IF NOT EXISTS surat_jalan_seq START WITH 1;
CREATE SEQUENCE IF NOT EXISTS po_number_seq START WITH 1001;

-- 2. MASTER DATA TABLES

-- 2.1 Ukuran Kasur
CREATE TABLE IF NOT EXISTS ukuran (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    kode TEXT NOT NULL UNIQUE, -- Contoh: '200', '180', '160', '120', '90', '200T30'
    nama TEXT NOT NULL, -- Contoh: 'Kasur Busa No. 1 (200x200)'
    panjang_cm NUMERIC NOT NULL,
    lebar_cm NUMERIC NOT NULL,
    tebal_cm NUMERIC,
    aktif BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2.2 Pabrik Supplier
CREATE TABLE IF NOT EXISTS pabrik (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nama TEXT NOT NULL,
    kontak TEXT,
    alamat TEXT,
    aktif BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2.3 Pihak (Pengirim, Koordinator, Pembeli)
CREATE TABLE IF NOT EXISTS pihak (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nama TEXT NOT NULL,
    telepon TEXT,
    tipe TEXT NOT NULL CHECK (tipe IN ('pengirim', 'koordinator', 'pembeli')),
    aktif BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3. TRANSAKSI PURCHASE ORDER (PO) & PENERIMAAN

-- 3.1 Purchase Order
CREATE TABLE IF NOT EXISTS purchase_order (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    no_po TEXT NOT NULL UNIQUE,
    pabrik_id UUID NOT NULL REFERENCES pabrik(id) ON DELETE RESTRICT,
    tanggal_pesan DATE NOT NULL DEFAULT CURRENT_DATE,
    status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'dipesan', 'sebagian_datang', 'selesai', 'batal')),
    catatan TEXT,
    dibuat_oleh TEXT DEFAULT 'Admin',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3.2 PO Item (Ukuran + Qty)
CREATE TABLE IF NOT EXISTS po_item (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    po_id UUID NOT NULL REFERENCES purchase_order(id) ON DELETE CASCADE,
    ukuran_id UUID NOT NULL REFERENCES ukuran(id) ON DELETE RESTRICT,
    qty_pesan INTEGER NOT NULL CHECK (qty_pesan > 0),
    qty_diterima INTEGER NOT NULL DEFAULT 0 CHECK (qty_diterima >= 0),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT unique_po_ukuran UNIQUE (po_id, ukuran_id)
);

-- 3.3 Penerimaan Barang dari PO
CREATE TABLE IF NOT EXISTS penerimaan (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    po_id UUID NOT NULL REFERENCES purchase_order(id) ON DELETE RESTRICT,
    tanggal_terima DATE NOT NULL DEFAULT CURRENT_DATE,
    penerima TEXT NOT NULL,
    catatan TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3.4 Barang Fisik per Pcs
-- Barcode format: {UKURAN}-{DDMMYY} (semua pcs ukuran sama yg diterima pd tgl yg sama berbagi 1 barcode)
CREATE TABLE IF NOT EXISTS barang (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    barcode TEXT NOT NULL,
    ukuran_id UUID NOT NULL REFERENCES ukuran(id) ON DELETE RESTRICT,
    po_item_id UUID REFERENCES po_item(id) ON DELETE SET NULL,
    penerimaan_id UUID NOT NULL REFERENCES penerimaan(id) ON DELETE RESTRICT,
    tanggal_masuk DATE NOT NULL,
    status TEXT NOT NULL DEFAULT 'di_gudang' CHECK (status IN ('di_gudang', 'keluar', 'rusak')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 4. PENGELUARAN (SURAT JALAN & SCAN BARANG KELUAR)

-- 4.1 Pengeluaran
CREATE TABLE IF NOT EXISTS pengeluaran (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    no_surat_jalan TEXT NOT NULL UNIQUE,
    tanggal TIMESTAMPTZ NOT NULL DEFAULT now(),
    pengirim_id UUID REFERENCES pihak(id) ON DELETE SET NULL,
    koordinator_id UUID REFERENCES pihak(id) ON DELETE SET NULL,
    koordinator_nama TEXT,
    pembeli_id UUID REFERENCES pihak(id) ON DELETE SET NULL,
    pembeli_nama TEXT NOT NULL,
    keterangan TEXT,
    status TEXT NOT NULL DEFAULT 'aktif' CHECK (status IN ('aktif', 'batal')),
    alasan_batal TEXT,
    dibuat_oleh TEXT DEFAULT 'Admin',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 4.2 Item Pengeluaran
CREATE TABLE IF NOT EXISTS pengeluaran_item (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pengeluaran_id UUID NOT NULL REFERENCES pengeluaran(id) ON DELETE CASCADE,
    barang_id UUID NOT NULL REFERENCES barang(id) ON DELETE RESTRICT,
    barcode_scan TEXT NOT NULL,
    pembeli_nama TEXT,
    waktu_scan TIMESTAMPTZ NOT NULL DEFAULT now(),
    is_batal BOOLEAN NOT NULL DEFAULT false
);

-- 5. AUDIT LOG & USER ROLES
CREATE TABLE IF NOT EXISTS audit_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id TEXT,
    user_email TEXT,
    aksi TEXT NOT NULL,
    tabel TEXT NOT NULL,
    record_id TEXT,
    data_sebelum JSONB,
    data_sesudah JSONB,
    waktu TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- User Profiles / Roles (opsional terhubung ke auth.users)
CREATE TABLE IF NOT EXISTS user_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT UNIQUE NOT NULL,
    nama TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'staf_gudang' CHECK (role IN ('admin', 'staf_gudang', 'owner')),
    aktif BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ====================================================================
-- 6. INDEKS PERFORMA & CONSTRAINT INTEGRITAS
-- ====================================================================

-- Satu barang hanya boleh berada di satu pengeluaran yang aktif
CREATE UNIQUE INDEX IF NOT EXISTS unique_active_pengeluaran_barang 
ON pengeluaran_item(barang_id) 
WHERE (NOT is_batal);

-- Indeks pencarian dan scan cepat
CREATE INDEX IF NOT EXISTS idx_barang_barcode ON barang(barcode);
CREATE INDEX IF NOT EXISTS idx_barang_status ON barang(status);
CREATE INDEX IF NOT EXISTS idx_barang_barcode_status ON barang(barcode, status);
CREATE INDEX IF NOT EXISTS idx_barang_ukuran_status ON barang(ukuran_id, status);
CREATE INDEX IF NOT EXISTS idx_barang_tanggal_masuk ON barang(tanggal_masuk);
CREATE INDEX IF NOT EXISTS idx_barang_penerimaan ON barang(penerimaan_id);

CREATE INDEX IF NOT EXISTS idx_pengeluaran_tanggal ON pengeluaran(tanggal);
CREATE INDEX IF NOT EXISTS idx_pengeluaran_status ON pengeluaran(status);
CREATE INDEX IF NOT EXISTS idx_pengeluaran_no_sj ON pengeluaran(no_surat_jalan);

CREATE INDEX IF NOT EXISTS idx_audit_log_waktu ON audit_log(waktu DESC);

-- ====================================================================
-- 7. VIEW: STOK KELOMPOK
-- ====================================================================
CREATE OR REPLACE VIEW stok_kelompok AS
SELECT 
    b.barcode,
    b.ukuran_id,
    u.kode AS kode_ukuran,
    u.nama AS nama_ukuran,
    u.panjang_cm,
    u.lebar_cm,
    u.tebal_cm,
    b.tanggal_masuk,
    COUNT(*) AS jumlah_masuk,
    COUNT(*) FILTER (WHERE b.status = 'di_gudang') AS sisa_di_gudang,
    COUNT(*) FILTER (WHERE b.status = 'keluar') AS jumlah_keluar,
    COUNT(*) FILTER (WHERE b.status = 'rusak') AS jumlah_rusak,
    MIN(b.created_at) AS pertama_masuk,
    MAX(b.created_at) AS terakhir_masuk
FROM barang b
JOIN ukuran u ON b.ukuran_id = u.id
GROUP BY b.barcode, b.ukuran_id, u.kode, u.nama, u.panjang_cm, u.lebar_cm, u.tebal_cm, b.tanggal_masuk;

-- ====================================================================
-- 8. RPC FUNCTIONS (PENERIMAAN & PENGELUARAN AMAN BALAPAN)
-- ====================================================================

-- 8.1 Terima Barang Batch dari PO
CREATE OR REPLACE FUNCTION terima_barang_batch(
    p_po_id UUID,
    p_penerima TEXT,
    p_catatan TEXT,
    p_tanggal_terima DATE,
    p_items JSONB -- Array of { po_item_id, ukuran_id, kode_ukuran, qty }
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_penerimaan_id UUID;
    v_item RECORD;
    v_barcode TEXT;
    v_date_str TEXT;
    v_i INTEGER;
    v_total_pcs INTEGER := 0;
    v_unfulfilled_count INTEGER;
    v_barcodes_created JSONB := '[]'::jsonb;
BEGIN
    -- Format tanggal DDMMYY untuk barcode sesuai PRD (contoh 101026)
    v_date_str := to_char(p_tanggal_terima, 'DDMMYY');

    -- Buat record penerimaan
    INSERT INTO penerimaan (po_id, tanggal_terima, penerima, catatan)
    VALUES (p_po_id, p_tanggal_terima, p_penerima, p_catatan)
    RETURNING id INTO v_penerimaan_id;

    -- Iterasi setiap item yang diterima
    FOR v_item IN SELECT * FROM jsonb_to_recordset(p_items) AS (
        po_item_id UUID,
        ukuran_id UUID,
        kode_ukuran TEXT,
        qty INTEGER
    )
    LOOP
        IF v_item.qty > 0 THEN
            v_barcode := v_item.kode_ukuran || '-' || v_date_str;

            -- Masukkan 1 record per pcs
            FOR v_i IN 1..v_item.qty LOOP
                INSERT INTO barang (barcode, ukuran_id, po_item_id, penerimaan_id, tanggal_masuk, status)
                VALUES (v_barcode, v_item.ukuran_id, v_item.po_item_id, v_penerimaan_id, p_tanggal_terima, 'di_gudang');
            END LOOP;

            -- Update qty_diterima di po_item
            UPDATE po_item
            SET qty_diterima = qty_diterima + v_item.qty
            WHERE id = v_item.po_item_id;

            v_total_pcs := v_total_pcs + v_item.qty;

            v_barcodes_created := v_barcodes_created || jsonb_build_object(
                'barcode', v_barcode,
                'kode_ukuran', v_item.kode_ukuran,
                'qty', v_item.qty
            );
        END IF;
    END LOOP;

    -- Cek sisa pesanan di PO untuk update status PO otomatis
    SELECT COUNT(*) INTO v_unfulfilled_count
    FROM po_item
    WHERE po_id = p_po_id AND qty_diterima < qty_pesan;

    IF v_unfulfilled_count = 0 THEN
        UPDATE purchase_order
        SET status = 'selesai', updated_at = now()
        WHERE id = p_po_id;
    ELSE
        UPDATE purchase_order
        SET status = 'sebagian_datang', updated_at = now()
        WHERE id = p_po_id;
    END IF;

    -- Catat ke audit log
    INSERT INTO audit_log (aksi, tabel, record_id, data_sesudah, waktu)
    VALUES (
        'TERIMA_BARANG',
        'penerimaan',
        v_penerimaan_id::text,
        jsonb_build_object(
            'penerimaan_id', v_penerimaan_id,
            'po_id', p_po_id,
            'penerima', p_penerima,
            'total_pcs', v_total_pcs,
            'barcodes', v_barcodes_created
        ),
        now()
    );

    RETURN jsonb_build_object(
        'success', true,
        'penerimaan_id', v_penerimaan_id,
        'total_pcs', v_total_pcs,
        'barcodes', v_barcodes_created
    );
END;
$$;


-- 8.2 Simpan Pengeluaran Barang Keluar (Anti-Balapan dengan FOR UPDATE SKIP LOCKED)
CREATE OR REPLACE FUNCTION simpan_pengeluaran(
    p_pengirim_id UUID,
    p_koordinator_id UUID,
    p_pembeli_id UUID,
    p_pembeli_nama TEXT,
    p_keterangan TEXT,
    p_barcodes TEXT[], -- Array barcode per pcs (mis. ['200-101026', '200-101026', '160-101026'])
    p_dibuat_oleh TEXT DEFAULT 'Admin',
    p_koordinator_nama TEXT DEFAULT NULL,
    p_buyer_names TEXT[] DEFAULT NULL -- Array nama pembeli per pcs (opsional jika multi-buyer)
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_pengeluaran_id UUID;
    v_no_sj TEXT;
    v_code TEXT;
    v_barang_id UUID;
    v_seq_val INTEGER;
    v_total_pcs INTEGER := 0;
    v_allocated_ids UUID[] := ARRAY[]::UUID[];
    v_final_koordinator_nama TEXT := p_koordinator_nama;
    v_idx INTEGER := 1;
    v_item_buyer TEXT;
BEGIN
    IF array_length(p_barcodes, 1) IS NULL OR array_length(p_barcodes, 1) = 0 THEN
        RAISE EXCEPTION 'Daftar barcode scan tidak boleh kosong';
    END IF;

    -- Dapatkan nama koordinator dari pihak jika tidak diketik langsung
    IF v_final_koordinator_nama IS NULL AND p_koordinator_id IS NOT NULL THEN
        SELECT nama INTO v_final_koordinator_nama FROM pihak WHERE id = p_koordinator_id;
    END IF;

    -- Generate nomor surat jalan: SJ-YYYYMMDD-XXXX
    v_seq_val := nextval('surat_jalan_seq');
    v_no_sj := 'SJ-' || to_char(now() AT TIME ZONE 'Asia/Jakarta', 'YYYYMMDD') || '-' || LPAD(v_seq_val::text, 4, '0');

    -- Buat record pengeluaran
    INSERT INTO pengeluaran (
        no_surat_jalan,
        tanggal,
        pengirim_id,
        koordinator_id,
        koordinator_nama,
        pembeli_id,
        pembeli_nama,
        keterangan,
        status,
        dibuat_oleh
    ) VALUES (
        v_no_sj,
        now(),
        p_pengirim_id,
        p_koordinator_id,
        v_final_koordinator_nama,
        p_pembeli_id,
        p_pembeli_nama,
        p_keterangan,
        'aktif',
        p_dibuat_oleh
    )
    RETURNING id INTO v_pengeluaran_id;

    -- Loop setiap scan satu per satu (1 scan = 1 pcs)
    FOREACH v_code IN ARRAY p_barcodes
    LOOP
        -- Tentukan pembeli untuk item ini
        v_item_buyer := p_pembeli_nama;
        IF p_buyer_names IS NOT NULL AND array_length(p_buyer_names, 1) >= v_idx THEN
            IF p_buyer_names[v_idx] IS NOT NULL AND p_buyer_names[v_idx] <> '' THEN
                v_item_buyer := p_buyer_names[v_idx];
            END IF;
        END IF;

        -- Pilih 1 pcs berstatus di_gudang paling lama masuk (FIFO)
        -- Kunci baris dengan FOR UPDATE SKIP LOCKED agar 2 admin tidak konflik
        SELECT id INTO v_barang_id
        FROM barang
        WHERE barcode = v_code 
          AND status = 'di_gudang'
          AND NOT (id = ANY(v_allocated_ids))
        ORDER BY tanggal_masuk ASC, created_at ASC
        LIMIT 1
        FOR UPDATE SKIP LOCKED;

        IF v_barang_id IS NULL THEN
            RAISE EXCEPTION 'Stok untuk barcode % tidak mencukupi atau sedang diproses admin lain', v_code;
        END IF;

        -- Tandai telah dialokasikan
        v_allocated_ids := array_append(v_allocated_ids, v_barang_id);

        -- Masukkan ke pengeluaran_item
        INSERT INTO pengeluaran_item (pengeluaran_id, barang_id, barcode_scan, pembeli_nama, waktu_scan)
        VALUES (v_pengeluaran_id, v_barang_id, v_code, v_item_buyer, now());

        -- Update status barang menjadi keluar
        UPDATE barang
        SET status = 'keluar', updated_at = now()
        WHERE id = v_barang_id;

        v_total_pcs := v_total_pcs + 1;
        v_idx := v_idx + 1;
    END LOOP;

    -- Log ke audit
    INSERT INTO audit_log (aksi, tabel, record_id, data_sesudah, waktu)
    VALUES (
        'SIMPAN_PENGELUARAN',
        'pengeluaran',
        v_pengeluaran_id::text,
        jsonb_build_object(
            'no_surat_jalan', v_no_sj,
            'pembeli_nama', p_pembeli_nama,
            'total_pcs', v_total_pcs,
            'dibuat_oleh', p_dibuat_oleh
        ),
        now()
    );

    RETURN jsonb_build_object(
        'success', true,
        'pengeluaran_id', v_pengeluaran_id,
        'no_surat_jalan', v_no_sj,
        'total_pcs', v_total_pcs
    );
END;
$$;


-- 8.3 Batalkan Transaksi Pengeluaran
CREATE OR REPLACE FUNCTION batalkan_pengeluaran(
    p_pengeluaran_id UUID,
    p_alasan TEXT,
    p_user TEXT DEFAULT 'Admin'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_curr_status TEXT;
    v_no_sj TEXT;
    v_item RECORD;
    v_restored_count INTEGER := 0;
BEGIN
    IF p_alasan IS NULL OR length(trim(p_alasan)) < 3 THEN
        RAISE EXCEPTION 'Alasan pembatalan wajib diisi (minimal 3 karakter)';
    END IF;

    -- Kunci record pengeluaran
    SELECT status, no_surat_jalan INTO v_curr_status, v_no_sj
    FROM pengeluaran
    WHERE id = p_pengeluaran_id
    FOR UPDATE;

    IF v_curr_status IS NULL THEN
        RAISE EXCEPTION 'Transaksi pengeluaran tidak ditemukan';
    END IF;

    IF v_curr_status = 'batal' THEN
        RAISE EXCEPTION 'Transaksi ini sudah dibatalkan sebelumnya';
    END IF;

    -- Kembalikan semua barang ke status di_gudang
    FOR v_item IN 
        SELECT barang_id 
        FROM pengeluaran_item 
        WHERE pengeluaran_id = p_pengeluaran_id AND NOT is_batal
    LOOP
        UPDATE barang
        SET status = 'di_gudang', updated_at = now()
        WHERE id = v_item.barang_id;

        v_restored_count := v_restored_count + 1;
    END LOOP;

    -- Tandai pengeluaran_item sebagai batal
    UPDATE pengeluaran_item
    SET is_batal = true
    WHERE pengeluaran_id = p_pengeluaran_id;

    -- Update status pengeluaran
    UPDATE pengeluaran
    SET status = 'batal',
        alasan_batal = p_alasan,
        updated_at = now()
    WHERE id = p_pengeluaran_id;

    -- Catat di audit log
    INSERT INTO audit_log (aksi, tabel, record_id, data_sesudah, waktu)
    VALUES (
        'BATALKAN_PENGELUARAN',
        'pengeluaran',
        p_pengeluaran_id::text,
        jsonb_build_object(
            'no_surat_jalan', v_no_sj,
            'alasan', p_alasan,
            'restored_pcs', v_restored_count,
            'dibatalkan_oleh', p_user
        ),
        now()
    );

    RETURN jsonb_build_object(
        'success', true,
        'pengeluaran_id', p_pengeluaran_id,
        'no_surat_jalan', v_no_sj,
        'restored_pcs', v_restored_count
    );
END;
$$;

-- ====================================================================
-- 9. ROW LEVEL SECURITY (RLS) POLICIES
-- ====================================================================

ALTER TABLE ukuran ENABLE ROW LEVEL SECURITY;
ALTER TABLE pabrik ENABLE ROW LEVEL SECURITY;
ALTER TABLE pihak ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchase_order ENABLE ROW LEVEL SECURITY;
ALTER TABLE po_item ENABLE ROW LEVEL SECURITY;
ALTER TABLE penerimaan ENABLE ROW LEVEL SECURITY;
ALTER TABLE barang ENABLE ROW LEVEL SECURITY;
ALTER TABLE pengeluaran ENABLE ROW LEVEL SECURITY;
ALTER TABLE pengeluaran_item ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

-- Helper function: Dapatkan role pengguna aktif
CREATE OR REPLACE FUNCTION current_user_role()
RETURNS TEXT
LANGUAGE sql
STABLE
AS $$
    SELECT coalesce(
        current_setting('request.jwt.claims', true)::jsonb ->> 'user_role',
        (SELECT role FROM user_profiles WHERE id = auth.uid() LIMIT 1),
        'admin' -- Fallback default jika diakses dengan anon/service role atau mode lokal
    );
$$;

-- Policy Ukuran: Semua bisa baca, hanya Admin yang bisa ubah/tambah
CREATE POLICY "Semua role dapat melihat ukuran" ON ukuran FOR SELECT USING (true);
CREATE POLICY "Admin dapat mengelola ukuran" ON ukuran FOR ALL USING (current_user_role() = 'admin');

-- Policy Pabrik: Semua bisa baca, hanya Admin yang bisa ubah/tambah
CREATE POLICY "Semua role dapat melihat pabrik" ON pabrik FOR SELECT USING (true);
CREATE POLICY "Admin dapat mengelola pabrik" ON pabrik FOR ALL USING (current_user_role() = 'admin');

-- Policy Pihak: Semua bisa baca & tambah (mis. pembeli baru), Admin bisa update/delete
CREATE POLICY "Semua role dapat melihat pihak" ON pihak FOR SELECT USING (true);
CREATE POLICY "Admin & Staf dapat menambah pihak" ON pihak FOR INSERT WITH CHECK (current_user_role() IN ('admin', 'staf_gudang'));
CREATE POLICY "Admin dapat mengelola pihak" ON pihak FOR UPDATE USING (current_user_role() = 'admin');
CREATE POLICY "Admin dapat menghapus pihak" ON pihak FOR DELETE USING (current_user_role() = 'admin');

-- Policy PO & PO Item
CREATE POLICY "Semua role dapat melihat PO" ON purchase_order FOR SELECT USING (true);
CREATE POLICY "Admin dapat mengelola PO" ON purchase_order FOR ALL USING (current_user_role() = 'admin');

CREATE POLICY "Semua role dapat melihat po_item" ON po_item FOR SELECT USING (true);
CREATE POLICY "Admin & Staf dapat mengelola po_item" ON po_item FOR ALL USING (current_user_role() IN ('admin', 'staf_gudang'));

-- Policy Penerimaan: Semua bisa baca, Admin & Staf bisa tambah, TIDAK ADA yang bisa hapus sembarangan
CREATE POLICY "Semua role dapat melihat penerimaan" ON penerimaan FOR SELECT USING (true);
CREATE POLICY "Admin & Staf dapat mencatat penerimaan" ON penerimaan FOR INSERT WITH CHECK (current_user_role() IN ('admin', 'staf_gudang'));

-- Policy Barang: Semua bisa baca, Admin & Staf bisa insert/update, DILARANG DELETE (Barang tidak pernah dihapus permanen)
CREATE POLICY "Semua role dapat melihat barang" ON barang FOR SELECT USING (true);
CREATE POLICY "Admin & Staf dapat mengelola barang" ON barang FOR INSERT WITH CHECK (current_user_role() IN ('admin', 'staf_gudang'));
CREATE POLICY "Admin & Staf dapat mengupdate barang" ON barang FOR UPDATE USING (current_user_role() IN ('admin', 'staf_gudang'));

-- Policy Pengeluaran & Item:
CREATE POLICY "Semua role dapat melihat pengeluaran" ON pengeluaran FOR SELECT USING (true);
CREATE POLICY "Admin & Staf dapat mencatat pengeluaran" ON pengeluaran FOR INSERT WITH CHECK (current_user_role() IN ('admin', 'staf_gudang'));
CREATE POLICY "Admin dapat membatalkan pengeluaran" ON pengeluaran FOR UPDATE USING (current_user_role() = 'admin');

CREATE POLICY "Semua role dapat melihat pengeluaran_item" ON pengeluaran_item FOR SELECT USING (true);
CREATE POLICY "Admin & Staf dapat menambah pengeluaran_item" ON pengeluaran_item FOR INSERT WITH CHECK (current_user_role() IN ('admin', 'staf_gudang'));
CREATE POLICY "Admin dapat update pengeluaran_item" ON pengeluaran_item FOR UPDATE USING (current_user_role() = 'admin');

-- Policy Audit Log
CREATE POLICY "Semua role dapat melihat audit log" ON audit_log FOR SELECT USING (true);
CREATE POLICY "Sistem & Admin dapat mencatat audit" ON audit_log FOR INSERT WITH CHECK (true);

-- ====================================================================
-- 10. TABEL PENGEMBALIAN BARANG (RETUR BATAL BELI)
-- ====================================================================
CREATE SEQUENCE IF NOT EXISTS retur_seq START WITH 1;

CREATE TABLE IF NOT EXISTS pengembalian (
    id TEXT PRIMARY KEY,
    no_retur TEXT NOT NULL UNIQUE,
    tanggal TIMESTAMPTZ NOT NULL DEFAULT now(),
    pembeli_nama TEXT NOT NULL,
    no_surat_jalan TEXT,
    alasan TEXT NOT NULL,
    petugas TEXT NOT NULL DEFAULT 'Staf Gudang',
    total_pcs INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS pengembalian_item (
    id TEXT PRIMARY KEY,
    pengembalian_id TEXT NOT NULL REFERENCES pengembalian(id) ON DELETE CASCADE,
    barcode TEXT NOT NULL,
    kode_ukuran TEXT,
    nama_ukuran TEXT,
    qty INTEGER NOT NULL DEFAULT 1,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- RPC pulihkan_stok_barang: Mengembalikan kasur berstatus 'keluar' menjadi 'di_gudang'
CREATE OR REPLACE FUNCTION pulihkan_stok_barang(
    p_barcode TEXT,
    p_qty INTEGER
)
RETURNS INTEGER
LANGUAGE plpgsql
AS $$
DECLARE
    v_updated INTEGER := 0;
BEGIN
    WITH candidate AS (
        SELECT id FROM barang
        WHERE barcode = p_barcode AND status = 'keluar'
        LIMIT p_qty
    )
    UPDATE barang
    SET status = 'di_gudang', updated_at = now()
    WHERE id IN (SELECT id FROM candidate);

    GET DIAGNOSTICS v_updated = ROW_COUNT;
    RETURN v_updated;
END;
$$;

ALTER TABLE pengembalian ENABLE ROW LEVEL SECURITY;
ALTER TABLE pengembalian_item ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Semua role dapat melihat pengembalian" ON pengembalian FOR SELECT USING (true);
CREATE POLICY "Admin & Staf dapat mencatat pengembalian" ON pengembalian FOR INSERT WITH CHECK (current_user_role() IN ('admin', 'staf_gudang'));

CREATE POLICY "Semua role dapat melihat item pengembalian" ON pengembalian_item FOR SELECT USING (true);
CREATE POLICY "Admin & Staf dapat mencatat item pengembalian" ON pengembalian_item FOR INSERT WITH CHECK (current_user_role() IN ('admin', 'staf_gudang'));


