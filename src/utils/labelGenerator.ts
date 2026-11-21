import JsBarcode from 'jsbarcode';
import { jsPDF } from 'jspdf';

export interface LabelData {
  barcode: string; // e.g. '200-101026'
  nama_ukuran: string;
  dimensi_str?: string; // e.g. '200 x 200 x 20 cm'
  tanggal_masuk: string; // YYYY-MM-DD or DD/MM/YYYY
  qty: number; // berapa lembar label yang ingin dicetak
}

/**
 * Generate barcode Code 128 sebagai data URL image PNG menggunakan canvas
 */
export function generateBarcodeDataUrl(text: string): string {
  const canvas = document.createElement('canvas');
  try {
    JsBarcode(canvas, text, {
      format: 'CODE128',
      width: 2,
      height: 48,
      displayValue: false, // kita render teks manual dengan ukuran proporsional
      margin: 4,
      background: '#ffffff',
      lineColor: '#000000',
    });
    return canvas.toDataURL('image/png');
  } catch (err) {
    console.error('Error generating barcode:', err);
    return '';
  }
}

/**
 * Format tanggal ke format DD/MM/YYYY untuk label
 */
export function formatTanggalLabel(dateStr: string): string {
  if (!dateStr) return '';
  if (dateStr.includes('/')) return dateStr;
  const parts = dateStr.split('-');
  if (parts.length === 3) {
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  }
  return dateStr;
}

/**
 * Cetak PDF Label Preset 1: Lembar Stiker A4 (3 Kolom × 8 Baris = 24 Label per Lembar)
 */
export function generateA4SheetPdf(labels: LabelData[], fileName = 'Label_A4_KasurBusa.pdf'): jsPDF {
  // A4 = 210 x 297 mm
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const cols = 3;
  const rows = 8;
  const labelsPerPage = cols * rows; // 24 label

  const marginX = 6; // margin kiri-kanan
  const marginY = 8; // margin atas-bawah
  const colWidth = (210 - marginX * 2) / cols; // ~66 mm
  const rowHeight = (297 - marginY * 2) / rows; // ~35.1 mm

  // Expand label list based on quantity
  const expandedList: {
    barcode: string;
    nama_ukuran: string;
    dimensi_str: string;
    tanggal_masuk: string;
    barcodeUrl: string;
  }[] = [];

  for (const item of labels) {
    const url = generateBarcodeDataUrl(item.barcode);
    const tgl = formatTanggalLabel(item.tanggal_masuk);
    const dimensi = item.dimensi_str || item.nama_ukuran;
    for (let i = 0; i < item.qty; i++) {
      expandedList.push({
        barcode: item.barcode,
        nama_ukuran: item.nama_ukuran,
        dimensi_str: dimensi,
        tanggal_masuk: tgl,
        barcodeUrl: url,
      });
    }
  }

  if (expandedList.length === 0) {
    return doc;
  }

  expandedList.forEach((lbl, index) => {
    if (index > 0 && index % labelsPerPage === 0) {
      doc.addPage('a4', 'portrait');
    }

    const pageIndex = index % labelsPerPage;
    const colIndex = pageIndex % cols;
    const rowIndex = Math.floor(pageIndex / cols);

    const x = marginX + colIndex * colWidth;
    const y = marginY + rowIndex * rowHeight;
    const padding = 2;
    const innerW = colWidth - padding * 2;
    const innerH = rowHeight - padding * 2;

    // Garis bantu potong tipis (dashed)
    doc.setDrawColor(220, 225, 230);
    doc.setLineWidth(0.15);
    doc.rect(x + padding, y + padding, innerW, innerH);

    // Header label: KASUR BUSA
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(30, 41, 59);
    doc.text('KASUR BUSA', x + colWidth / 2, y + padding + 4, { align: 'center' });

    // Barcode image
    if (lbl.barcodeUrl) {
      const imgW = innerW - 6;
      const imgH = 13;
      const imgX = x + (colWidth - imgW) / 2;
      const imgY = y + padding + 5.5;
      doc.addImage(lbl.barcodeUrl, 'PNG', imgX, imgY, imgW, imgH);
    }

    // Kode barcode besar & jelas
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(15, 23, 42);
    doc.text(lbl.barcode, x + colWidth / 2, y + padding + 22.5, { align: 'center' });

    // Ukuran & Tanggal
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(71, 85, 105);
    doc.text(lbl.dimensi_str, x + colWidth / 2, y + padding + 26.5, { align: 'center' });
    doc.text(`Tgl Masuk: ${lbl.tanggal_masuk}`, x + colWidth / 2, y + padding + 30, { align: 'center' });
  });

  return doc;
}

/**
 * Cetak PDF Label Preset 2: Thermal Roll 50 × 30 mm
 */
export function generateThermalPdf(labels: LabelData[], fileName = 'Label_Thermal_KasurBusa.pdf'): jsPDF {
  // Label individual 50mm x 30mm
  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: [30, 50], // height 30, width 50
  });

  const expandedList: {
    barcode: string;
    nama_ukuran: string;
    dimensi_str: string;
    tanggal_masuk: string;
    barcodeUrl: string;
  }[] = [];

  for (const item of labels) {
    const url = generateBarcodeDataUrl(item.barcode);
    const tgl = formatTanggalLabel(item.tanggal_masuk);
    const dimensi = item.dimensi_str || item.nama_ukuran;
    for (let i = 0; i < item.qty; i++) {
      expandedList.push({
        barcode: item.barcode,
        nama_ukuran: item.nama_ukuran,
        dimensi_str: dimensi,
        tanggal_masuk: tgl,
        barcodeUrl: url,
      });
    }
  }

  if (expandedList.length === 0) return doc;

  expandedList.forEach((lbl, index) => {
    if (index > 0) {
      doc.addPage([30, 50], 'landscape');
    }

    const w = 50;
    // Header
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(0, 0, 0);
    doc.text('KASUR BUSA', w / 2, 4.2, { align: 'center' });

    // Barcode image
    if (lbl.barcodeUrl) {
      const imgW = 44;
      const imgH = 11;
      const imgX = (w - imgW) / 2;
      doc.addImage(lbl.barcodeUrl, 'PNG', imgX, 5.5, imgW, imgH);
    }

    // Kode Barcode
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9.5);
    doc.text(lbl.barcode, w / 2, 19.5, { align: 'center' });

    // Info ukuran & tanggal
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.5);
    doc.text(lbl.dimensi_str, w / 2, 23.5, { align: 'center' });
    doc.text(`Tgl: ${lbl.tanggal_masuk}`, w / 2, 27, { align: 'center' });
  });

  return doc;
}

