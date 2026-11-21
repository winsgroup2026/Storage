import React, { useState, useEffect } from 'react';
import { X, Printer, FileText, CheckCircle2 } from 'lucide-react';
import { LabelData, generateA4SheetPdf, generateThermalPdf, generateBarcodeDataUrl } from '../utils/labelGenerator';

interface CetakLabelModalProps {
  isOpen: boolean;
  onClose: () => void;
  labels: LabelData[];
}

export const CetakLabelModal: React.FC<CetakLabelModalProps> = ({ isOpen, onClose, labels }) => {
  const [preset, setPreset] = useState<'a4' | 'thermal'>('a4');
  const [currentLabels, setCurrentLabels] = useState<LabelData[]>(labels);
  const [previewBarcodeUrl, setPreviewBarcodeUrl] = useState<string>('');
  const [isGenerating, setIsGenerating] = useState(false);

  useEffect(() => {
    setCurrentLabels(labels);
    if (labels.length > 0) {
      const url = generateBarcodeDataUrl(labels[0].barcode);
      setPreviewBarcodeUrl(url);
    }
  }, [labels]);

  if (!isOpen || currentLabels.length === 0) return null;

  const totalPcs = currentLabels.reduce((sum, item) => sum + (Number(item.qty) || 0), 0);
  const sample = currentLabels[0];

  const handleQtyChange = (index: number, newQty: number) => {
    const updated = [...currentLabels];
    updated[index].qty = Math.max(1, newQty);
    setCurrentLabels(updated);
  };

  const handlePrintOrDownload = (action: 'print' | 'download') => {
    setIsGenerating(true);
    try {
      const doc = preset === 'a4' 
        ? generateA4SheetPdf(currentLabels)
        : generateThermalPdf(currentLabels);

      const fileName = `Label_${preset.toUpperCase()}_KasurBusa_${sample.barcode}.pdf`;

      if (action === 'print') {
        doc.autoPrint();
        const blobUrl = doc.output('bloburl');
        window.open(blobUrl, '_blank');
      } else {
        doc.save(fileName);
      }
    } catch (err) {
      console.error('Error generating PDF:', err);
      alert('Terjadi kesalahan saat memproses PDF label.');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-white w-full max-w-xl rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/50">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-brand-50 rounded-xl text-brand-600">
              <Printer className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-800">Cetak Label Barcode</h2>
              <p className="text-xs text-slate-500">Pilih format preset stiker atau thermal printer</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-6">
          {/* Preset Selector */}
          <div>
            <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-2">
              Pilihan Format Preset
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setPreset('a4')}
                className={`p-4 rounded-xl border text-left transition flex flex-col gap-1.5 ${
                  preset === 'a4'
                    ? 'border-brand-500 bg-brand-50/50 text-brand-900 ring-2 ring-brand-200'
                    : 'border-slate-200 hover:border-slate-300 bg-white text-slate-700'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-sm">Lembar Stiker A4</span>
                  {preset === 'a4' && <CheckCircle2 className="w-4 h-4 text-brand-600" />}
                </div>
                <span className="text-xs text-slate-500">
                  3 kolom × 8 baris (24 label/lembar). Cocok untuk printer kantor biasa.
                </span>
              </button>

              <button
                type="button"
                onClick={() => setPreset('thermal')}
                className={`p-4 rounded-xl border text-left transition flex flex-col gap-1.5 ${
                  preset === 'thermal'
                    ? 'border-brand-500 bg-brand-50/50 text-brand-900 ring-2 ring-brand-200'
                    : 'border-slate-200 hover:border-slate-300 bg-white text-slate-700'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-sm">Thermal Roll 50×30 mm</span>
                  {preset === 'thermal' && <CheckCircle2 className="w-4 h-4 text-brand-600" />}
                </div>
                <span className="text-xs text-slate-500">
                  Satu per satu gulungan (continuous). Efisien untuk printer label kasir.
                </span>
              </button>
            </div>
          </div>

          {/* Label Preview Card */}
          <div>
            <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-2">
              Pratinjau Fisik Label
            </label>
            <div className="flex justify-center p-4 bg-slate-100 rounded-2xl border border-slate-200">
              <div className="w-[210px] bg-white rounded-lg shadow-sm border border-slate-300 p-2.5 text-center flex flex-col items-center">
                <span className="text-[10px] font-bold text-slate-700 tracking-wider">KASUR BUSA</span>
                {previewBarcodeUrl && (
                  <img src={previewBarcodeUrl} alt={sample.barcode} className="h-10 w-full object-contain my-1" />
                )}
                <span className="font-mono font-bold text-xs text-slate-900 tracking-tight">{sample.barcode}</span>
                <span className="text-[10px] text-slate-600 mt-0.5">{sample.dimensi_str || sample.nama_ukuran}</span>
                <span className="text-[9px] text-slate-400">Tgl Masuk: {sample.tanggal_masuk}</span>
              </div>
            </div>
          </div>

          {/* List of Barcodes to Print */}
          <div>
            <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-2">
              Daftar Label & Jumlah Lembar
            </label>
            <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
              {currentLabels.map((item, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-200 text-sm"
                >
                  <div>
                    <span className="font-mono font-bold text-slate-800">{item.barcode}</span>
                    <span className="text-xs text-slate-500 ml-2">({item.nama_ukuran})</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-slate-500">Qty:</span>
                    <input
                      type="number"
                      min="1"
                      max="1000"
                      value={item.qty}
                      onChange={(e) => handleQtyChange(idx, parseInt(e.target.value) || 1)}
                      className="w-16 px-2 py-1 text-center font-bold text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500"
                    />
                    <span className="text-xs text-slate-600">lembar</span>
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-2 text-right text-xs text-slate-600 font-medium">
              Total cetak: <strong className="text-brand-600">{totalPcs} label</strong>
              {preset === 'a4' && (
                <span className="text-slate-400 ml-1">
                  (± {Math.ceil(totalPcs / 24)} lembar kertas A4)
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-slate-100 bg-slate-50/50">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm font-semibold text-slate-600 hover:text-slate-800 hover:bg-slate-200/60 rounded-xl transition"
          >
            Batal
          </button>
          <button
            type="button"
            disabled={isGenerating || totalPcs === 0}
            onClick={() => handlePrintOrDownload('download')}
            className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-xl transition shadow-sm"
          >
            <FileText className="w-4 h-4 text-slate-500" />
            <span>Unduh PDF</span>
          </button>
          <button
            type="button"
            disabled={isGenerating || totalPcs === 0}
            onClick={() => handlePrintOrDownload('print')}
            className="flex items-center gap-2 px-5 py-2 text-sm font-semibold text-white bg-brand-600 hover:bg-brand-700 active:scale-95 rounded-xl transition shadow-sm shadow-brand-500/20"
          >
            <Printer className="w-4 h-4" />
            <span>{isGenerating ? 'Menyiapkan...' : 'Cetak Langsung'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};

