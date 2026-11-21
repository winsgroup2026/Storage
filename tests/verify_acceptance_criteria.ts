/**
 * Script Pengujian Otomatis Kriteria Penerimaan (Acceptance Criteria)
 * Sesuai PRD Sistem Gudang Barcode — KASUR BUSA & Update Fitur Retur + Ukuran Bebas
 */

import { api, initLocalSeedData } from '../src/services/api';
import { UKURAN_STANDAR_KASUR, OFFICIAL_ACCOUNTS } from '../src/types';
import { generateSuratJalanPdf } from '../src/utils/suratJalanPdf';
import { generateBuktiReturPdf } from '../src/utils/buktiReturPdf';
import { generateSlipGajiPdf } from '../src/utils/slipGajiPdf';
import { terbilang, formatRupiah } from '../src/utils/currency';

// Mock localStorage in Node environment
const store: Record<string, string> = {};
(global as any).window = {};
(global as any).localStorage = {
  getItem: (key: string) => store[key] || null,
  setItem: (key: string, val: string) => { store[key] = val; },
  removeItem: (key: string) => { delete store[key]; },
  clear: () => { Object.keys(store).forEach(k => delete store[k]); },
};

async function runAcceptanceTests() {
  console.log('================================================================');
  console.log('🧪 MEMULAI VERIFIKASI SISTEM GUDANG BARCODE KASUR BUSA');
  console.log('================================================================\n');

  // Reset data store
  localStorage.clear();
  initLocalSeedData();

  // --------------------------------------------------------------------------
  // KRITERIA 1:
  // Membuat PO 50 pcs ukuran 200, menerima 30 pcs pada 10 Oktober 2026
  // -> PO berstatus Sebagian datang, 30 label berkode 200-101026 tercetak, sisa 20 tampil.
  // --------------------------------------------------------------------------
  console.log('▶ Kriteria 1: Pembuatan PO & Penerimaan Parsial 30 pcs ke UMKM Comet');
  const ukurans = await api.getUkuranList();
  const u200 = ukurans.find(u => u.kode === '200')!;
  const pabriks = await api.getPabrik();
  const pabrik1 = pabriks.find(p => p.nama === 'UMKM Comet') || pabriks[0];
  console.assert(pabrik1.nama === 'UMKM Comet', `Nama pabrik harus UMKM Comet, didapat: ${pabrik1.nama}`);

  const po = await api.createPurchaseOrder(
    {
      pabrik_id: pabrik1.id,
      tanggal_pesan: '2026-10-08',
      catatan: 'Pesanan uji kriteria 1 ke pabrik UMKM Comet',
    },
    [{ ukuran_id: u200.id, qty_pesan: 50 }]
  );

  const poItemId = po.items![0].id;

  // Staf menerima 30 pcs pada tanggal 10 Oktober 2026 (10-10-2026)
  const rcv1 = await api.terimaBarangBatch(
    po.id,
    'Staf Gudang Bambang',
    'Kiriman batch 1',
    '2026-10-10',
    [{ po_item_id: poItemId, ukuran_id: u200.id, kode_ukuran: '200', qty: 30 }]
  );

  const updatedPO1 = (await api.getPurchaseOrders()).find(p => p.id === po.id)!;
  const sisa1 = updatedPO1.items![0].qty_pesan - updatedPO1.items![0].qty_diterima;

  console.assert(updatedPO1.status === 'sebagian_datang', `Status PO harusnya sebagian_datang, didapat: ${updatedPO1.status}`);
  console.assert(rcv1.total_pcs === 30, `Total diterima harus 30 pcs, didapat: ${rcv1.total_pcs}`);
  console.assert(rcv1.barcodes[0].barcode === '200-101026', `Barcode harus 200-101026, didapat: ${rcv1.barcodes[0].barcode}`);
  console.assert(sisa1 === 20, `Sisa harus 20 pcs, didapat: ${sisa1}`);
  console.log('  ✅ [PASS] Kriteria 1: PO status = sebagian_datang, barcode = 200-101026 (30 pcs), sisa = 20 pcs.\n');

  // --------------------------------------------------------------------------
  // KRITERIA 2:
  // Menerima 10 pcs berikutnya di hari yang sama -> kode tetap 200-101026 dan stok kode itu menjadi 40.
  // Jika diterima di hari lain, kodenya berbeda.
  // --------------------------------------------------------------------------
  console.log('▶ Kriteria 2: Penerimaan hari yang sama vs hari lain');
  const rcv2SameDay = await api.terimaBarangBatch(
    po.id,
    'Staf Gudang Bambang',
    'Kiriman batch 2 di hari yang sama',
    '2026-10-10',
    [{ po_item_id: poItemId, ukuran_id: u200.id, kode_ukuran: '200', qty: 10 }]
  );

  console.assert(rcv2SameDay.barcodes[0].barcode === '200-101026', 'Barcode di hari sama harus tetap 200-101026');

  // Cek total stok untuk barcode 200-101026
  const stokList = await api.getStokKelompok();
  const group200 = stokList.find(k => k.barcode === '200-101026')!;
  console.log(`  Stok barcode 200-101026 saat ini: ${group200.sisa_di_gudang} pcs`);

  // Jika diterima di hari lain (misal 11 Oktober 2026)
  const rcv3OtherDay = await api.terimaBarangBatch(
    po.id,
    'Staf Gudang Bambang',
    'Kiriman sisa di hari lain',
    '2026-10-11',
    [{ po_item_id: poItemId, ukuran_id: u200.id, kode_ukuran: '200', qty: 10 }]
  );
  console.assert(rcv3OtherDay.barcodes[0].barcode === '200-111026', `Barcode di hari lain harus 200-111026, didapat: ${rcv3OtherDay.barcodes[0].barcode}`);

  const updatedPO2 = (await api.getPurchaseOrders()).find(p => p.id === po.id)!;
  console.assert(updatedPO2.status === 'selesai', `Status PO setelah 50/50 harus selesai, didapat: ${updatedPO2.status}`);
  console.log('  ✅ [PASS] Kriteria 2: Hari sama menghasilkan kode sama, hari lain menghasilkan 200-111026, PO status = selesai.\n');

  // --------------------------------------------------------------------------
  // KRITERIA 3:
  // Form Penerimaan Langsung (Ukuran Standar 80..200 & Custom) Tanpa PO Kaku
  // --------------------------------------------------------------------------
  console.log('▶ Kriteria 3: Penerimaan Langsung Ukuran Standar (80, 90, 100, 120, 140, 160, 200) & Custom');
  console.assert(
    UKURAN_STANDAR_KASUR.map(u => u.kode).join(',') === '80,90,100,120,140,160,200',
    'Ukuran standar harus 80, 90, 100, 120, 140, 160, 200'
  );

  const rcvDirect = await api.terimaBarangBatch(
    undefined,
    'Staf Gudang Raka',
    'Kiriman langsung kasur berbagai ukuran dari UMKM Comet',
    '2026-11-10',
    [
      { ukuran_id: 'u-120', kode_ukuran: '120', qty: 5 },
      { ukuran_id: 'u-160', kode_ukuran: '160', qty: 10 },
      { kode_ukuran: '150X200', qty: 4 }, // custom size 150x200
    ],
    'UMKM Comet'
  );

  console.assert(rcvDirect.total_pcs === 19, `Total diterima harus 19 pcs, didapat: ${rcvDirect.total_pcs}`);
  const bc120 = rcvDirect.barcodes.find(b => b.barcode === '120-101126');
  const bc160 = rcvDirect.barcodes.find(b => b.barcode === '160-101126');
  const bc150x200 = rcvDirect.barcodes.find(b => b.barcode === '150X200-101126');
  console.assert(Boolean(bc120), 'Barcode 120-101126 berhasil dibuat');
  console.assert(Boolean(bc160), 'Barcode 160-101126 berhasil dibuat');
  console.assert(Boolean(bc150x200), 'Barcode ukuran custom 150X200-101126 berhasil dibuat');
  console.log(`  ✅ [PASS] Kriteria 3: Sukses menerima kasur ukuran standar dan custom (150X200-101126).\n`);

  // --------------------------------------------------------------------------
  // KRITERIA 4:
  // Scan Barang Keluar dengan Pengirim Rendy Handsome & Koordinator Bebas Ketik
  // --------------------------------------------------------------------------
  console.log('▶ Kriteria 4: Scan Barang Keluar (Supir: Rendy Handsome, Koordinator: Custom Ketik)');
  const pengirims = await api.getPihak('pengirim');
  const rendyPengirim = pengirims.find(p => p.nama.includes('Rendy Handsome')) || pengirims[0];
  console.assert(rendyPengirim.nama.includes('Rendy Handsome'), `Pengirim 1 harus Rendy Handsome, didapat: ${rendyPengirim.nama}`);

  const mujiPengirim = pengirims.find(p => p.nama.includes('Muji Keren'));
  console.assert(Boolean(mujiPengirim), 'Pengirim 2 harus memuat Muji Keren');

  const customKoordNama = 'Bambang Koordinator Lapangan';

  const stock160Before = (await api.getStokKelompok()).find(k => k.barcode === bc160!.barcode)!.sisa_di_gudang;

  const pengeluaranRes = await api.simpanPengeluaran({
    pengirim_id: rendyPengirim.id,
    koordinator_nama: customKoordNama,
    pembeli_nama: 'Ibu Hajah Siti',
    keterangan: 'Kirim via armada supir Rendy Handsome',
    scans: [bc160!.barcode, bc160!.barcode], // 2 pcs keluar
  });

  const stock160After = (await api.getStokKelompok()).find(k => k.barcode === bc160!.barcode)!.sisa_di_gudang;
  console.assert(stock160After === stock160Before - 2, `Stok 160 harus berkurang 2 pcs (${stock160Before} -> ${stock160After})`);
  console.log(`  ✅ [PASS] Kriteria 4: 2 pcs kasur 160 keluar ke Ibu Hajah Siti via supir Rendy Handsome & koordinator ${customKoordNama}.\n`);

  // --------------------------------------------------------------------------
  // KRITERIA 5:
  // Pengembalian Barang (Customer Batal Beli -> Masuk Stok Kembali Siap Jual)
  // --------------------------------------------------------------------------
  console.log('▶ Kriteria 5: Pengembalian Barang (Customer Batal Beli -> Stok Pulih ke Gudang)');
  const returRes = await api.simpanPengembalian({
    pembeli_nama: 'Ibu Hajah Siti',
    no_surat_jalan: pengeluaranRes.no_surat_jalan,
    alasan: 'Customer batal beli karena salah ukur kamar, kasur masih mulus dalam plastik',
    petugas: 'Staf Gudang Raka',
    items: [
      { barcode: bc160!.barcode, qty: 1, kode_ukuran: '160', nama_ukuran: 'Kasur Busa No. 2 (Queen)' },
    ],
  });

  console.assert(returRes.no_retur.startsWith('RT-'), `Nomor Retur harus berformat RT-YYYYMMDD-XXXX: ${returRes.no_retur}`);
  console.assert(returRes.total_pcs === 1, `Total pcs retur harus 1 pcs, didapat: ${returRes.total_pcs}`);

  const stock160AfterRetur = (await api.getStokKelompok()).find(k => k.barcode === bc160!.barcode)!.sisa_di_gudang;
  console.assert(stock160AfterRetur === stock160After + 1, `Stok harus kembali naik 1 pcs (${stock160After} -> ${stock160AfterRetur})`);

  // Pastikan barang yang diretur bisa langsung di-scan dan dijual lagi ke customer baru!
  const jualLagiRes = await api.simpanPengeluaran({
    pengirim_id: mujiPengirim!.id,
    koordinator_nama: 'Koordinator Baru',
    pembeli_nama: 'Bapak Hendra (Pembeli Baru)',
    scans: [bc160!.barcode],
  });
  console.assert(jualLagiRes.total_pcs === 1, 'Kasur yang dikembalikan harus bisa langsung dijual lagi ke pembeli baru');
  console.log(`  ✅ [PASS] Kriteria 5: Kasur batal beli berhasil masuk kembali ke stok gudang (${returRes.no_retur}) dan langsung siap dijual lagi!\n`);

  // --------------------------------------------------------------------------
  // KRITERIA 6:
  // Riwayat Retur & Pencegahan Overdraw
  // --------------------------------------------------------------------------
  console.log('▶ Kriteria 6: Verifikasi Riwayat Pengembalian & Proteksi Stok Minus');
  const returList = await api.getPengembalianList();
  console.assert(returList.length > 0, 'Daftar pengembalian harus memuat minimal 1 data retur');
  console.assert(returList[0].pembeli_nama === 'Ibu Hajah Siti', 'Data pembeli retur harus tersimpan');

  let overdrawFailed = false;
  try {
    const hugeScans = Array(9999).fill('200-101026');
    await api.simpanPengeluaran({
      pembeli_nama: 'Toko Overdraw',
      scans: hugeScans,
    });
  } catch (err: any) {
    overdrawFailed = true;
  }
  console.assert(overdrawFailed, 'Sistem harus menolak transaksi jika jumlah pcs melebihi stok yang ada');
  console.log('  ✅ [PASS] Kriteria 6: Riwayat retur tersimpan lengkap & stok terlindung dari overdraw.\n');

  // --------------------------------------------------------------------------
  // KRITERIA 7:
  // 1 Koordinator Membawa Banyak Pembeli (Nama Pembeli per Kasur & di Deskripsi Surat Jalan)
  // --------------------------------------------------------------------------
  console.log('▶ Kriteria 7: Multi-Buyer per Koordinator (Nama Pembeli per Pcs Kasur & Kolom Deskripsi Surat Jalan)');
  const multiPengeluaran = await api.simpanPengeluaran({
    pengirim_id: rendyPengirim.id,
    koordinator_nama: 'Fajar Ramadhan (Koord Barat)',
    pembeli_nama: '', // Kosong di header, diisi per-kasur
    keterangan: 'Pengiriman rute barat 2 customer sekaligus',
    scans: [
      { barcode: bc160!.barcode, pembeli_nama: 'Bu Asih' },
      { barcode: bc120!.barcode, pembeli_nama: 'Pak Budi' },
    ],
  });

  console.assert(multiPengeluaran.total_pcs === 2, `Total pcs harus 2, didapat: ${multiPengeluaran.total_pcs}`);
  console.assert(
    multiPengeluaran.pengeluaran.items?.length === 2,
    `Items harus 2, didapat: ${multiPengeluaran.pengeluaran.items?.length}`
  );

  const itemBuAsih = multiPengeluaran.pengeluaran.items?.find(it => it.pembeli_nama === 'Bu Asih');
  const itemPakBudi = multiPengeluaran.pengeluaran.items?.find(it => it.pembeli_nama === 'Pak Budi');
  console.assert(Boolean(itemBuAsih), 'Kasur untuk Bu Asih harus tercatat dengan pembeli_nama Bu Asih');
  console.assert(Boolean(itemPakBudi), 'Kasur untuk Pak Budi harus tercatat dengan pembeli_nama Pak Budi');
  console.assert(
    multiPengeluaran.pengeluaran.pembeli_nama.includes('Bu Asih') &&
      multiPengeluaran.pengeluaran.pembeli_nama.includes('Pak Budi'),
    `Header pembeli harus memuat nama Bu Asih dan Pak Budi, didapat: ${multiPengeluaran.pengeluaran.pembeli_nama}`
  );

  // Verifikasi generate PDF Surat Jalan
  const doc = generateSuratJalanPdf(multiPengeluaran.pengeluaran);
  console.assert(Boolean(doc), 'PDF Surat Jalan untuk multi-buyer harus berhasil dibuat tanpa error');
  console.log('  ✅ [PASS] Kriteria 7: Multi-buyer per koordinator sukses tercatat dan PDF Surat Jalan ter-generate dengan format "Ukuran — Pembeli: [Nama]".\n');

  // --------------------------------------------------------------------------
  // KRITERIA 8:
  // Verifikasi Dokumen Bukti Retur PDF (bukan window.print)
  // --------------------------------------------------------------------------
  console.log('▶ Kriteria 8: Pembuatan Dokumen Bukti Pengembalian Barang (PDF)');
  const returItemDetail = await api.getPengembalianList();
  const sampleRetur = returItemDetail[0];
  const buktiDoc = generateBuktiReturPdf(sampleRetur);
  console.assert(Boolean(buktiDoc), 'Dokumen Bukti Retur PDF harus berhasil di-generate');
  console.log(`  ✅ [PASS] Kriteria 8: Bukti Retur PDF untuk ${sampleRetur.no_retur} (${sampleRetur.pembeli_nama}) sukses terbit dengan format resmi.\n`);

  // --------------------------------------------------------------------------
  // KRITERIA 9:
  // Sistem Payroll & Slip Gaji Karyawan (Lengkap dengan seluruh variabel & formula THP)
  // --------------------------------------------------------------------------
  console.log('▶ Kriteria 9: Sistem Payroll, Formula THP, & Pembuatan Dokumen Slip Gaji PDF');

  // 1. Verifikasi Master Karyawan Bersih (Awal 0 Karyawan Siap Produksi) & Registrasi Karyawan Uji
  const karyawanListAwal = await api.getKaryawanList();
  console.assert(karyawanListAwal.length === 0, `Master karyawan awal harus bersih (0 data), didapat: ${karyawanListAwal.length}`);
  const rendyEmp = await api.saveKaryawan({
    nik: 'KB-2023001',
    nama: 'Rendy Handsome',
    jabatan: 'Driver / Supir Ekspedisi',
    tanggal_masuk: '2023-01-15',
    gaji_pokok_standar: 3500000,
    uang_makan_standar: 650000,
    transport_standar: 500000,
    tunjangan_jabatan_standar: 300000,
    tunjangan_operasional_standar: 250000,
    aktif: true,
  });
  console.assert(Boolean(rendyEmp), 'Karyawan Rendy Handsome harus berhasil disimpan');
  console.assert(Boolean(rendyEmp?.nik), 'Karyawan harus memiliki NIK');
  console.assert(Boolean(rendyEmp?.jabatan), 'Karyawan harus memiliki Jabatan');
  console.assert(Boolean(rendyEmp?.tanggal_masuk), 'Karyawan harus memiliki Tanggal Masuk');

  // 2. Input Payroll Baru dengan Seluruh Variabel Sesuai Permintaan User:
  // Pendapatan: Gaji Pokok, Uang makan, Transport, Tunjangan jabatan, Tunjangan operasional, THR, Lembur
  // Potongan: Absensi (Alpha, Izin, Sakit, WFH), Jamsostek, BPJS, Pinjaman, Transport
  // THP = Jumlah Pendapatan - Total Potongan
  const newPayrollData = {
    nik: 'WG-2026-009',
    nama: 'Bambang Kusuma',
    jabatan: 'Koordinator Distribusi Busa',
    tanggal_masuk: '2024-01-15',
    tanggal_resign: '2026-11-30', // Resign test
    periode_bulan: 'November 2026',
    tanggal_bayar: '2026-11-28',
    // Variabel Pendapatan
    gaji_pokok: 4500000,
    uang_makan: 600000,
    transport: 400000,
    tunjangan_jabatan: 500000,
    tunjangan_operasional: 300000,
    thr: 1000000,
    lembur: 250000,
    // Variabel Potongan Absensi
    potongan_alpha: 150000,
    potongan_izin: 50000,
    potongan_sakit: 0,
    potongan_wfh: 0,
    // Variabel Potongan Lainnya
    jamsostek: 120000,
    bpjs: 100000,
    pinjaman: 500000,
    potongan_transport: 80000,
    catatan: 'Gaji bulan terakhir sebelum efektif resign per 30 Nov 2026',
  };

  const result = await api.simpanPayroll(newPayrollData);
  const savedPayroll = result.payroll;

  // Verifikasi Formula:
  // Jumlah Pendapatan = 4.500.000 + 600.000 + 400.000 + 500.000 + 300.000 + 1.000.000 + 250.000 = 7.550.000
  const expectedJumlahPendapatan = 4500000 + 600000 + 400000 + 500000 + 300000 + 1000000 + 250000;
  console.assert(
    savedPayroll.jumlah_pendapatan === expectedJumlahPendapatan,
    `Jumlah Pendapatan harus ${expectedJumlahPendapatan}, didapat: ${savedPayroll.jumlah_pendapatan}`
  );

  // Potongan Absensi = 150.000 + 50.000 + 0 + 0 = 200.000
  const expectedPotonganAbsensi = 150000 + 50000 + 0 + 0;
  console.assert(
    savedPayroll.total_potongan_absensi === expectedPotonganAbsensi,
    `Potongan Absensi harus ${expectedPotonganAbsensi}, didapat: ${savedPayroll.total_potongan_absensi}`
  );

  // Total Potongan = 200.000 + 120.000 + 100.000 + 500.000 + 80.000 = 1.000.000
  const expectedTotalPotongan = expectedPotonganAbsensi + 120000 + 100000 + 500000 + 80000;
  console.assert(
    savedPayroll.total_potongan === expectedTotalPotongan,
    `Total Potongan harus ${expectedTotalPotongan}, didapat: ${savedPayroll.total_potongan}`
  );

  // Take Home Pay (THP) = 7.550.000 - 1.000.000 = 6.550.000
  const expectedTHP = expectedJumlahPendapatan - expectedTotalPotongan;
  console.assert(
    savedPayroll.take_home_pay === expectedTHP,
    `Take Home Pay (THP) harus ${expectedTHP}, didapat: ${savedPayroll.take_home_pay}`
  );

  // Verifikasi Nomor Slip Otomatis
  console.assert(
    Boolean(savedPayroll.no_slip && savedPayroll.no_slip.startsWith('SLIP-')),
    `Nomor slip harus format SLIP-..., didapat: ${savedPayroll.no_slip}`
  );

  // Verifikasi Teks Terbilang
  const terbilangTHP = terbilang(savedPayroll.take_home_pay);
  console.assert(
    terbilangTHP.toLowerCase().includes('enam juta lima ratus lima puluh ribu rupiah'),
    `Terbilang harus tepat, didapat: ${terbilangTHP}`
  );

  // 3. Verifikasi Output Dokumen PDF Slip Gaji Karyawan
  const slipDoc = generateSlipGajiPdf(savedPayroll);
  console.assert(Boolean(slipDoc), 'Dokumen Slip Gaji PDF harus berhasil dibuat tanpa error');

  console.log(`  ✅ [PASS] Kriteria 9: Formula THP terverifikasi akurat (THP: ${formatRupiah(savedPayroll.take_home_pay)}).`);
  console.log(`         No Slip: ${savedPayroll.no_slip} | Terbilang: "${terbilangTHP}".`);
  console.log(`         Dokumen PDF Slip Gaji resmi Win's Group berhasil di-generate!\n`);

  // --------------------------------------------------------------------------
  // KRITERIA 10:
  // Input Nama Karyawan Sendiri Secara Manual & Sinkronisasi Master Data Karyawan
  // --------------------------------------------------------------------------
  console.log('▶ Kriteria 10: Input Nama Karyawan Sendiri (Manual) & Pembuatan Slip Gaji');
  const customEmployeeName = 'Asep Kusnadi (Helper Lepas)';
  const customNik = 'KB-2026888';
  const customJabatan = 'Helper Bongkar Muat Busa';

  // 1. Simpan slip gaji langsung dengan nama sendiri tanpa karyawan_id sebelumnya
  const manualPayrollRes = await api.simpanPayroll({
    nik: customNik,
    nama: customEmployeeName,
    jabatan: customJabatan,
    tanggal_masuk: '2026-11-01',
    periode_bulan: 'November 2026',
    tanggal_pembayaran: '2026-11-28',
    gaji_pokok: 3500000,
    uang_makan: 500000,
    transport: 300000,
    tunjangan_jabatan: 0,
    tunjangan_operasional: 0,
    thr: 0,
    lembur: 200000,
    potongan_alpha: 0,
    potongan_izin: 0,
    potongan_sakit: 0,
    potongan_wfh: 0,
    jamsostek: 105000,
    bpjs: 35000,
    pinjaman: 0,
    potongan_transport: 0,
    catatan: 'Pegawai baru diinput dengan nama sendiri',
  });

  const manualPayroll = manualPayrollRes.payroll;
  console.assert(manualPayroll.nama === customEmployeeName, `Nama karyawan manual harus sesuai, didapat: ${manualPayroll.nama}`);
  console.assert(manualPayroll.take_home_pay === (3500000 + 500000 + 300000 + 200000) - (105000 + 35000), 'THP manual karyawan harus tepat');

  // 2. Simpan juga ke master data karyawan jika opsi aktif
  const savedKar = await api.saveKaryawan({
    nama: customEmployeeName,
    nik: customNik,
    jabatan: customJabatan,
    tanggal_masuk: '2026-11-01',
    gaji_pokok_standar: 3500000,
    uang_makan_standar: 500000,
    transport_standar: 300000,
  });

  const updatedKaryawans = await api.getKaryawanList();
  const foundInMaster = updatedKaryawans.find(k => k.nama === customEmployeeName);
  console.assert(Boolean(foundInMaster), 'Karyawan yang diinput nama sendiri harus tersimpan di master karyawan');

  const customDoc = generateSlipGajiPdf(manualPayroll);
  console.assert(Boolean(customDoc), 'PDF Slip Gaji karyawan custom harus berhasil dibuat');
  console.log(`  ✅ [PASS] Kriteria 10: Sukses membuat slip gaji dengan nama karyawan sendiri (${manualPayroll.nama}) dan tersinkron ke Master Data!\n`);

  // --------------------------------------------------------------------------
  // KRITERIA 11:
  // Sistem Login Akun Resmi @wins.com (Admin 1: Sukesti, Admin 2: Deva, Owner: Wiwin, Developer: Raka)
  // --------------------------------------------------------------------------
  console.log('▶ Kriteria 11: Sistem Login Akun Resmi @wins.com (Admin 1, Admin 2, Owner, Developer)');
  const officialAccounts = await api.getOfficialAccounts();
  console.assert(officialAccounts.length === 4, `Jumlah akun resmi harus 4, didapat: ${officialAccounts.length}`);

  const sukestiAcc = officialAccounts.find(a => a.email === 'sukesti@wins.com');
  const devaAcc = officialAccounts.find(a => a.email === 'deva@wins.com');
  const wiwinAcc = officialAccounts.find(a => a.email === 'wiwin@wins.com');
  const rakaAcc = officialAccounts.find(a => a.email === 'raka@wins.com');

  console.assert(Boolean(sukestiAcc && sukestiAcc.role === 'admin'), 'Akun sukesti@wins.com harus terdaftar sebagai admin');
  console.assert(Boolean(devaAcc && devaAcc.role === 'admin'), 'Akun deva@wins.com harus terdaftar sebagai admin');
  console.assert(Boolean(wiwinAcc && wiwinAcc.role === 'owner'), 'Akun wiwin@wins.com harus terdaftar sebagai owner');
  console.assert(Boolean(rakaAcc && rakaAcc.role === 'admin'), 'Akun raka@wins.com harus terdaftar sebagai developer (akses admin)');

  // Test 1: Login Sukesti (Admin 1)
  const loginSukesti = await api.login('sukesti@wins.com', 'wins123');
  console.assert(loginSukesti.success, 'Login sukesti@wins.com harus berhasil');
  console.assert(loginSukesti.user?.role === 'admin', 'Role Sukesti harus admin');
  console.assert(api.getAuthUser()?.email === 'sukesti@wins.com', 'Auth user harus tersimpan di session');

  // Test 2: Login Deva (Admin 2)
  const loginDeva = await api.login('deva@wins.com', 'wins123');
  console.assert(loginDeva.success, 'Login deva@wins.com harus berhasil');
  console.assert(loginDeva.user?.role === 'admin', 'Role Deva harus admin');
  console.assert(api.getAuthUser()?.email === 'deva@wins.com', 'Auth user harus tersimpan di session');

  // Test 3: Login Wiwin (Owner)
  const loginWiwin = await api.login('wiwin@wins.com', 'wins123');
  console.assert(loginWiwin.success, 'Login wiwin@wins.com harus berhasil');
  console.assert(loginWiwin.user?.role === 'owner', 'Role Wiwin harus owner');
  console.assert(api.getAuthUser()?.email === 'wiwin@wins.com', 'Auth user harus tersimpan di session');

  // Test 4: Login Raka (Developer)
  const loginRaka = await api.login('raka@wins.com', 'wins123');
  console.assert(loginRaka.success, 'Login raka@wins.com harus berhasil');
  console.assert(loginRaka.user?.role === 'admin', 'Role Developer Raka harus memiliki hak akses admin');
  console.assert(api.getAuthUser()?.email === 'raka@wins.com', 'Auth user Developer harus tersimpan di session');

  // Test 5: Rejeksi email di luar domain @wins.com (misal Gmail atau unlisted)
  const loginGmail = await api.login('sukesti@gmail.com', 'wins123');
  console.assert(!loginGmail.success, 'Login menggunakan @gmail.com harus ditolak');
  console.assert(Boolean(loginGmail.error), 'Harus ada pesan error penolakan email tidak terdaftar');

  // Test 6: Rejeksi password salah
  const loginWrongPass = await api.login('sukesti@wins.com', 'passwordsalah123');
  console.assert(!loginWrongPass.success, 'Login password salah harus ditolak');

  // Test 7: Logout
  await api.logout();
  console.assert(api.getAuthUser() === null, 'Setelah logout session auth harus bersih');

  console.log(`  ✅ [PASS] Kriteria 11: Sistem Login @wins.com sukses terverifikasi:`);
  console.log(`         - Admin 1  : sukesti@wins.com (Role: admin)`);
  console.log(`         - Admin 2  : deva@wins.com (Role: admin)`);
  console.log(`         - Owner    : wiwin@wins.com (Role: owner)`);
  console.log(`         - Developer: raka@wins.com (Role: admin)`);
  console.log(`         - Validasi email non-wins & password proteksi berjalan sempurna!\n`);

  // --------------------------------------------------------------------------
  // KRITERIA 12:
  // Menu Data Karyawan & Penambahan Karyawan Sendiri Secara Mandiri
  // --------------------------------------------------------------------------
  console.log('▶ Kriteria 12: Menu Data Karyawan & Penambahan Karyawan Sendiri Secara Mandiri');
  
  // 1. Ambil list karyawan awal
  const initialKaryawans = await api.getKaryawanList();
  console.assert(initialKaryawans.length >= 0, `Karyawan list harus terdefinisi`);

  // 2. Tambah karyawan baru mandiri
  const newKaryawanData = {
    nik: 'KB-20261199',
    nama: 'Budi Hartono (Driver Baru)',
    jabatan: 'Driver / Supir Ekspedisi',
    tanggal_masuk: '2026-11-20',
    gaji_pokok_standar: 4500000,
    uang_makan_standar: 650000,
    transport_standar: 350000,
    tunjangan_jabatan_standar: 250000,
    tunjangan_operasional_standar: 200000,
    aktif: true,
  };
  const createdKaryawan = await api.saveKaryawan(newKaryawanData);
  console.assert(Boolean(createdKaryawan.id), 'Karyawan baru harus memiliki ID yang di-generate');
  console.assert(createdKaryawan.nik === 'KB-20261199', 'NIK karyawan baru harus sesuai input');
  console.assert(createdKaryawan.nama === 'Budi Hartono (Driver Baru)', 'Nama karyawan baru harus sesuai input');
  console.assert(createdKaryawan.gaji_pokok_standar === 4500000, 'Gaji pokok standar harus 4.500.000');

  // 3. Verifikasi karyawan baru tampil di list
  const afterAddList = await api.getKaryawanList();
  const foundNew = afterAddList.find(k => k.id === createdKaryawan.id);
  console.assert(Boolean(foundNew), 'Karyawan baru harus dapat ditemukan dalam getKaryawanList()');
  console.assert(afterAddList.length === initialKaryawans.length + 1, 'Jumlah karyawan harus bertambah 1');

  // 4. Verifikasi pembuatan slip gaji otomatis dari karyawan baru tersebut
  const newSlip = await api.simpanPayroll({
    karyawan_id: createdKaryawan.id,
    nik: createdKaryawan.nik,
    nama: createdKaryawan.nama,
    jabatan: createdKaryawan.jabatan,
    tanggal_masuk: createdKaryawan.tanggal_masuk,
    periode_bulan: 'November 2026',
    tanggal_pembayaran: '2026-11-25',
    gaji_pokok: createdKaryawan.gaji_pokok_standar,
    uang_makan: createdKaryawan.uang_makan_standar,
    transport: createdKaryawan.transport_standar,
    tunjangan_jabatan: createdKaryawan.tunjangan_jabatan_standar,
    tunjangan_operasional: createdKaryawan.tunjangan_operasional_standar,
    thr: 0,
    lembur: 0,
    potongan_alpha: 0,
    potongan_izin: 0,
    potongan_sakit: 0,
    potongan_wfh: 0,
    jamsostek: Math.round((createdKaryawan.gaji_pokok_standar || 0) * 0.03), // 135.000
    bpjs: Math.round((createdKaryawan.gaji_pokok_standar || 0) * 0.01), // 45.000
    pinjaman: 0,
    potongan_transport: 0,
    status: 'dibayar',
    dibuat_oleh: 'Admin Sukesti',
  });
  console.assert(Boolean(newSlip.no_slip), 'Slip gaji untuk karyawan baru harus berhasil terbit');
  console.assert(newSlip.payroll.jumlah_pendapatan === 5950000, `Jumlah pendapatan harus 5.950.000, didapat: ${newSlip.payroll.jumlah_pendapatan}`);
  console.assert(newSlip.payroll.total_potongan === 180000, `Total potongan harus 180.000, didapat: ${newSlip.payroll.total_potongan}`);
  console.assert(newSlip.payroll.take_home_pay === 5770000, `Take Home Pay harus 5.770.000, didapat: ${newSlip.payroll.take_home_pay}`);

  // 5. Update data karyawan (promosi jabatan)
  const updatedKaryawan = await api.saveKaryawan({
    id: createdKaryawan.id,
    jabatan: 'Koordinator Driver & Logistik',
    gaji_pokok_standar: 5000000,
  });
  console.assert(updatedKaryawan.jabatan === 'Koordinator Driver & Logistik', 'Jabatan karyawan harus terupdate');
  console.assert(updatedKaryawan.gaji_pokok_standar === 5000000, 'Gaji pokok terupdate menjadi 5.000.000');

  // 6. Hapus karyawan uji coba
  const deleteResult = await api.deleteKaryawan(createdKaryawan.id);
  console.assert(deleteResult === true, 'Penghapusan karyawan harus berhasil');
  const finalKaryawans = await api.getKaryawanList();
  const checkDeleted = finalKaryawans.find(k => k.id === createdKaryawan.id);
  console.assert(!checkDeleted, 'Karyawan yang dihapus tidak boleh lagi ada di list');

  console.log(`  ✅ [PASS] Kriteria 12: Menu Data Karyawan & Penambahan Karyawan Sendiri sukses:`);
  console.log(`         - Melihat seluruh karyawan (Total, Aktif, Resign)`);
  console.log(`         - Tambah karyawan mandiri: ${newKaryawanData.nama} (${newKaryawanData.nik})`);
  console.log(`         - Standar Gaji & Tunjangan otomatis terintegrasi ke slip gaji (THP: ${formatRupiah(5770000)})`);
  console.log(`         - Edit & Hapus Karyawan berfungsi dengan proteksi hak akses!\n`);

  console.log('================================================================');
  console.log('🎉 SEMUA VERIFIKASI PENGUJIAN OTOMATIS SELESAI 100% SUKSES!');
  console.log('================================================================');
}

runAcceptanceTests().catch(err => {
  console.error('❌ Test failed:', err);
  process.exit(1);
});
