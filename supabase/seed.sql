-- ====================================================================
-- SEED DATA AWAL: SISTEM GUDANG BARCODE KASUR BUSA WIN'S GROUP
-- Status: Bersih / Siap Produksi (Hanya Master Ukuran & Referensi)
-- Data Karyawan, PO, Barang Masuk, Stok Kasur, Barang Keluar, dan Retur KOSONG (0 data)
-- ====================================================================

-- 1. SEED MASTER UKURAN STANDAR (7 Ukuran standar kasur busa Win's Group)
INSERT INTO ukuran (id, kode, nama, panjang_cm, lebar_cm, tebal_cm, aktif)
VALUES
    ('a0000000-0000-0000-0000-000000000001', '200', 'Kasur Busa No. 1 King (200×200 cm)', 200, 200, 20, true),
    ('a0000000-0000-0000-0000-000000000002', '160', 'Kasur Busa No. 3 Queen (160×200 cm)', 200, 160, 20, true),
    ('a0000000-0000-0000-0000-000000000003', '140', 'Kasur Busa No. 3B Double (140×200 cm)', 200, 140, 20, true),
    ('a0000000-0000-0000-0000-000000000004', '120', 'Kasur Busa No. 4 Super Single (120×200 cm)', 200, 120, 15, true),
    ('a0000000-0000-0000-0000-000000000005', '100', 'Kasur Busa No. 4B (100×200 cm)', 200, 100, 15, true),
    ('a0000000-0000-0000-0000-000000000006', '90',  'Kasur Busa No. 5 Single (90×200 cm)', 200, 90, 15, true),
    ('a0000000-0000-0000-0000-000000000007', '80',  'Kasur Busa No. 6 (80×200 cm)', 200, 80, 15, true)
ON CONFLICT (kode) DO NOTHING;

-- 2. SEED PABRIK PEMASOK (Referensi Pemasok)
INSERT INTO pabrik (id, nama, kontak, alamat, aktif)
VALUES
    ('b0000000-0000-0000-0000-000000000001', 'UMKM Comet', '0812-3456-7890 (Bpk. Comet)', 'Sentra Industri Kasur Busa UMKM Comet, Jawa Barat', true),
    ('b0000000-0000-0000-0000-000000000002', 'CV Foam Perkasa Abadi', '0813-9876-5432 (Ibu Maya)', 'Jl. Raya Industri Km 18, Tangerang', true)
ON CONFLICT DO NOTHING;

-- CATATAN:
-- Semua tabel transaksi (purchase_order, po_item, penerimaan, barang, pengeluaran, pengeluaran_item, pengembalian, karyawan, payroll)
-- Dikosongkan agar seluruh data riil diinput langsung oleh Admin melalui aplikasi.
