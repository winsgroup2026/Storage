import { jsPDF } from 'jspdf';
import { PayrollRecord } from '../types';
import { formatRupiah, terbilang } from './currency';

export function generateSlipGajiPdf(payroll: PayrollRecord): jsPDF {
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

  // Garis Pembatas Header
  doc.setDrawColor(203, 213, 225);
  doc.setLineWidth(0.5);
  doc.line(margin, 33, pageWidth - margin, 33);

  // Judul Dokumen
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.setTextColor(15, 23, 42);
  doc.text('SLIP GAJI KARYAWAN', margin, 42);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9.5);
  doc.setTextColor(100, 116, 139);
  doc.text(`Periode: ${payroll.periode_bulan} · No. Slip: ${payroll.no_slip}`, margin, 47);

  // Kotak Identitas Karyawan
  const infoY = 52;
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(margin, infoY, contentWidth, 34, 2, 2, 'F');
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(margin, infoY, contentWidth, 34, 2, 2, 'D');

  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(71, 85, 105);

  // Kolom Kiri Info
  doc.text('NIK:', margin + 4, infoY + 7);
  doc.text('Nama Karyawan:', margin + 4, infoY + 14);
  doc.text('Jabatan / Posisi:', margin + 4, infoY + 21);
  doc.text('Tanggal Masuk:', margin + 4, infoY + 28);

  doc.setFont('helvetica', 'normal');
  doc.setTextColor(15, 23, 42);
  doc.text(payroll.nik || '-', margin + 35, infoY + 7);
  doc.setFont('helvetica', 'bold');
  doc.text(payroll.nama || '-', margin + 35, infoY + 14);
  doc.setFont('helvetica', 'normal');
  doc.text(payroll.jabatan || '-', margin + 35, infoY + 21);
  doc.text(payroll.tanggal_masuk || '-', margin + 35, infoY + 28);

  // Kolom Kanan Info
  const rightColX = margin + 95;
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(71, 85, 105);
  doc.text('Tanggal Resign:', rightColX, infoY + 7);
  doc.text('Tanggal Bayar:', rightColX, infoY + 14);
  doc.text('Status Kerja:', rightColX, infoY + 21);
  doc.text('Status Slip:', rightColX, infoY + 28);

  doc.setFont('helvetica', 'normal');
  doc.setTextColor(15, 23, 42);
  if (payroll.tanggal_resign) {
    doc.setTextColor(220, 38, 38);
    doc.text(payroll.tanggal_resign, rightColX + 35, infoY + 7);
  } else {
    doc.text('-', rightColX + 35, infoY + 7);
  }

  doc.setTextColor(15, 23, 42);
  doc.text(payroll.tanggal_pembayaran || '-', rightColX + 35, infoY + 14);

  if (payroll.tanggal_resign) {
    doc.setTextColor(185, 28, 28);
    doc.setFont('helvetica', 'bold');
    doc.text('RESIGN / NON-AKTIF', rightColX + 35, infoY + 21);
  } else {
    doc.setTextColor(22, 101, 52);
    doc.setFont('helvetica', 'bold');
    doc.text('KARYAWAN AKTIF', rightColX + 35, infoY + 21);
  }

  doc.setTextColor(22, 101, 52);
  doc.setFont('helvetica', 'bold');
  doc.text((payroll.status || 'DIBAYAR').toUpperCase(), rightColX + 35, infoY + 28);

  // --------------------------------------------------------------------------
  // TABEL 2 KOLOM BERDAMPINGAN: PENDAPATAN VS POTONGAN
  // --------------------------------------------------------------------------
  const tableY = infoY + 40;
  const colW = (contentWidth - 6) / 2; // ~87mm each with 6mm gap
  const leftX = margin;
  const rightX = margin + colW + 6;

  // Header Pendapatan
  doc.setFillColor(2, 83, 163); // Deep blue
  doc.rect(leftX, tableY, colW, 7.5, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(255, 255, 255);
  doc.text('PENERIMAAN / PENDAPATAN', leftX + 4, tableY + 5);
  doc.text('JUMLAH (RP)', leftX + colW - 4, tableY + 5, { align: 'right' });

  // Header Potongan
  doc.setFillColor(180, 83, 9); // Amber-brown
  doc.rect(rightX, tableY, colW, 7.5, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(255, 255, 255);
  doc.text('POTONGAN GAJI', rightX + 4, tableY + 5);
  doc.text('JUMLAH (RP)', rightX + colW - 4, tableY + 5, { align: 'right' });

  // Data Pendapatan
  const pendapatanRows = [
    { label: 'Gaji Pokok', val: payroll.gaji_pokok },
    { label: 'Uang Makan', val: payroll.uang_makan },
    { label: 'Transport', val: payroll.transport },
    { label: 'Tunjangan Jabatan', val: payroll.tunjangan_jabatan },
    { label: 'Tunjangan Operasional', val: payroll.tunjangan_operasional },
    { label: 'Tunjangan Hari Raya (THR)', val: payroll.thr },
    { label: 'Uang Lembur', val: payroll.lembur },
  ];

  // Data Potongan
  const potonganRows = [
    {
      label: `Potongan Alpha (${payroll.hari_alpha || 0} hari)`,
      val: payroll.potongan_alpha,
    },
    {
      label: `Potongan Izin (${payroll.hari_izin || 0} hari)`,
      val: payroll.potongan_izin,
    },
    {
      label: `Potongan Sakit (${payroll.hari_sakit || 0} hari)`,
      val: payroll.potongan_sakit,
    },
    {
      label: `Potongan WFH (${payroll.hari_wfh || 0} hari)`,
      val: payroll.potongan_wfh,
    },
    { label: 'Jamsostek (BPJS Ketenagakerjaan)', val: payroll.jamsostek },
    { label: 'BPJS Kesehatan', val: payroll.bpjs },
    { label: 'Pinjaman / Kasbon', val: payroll.pinjaman },
    { label: 'Potongan Transport', val: payroll.potongan_transport },
  ];

  const maxRows = Math.max(pendapatanRows.length, potonganRows.length);
  const rowH = 6.2;
  let currentY = tableY + 7.5;

  doc.setFontSize(8);

  for (let i = 0; i < maxRows; i++) {
    const isEven = i % 2 === 1;

    // Background zebra
    if (isEven) {
      doc.setFillColor(248, 250, 252);
      doc.rect(leftX, currentY, colW, rowH, 'F');
      doc.rect(rightX, currentY, colW, rowH, 'F');
    }

    doc.setDrawColor(241, 245, 249);
    doc.line(leftX, currentY + rowH, leftX + colW, currentY + rowH);
    doc.line(rightX, currentY + rowH, rightX + colW, currentY + rowH);

    // Left Item (Pendapatan)
    const pItem = pendapatanRows[i];
    if (pItem) {
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(51, 65, 85);
      doc.text(pItem.label, leftX + 4, currentY + 4.3);
      doc.setFont('helvetica', pItem.val > 0 ? 'bold' : 'normal');
      doc.setTextColor(15, 23, 42);
      doc.text(formatRupiah(pItem.val), leftX + colW - 4, currentY + 4.3, { align: 'right' });
    }

    // Right Item (Potongan)
    const dItem = potonganRows[i];
    if (dItem) {
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(51, 65, 85);
      doc.text(dItem.label, rightX + 4, currentY + 4.3);
      doc.setFont('helvetica', dItem.val > 0 ? 'bold' : 'normal');
      doc.setTextColor(dItem.val > 0 ? 185 : 100, dItem.val > 0 ? 28 : 116, dItem.val > 0 ? 28 : 139);
      doc.text(formatRupiah(dItem.val), rightX + colW - 4, currentY + 4.3, { align: 'right' });
    }

    currentY += rowH;
  }

  // Baris Subtotal Pendapatan & Subtotal Potongan
  doc.setFillColor(238, 242, 255); // Soft brand
  doc.rect(leftX, currentY, colW, 8, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(2, 83, 163);
  doc.text('JUMLAH PENDAPATAN', leftX + 4, currentY + 5.5);
  doc.text(formatRupiah(payroll.jumlah_pendapatan), leftX + colW - 4, currentY + 5.5, { align: 'right' });

  doc.setFillColor(254, 242, 242); // Soft red
  doc.rect(rightX, currentY, colW, 8, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(185, 28, 28);
  doc.text('TOTAL POTONGAN', rightX + 4, currentY + 5.5);
  doc.text(formatRupiah(payroll.total_potongan), rightX + colW - 4, currentY + 5.5, { align: 'right' });

  currentY += 12;

  // --------------------------------------------------------------------------
  // KOTAK UTAMA: TAKE HOME PAY (THP)
  // --------------------------------------------------------------------------
  doc.setFillColor(236, 253, 245); // Emerald-50
  doc.roundedRect(margin, currentY, contentWidth, 22, 2, 2, 'F');
  doc.setDrawColor(16, 185, 129); // Emerald-500
  doc.setLineWidth(0.7);
  doc.roundedRect(margin, currentY, contentWidth, 22, 2, 2, 'D');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(6, 95, 70); // Emerald-800
  doc.text('TAKE HOME PAY (THP):', margin + 6, currentY + 7);

  doc.setFontSize(14);
  doc.setTextColor(4, 120, 87); // Emerald-700
  doc.text(formatRupiah(payroll.take_home_pay), pageWidth - margin - 6, currentY + 7.5, { align: 'right' });

  // Terbilang
  doc.setFont('helvetica', 'italic');
  doc.setFontSize(8.5);
  doc.setTextColor(71, 85, 105);
  const terbilangText = `Terbilang: ${terbilang(payroll.take_home_pay)}`;
  const terbilangLines = doc.splitTextToSize(terbilangText, contentWidth - 12);
  doc.text(terbilangLines, margin + 6, currentY + 14.5);

  currentY += 27;

  // Catatan Penggajian jika ada
  if (payroll.catatan) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139);
    doc.text(`Catatan: ${payroll.catatan}`, margin, currentY);
    currentY += 6;
  }

  // Garis Tanda Tangan
  currentY += 4;
  const signW = contentWidth / 2;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(71, 85, 105);

  // Kiri: Dibuat / Disetujui Oleh
  doc.text('Dibuat & Disetujui Oleh,', margin + signW * 0.5, currentY, { align: 'center' });
  doc.text('Finance / HRD Win\'s Group', margin + signW * 0.5, currentY + 4, { align: 'center' });
  doc.text('( ......................................... )', margin + signW * 0.5, currentY + 24, { align: 'center' });
  doc.setFont('helvetica', 'bold');
  doc.text(payroll.dibuat_oleh || 'Bagian Keuangan', margin + signW * 0.5, currentY + 29, { align: 'center' });

  // Kanan: Diterima Oleh Karyawan
  doc.setFont('helvetica', 'normal');
  doc.text('Diterima Oleh Karyawan,', margin + signW * 1.5, currentY, { align: 'center' });
  doc.text(payroll.jabatan || 'Karyawan', margin + signW * 1.5, currentY + 4, { align: 'center' });
  doc.text('( ......................................... )', margin + signW * 1.5, currentY + 24, { align: 'center' });
  doc.setFont('helvetica', 'bold');
  doc.text(payroll.nama, margin + signW * 1.5, currentY + 29, { align: 'center' });

  // Footer Kerahasiaan
  doc.setFont('helvetica', 'italic');
  doc.setFontSize(7.5);
  doc.setTextColor(148, 163, 184);
  doc.text(
    '* Dokumen slip gaji ini diterbitkan secara otomatis dan sah oleh Sistem Payroll Win\'s Group. Harap dijaga kerahasiaannya.',
    pageWidth / 2,
    285,
    { align: 'center' }
  );

  return doc;
}
