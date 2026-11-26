import React, { useMemo, useState, useEffect } from 'react';
import { X, Printer, Download, FileText, CheckCircle2, Eye, FileCode2, AlertCircle } from 'lucide-react';
import { Penerimaan, getHppKasur } from '../types';
import { generatePurchaseOrderPdf } from '../utils/purchaseOrderPdf';
import { formatRupiah, terbilang } from '../utils/currency';

interface PurchaseOrderPreviewModalProps {
  penerimaan: Penerimaan;
  onClose: () => void;
}

export const PurchaseOrderPreviewModal: React.FC<PurchaseOrderPreviewModalProps> = ({
  penerimaan,
  onClose,
}) => {
  const [viewMode, setViewMode] = useState<'html' | 'pdf'>('html');
  const [pdfBlobUrl, setPdfBlobUrl] = useState<string>('');

  // Normalisasi seluruh field dokumen PO agar tidak pernah crash meskipun ada field opsional yg kosong
  const normalizedPo = useMemo(() => {
    const safeId = String(penerimaan.id || (penerimaan as any).penerimaan_id || `PO-${Date.now().toString().slice(-4)}`);
    const rawDateStr = penerimaan.tanggal_po || penerimaan.tanggal_terima || new Date().toISOString().slice(0, 10);
    const parsedPoDate = new Date(rawDateStr);
    const safePoDate = isNaN(parsedPoDate.getTime()) ? new Date() : parsedPoDate;

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

    const noPo = String(
      penerimaan.no_po ||
        penerimaan.po?.no_po ||
        `PO/${safePoDate.getFullYear()}/${String(safePoDate.getMonth() + 1).padStart(2, '0')}/${safeId
          .slice(-4)
          .toUpperCase()}`
    );

    const items = (penerimaan.barcodes || []).map((it) => {
      const qty = Number(it.qty) || 0;
      const harga = Number(it.harga_satuan) || getHppKasur(it.kode_ukuran || '') || 0;
      const subtotal = Number(it.subtotal) || harga * qty;
      return {
        ...it,
        qty,
        tipe: it.tipe || 'Topper Ryo',
        nama_ukuran: it.nama_ukuran || `Kasur Busa Ukuran ${it.kode_ukuran || '-'}`,
        harga_satuan: harga,
        subtotal,
      };
    });

    const calculatedSubtotal = items.reduce((s, it) => s + it.subtotal, 0);
    const finalTotal = Number(penerimaan.total_nominal) || calculatedSubtotal;

    return {
      safeId,
      noPo,
      tglPoFormatted: formatTgl(rawDateStr),
      tglTerimaFormatted: formatTgl(penerimaan.tanggal_terima || rawDateStr),
      pabrikNama: penerimaan.pabrik_nama || penerimaan.po?.pabrik?.nama || 'PT / UMKM COMET FOAM',
      pabrikAlamat: penerimaan.pabrik_alamat || 'Ngablak RT 03/05, Ds. Jetis, Kec. Delanggu, Klaten, Jawa Tengah',
      pabrikTelepon: penerimaan.pabrik_telepon || '085643218564 / 081332790030',
      kepadaYth: penerimaan.kepada_yth || "Win's Group (Kepada Yth: Pak WIWIN)",
      kepadaAlamat: penerimaan.kepada_alamat || 'Yogyakarta, D.I. Yogyakarta',
      pembayaran: penerimaan.pembayaran || 'Transfer Bank (TF)',
      petugas: penerimaan.penerima || 'Staf Gudang',
      items,
      finalTotal,
      terbilangText: terbilang(finalTotal),
    };
  }, [penerimaan]);

  const { doc, pdfError } = useMemo(() => {
    try {
      return {
        doc: generatePurchaseOrderPdf({
          ...penerimaan,
          id: normalizedPo.safeId,
          no_po: normalizedPo.noPo,
          total_nominal: normalizedPo.finalTotal,
        }),
        pdfError: null as string | null,
      };
    } catch (err: any) {
      console.error('Error generating Purchase Order PDF:', err);
      return {
        doc: null,
        pdfError: err?.message || 'Gagal membentuk file PDF Purchase Order.',
      };
    }
  }, [penerimaan, normalizedPo]);

  // Buat Blob URL untuk mode Pratinjau PDF (jauh lebih aman daripada datauristring di Chrome/Edge)
  useEffect(() => {
    if (!doc) {
      setPdfBlobUrl('');
      return;
    }
    try {
      const blob = doc.output('blob');
      const url = URL.createObjectURL(blob);
      setPdfBlobUrl(url);
      return () => {
        URL.revokeObjectURL(url);
      };
    } catch {
      setPdfBlobUrl('');
    }
  }, [doc]);

  const handleDownload = () => {
    if (!doc) {
      alert(pdfError || 'Dokumen PDF tidak dapat dibuat.');
      return;
    }
    const cleanName = normalizedPo.noPo.replace(/[/\\?%*:|"<>]/g, '_');
    doc.save(`Purchase_Order_${cleanName}.pdf`);
  };

  // Cetak langsung via hidden iframe HTML A4 agar TIDAK pernah diblokir popup blocker Edge/Chrome
  const handlePrint = () => {
    try {
      const itemRowsHtml =
        normalizedPo.items.length === 0
          ? `<tr><td colspan="6" style="padding:18px;text-align:center;color:#94a3b8;font-style:italic;">Tidak ada rincian item kasur pada dokumen ini.</td></tr>`
          : normalizedPo.items
              .map(
                (it, idx) => `
          <tr style="background:${idx % 2 === 1 ? '#f8fafc' : '#ffffff'};border-bottom:1px solid #f1f5f9;">
            <td style="padding:9px 10px;">
              <div style="font-weight:700;color:#0f172a;font-size:12px;">${it.tipe} — Ukuran ${it.kode_ukuran}</div>
              <div style="color:#64748b;font-size:10px;margin-top:2px;">${it.nama_ukuran} · Barcode: ${it.barcode || '-'}</div>
            </td>
            <td style="padding:9px 10px;text-align:center;font-weight:600;color:#0f172a;">${it.qty}</td>
            <td style="padding:9px 10px;text-align:right;color:#0f172a;">${formatRupiah(it.harga_satuan)}</td>
            <td style="padding:9px 10px;text-align:center;color:#64748b;">0%</td>
            <td style="padding:9px 10px;text-align:center;color:#64748b;">-</td>
            <td style="padding:9px 10px;text-align:right;font-weight:700;color:#0f172a;">${formatRupiah(it.subtotal)}</td>
          </tr>`
              )
              .join('');

      const printHtml = `<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8" />
  <title>Purchase Order - ${normalizedPo.noPo}</title>
  <style>
    @page { size: A4 portrait; margin: 14mm; }
    * { box-sizing: border-box; font-family: 'Segoe UI', Arial, sans-serif; }
    body { margin: 0; padding: 0; color: #0f172a; background: #fff; font-size: 12px; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    .sheet { width: 100%; max-width: 780px; margin: 0 auto; }
    .top-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 24px; }
    .brand { display: flex; align-items: center; gap: 10px; }
    .logo-box { width: 38px; height: 38px; background: #0253a3; color: #fff; font-weight: 800; font-size: 18px; border-radius: 6px; display: flex; align-items: center; justify-content: center; }
    .brand-title { font-size: 20px; font-weight: 800; color: #1e293b; letter-spacing: 0.4px; }
    .brand-sub { font-size: 11px; color: #64748b; }
    .po-meta { text-align: right; }
    .po-title { font-size: 22px; font-weight: 800; color: #0f172a; margin-bottom: 6px; }
    .meta-table td { padding: 1.5px 0; font-size: 11px; }
    .meta-label { color: #64748b; padding-right: 16px; text-align: right; }
    .meta-val { font-weight: 700; color: #0f172a; text-align: right; }
    .two-cols { display: flex; gap: 28px; margin-bottom: 22px; }
    .col { flex: 1; }
    .col-heading { font-size: 12px; font-weight: 700; color: #334155; padding-bottom: 5px; border-bottom: 1.5px solid #cbd5e1; margin-bottom: 8px; }
    .col-name { font-weight: 700; font-size: 12px; color: #0f172a; margin-bottom: 3px; }
    .col-line { font-size: 11px; color: #475569; line-height: 1.5; }
    table.items { width: 100%; border-collapse: collapse; margin-bottom: 16px; }
    table.items thead th { background: #283548; color: #fff; font-weight: 700; font-size: 11px; padding: 9px 10px; text-align: left; }
    .bottom-grid { display: flex; justify-content: space-between; align-items: flex-start; gap: 24px; margin-top: 8px; }
    .terms { flex: 1; }
    .terms-title { font-size: 12px; font-weight: 700; color: #334155; padding-bottom: 4px; border-bottom: 1.5px solid #cbd5e1; margin-bottom: 6px; max-width: 260px; }
    .terms-list { font-size: 10.5px; color: #64748b; line-height: 1.55; margin: 0; padding-left: 14px; }
    .summary { width: 290px; }
    .sum-row { display: flex; justify-content: space-between; font-size: 11.5px; color: #475569; padding: 3px 0; }
    .sum-total { display: flex; justify-content: space-between; font-size: 14px; font-weight: 800; color: #0f172a; border-top: 1.5px solid #cbd5e1; padding-top: 7px; margin-top: 6px; }
    .sum-total span:last-child { color: #0253a3; }
    .terbilang { text-align: right; font-style: italic; font-size: 10.5px; color: #64748b; margin-top: 4px; }
    .date-line { text-align: right; font-size: 11px; color: #64748b; margin-top: 28px; margin-bottom: 8px; }
    .signs { display: flex; justify-content: space-between; padding: 0 36px; margin-top: 6px; }
    .sign-box { text-align: center; width: 200px; }
    .sign-role { font-weight: 700; font-size: 11.5px; color: #334155; margin-bottom: 54px; }
    .sign-line { border-top: 1px solid #94a3b8; padding-top: 5px; font-weight: 700; font-size: 11.5px; color: #0f172a; }
    .sign-sub { font-size: 10px; color: #64748b; }
  </style>
</head>
<body>
  <div class="sheet">
    <div class="top-header">
      <div class="brand">
        <div class="logo-box">W</div>
        <div>
          <div class="brand-title">WIN'S GROUP</div>
          <div class="brand-sub">Gudang Distribusi Kasur Busa & Logistik</div>
        </div>
      </div>
      <div class="po-meta">
        <div class="po-title">Purchase Order</div>
        <table class="meta-table" align="right">
          <tr><td class="meta-label">Referensi</td><td class="meta-val">${normalizedPo.noPo}</td></tr>
          <tr><td class="meta-label">Tanggal PO</td><td class="meta-val">${normalizedPo.tglPoFormatted}</td></tr>
          <tr><td class="meta-label">Tgl. Kirim / Terima</td><td class="meta-val">${normalizedPo.tglTerimaFormatted}</td></tr>
          <tr><td class="meta-label">Status</td><td class="meta-val" style="color:#109568;">Diterima / Selesai</td></tr>
        </table>
      </div>
    </div>

    <div class="two-cols">
      <div class="col">
        <div class="col-heading">Info Perusahaan</div>
        <div class="col-name">${normalizedPo.kepadaYth}</div>
        <div class="col-line">Alamat: ${normalizedPo.kepadaAlamat}</div>
        <div class="col-line">Metode Pembayaran: ${normalizedPo.pembayaran}</div>
        <div class="col-line">Petugas Penerima: ${normalizedPo.petugas}</div>
        <div class="col-line">WhatsApp: 0812-3456-7890 · Email: wiwin@wins.com</div>
      </div>
      <div class="col">
        <div class="col-heading">Order Ke</div>
        <div class="col-name">${normalizedPo.pabrikNama}</div>
        <div class="col-line" style="font-style:italic;color:#64748b;">Save For The Health Of Your Sleep With High Density General Foam</div>
        <div class="col-line">${normalizedPo.pabrikAlamat}</div>
        <div class="col-line">HP/WA: ${normalizedPo.pabrikTelepon}</div>
        <div class="col-line">FB / IG: Comet Foam · Pembayaran: TF</div>
      </div>
    </div>

    <table class="items">
      <thead>
        <tr>
          <th style="width:38%;">Produk</th>
          <th style="width:12%;text-align:center;">Kuantitas</th>
          <th style="width:16%;text-align:right;">Harga</th>
          <th style="width:10%;text-align:center;">Diskon</th>
          <th style="width:8%;text-align:center;">Pajak</th>
          <th style="width:16%;text-align:right;">Total</th>
        </tr>
      </thead>
      <tbody>${itemRowsHtml}</tbody>
    </table>

    <div class="bottom-grid">
      <div class="terms">
        <div class="terms-title">Syarat & Ketentuan</div>
        <div style="font-size:10.5px;color:#475569;margin-bottom:4px;">Metode Pembayaran: Bank Transfer (TF)</div>
        <ol class="terms-list">
          <li>Kasur busa telah diterima & dicek lengkap di Gudang Win's Group.</li>
          <li>Label barcode kasur telah terbit & tersinkronisasi di sistem stok.</li>
          <li>Dokumen purchase order ini sah sebagai bukti tagihan pabrik.</li>
        </ol>
      </div>
      <div class="summary">
        <div class="sum-row"><span>Subtotal</span><span>${formatRupiah(normalizedPo.finalTotal)}</span></div>
        <div class="sum-row"><span>Pajak</span><span>Rp 0</span></div>
        <div class="sum-row"><span>Diskon</span><span>Rp 0</span></div>
        <div class="sum-row"><span>Total</span><span>${formatRupiah(normalizedPo.finalTotal)}</span></div>
        <div class="sum-row"><span>Pajak Included</span><span>Rp 0</span></div>
        <div class="sum-total"><span>Jumlah Tertagih:</span><span>${formatRupiah(normalizedPo.finalTotal)}</span></div>
        <div class="terbilang">(${normalizedPo.terbilangText})</div>
      </div>
    </div>

    <div class="date-line">Klaten / Yogyakarta, ${normalizedPo.tglTerimaFormatted}</div>
    <div class="signs">
      <div class="sign-box">
        <div class="sign-role">Penerima,</div>
        <div class="sign-line">( ${normalizedPo.petugas} / Bpk. WIWIN )</div>
        <div class="sign-sub">Win's Group — Yogyakarta</div>
      </div>
      <div class="sign-box">
        <div class="sign-role">Hormat Kami,</div>
        <div class="sign-line">( COMET FOAM )</div>
        <div class="sign-sub">Sentra Busa Delanggu, Klaten</div>
      </div>
    </div>
  </div>
</body>
</html>`;

      const existingFrame = document.getElementById('po-hidden-print-frame');
      if (existingFrame) existingFrame.remove();

      const iframe = document.createElement('iframe');
      iframe.id = 'po-hidden-print-frame';
      iframe.style.position = 'fixed';
      iframe.style.right = '0';
      iframe.style.bottom = '0';
      iframe.style.width = '0';
      iframe.style.height = '0';
      iframe.style.border = '0';
      document.body.appendChild(iframe);

      const frameDoc = iframe.contentWindow?.document;
      if (!frameDoc || !iframe.contentWindow) {
        handleDownload();
        return;
      }

      frameDoc.open();
      frameDoc.write(printHtml);
      frameDoc.close();

      setTimeout(() => {
        try {
          iframe.contentWindow?.focus();
          iframe.contentWindow?.print();
        } catch {
          handleDownload();
        }
      }, 250);
    } catch (err) {
      console.error('Error printing PO:', err);
      handleDownload();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-6 bg-slate-900/70 backdrop-blur-xs animate-fade-in">
      <div className="bg-white w-full max-w-4xl h-[92vh] rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col">
        {/* Header Modal */}
        <div className="px-4 sm:px-6 py-3.5 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-brand-50 text-brand-700 flex items-center justify-center border border-brand-100 shrink-0">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-bold text-slate-900">
                Dokumen Purchase Order (PO)
              </h2>
              <p className="text-xs text-slate-500 font-mono">
                {normalizedPo.noPo} · {normalizedPo.pabrikNama}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Switch Mode Preview */}
            <div className="flex p-0.5 bg-slate-200/80 rounded-xl mr-1">
              <button
                type="button"
                onClick={() => setViewMode('html')}
                className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-bold transition ${
                  viewMode === 'html' ? 'bg-white text-brand-700 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Eye className="w-3.5 h-3.5" />
                <span>Pratinjau Dokumen</span>
              </button>
              <button
                type="button"
                onClick={() => setViewMode('pdf')}
                className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-bold transition ${
                  viewMode === 'pdf' ? 'bg-white text-brand-700 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <FileCode2 className="w-3.5 h-3.5" />
                <span>PDF Embed</span>
              </button>
            </div>

            <button
              type="button"
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-brand-600 hover:bg-brand-700 text-white text-xs font-bold rounded-xl transition shadow-xs active:scale-95"
            >
              <Printer className="w-4 h-4" />
              <span>Cetak Sekarang</span>
            </button>
            <button
              type="button"
              onClick={handleDownload}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold rounded-xl transition shadow-xs active:scale-95"
            >
              <Download className="w-4 h-4" />
              <span>Unduh PDF</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-200 rounded-xl transition ml-1"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Viewer Body */}
        <div className="flex-1 bg-slate-200/70 p-3 sm:p-6 overflow-y-auto">
          {pdfError && (
            <div className="mb-3 p-3 bg-amber-50 border border-amber-200 text-amber-800 rounded-xl text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{pdfError} — Menggunakan tampilan dokumen langsung.</span>
            </div>
          )}

          {viewMode === 'html' ? (
            /* Pratinjau Visual Dokumen A4 (Selalu muncul sempurna di semua browser & HP) */
            <div className="bg-white max-w-[780px] mx-auto rounded-xl shadow-lg border border-slate-200 p-6 sm:p-10 text-slate-900 space-y-6">
              {/* Top Header */}
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-[#0253a3] text-white font-black text-lg flex items-center justify-center shrink-0">
                    W
                  </div>
                  <div>
                    <div className="text-lg font-extrabold text-slate-800 tracking-wide">WIN'S GROUP</div>
                    <div className="text-xs text-slate-500">Gudang Distribusi Kasur Busa & Logistik</div>
                  </div>
                </div>

                <div className="sm:text-right">
                  <div className="text-xl font-extrabold text-slate-900">Purchase Order</div>
                  <div className="mt-1.5 space-y-0.5 text-xs">
                    <div className="flex sm:justify-end gap-4">
                      <span className="text-slate-500">Referensi</span>
                      <span className="font-bold font-mono text-slate-900">{normalizedPo.noPo}</span>
                    </div>
                    <div className="flex sm:justify-end gap-4">
                      <span className="text-slate-500">Tanggal PO</span>
                      <span className="font-bold text-slate-900">{normalizedPo.tglPoFormatted}</span>
                    </div>
                    <div className="flex sm:justify-end gap-4">
                      <span className="text-slate-500">Tgl. Kirim / Terima</span>
                      <span className="font-bold text-slate-900">{normalizedPo.tglTerimaFormatted}</span>
                    </div>
                    <div className="flex sm:justify-end gap-4">
                      <span className="text-slate-500">Status</span>
                      <span className="font-bold text-emerald-600">Diterima / Selesai</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* 2 Kolom Info Perusahaan & Order Ke */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 text-xs">
                <div>
                  <div className="font-bold text-slate-700 pb-1.5 border-b border-slate-300 mb-2">
                    Info Perusahaan
                  </div>
                  <div className="font-bold text-slate-900 mb-1">{normalizedPo.kepadaYth}</div>
                  <div className="text-slate-600 space-y-0.5 leading-relaxed">
                    <div>Alamat: {normalizedPo.kepadaAlamat}</div>
                    <div>Metode Pembayaran: {normalizedPo.pembayaran}</div>
                    <div>Petugas Penerima: {normalizedPo.petugas}</div>
                    <div>WhatsApp: 0812-3456-7890 · Email: wiwin@wins.com</div>
                  </div>
                </div>

                <div>
                  <div className="font-bold text-slate-700 pb-1.5 border-b border-slate-300 mb-2">
                    Order Ke
                  </div>
                  <div className="font-bold text-slate-900 mb-0.5">{normalizedPo.pabrikNama}</div>
                  <div className="italic text-[11px] text-slate-500 mb-1">
                    Save For The Health Of Your Sleep With High Density General Foam
                  </div>
                  <div className="text-slate-600 space-y-0.5 leading-relaxed">
                    <div>{normalizedPo.pabrikAlamat}</div>
                    <div>HP/WA: {normalizedPo.pabrikTelepon}</div>
                    <div>FB / IG: Comet Foam · Pembayaran: TF</div>
                  </div>
                </div>
              </div>

              {/* Tabel Produk Header Navy */}
              <div className="overflow-x-auto rounded-lg border border-slate-200">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-[#283548] text-white">
                      <th className="py-2.5 px-3 font-bold">Produk</th>
                      <th className="py-2.5 px-3 font-bold text-center">Kuantitas</th>
                      <th className="py-2.5 px-3 font-bold text-right">Harga</th>
                      <th className="py-2.5 px-3 font-bold text-center">Diskon</th>
                      <th className="py-2.5 px-3 font-bold text-center">Pajak</th>
                      <th className="py-2.5 px-3 font-bold text-right">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {normalizedPo.items.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="py-6 text-center italic text-slate-400">
                          Tidak ada rincian item kasur pada dokumen ini.
                        </td>
                      </tr>
                    ) : (
                      normalizedPo.items.map((it, idx) => (
                        <tr key={idx} className={idx % 2 === 1 ? 'bg-slate-50/80' : 'bg-white'}>
                          <td className="py-2.5 px-3">
                            <div className="font-bold text-slate-900">
                              {it.tipe} — Ukuran {it.kode_ukuran}
                            </div>
                            <div className="text-[11px] text-slate-500">
                              {it.nama_ukuran} · Barcode: {it.barcode || '-'}
                            </div>
                          </td>
                          <td className="py-2.5 px-3 text-center font-semibold">{it.qty}</td>
                          <td className="py-2.5 px-3 text-right font-mono">{formatRupiah(it.harga_satuan)}</td>
                          <td className="py-2.5 px-3 text-center text-slate-500">0%</td>
                          <td className="py-2.5 px-3 text-center text-slate-500">-</td>
                          <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-900">
                            {formatRupiah(it.subtotal)}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              {/* Syarat & Ringkasan Harga */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-2">
                <div className="text-xs">
                  <div className="font-bold text-slate-700 pb-1 border-b border-slate-300 mb-2 max-w-[240px]">
                    Syarat & Ketentuan
                  </div>
                  <div className="text-slate-600 mb-1">Metode Pembayaran: Bank Transfer (TF)</div>
                  <ol className="list-decimal list-inside text-[11px] text-slate-500 space-y-0.5">
                    <li>Kasur busa telah diterima & dicek lengkap di Gudang Win's Group.</li>
                    <li>Label barcode kasur telah terbit & tersinkronisasi di sistem stok.</li>
                    <li>Dokumen purchase order ini sah sebagai bukti tagihan pabrik.</li>
                  </ol>
                </div>

                <div className="text-xs space-y-1.5 sm:pl-12">
                  <div className="flex justify-between text-slate-600">
                    <span>Subtotal</span>
                    <span className="font-mono">{formatRupiah(normalizedPo.finalTotal)}</span>
                  </div>
                  <div className="flex justify-between text-slate-600">
                    <span>Pajak</span>
                    <span className="font-mono">Rp 0</span>
                  </div>
                  <div className="flex justify-between text-slate-600">
                    <span>Diskon</span>
                    <span className="font-mono">Rp 0</span>
                  </div>
                  <div className="flex justify-between text-slate-600">
                    <span>Total</span>
                    <span className="font-mono">{formatRupiah(normalizedPo.finalTotal)}</span>
                  </div>
                  <div className="flex justify-between text-slate-600">
                    <span>Pajak Included</span>
                    <span className="font-mono">Rp 0</span>
                  </div>
                  <div className="flex justify-between items-center pt-2 border-t border-slate-300 font-extrabold text-sm text-slate-900">
                    <span>Jumlah Tertagih:</span>
                    <span className="font-mono text-[#0253a3]">{formatRupiah(normalizedPo.finalTotal)}</span>
                  </div>
                  <div className="text-right italic text-[11px] text-slate-500">
                    ({normalizedPo.terbilangText})
                  </div>
                </div>
              </div>

              {/* Tanda Tangan Dua Pihak */}
              <div className="pt-4">
                <div className="text-right text-xs text-slate-500 mb-3">
                  Klaten / Yogyakarta, {normalizedPo.tglTerimaFormatted}
                </div>
                <div className="grid grid-cols-2 gap-8 text-center text-xs">
                  <div>
                    <div className="font-bold text-slate-700 mb-14">Penerima,</div>
                    <div className="border-t border-slate-400 pt-1.5 max-w-[200px] mx-auto font-bold text-slate-900">
                      ( {normalizedPo.petugas} / Bpk. WIWIN )
                    </div>
                    <div className="text-[11px] text-slate-500">Win's Group — Yogyakarta</div>
                  </div>
                  <div>
                    <div className="font-bold text-slate-700 mb-14">Hormat Kami,</div>
                    <div className="border-t border-slate-400 pt-1.5 max-w-[200px] mx-auto font-bold text-slate-900">
                      ( COMET FOAM )
                    </div>
                    <div className="text-[11px] text-slate-500">Sentra Busa Delanggu, Klaten</div>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            /* Pratinjau PDF Embed via Blob URL */
            <div className="h-full min-h-[500px] flex items-center justify-center">
              {pdfBlobUrl ? (
                <iframe
                  src={pdfBlobUrl}
                  title="Preview Purchase Order PDF"
                  className="w-full h-full min-h-[560px] rounded-2xl border border-slate-300 shadow-inner bg-white"
                />
              ) : (
                <div className="text-center p-8 bg-white rounded-2xl border border-slate-200 space-y-3">
                  <p className="text-sm font-semibold text-slate-700">
                    Browser Anda tidak menampilkan PDF inline.
                  </p>
                  <button
                    type="button"
                    onClick={handleDownload}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-brand-600 text-white text-xs font-bold rounded-xl"
                  >
                    <Download className="w-4 h-4" />
                    <span>Unduh PDF Purchase Order</span>
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer Modal */}
        <div className="px-6 py-3 bg-white border-t border-slate-200 flex items-center justify-between text-xs text-slate-500 shrink-0">
          <div className="flex items-center gap-2 text-emerald-700 font-medium">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>Format Resmi Sesuai Standar Pabrik Comet Foam & HPP Win's Group</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl transition"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
};
