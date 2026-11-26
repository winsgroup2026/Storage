import { generatePurchaseOrderPdf } from '../src/utils/purchaseOrderPdf';
import { getHppKasur, MASTER_HPP_KASUR, Penerimaan } from '../src/types';

console.log('🧪 VERIFIKASI GENERATOR PURCHASE ORDER (PO) & HARGA HPP KASUR');
console.log('------------------------------------------------------------');

// 1. Verifikasi HPP dari Gambar 3
const expectedHpp: Record<string, number> = {
  '80': 225000,
  '90': 244000,
  '100': 271700,
  '120': 307800,
  '140': 359500,
  '160': 395500,
  '180': 446800,
  '200': 515820,
};

let hppErrors = 0;
for (const [kode, harga] of Object.entries(expectedHpp)) {
  const actual = getHppKasur(kode);
  if (actual !== harga) {
    console.error(`❌ Mismatch HPP ukuran ${kode}: expected ${harga}, got ${actual}`);
    hppErrors++;
  } else {
    console.log(`✅ Ukuran ${kode}×200 cm: Rp ${actual.toLocaleString('id-ID')} (Sesuai Gambar 3)`);
  }
}

if (hppErrors > 0) {
  process.exit(1);
}

// 2. Verifikasi Data Gambar 2
// Items:
// 200x80x5: 8 pcs @ 225.000 = 1.800.000
// 200x90x5: 8 pcs @ 244.000 = 1.952.000
// 200x100x5: 2 pcs @ 271.700 = 543.400
// 200x120x5: 2 pcs @ 307.800 = 615.600
// Total pcs: 20 pcs
// Total nominal: 4.911.000
const mockPenerimaan: Penerimaan = {
  id: 'rcv-test-po-01',
  po_id: 'po-test-01',
  no_po: 'PO/2026/11/0001',
  pabrik_nama: 'PT / UMKM COMET FOAM',
  pabrik_alamat: 'Ngablak RT 03/05, Ds. Jetis, Kec. Delanggu, Klaten',
  pabrik_telepon: '085643218564 / 081332790030',
  kepada_yth: 'Pak WIWIN',
  kepada_alamat: 'Yogyakarta',
  pembayaran: 'TF',
  tipe_kasur: 'Topper Ryo',
  tanggal_po: '2026-11-14',
  tanggal_terima: '2026-11-14',
  penerima: 'Staf Gudang (Pak Wiwin)',
  catatan: 'Kiriman kasur Topper Ryo Comet Foam Klaten',
  total_pcs: 20,
  total_nominal: 4911000,
  barcodes: [
    {
      barcode: '80-141126',
      kode_ukuran: '80',
      nama_ukuran: 'Kasur Busa No. 6 (80×200 cm)',
      tipe: 'Topper Ryo',
      qty: 8,
      harga_satuan: 225000,
      subtotal: 1800000,
    },
    {
      barcode: '90-141126',
      kode_ukuran: '90',
      nama_ukuran: 'Kasur Busa No. 5 Single (90×200 cm)',
      tipe: 'Topper Ryo',
      qty: 8,
      harga_satuan: 244000,
      subtotal: 1952000,
    },
    {
      barcode: '100-141126',
      kode_ukuran: '100',
      nama_ukuran: 'Kasur Busa No. 4B (100×200 cm)',
      tipe: 'Topper Ryo',
      qty: 2,
      harga_satuan: 271700,
      subtotal: 543400,
    },
    {
      barcode: '120-141126',
      kode_ukuran: '120',
      nama_ukuran: 'Kasur Busa No. 4 Super Single (120×200 cm)',
      tipe: 'Topper Ryo',
      qty: 2,
      harga_satuan: 307800,
      subtotal: 615600,
    },
  ],
};

const doc = generatePurchaseOrderPdf(mockPenerimaan);
const pageCount = doc.getNumberOfPages();
const pdfBase64 = doc.output('datauristring');

if (pageCount < 1 || !pdfBase64.startsWith('data:application/pdf')) {
  console.error('❌ Gagal mengenerate Purchase Order PDF');
  process.exit(1);
}

// 3. Verifikasi Kasus Edge-Case (object tanpa id / tanggal_terima spt successResult lama)
const partialSuccessResult = {
  penerimaan_id: 'rcv-edge-1234',
  pabrik_nama: 'UMKM Comet',
  total_pcs: 8,
  barcodes: [{ barcode: '80-261126', kode_ukuran: '80', qty: 8 }],
} as unknown as Penerimaan;

const edgeDoc = generatePurchaseOrderPdf(partialSuccessResult);
if (edgeDoc.getNumberOfPages() < 1) {
  console.error('❌ Gagal pada kasus partial object tanpa id');
  process.exit(1);
}
console.log('✅ Kasus partial object tanpa field id/tanggal aman 100% (tidak crash)');

console.log(`✅ PDF Purchase Order berhasil di-generate! Jumlah Halaman: ${pageCount}`);
console.log(`✅ Total Kasur: ${mockPenerimaan.total_pcs} pcs | Total Nilai: Rp ${mockPenerimaan.total_nominal?.toLocaleString('id-ID')}`);
console.log('🎉 SEMUA VERIFIKASI PURCHASE ORDER (PO) SUKSES 100%!');
