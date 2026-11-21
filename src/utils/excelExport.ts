import * as XLSX from 'xlsx';

export interface ExportExcelOptions {
  filename: string;
  sheetName?: string;
  headers: string[];
  data: (string | number | boolean | null | undefined)[][];
  columnWidths?: number[];
}

/**
 * Ekspor data ke file Excel (.xlsx) dengan auto-width kolom yang rapi
 * Menghindari pesan 'POSSIBLE DATA LOSS' dari format CSV di Microsoft Excel
 */
export function exportToExcel(options: ExportExcelOptions): void {
  const { filename, sheetName = 'Laporan', headers, data, columnWidths } = options;

  // Bangun array of arrays (AOA) dengan header di baris pertama
  const wsData = [headers, ...data];
  const ws = XLSX.utils.aoa_to_sheet(wsData);

  // Hitung lebar kolom otomatis (auto-width) agar tidak ada teks terpotong di Excel
  const cols = headers.map((headerText, colIdx) => {
    let maxLen = String(headerText ?? '').length;

    for (const row of data) {
      const cellVal = row[colIdx];
      if (cellVal !== undefined && cellVal !== null) {
        const len = String(cellVal).length;
        if (len > maxLen) maxLen = len;
      }
    }

    // Jika ada lebar khusus, gunakan; jika tidak, beri padding + 4 dengan lebar minimal 14 karakter
    const explicitWidth = columnWidths?.[colIdx];
    const computedWidth = Math.max(maxLen + 4, 14);
    return { wch: explicitWidth || Math.min(computedWidth, 50) };
  });

  ws['!cols'] = cols;

  // Buat workbook baru dan tambahkan worksheet
  const wb = XLSX.utils.book_new();
  const safeSheetName = (sheetName || 'Laporan').slice(0, 31);
  XLSX.utils.book_append_sheet(wb, ws, safeSheetName);

  // Tulis dan unduh file langsung sebagai .xlsx
  const safeFilename = filename.toLowerCase().endsWith('.xlsx') ? filename : `${filename}.xlsx`;
  XLSX.writeFile(wb, safeFilename);
}

