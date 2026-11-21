import { jsPDF } from 'jspdf';
import { Pengeluaran } from '../types';

export function generateSuratJalanPdf(pengeluaran: Pengeluaran): jsPDF {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = 210;
  const margin = 15;
  const contentWidth = pageWidth - margin * 2;

  // Header Perusahaan
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.setTextColor(2, 83, 163); // Brand color #0253a3
  doc.text("WIN'S GROUP — KASUR BUSA", margin, 20);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(71, 85, 105);
  doc.text('Gudang Distribusi & Logistik Kasur Busa Berkualitas', margin, 25);
  doc.text('Jl. Raya Industri Pergudangan No. 88 · WhatsApp: 0812-0000-8888', margin, 29);

  // Garis Header
  doc.setDrawColor(203, 213, 225);
  doc.setLineWidth(0.5);
  doc.line(margin, 33, pageWidth - margin, 33);

  // Judul Dokumen
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.setTextColor(15, 23, 42);
  doc.text('SURAT JALAN / BUKTI PENGELUARAN BARANG', margin, 42);

  // Kotak Info Transaksi
  const infoY = 48;
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(margin, infoY, contentWidth, 34, 2, 2, 'F');
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(margin, infoY, contentWidth, 34, 2, 2, 'D');

  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(51, 65, 85);

  // Kolom Kiri
  doc.text('No. Surat Jalan:', margin + 4, infoY + 7);
  doc.text('Tanggal:', margin + 4, infoY + 14);
  doc.text('Pengirim / Supir:', margin + 4, infoY + 21);
  doc.text('Koordinator:', margin + 4, infoY + 28);

  doc.setFont('helvetica', 'normal');
  doc.text(pengeluaran.no_surat_jalan, margin + 35, infoY + 7);
  
  const d = new Date(pengeluaran.tanggal);
  const formattedDate = !isNaN(d.getTime()) 
    ? d.toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })
    : pengeluaran.tanggal;
  doc.text(formattedDate, margin + 35, infoY + 14);
  doc.text(pengeluaran.pengirim?.nama || '-', margin + 35, infoY + 21);
  doc.text(pengeluaran.koordinator_nama || pengeluaran.koordinator?.nama || '-', margin + 35, infoY + 28);

  // Kolom Kanan
  const rightColX = margin + 95;
  doc.setFont('helvetica', 'bold');
  doc.text('Penerima / Pembeli:', rightColX, infoY + 7);
  doc.text('Telepon:', rightColX, infoY + 14);
  doc.text('Keterangan:', rightColX, infoY + 21);
  doc.text('Status:', rightColX, infoY + 28);

  doc.setFont('helvetica', 'normal');
  const distinctItemBuyers = Array.from(new Set(pengeluaran.items?.map(it => it.pembeli_nama?.trim()).filter(Boolean)));
  let headerBuyerText = pengeluaran.pembeli_nama || pengeluaran.pembeli?.nama || '-';
  if (distinctItemBuyers.length > 1) {
    headerBuyerText = `Banyak Pembeli (${distinctItemBuyers.length} orang)`;
  }
  doc.text(headerBuyerText, rightColX + 35, infoY + 7);
  doc.text(pengeluaran.pembeli?.telepon || '-', rightColX + 35, infoY + 14);
  doc.text(pengeluaran.keterangan || '-', rightColX + 35, infoY + 21);
  
  if (pengeluaran.status === 'batal') {
    doc.setTextColor(220, 38, 38);
    doc.setFont('helvetica', 'bold');
    doc.text('DIBATALKAN', rightColX + 35, infoY + 28);
    doc.setTextColor(51, 65, 85);
  } else {
    doc.setTextColor(22, 101, 52);
    doc.setFont('helvetica', 'bold');
    doc.text('AKTIF / RESMI', rightColX + 35, infoY + 28);
    doc.setTextColor(51, 65, 85);
  }

  // Agregasi item berdasarkan barcode dan nama pembeli
  const groupMap: { [key: string]: { barcode: string; nama_ukuran: string; pembeli_nama?: string; qty: number } } = {};
  if (pengeluaran.items && pengeluaran.items.length > 0) {
    for (const it of pengeluaran.items) {
      const bcode = it.barcode_scan;
      const buyer = (it.pembeli_nama || pengeluaran.pembeli_nama || '').trim();
      const key = `${bcode}__${buyer}`;
      if (!groupMap[key]) {
        const lastDash = bcode.lastIndexOf('-');
        const kodeStr = lastDash > 0 ? bcode.slice(0, lastDash) : bcode;
        const ukuranNama = it.barang?.ukuran?.nama || `Ukuran ${kodeStr}`;
        groupMap[key] = {
          barcode: bcode,
          nama_ukuran: ukuranNama,
          pembeli_nama: buyer,
          qty: 0,
        };
      }
      groupMap[key].qty += 1;
    }
  }

  const items = Object.values(groupMap);

  // Tabel Header
  let tableY = infoY + 42;
  doc.setFillColor(2, 83, 163);
  doc.rect(margin, tableY, contentWidth, 8, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(255, 255, 255);
  doc.text('NO', margin + 4, tableY + 5.5);
  doc.text('KODE BARCODE', margin + 18, tableY + 5.5);
  doc.text('DESKRIPSI / UKURAN KASUR', margin + 65, tableY + 5.5);
  doc.text('JUMLAH (PCS)', pageWidth - margin - 25, tableY + 5.5, { align: 'right' });

  // Tabel Body
  tableY += 8;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(15, 23, 42);

  let totalQty = 0;
  items.forEach((item, idx) => {
    totalQty += item.qty;

    // Nama pembeli ditaruh di deskripsi sesuai instruksi pengguna
    const descText = item.pembeli_nama
      ? `${item.nama_ukuran} — Pembeli: ${item.pembeli_nama}`
      : item.nama_ukuran;

    const descLines = doc.splitTextToSize(descText, 85);
    const rowHeight = Math.max(8, descLines.length * 4.5 + 3.5);

    const isEven = idx % 2 === 1;
    if (isEven) {
      doc.setFillColor(248, 250, 252);
      doc.rect(margin, tableY, contentWidth, rowHeight, 'F');
    }
    doc.setDrawColor(226, 232, 240);
    doc.line(margin, tableY + rowHeight, pageWidth - margin, tableY + rowHeight);

    doc.text((idx + 1).toString(), margin + 4, tableY + 5.5);
    doc.text(item.barcode, margin + 18, tableY + 5.5);
    doc.text(descLines, margin + 65, tableY + 5.5);
    doc.text(item.qty.toString() + ' pcs', pageWidth - margin - 25, tableY + 5.5, { align: 'right' });

    tableY += rowHeight;
  });

  // Total Baris
  doc.setFillColor(241, 245, 249);
  doc.rect(margin, tableY, contentWidth, 8, 'F');
  doc.setFont('helvetica', 'bold');
  doc.text('TOTAL BARANG KELUAR', margin + 18, tableY + 5.5);
  doc.text(`${totalQty} pcs`, pageWidth - margin - 25, tableY + 5.5, { align: 'right' });

  tableY += 16;

  // Catatan Pembatalan jika ada
  if (pengeluaran.status === 'batal' && pengeluaran.alasan_batal) {
    doc.setTextColor(220, 38, 38);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.text(`* Transaksi dibatalkan: ${pengeluaran.alasan_batal}`, margin, tableY);
    tableY += 10;
  }

  // Tanda Tangan 4 Kolom
  const signY = Math.max(tableY, 215);
  const colSignW = contentWidth / 4;

  const roles = [
    { label: 'Admin Gudang', name: pengeluaran.dibuat_oleh || 'Petugas Gudang' },
    { label: 'Supir / Pengirim', name: pengeluaran.pengirim?.nama || 'Pengirim' },
    { label: 'Koordinator', name: pengeluaran.koordinator_nama || pengeluaran.koordinator?.nama || 'Koordinator' },
    { label: 'Penerima / Pembeli', name: pengeluaran.pembeli_nama || 'Penerima' },
  ];

  roles.forEach((r, idx) => {
    const startX = margin + idx * colSignW;
    const centerX = startX + colSignW / 2;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(71, 85, 105);
    doc.text(r.label, centerX, signY, { align: 'center' });

    // Garis tanda tangan
    doc.setDrawColor(148, 163, 184);
    doc.line(startX + 6, signY + 25, startX + colSignW - 6, signY + 25);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(15, 23, 42);
    doc.text(`( ${r.name} )`, centerX, signY + 30, { align: 'center' });
  });

  return doc;
}

