import { jsPDF } from 'jspdf';
import { Pengembalian } from '../types';

export function generateBuktiReturPdf(retur: Pengembalian): jsPDF {
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
  doc.setTextColor(2, 83, 163); // Brand blue #0253a3
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
  doc.text('SURAT BUKTI PENGEMBALIAN BARANG (RETUR)', margin, 42);

  // Kotak Info Transaksi Retur
  const infoY = 48;
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(margin, infoY, contentWidth, 36, 2, 2, 'F');
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(margin, infoY, contentWidth, 36, 2, 2, 'D');

  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(51, 65, 85);

  // Kolom Kiri
  doc.text('No. Bukti Retur:', margin + 4, infoY + 7);
  doc.text('Tanggal & Waktu:', margin + 4, infoY + 14);
  doc.text('Petugas Penerima:', margin + 4, infoY + 21);
  doc.text('Status:', margin + 4, infoY + 28);

  doc.setFont('helvetica', 'normal');
  doc.text(retur.no_retur, margin + 35, infoY + 7);

  const d = new Date(retur.tanggal);
  const formattedDate = !isNaN(d.getTime())
    ? d.toLocaleDateString('id-ID', {
        day: '2-digit',
        month: 'long',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    : retur.tanggal;
  doc.text(formattedDate, margin + 35, infoY + 14);
  doc.text(retur.petugas || 'Staf Gudang', margin + 35, infoY + 21);

  // Status Badge Hijau
  doc.setTextColor(22, 101, 52);
  doc.setFont('helvetica', 'bold');
  doc.text('DITERIMA & STOK PULIH', margin + 35, infoY + 28);
  doc.setTextColor(51, 65, 85);

  // Kolom Kanan
  const rightColX = margin + 95;
  doc.setFont('helvetica', 'bold');
  doc.text('Customer / Pembeli:', rightColX, infoY + 7);
  doc.text('Ref. Surat Jalan:', rightColX, infoY + 14);
  doc.text('Alasan Retur:', rightColX, infoY + 21);

  doc.setFont('helvetica', 'normal');
  doc.text(retur.pembeli_nama || '-', rightColX + 35, infoY + 7);
  doc.text(retur.no_surat_jalan || 'Langsung (Batal Beli)', rightColX + 35, infoY + 14);

  // Text wrap untuk alasan jika panjang
  const alasanLines = doc.splitTextToSize(retur.alasan || 'Customer batal beli', contentWidth - (rightColX + 35 - margin));
  doc.text(alasanLines, rightColX + 35, infoY + 21);

  // Tabel Header
  let tableY = infoY + 44;
  doc.setFillColor(2, 83, 163); // Brand blue
  doc.rect(margin, tableY, contentWidth, 8, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(255, 255, 255);
  doc.text('NO', margin + 4, tableY + 5.5);
  doc.text('KODE BARCODE', margin + 18, tableY + 5.5);
  doc.text('DESKRIPSI / UKURAN KASUR', margin + 65, tableY + 5.5);
  doc.text('STATUS STOK', pageWidth - margin - 55, tableY + 5.5);
  doc.text('JUMLAH (PCS)', pageWidth - margin - 15, tableY + 5.5, { align: 'right' });

  // Tabel Body
  tableY += 8;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(15, 23, 42);

  const items = retur.items || [];
  let totalQty = 0;

  items.forEach((item, idx) => {
    totalQty += item.qty;

    const descText = item.nama_ukuran || `Kasur Ukuran ${item.barcode.split('-')[0]}`;
    const descLines = doc.splitTextToSize(descText, 60);
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

    doc.setTextColor(22, 101, 52);
    doc.setFont('helvetica', 'bold');
    doc.text('Kembali ke Gudang', pageWidth - margin - 55, tableY + 5.5);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(15, 23, 42);

    doc.text(`${item.qty} pcs`, pageWidth - margin - 15, tableY + 5.5, { align: 'right' });

    tableY += rowHeight;
  });

  // Total Baris
  doc.setFillColor(241, 245, 249);
  doc.rect(margin, tableY, contentWidth, 8, 'F');
  doc.setFont('helvetica', 'bold');
  doc.text('TOTAL KASUR PULIH KE GUDANG', margin + 18, tableY + 5.5);
  doc.text(`${totalQty || retur.total_pcs} pcs`, pageWidth - margin - 15, tableY + 5.5, { align: 'right' });

  tableY += 14;

  // Catatan Operasional
  doc.setFont('helvetica', 'italic');
  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139);
  doc.text(
    '* Catatan: Kasur yang diretur telah diperiksa kondisi fisiknya, dinyatakan layak, dan otomatis masuk kembali ke stok gudang siap jual.',
    margin,
    tableY
  );

  // Bagian Tanda Tangan (3 Kolom)
  const signY = tableY + 16;
  const colWidth = contentWidth / 3;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(51, 65, 85);

  // Kolom 1: Petugas Gudang Penerima
  doc.text('Petugas Gudang (Penerima),', margin + colWidth * 0.5, signY, { align: 'center' });
  doc.text('( ......................................... )', margin + colWidth * 0.5, signY + 22, { align: 'center' });
  doc.setFont('helvetica', 'bold');
  doc.text(retur.petugas || 'Staf Gudang', margin + colWidth * 0.5, signY + 27, { align: 'center' });

  // Kolom 2: Supir / Pembawa Barang
  doc.setFont('helvetica', 'normal');
  doc.text('Pengantar / Supir,', margin + colWidth * 1.5, signY, { align: 'center' });
  doc.text('( ......................................... )', margin + colWidth * 1.5, signY + 22, { align: 'center' });
  doc.text('Nama Jelas', margin + colWidth * 1.5, signY + 27, { align: 'center' });

  // Kolom 3: Customer / Pembeli
  doc.text('Customer / Pembeli,', margin + colWidth * 2.5, signY, { align: 'center' });
  doc.text('( ......................................... )', margin + colWidth * 2.5, signY + 22, { align: 'center' });
  doc.setFont('helvetica', 'bold');
  doc.text(retur.pembeli_nama || 'Pembeli', margin + colWidth * 2.5, signY + 27, { align: 'center' });

  return doc;
}

