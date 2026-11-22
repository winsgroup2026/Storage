import React, { useState, useEffect } from 'react';
import {
  Package,
  Calendar,
  User,
  Printer,
  CheckCircle2,
  AlertCircle,
  Plus,
  Minus,
  Trash2,
  Boxes,
  Factory,
  Sparkles,
} from 'lucide-react';
import { api } from '../services/api';
import { Penerimaan, UKURAN_STANDAR_KASUR, Ukuran } from '../types';
import { CetakLabelModal } from '../components/CetakLabelModal';
import { LabelData } from '../utils/labelGenerator';

interface IncomingItemRow {
  id: string;
  isCustom: boolean;
  kodeUkuran: string;
  namaUkuran: string;
  qty: number;
}

interface PenerimaanViewProps {
  initialPoId?: string;
}

export const PenerimaanView: React.FC<PenerimaanViewProps> = ({ initialPoId }) => {
  const [activeTab, setActiveTab] = useState<'form' | 'history'>('form');
  const [penerimaanList, setPenerimaanList] = useState<Penerimaan[]>([]);
  const [pabrikNama, setPabrikNama] = useState('UMKM Comet');
  const [penerima, setPenerima] = useState('Staf Gudang');
  const [catatan, setCatatan] = useState('');
  const [tanggalPo, setTanggalPo] = useState(() => new Date().toISOString().slice(0, 10));
  const [tanggalTerima, setTanggalTerima] = useState(() => new Date().toISOString().slice(0, 10));

  // Rows of incoming mattress sizes
  const [incomingItems, setIncomingItems] = useState<IncomingItemRow[]>([
    {
      id: 'item-1',
      isCustom: false,
      kodeUkuran: '200',
      namaUkuran: 'Kasur Busa Ukuran 200 King (200×200 cm)',
      qty: 20,
    },
    {
      id: 'item-2',
      isCustom: false,
      kodeUkuran: '160',
      namaUkuran: 'Kasur Busa Ukuran 160 Queen (160×200 cm)',
      qty: 15,
    },
  ]);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successResult, setSuccessResult] = useState<any | null>(null);
  const [labelModalData, setLabelModalData] = useState<LabelData[] | null>(null);

  const loadData = async () => {
    try {
      const rcvData = await api.getPenerimaanList();
      setPenerimaanList(rcvData);
    } catch (err) {
      console.error('Error loading penerimaan data:', err);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Format tanggal DDMMYY untuk preview barcode dari Tanggal PO (misal 10/11/2026 -> 101126)
  const getDateCode = (dateStr: string) => {
    if (!dateStr) return '';
    const parts = dateStr.split('-');
    if (parts.length === 3) {
      return `${parts[2]}${parts[1]}${parts[0].slice(-2)}`;
    }
    return '';
  };

  const currentDateCode = getDateCode(tanggalPo || tanggalTerima);

  // Tambah baris baru
  const handleAddRow = (kodeUkuran = '120', isCustom = false) => {
    if (kodeUkuran === 'custom' || isCustom) {
      setIncomingItems(prev => [
        ...prev,
        {
          id: `row-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
          isCustom: true,
          kodeUkuran: '',
          namaUkuran: '',
          qty: 10,
        },
      ]);
      return;
    }

    const preset = UKURAN_STANDAR_KASUR.find(u => u.kode === kodeUkuran);
    setIncomingItems(prev => [
      ...prev,
      {
        id: `row-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        isCustom: false,
        kodeUkuran: kodeUkuran,
        namaUkuran: preset ? preset.nama : `Kasur Ukuran ${kodeUkuran}`,
        qty: 10,
      },
    ]);
  };

  // Quick Add via Chip Button
  const handleQuickAddSize = (kode: string) => {
    const existingIndex = incomingItems.findIndex(it => it.kodeUkuran === kode && !it.isCustom);
    if (existingIndex >= 0) {
      // Tambah qty jika sudah ada
      const updated = [...incomingItems];
      updated[existingIndex].qty += 10;
      setIncomingItems(updated);
    } else {
      handleAddRow(kode, false);
    }
  };

  // Input ukuran custom: otomatis membentuk kode barcode dan nama ukuran
  const handleCustomSizeInput = (id: string, rawValue: string) => {
    // Format input untuk barcode: ubah ke uppercase, buang spasi, hanya karakter valid
    // Contoh: "150x200" -> "150X200", "150" -> "150", "200t30" -> "200T30"
    const cleanCode = rawValue
      .trim()
      .toUpperCase()
      .replace(/\s+/g, '')
      .replace(/[^A-Z0-9_\-]/g, '');

    setIncomingItems(prev =>
      prev.map(row => {
        if (row.id !== id) return row;
        return {
          ...row,
          isCustom: true,
          kodeUkuran: cleanCode,
          namaUkuran: rawValue.trim() ? `Kasur Custom ${rawValue.trim()}` : '',
        };
      })
    );
  };

  const handleRowChange = (id: string, field: 'kodeUkuran' | 'qty' | 'isCustom' | 'namaUkuran', value: any) => {
    setIncomingItems(prev =>
      prev.map(row => {
        if (row.id !== id) return row;

        if (field === 'kodeUkuran') {
          if (value === 'custom') {
            return {
              ...row,
              isCustom: true,
              kodeUkuran: '',
              namaUkuran: '',
            };
          } else {
            const preset = UKURAN_STANDAR_KASUR.find(u => u.kode === value);
            return {
              ...row,
              isCustom: false,
              kodeUkuran: value,
              namaUkuran: preset ? preset.nama : `Kasur Ukuran ${value}`,
            };
          }
        }

        if (field === 'qty') {
          return { ...row, qty: Math.max(1, Number(value) || 1) };
        }

        return { ...row, [field]: value };
      })
    );
  };

  const handleRemoveRow = (id: string) => {
    if (incomingItems.length <= 1) return;
    setIncomingItems(prev => prev.filter(row => row.id !== id));
  };

  const handleStepQty = (id: string, delta: number) => {
    setIncomingItems(prev =>
      prev.map(row => {
        if (row.id === id) {
          return { ...row, qty: Math.max(1, (Number(row.qty) || 1) + delta) };
        }
        return row;
      })
    );
  };

  const totalIncomingPcs = incomingItems.reduce((sum, row) => sum + (Number(row.qty) || 0), 0);

  const handleSubmitPenerimaan = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!penerima.trim()) {
      setErrorMessage('Nama petugas penerima wajib diisi');
      return;
    }

    const validItems = incomingItems
      .map(it => {
        const cleanCode = (it.kodeUkuran.trim() || it.namaUkuran.trim())
          .toUpperCase()
          .replace(/\s+/g, '')
          .replace(/[^A-Z0-9_\-]/g, '');

        const cleanNama = it.namaUkuran.trim() || (it.isCustom ? `Kasur Custom ${cleanCode}` : `Kasur Ukuran ${cleanCode}`);
        return {
          ...it,
          kodeUkuran: cleanCode,
          namaUkuran: cleanNama,
        };
      })
      .filter(it => it.kodeUkuran && it.qty > 0);

    if (validItems.length === 0) {
      setErrorMessage('Tambahkan minimal 1 ukuran kasur dengan jumlah qty > 0 dan ukuran yang valid');
      return;
    }

    try {
      setIsSubmitting(true);
      const itemsToProcess = validItems.map(it => ({
        kode_ukuran: it.kodeUkuran,
        nama_ukuran: it.namaUkuran,
        qty: it.qty,
      }));

      const res = await api.terimaBarangBatch(
        undefined, // Tidak lagi wajib terikat dengan PO yang rigid
        penerima.trim(),
        catatan.trim(),
        tanggalTerima,
        itemsToProcess,
        pabrikNama.trim() || 'UMKM Comet',
        tanggalPo
      );

      // Siapkan label untuk cetak instan
      const labelsToPrint: LabelData[] = res.barcodes.map(b => ({
        barcode: b.barcode,
        nama_ukuran: b.nama_ukuran || `Kasur Ukuran ${b.kode_ukuran}`,
        dimensi_str: `Kasur Busa ${b.kode_ukuran}`,
        tanggal_masuk: tanggalPo || tanggalTerima,
        qty: b.qty,
      }));

      setSuccessResult({
        ...res,
        pabrik_nama: pabrikNama,
        labelsToPrint,
      });

      await loadData();
    } catch (err: any) {
      setErrorMessage(err.message || 'Gagal menyimpan penerimaan barang');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReprintPenerimaan = (rcv: Penerimaan) => {
    if (!rcv.barcodes || rcv.barcodes.length === 0) {
      alert('Data label untuk penerimaan ini tidak ditemukan.');
      return;
    }

    const labels: LabelData[] = rcv.barcodes.map(b => ({
      barcode: b.barcode,
      nama_ukuran: `Kasur Ukuran ${b.kode_ukuran}`,
      dimensi_str: `Kasur Busa ${b.kode_ukuran}`,
      tanggal_masuk: rcv.tanggal_po || rcv.tanggal_terima,
      qty: b.qty,
    }));

    setLabelModalData(labels);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Purchase Order (PO) Kasur</h1>
          <p className="text-xs text-slate-500 mt-1">
            Catat pesanan purchase order (PO) kasur busa dari pabrik, terbitkan barcode penerimaan, dan kelola stok masuk secara terpadu.
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="flex p-1 bg-slate-200/80 rounded-2xl w-fit">
          <button
            onClick={() => setActiveTab('form')}
            className={`px-4 py-1.5 rounded-xl text-xs font-bold transition ${
              activeTab === 'form' ? 'bg-white text-brand-700 shadow-sm' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Purchase Order (PO)
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`px-4 py-1.5 rounded-xl text-xs font-bold transition ${
              activeTab === 'history' ? 'bg-white text-brand-700 shadow-sm' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Riwayat PO & Penerimaan
          </button>
        </div>
      </div>

      {activeTab === 'form' ? (
        <div className="bg-white rounded-3xl border border-slate-200/80 p-6 sm:p-8 shadow-sm space-y-6 max-w-4xl mx-auto">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <Boxes className="w-5 h-5 text-brand-600" />
              <span>Purchase Order (PO)</span>
            </h2>
            <span className="text-xs font-bold text-brand-700 bg-brand-50 px-3 py-1 rounded-xl">
              Format Barcode: {'{UKURAN}-{DDMMYY Tanggal PO}'}
            </span>
          </div>

          {errorMessage && (
            <div className="p-3.5 bg-red-50 border border-red-200 text-red-700 rounded-2xl text-xs flex items-center gap-2 animate-fade-in">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          <form onSubmit={handleSubmitPenerimaan} className="space-y-6">
            {/* Informasi Pemasok & Penerimaan */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">
                  Pabrik / Pemasok *
                </label>
                <div className="relative">
                  <Factory className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={pabrikNama}
                    onChange={(e) => setPabrikNama(e.target.value)}
                    required
                    placeholder="Contoh: UMKM Comet"
                    className="w-full pl-9 pr-3 py-2.5 text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-500 bg-white font-medium text-slate-800"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">
                  Tanggal PO Barang *
                </label>
                <div className="relative">
                  <Calendar className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-brand-600" />
                  <input
                    type="date"
                    value={tanggalPo}
                    onChange={(e) => setTanggalPo(e.target.value)}
                    required
                    className="w-full pl-9 pr-3 py-2 text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-500 bg-white font-medium"
                  />
                </div>
                <span className="text-[10px] text-slate-400 mt-0.5 block">
                  Tanggal PO ini membentuk kode barcode, misal: <strong className="font-mono text-brand-600">{currentDateCode}</strong>
                </span>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">
                  Tanggal Barang Diterima *
                </label>
                <div className="relative">
                  <Calendar className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="date"
                    value={tanggalTerima}
                    onChange={(e) => setTanggalTerima(e.target.value)}
                    required
                    className="w-full pl-9 pr-3 py-2 text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-500 bg-white font-medium"
                  />
                </div>
                <span className="text-[10px] text-slate-400 mt-0.5 block">
                  Tanggal fisik kasur tiba di gudang
                </span>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">
                  Nama Petugas Penerima *
                </label>
                <div className="relative">
                  <User className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={penerima}
                    onChange={(e) => setPenerima(e.target.value)}
                    required
                    placeholder="Contoh: Staf Gudang"
                    className="w-full pl-9 pr-3 py-2.5 text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-500 bg-white font-medium"
                  />
                </div>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">
                Catatan Penerimaan / No. Surat Jalan Pabrik (Opsional)
              </label>
              <input
                type="text"
                placeholder="Contoh: Kiriman tahap 1 dari UMKM Comet, kasur kondisi baik dan bersih"
                value={catatan}
                onChange={(e) => setCatatan(e.target.value)}
                className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-500 bg-white"
              />
            </div>

            {/* Quick Add Ukuran Kasur Standar */}
            <div className="p-4 bg-slate-50/80 rounded-2xl border border-slate-200/80 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-brand-600" />
                  Pilih Cepat Ukuran Kasur Standar
                </span>
                <span className="text-[11px] text-slate-500">Klik untuk langsung menambahkan</span>
              </div>

              <div className="flex flex-wrap gap-2 pt-1">
                {UKURAN_STANDAR_KASUR.map(u => (
                  <button
                    key={u.kode}
                    type="button"
                    onClick={() => handleQuickAddSize(u.kode)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-brand-50 hover:border-brand-300 text-slate-700 hover:text-brand-700 text-xs font-bold transition shadow-xs active:scale-95"
                  >
                    <span className="font-mono text-brand-600">{u.kode}</span>
                    <span className="text-[11px] text-slate-400 font-normal">({u.lebar_cm}cm)</span>
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => handleAddRow('custom', true)}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-xl border border-dashed border-brand-400 bg-brand-50/50 hover:bg-brand-100/70 text-brand-700 text-xs font-bold transition active:scale-95"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>+ Ukuran Custom</span>
                </button>
              </div>
            </div>

            {/* DAFTAR UKURAN BARANG YANG DATANG (ROWS) */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Daftar Ukuran Kasur yang Datang
                </label>
                <button
                  type="button"
                  onClick={() => handleAddRow('120', false)}
                  className="text-xs text-brand-600 font-bold hover:underline flex items-center gap-1"
                >
                  <Plus className="w-4 h-4" />
                  <span>Tambah Baris</span>
                </button>
              </div>

              <div className="space-y-3">
                {incomingItems.map((item) => {
                  const cleanKode = item.kodeUkuran.trim().toUpperCase();
                  const previewBarcode = cleanKode ? `${cleanKode}-${currentDateCode}` : '---';

                  return (
                    <div
                      key={item.id}
                      className="p-3.5 sm:p-4 rounded-2xl border border-slate-200 bg-white hover:border-brand-300 shadow-2xs transition space-y-3"
                    >
                      {/* Baris 1: Header Kartu (Barcode Badge + Label Ukuran + Tombol Hapus) */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-mono font-bold text-xs bg-brand-50 text-brand-700 px-2.5 py-1 rounded-xl border border-brand-200 tracking-wide shadow-2xs">
                            {previewBarcode}
                          </span>
                          {item.isCustom ? (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-amber-100 text-amber-800">
                              Ukuran Custom
                            </span>
                          ) : (
                            <span className="text-[11px] font-semibold text-slate-500">
                              {item.namaUkuran || `Kasur Ukuran ${cleanKode}`}
                            </span>
                          )}
                        </div>

                        <button
                          type="button"
                          onClick={() => handleRemoveRow(item.id)}
                          disabled={incomingItems.length <= 1}
                          className="p-1.5 text-slate-400 hover:text-red-600 disabled:opacity-20 rounded-lg transition"
                          title="Hapus baris ini"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>

                      {/* Baris 2: Dropdown / Input Ukuran (Full Width di Layar HP) */}
                      <div>
                        {!item.isCustom ? (
                          <select
                            value={item.kodeUkuran}
                            onChange={(e) => handleRowChange(item.id, 'kodeUkuran', e.target.value)}
                            className="w-full px-3 py-2.5 text-xs sm:text-sm font-semibold rounded-xl border border-slate-200 bg-slate-50/70 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-500 transition"
                          >
                            <optgroup label="Ukuran Standar Kasur">
                              {UKURAN_STANDAR_KASUR.map(u => (
                                <option key={u.kode} value={u.kode}>
                                  Kasur Ukuran {u.kode} ({u.lebar_cm}×{u.panjang_cm} cm)
                                </option>
                              ))}
                            </optgroup>
                            <option value="custom">+ Ukuran Custom (Input Sendiri)</option>
                          </select>
                        ) : (
                          <div className="flex flex-col sm:flex-row gap-2">
                            <input
                              type="text"
                              placeholder="Ketik ukuran custom (contoh: 150, 150x200, 180, 200T30)..."
                              value={item.kodeUkuran}
                              onChange={(e) => handleCustomSizeInput(item.id, e.target.value)}
                              className="flex-1 px-3 py-2 text-xs sm:text-sm font-mono font-bold rounded-xl border-2 border-brand-400 bg-white focus:outline-none focus:ring-2 focus:ring-brand-500 text-slate-900 shadow-2xs"
                              autoFocus
                            />
                            <button
                              type="button"
                              onClick={() => handleRowChange(item.id, 'kodeUkuran', '200')}
                              className="text-xs text-brand-600 hover:text-brand-800 font-bold underline px-2 py-1 self-end sm:self-center shrink-0"
                            >
                              Pilih Standar
                            </button>
                          </div>
                        )}
                      </div>

                      {/* Baris 3: Counter Qty Datang Sekarang (Mobile-Friendly Stepper) */}
                      <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                        <span className="text-xs font-semibold text-slate-600">
                          Datang Sekarang:
                        </span>
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleStepQty(item.id, -1)}
                            className="w-8 h-8 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-sm flex items-center justify-center transition active:scale-95 shadow-2xs"
                            title="Kurangi 1 pcs"
                          >
                            <Minus className="w-3.5 h-3.5" />
                          </button>
                          <input
                            type="number"
                            min="1"
                            max="1000"
                            value={item.qty}
                            onChange={(e) => handleRowChange(item.id, 'qty', e.target.value)}
                            className="w-16 px-2 py-1 text-center font-extrabold text-sm font-mono rounded-xl border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-brand-500"
                          />
                          <button
                            type="button"
                            onClick={() => handleStepQty(item.id, 1)}
                            className="w-8 h-8 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-sm flex items-center justify-center transition active:scale-95 shadow-2xs"
                            title="Tambah 1 pcs"
                          >
                            <Plus className="w-3.5 h-3.5" />
                          </button>
                          <span className="text-xs font-semibold text-slate-500 ml-1">pcs</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Summary & Submit */}
            <div className="pt-4 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="text-xs text-slate-500">
                Total muatan kasur datang:{' '}
                <strong className="text-brand-700 font-mono text-sm">{totalIncomingPcs} pcs</strong>
              </div>

              <button
                type="submit"
                disabled={isSubmitting || incomingItems.length === 0}
                className="flex items-center justify-center gap-2 px-6 py-3.5 bg-brand-600 hover:bg-brand-700 text-white font-bold text-sm rounded-2xl transition shadow-lg shadow-brand-500/20 active:scale-95 disabled:opacity-50"
              >
                <CheckCircle2 className="w-5 h-5" />
                <span>
                  {isSubmitting
                    ? 'Membuat Barcode...'
                    : `Simpan Penerimaan & Buat Barcode (${totalIncomingPcs} pcs)`}
                </span>
              </button>
            </div>
          </form>
        </div>
      ) : (
        /* History View */
        <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-slate-100">
            <h3 className="font-bold text-slate-800 text-sm">Riwayat Semua Penerimaan Barang Datang</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50/75 border-b border-slate-200 text-xs font-bold text-slate-500 uppercase">
                <tr>
                  <th className="py-3 px-4">Tanggal PO & Terima</th>
                  <th className="py-3 px-4">Pabrik Pemasok</th>
                  <th className="py-3 px-4">Petugas Penerima</th>
                  <th className="py-3 px-4 text-center">Total Pcs</th>
                  <th className="py-3 px-4">Barcode Tercetak</th>
                  <th className="py-3 px-4">Catatan</th>
                  <th className="py-3 px-4 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {penerimaanList.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-slate-400 text-xs italic">
                      Belum ada riwayat purchase order (PO) / penerimaan kasur.
                    </td>
                  </tr>
                ) : (
                  penerimaanList.map((rcv) => (
                    <tr key={rcv.id} className="hover:bg-slate-50">
                      <td className="py-3.5 px-4 font-medium text-slate-800 text-xs">
                        <div className="font-bold text-slate-900">
                          {new Date(rcv.tanggal_terima).toLocaleDateString('id-ID')}
                        </div>
                        {rcv.tanggal_po && (
                          <div className="text-[10px] text-brand-700 font-medium">
                            PO: {new Date(rcv.tanggal_po).toLocaleDateString('id-ID')}
                          </div>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-slate-800 font-semibold text-xs">
                        {rcv.pabrik_nama || rcv.po?.pabrik?.nama || 'UMKM Comet'}
                      </td>
                      <td className="py-3.5 px-4 text-slate-700 text-xs">{rcv.penerima}</td>
                      <td className="py-3.5 px-4 text-center font-mono font-bold text-emerald-600">
                        {rcv.total_pcs || '-'} pcs
                      </td>
                      <td className="py-3.5 px-4 text-xs font-mono text-brand-700">
                        {rcv.barcodes && rcv.barcodes.length > 0 ? (
                          <div className="flex flex-wrap gap-1">
                            {rcv.barcodes.map((b, i) => (
                              <span key={i} className="px-1.5 py-0.5 bg-brand-50 rounded border border-brand-100">
                                {b.barcode} ({b.qty}pcs)
                              </span>
                            ))}
                          </div>
                        ) : (
                          '-'
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-slate-500 text-xs">{rcv.catatan || '-'}</td>
                      <td className="py-3.5 px-4 text-right">
                        <button
                          onClick={() => handleReprintPenerimaan(rcv)}
                          className="flex items-center gap-1.5 ml-auto px-3 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg transition"
                        >
                          <Printer className="w-3.5 h-3.5 text-slate-500" />
                          <span>Cetak Ulang</span>
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal Sukses Penerimaan + Quick Print */}
      {successResult && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white w-full max-w-lg rounded-3xl shadow-2xl border border-slate-200 overflow-hidden text-center p-6 space-y-4">
            <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-9 h-9" />
            </div>

            <div>
              <h3 className="text-xl font-bold text-slate-900">Penerimaan Berhasil Dicatat!</h3>
              <p className="text-xs text-slate-500 mt-1">
                Sebanyak <strong className="text-emerald-700 font-mono text-sm">{successResult.total_pcs} pcs kasur</strong> dari <strong>{successResult.pabrik_nama || 'UMKM Comet'}</strong> telah masuk ke stok gudang (<code className="font-mono">di_gudang</code>).
              </p>
            </div>

            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 text-left text-xs space-y-2">
              <span className="font-bold text-slate-700 uppercase tracking-wider block">
                Kode Barcode Dihasilkan:
              </span>
              {successResult.barcodes?.map((b: any, idx: number) => (
                <div key={idx} className="flex justify-between items-center bg-white p-2.5 rounded-xl border border-slate-200">
                  <div>
                    <span className="font-mono font-bold text-brand-700">{b.barcode}</span>
                    <span className="text-slate-500 text-[11px] ml-2">({b.nama_ukuran || b.kode_ukuran})</span>
                  </div>
                  <span className="text-slate-800 font-bold">{b.qty} pcs</span>
                </div>
              ))}
            </div>

            <div className="flex flex-col sm:flex-row items-center gap-3 pt-2">
              <button
                onClick={() => {
                  setLabelModalData(successResult.labelsToPrint);
                  setSuccessResult(null);
                }}
                className="w-full flex items-center justify-center gap-2 px-5 py-3 bg-brand-600 hover:bg-brand-700 text-white font-bold text-sm rounded-2xl transition shadow-lg shadow-brand-500/20 active:scale-95"
              >
                <Printer className="w-4 h-4" />
                <span>Cetak Label Barcode Sekarang</span>
              </button>

              <button
                onClick={() => setSuccessResult(null)}
                className="w-full sm:w-auto px-5 py-3 text-slate-600 font-semibold text-sm hover:bg-slate-100 rounded-2xl"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Cetak Label */}
      {labelModalData && (
        <CetakLabelModal
          isOpen={true}
          labels={labelModalData}
          onClose={() => setLabelModalData(null)}
        />
      )}
    </div>
  );
};
