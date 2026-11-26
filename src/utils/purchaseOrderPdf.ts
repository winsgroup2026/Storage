import { jsPDF } from 'jspdf';
import { Penerimaan, getHppKasur } from '../types';
import { formatRupiah, terbilang } from './currency';

/**
 * Generator PDF Purchase Order (PO) Penerimaan Barang
 * Format layout persis Gambar 1 (Paper.id modern invoice / PO style),
 * Isi dokumen persis Gambar 2 (Comet Foam Klaten -> Pak Wiwin Win's Group),
 * Harga satuan kasur (HPP) persis Gambar 3.
 */
export function generatePurchaseOrderPdf(penerimaan: Penerimaan): jsPDF {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = 210;
  const pageHeight = 297;
  const margin = 15;
  const contentWidth = pageWidth - margin * 2; // 180mm

  // Sanitasi karakter khusus yang kadang bermasalah pada font Helvetica WinAnsi
  const sanitizePdfText = (val?: string | null): string => {
    return String(val ?? '')
      .replace(/—/g, '-')
      .replace(/×/g, 'x')
      .replace(/·/g, ' - ');
  };

  // Format Tanggal aman dari undefined/invalid
  const formatTgl = (tglStr?: string) => {
    if (!tglStr) return '-';
    const d = new Date(tglStr);
    if (isNaN(d.getTime())) return String(tglStr);
    return d.toLocaleDateString('id-ID', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  };

  const rawId = String(penerimaan?.id || (penerimaan as any)?.penerimaan_id || '0001');
  const rawPoDate =
    penerimaan?.tanggal_po || penerimaan?.tanggal_terima || new Date().toISOString().slice(0, 10);
  const parsedPoDate = new Date(rawPoDate);
  const safePoDate = isNaN(parsedPoDate.getTime()) ? new Date() : parsedPoDate;

  const tglPoFormatted = formatTgl(rawPoDate);
  const tglTerimaFormatted = formatTgl(penerimaan?.tanggal_terima || rawPoDate);
  const noPo =
    penerimaan?.no_po ||
    `PO/${safePoDate.getFullYear()}/${String(safePoDate.getMonth() + 1).padStart(2, '0')}/${rawId
      .slice(-4)
      .toUpperCase()}`;

  // ==========================================================================
  // 1. TOP HEADER (LOGO DI KIRI, JUDUL & DETAIL PO DI KANAN)
  // ==========================================================================

  // Kiri: Logo & Nama Brand Win's Group
  doc.setFillColor(2, 83, 163); // #0253a3 brand blue
  doc.roundedRect(margin, 15, 10, 10, 2, 2, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(255, 255, 255);
  doc.text('W', margin + 3.2, 21.5);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.setTextColor(30, 41, 59); // slate-800
  doc.text("WIN'S GROUP", margin + 13, 21);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139); // slate-500
  doc.text('Gudang Distribusi Kasur Busa & Logistik', margin + 13, 25.5);

  // Kanan: Judul "Purchase Order" & Info Referensi (Persis Gambar 1)
  const rightAlignX = pageWidth - margin;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.setTextColor(15, 23, 42); // slate-900
  doc.text('Purchase Order', rightAlignX, 19, { align: 'right' });

  doc.setFontSize(8);
  doc.setTextColor(71, 85, 105);

  const metaStartY = 24.5;
  const labelX = rightAlignX - 35;
  doc.setFont('helvetica', 'normal');
  doc.text('Referensi', labelX, metaStartY, { align: 'right' });
  doc.text('Tanggal PO', labelX, metaStartY + 4.2, { align: 'right' });
  doc.text('Tgl. Kirim / Terima', labelX, metaStartY + 8.4, { align: 'right' });
  doc.text('Status', labelX, metaStartY + 12.6, { align: 'right' });

  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text(noPo, rightAlignX, metaStartY, { align: 'right' });
  doc.text(tglPoFormatted, rightAlignX, metaStartY + 4.2, { align: 'right' });
  doc.text(tglTerimaFormatted, rightAlignX, metaStartY + 8.4, { align: 'right' });

  doc.setTextColor(16, 149, 104); // emerald green status
  doc.text('Diterima / Selesai', rightAlignX, metaStartY + 12.6, { align: 'right' });

  // ==========================================================================
  // 2. DUA KOLOM: INFO PERUSAHAAN (PEMBELI) & ORDER KE (PEMASOK COMET FOAM)
  //    (Format Layout Garis Underline Persis Gambar 1, Isi Persis Gambar 2)
  // ==========================================================================
  const infoSectionY = 46;

  // Kolom Kiri: Info Perusahaan (Win's Group / Bpk. Wiwin Yogyakarta)
  const leftColX = margin;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(51, 65, 85);
  doc.text('Info Perusahaan', leftColX, infoSectionY);

  // Garis bawah tipis di bawah "Info Perusahaan"
  doc.setDrawColor(203, 213, 225);
  doc.setLineWidth(0.4);
  doc.line(leftColX, infoSectionY + 2, leftColX + 78, infoSectionY + 2);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(15, 23, 42);
  doc.text("Win's Group (Kepada Yth: Pak WIWIN)", leftColX, infoSectionY + 7.5);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(71, 85, 105);
  doc.text('Alamat: Yogyakarta, D.I. Yogyakarta', leftColX, infoSectionY + 11.8);
  doc.text('Metode Pembayaran: Transfer Bank (TF)', leftColX, infoSectionY + 16.1);
  doc.text(`Petugas Penerima: ${penerimaan.penerima || 'Staf Gudang'}`, leftColX, infoSectionY + 20.4);
  doc.text('WhatsApp: 0812-3456-7890 · Email: wiwin@wins.com', leftColX, infoSectionY + 24.7);

  // Kolom Kanan: Order Ke (UMKM Comet / Comet Foam Klaten - Persis Gambar 2)
  const rightColX = margin + 92;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(51, 65, 85);
  doc.text('Order Ke', rightColX, infoSectionY);

  // Garis bawah tipis di bawah "Order Ke"
  doc.line(rightColX, infoSectionY + 2, rightColX + 88, infoSectionY + 2);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(15, 23, 42);
  doc.text(penerimaan.pabrik_nama || 'PT / UMKM COMET FOAM', rightColX, infoSectionY + 7.5);

  doc.setFont('helvetica', 'italic');
  doc.setFontSize(7.5);
  doc.setTextColor(100, 116, 139);
  doc.text('Save For The Health Of Your Sleep With High Density General Foam', rightColX, infoSectionY + 11.5);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(71, 85, 105);
  doc.text('Ngablak RT 03/05, Ds. Jetis, Kec. Delanggu', rightColX, infoSectionY + 15.8);
  doc.text('Klaten, Jawa Tengah · HP/WA: 085643218564 / 081332790030', rightColX, infoSectionY + 20.1);
  doc.text('FB / IG: Comet Foam · Pembayaran: TF', rightColX, infoSectionY + 24.4);

  // ==========================================================================
  // 3. TABEL PRODUK (HEADER DARK NAVY PERSIS GAMBAR 1, HARGA HPP PERSIS GAMBAR 3)
  // ==========================================================================
  const tableStartY = 78;
  const colProdukX = margin; // 15
  const colQtyX = margin + 78; // 93 (center 100)
  const colHargaX = margin + 104; // 119 (right 134)
  const colDiskonX = margin + 127; // 142 (center 147)
  const colPajakX = margin + 143; // 158 (center 163)
  const colTotalX = margin + 158; // 173 (right 195)

  // Header Bar (Navy Gelap persis Gambar 1)
  doc.setFillColor(40, 53, 72); // #283548 dark slate navy
  doc.rect(margin, tableStartY, contentWidth, 8.5, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(255, 255, 255);
  doc.text('Produk', colProdukX + 3, tableStartY + 5.5);
  doc.text('Kuantitas', colQtyX + 7, tableStartY + 5.5, { align: 'center' });
  doc.text('Harga', colHargaX + 18, tableStartY + 5.5, { align: 'right' });
  doc.text('Diskon', colDiskonX + 6, tableStartY + 5.5, { align: 'center' });
  doc.text('Pajak', colPajakX + 6, tableStartY + 5.5, { align: 'center' });
  doc.text('Total', pageWidth - margin - 3, tableStartY + 5.5, { align: 'right' });

  // Baris-baris Produk
  let currentY = tableStartY + 8.5;
  const items = penerimaan.barcodes && penerimaan.barcodes.length > 0 ? penerimaan.barcodes : [];

  let subtotalCalculated = 0;

  if (items.length === 0) {
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(8);
    doc.setTextColor(148, 163, 184);
    doc.text('Tidak ada rincian item kasur pada dokumen ini.', margin + 4, currentY + 7);
    currentY += 12;
  } else {
    items.forEach((it, idx) => {
      const rowHeight = 11.5;
      const isEven = idx % 2 === 1;

      // Zebra striping background
      if (isEven) {
        doc.setFillColor(248, 250, 252);
        doc.rect(margin, currentY, contentWidth, rowHeight, 'F');
      }

      // Garis pemisah bawah tipis
      doc.setDrawColor(241, 245, 249);
      doc.setLineWidth(0.3);
      doc.line(margin, currentY + rowHeight, pageWidth - margin, currentY + rowHeight);

      // 1. Nama & Deskripsi Produk (Sesuai Type Gambar 2: Topper Ryo)
      const tipeNama = sanitizePdfText(it.tipe || 'Topper Ryo');
      const ukuranKode = sanitizePdfText(it.kode_ukuran || '');
      const namaKasur = sanitizePdfText(it.nama_ukuran || `Kasur Busa Ukuran ${ukuranKode}`);
      const barcodeStr = sanitizePdfText(it.barcode || `${ukuranKode}-${tglPoFormatted.replace(/\//g, '').slice(0, 4)}`);

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8.5);
      doc.setTextColor(15, 23, 42);
      doc.text(`${tipeNama} - Ukuran ${ukuranKode}`, colProdukX + 3, currentY + 4.5);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7);
      doc.setTextColor(100, 116, 139);
      doc.text(`${namaKasur} - Barcode: ${barcodeStr}`, colProdukX + 3, currentY + 8.5);

      // 2. Kuantitas
      const itemQty = Number(it.qty) || 0;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8.5);
      doc.setTextColor(15, 23, 42);
      doc.text(`${itemQty}`, colQtyX + 7, currentY + 6.8, { align: 'center' });

      // 3. Harga Satuan (HPP Gambar 3)
      const hargaSatuan = Number(it.harga_satuan) || getHppKasur(it.kode_ukuran || '') || 0;
      doc.text(formatRupiah(hargaSatuan), colHargaX + 18, currentY + 6.8, { align: 'right' });

      // 4. Diskon
      doc.setTextColor(100, 116, 139);
      doc.text('0%', colDiskonX + 6, currentY + 6.8, { align: 'center' });

      // 5. Pajak
      doc.text('-', colPajakX + 6, currentY + 6.8, { align: 'center' });

      // 6. Total Baris
      const barisTotal = Number(it.subtotal) || hargaSatuan * itemQty;
      subtotalCalculated += barisTotal;

      doc.setFont('helvetica', 'bold');
      doc.setTextColor(15, 23, 42);
      doc.text(formatRupiah(barisTotal), pageWidth - margin - 3, currentY + 6.8, { align: 'right' });

      currentY += rowHeight;
    });
  }

  // Jika nominal total di object penerimaan ada, utamakan itu
  const finalTotal = Number(penerimaan?.total_nominal) || subtotalCalculated;

  // Tambah halaman baru jika tabel panjang agar ringkasan & tanda tangan tidak terpotong
  if (currentY > 220) {
    doc.addPage();
    currentY = 20;
  }

  // ==========================================================================
  // 4. SUMMARY BOX (KANAN BAWAH PERSIS GAMBAR 1)
  //    Subtotal, Pajak, Diskon, Total, Pajak Included, Jumlah Tertagih
  // ==========================================================================
  currentY += 4;
  const summaryStartX = pageWidth - margin - 85;
  const summaryLabelX = summaryStartX + 42;
  const summaryValX = pageWidth - margin - 3;

  const drawSummaryLine = (label: string, val: string, isBold = false) => {
    doc.setFont('helvetica', isBold ? 'bold' : 'normal');
    doc.setFontSize(8);
    doc.setTextColor(isBold ? 15 : 71, isBold ? 23 : 85, isBold ? 42 : 105);
    doc.text(label, summaryLabelX, currentY, { align: 'right' });
    doc.text(val, summaryValX, currentY, { align: 'right' });
    currentY += 4.5;
  };

  drawSummaryLine('Subtotal', formatRupiah(finalTotal));
  drawSummaryLine('Pajak', 'Rp 0');
  drawSummaryLine('Diskon', 'Rp 0');
  drawSummaryLine('Total', formatRupiah(finalTotal));
  drawSummaryLine('Pajak Included', 'Rp 0');

  // Garis pemisah sebelum Jumlah Tertagih
  doc.setDrawColor(203, 213, 225);
  doc.setLineWidth(0.4);
  doc.line(summaryStartX + 10, currentY, summaryValX, currentY);
  currentY += 3.5;

  // Jumlah Tertagih (Font Lebih Besar & Bold)
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10.5);
  doc.setTextColor(15, 23, 42);
  doc.text('Jumlah Tertagih:', summaryLabelX, currentY, { align: 'right' });
  doc.setTextColor(2, 83, 163); // Brand blue
  doc.text(formatRupiah(finalTotal), summaryValX, currentY, { align: 'right' });
  currentY += 5;

  // Terbilang Rupiah
  doc.setFont('helvetica', 'italic');
  doc.setFontSize(7);
  doc.setTextColor(100, 116, 139);
  const terbilangStr = `(${terbilang(finalTotal)})`;
  doc.text(terbilangStr, summaryValX, currentY, { align: 'right', maxWidth: 85 });

  // ==========================================================================
  // 5. SYARAT & KETENTUAN (KIRI BAWAH PERSIS GAMBAR 1)
  // ==========================================================================
  const notesY = Math.max(currentY - 26, 100); // Sejajar dengan area summary box
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(51, 65, 85);
  doc.text('Syarat & Ketentuan', margin, notesY);

  // Garis bawah judul syarat & ketentuan
  doc.setDrawColor(203, 213, 225);
  doc.setLineWidth(0.4);
  doc.line(margin, notesY + 1.8, margin + 70, notesY + 1.8);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(100, 116, 139);
  doc.text('Metode Pembayaran: Bank Transfer (TF)', margin, notesY + 6.5);
  doc.text('1. Kasur busa telah diterima & dicek lengkap di Gudang Win\'s Group.', margin, notesY + 10.5);
  doc.text('2. Label barcode kasur telah terbit & tersinkronisasi di sistem stok.', margin, notesY + 14.5);
  doc.text('3. Dokumen purchase order ini sah sebagai bukti tagihan pabrik.', margin, notesY + 18.5);

  // ==========================================================================
  // 6. TANDA TANGAN DUA PIHAK (PERSIS GAMBAR 2)
  // ==========================================================================
  const signatureY = Math.max(currentY + 14, 240);

  // Tanggal Tempat
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139);
  doc.text(`Klaten / Yogyakarta, ${tglTerimaFormatted}`, pageWidth - margin, signatureY - 5, { align: 'right' });

  // Kiri: Penerima (Win's Group / Bpk. Wiwin)
  const signLeftX = margin + 15;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(51, 65, 85);
  doc.text('Penerima,', signLeftX, signatureY);

  // Garis tanda tangan penerima
  doc.setDrawColor(148, 163, 184);
  doc.setLineWidth(0.4);
  doc.line(signLeftX - 10, signatureY + 22, signLeftX + 45, signatureY + 22);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(15, 23, 42);
  doc.text(`( ${sanitizePdfText(penerimaan?.penerima || 'Staf Gudang')} / Bpk. WIWIN )`, signLeftX + 17.5, signatureY + 26, {
    align: 'center',
  });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(100, 116, 139);
  doc.text("Win's Group - Yogyakarta", signLeftX + 17.5, signatureY + 29.5, { align: 'center' });

  // Kanan: Hormat Kami (Comet Foam Klaten)
  const signRightX = pageWidth - margin - 35;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(51, 65, 85);
  doc.text('Hormat Kami,', signRightX, signatureY, { align: 'center' });

  // Garis tanda tangan supplier
  doc.line(signRightX - 25, signatureY + 22, signRightX + 25, signatureY + 22);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(15, 23, 42);
  doc.text('( COMET FOAM )', signRightX, signatureY + 26, { align: 'center' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(100, 116, 139);
  doc.text('Sentra Busa Delanggu, Klaten', signRightX, signatureY + 29.5, { align: 'center' });

  // Footer kecil
  doc.setFontSize(6.5);
  doc.setTextColor(148, 163, 184);
  doc.text(
    `Dokumen resmi ini dicetak otomatis dari Sistem Gudang Barcode Win's Group · ${new Date().toLocaleString('id-ID')}`,
    margin,
    pageHeight - 8
  );

  return doc;
}
