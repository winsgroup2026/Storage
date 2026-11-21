import React, { useState, useEffect, useRef } from 'react';
import {
  RotateCcw,
  Camera,
  Keyboard,
  Plus,
  Trash2,
  AlertCircle,
  CheckCircle2,
  Printer,
  X,
  History,
  User,
  FileText,
  Search,
  PackageCheck,
  Calendar,
  Sparkles,
} from 'lucide-react';
import { api } from '../services/api';
import { Pengembalian, Ukuran, Pihak, Pengeluaran, UserRole } from '../types';
import { UKURAN_STANDAR_KASUR } from '../types';
import { useBarcodeScanner } from '../hooks/useBarcodeScanner';
import { CameraScanner } from '../components/CameraScanner';
import { playSuccessBeep, playErrorBeep } from '../utils/feedback';
import { generateBuktiReturPdf } from '../utils/buktiReturPdf';

interface PengembalianViewProps {
  currentRole?: UserRole;
}

export const PengembalianView: React.FC<PengembalianViewProps> = () => {
  const [activeTab, setActiveTab] = useState<'input' | 'riwayat'>('input');
  const [returList, setReturList] = useState<Pengembalian[]>([]);
  const [ukuranList, setUkuranList] = useState<Ukuran[]>([]);
  const [pembeliList, setPembeliList] = useState<Pihak[]>([]);
  const [pengeluaranList, setPengeluaranList] = useState<Pengeluaran[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Scanner & Input State
  const [scannedItems, setScannedItems] = useState<{ barcode: string; qty: number; kode_ukuran?: string; nama_ukuran?: string }[]>([]);
  const [manualInput, setManualInput] = useState('');
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [scanAlert, setScanAlert] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Form Fields
  const [pembeliNama, setPembeliNama] = useState('');
  const [selectedPembeliId, setSelectedPembeliId] = useState('');
  const [noSuratJalan, setNoSuratJalan] = useState('');
  const [alasan, setAlasan] = useState('');
  const [petugas, setPetugas] = useState('Staf Gudang');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Success Modal
  const [completedRetur, setCompletedRetur] = useState<Pengembalian | null>(null);

  // Search in History
  const [searchTerm, setSearchTerm] = useState('');

  const barcodeInputRef = useRef<HTMLInputElement>(null);

  const loadData = async () => {
    try {
      setIsLoading(true);
      const [allRetur, allUkuran, allPembeli, allPengeluaran] = await Promise.all([
        api.getPengembalianList(),
        api.getUkuranList(),
        api.getPihak('pembeli'),
        api.getPengeluaranList(),
      ]);
      setReturList(allRetur);
      setUkuranList(allUkuran);
      setPembeliList(allPembeli);
      setPengeluaranList(allPengeluaran);
    } catch (err) {
      console.error('Error loading pengembalian data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Quick helper to resolve ukuran label from barcode
  const resolveUkuranLabel = (barcode: string): { kode: string; nama: string } => {
    const parts = barcode.trim().split('-');
    const kode = parts[0] || barcode;
    const match = ukuranList.find(u => u.kode === kode);
    if (match) {
      return { kode: match.kode, nama: match.nama };
    }
    return { kode, nama: `Kasur Ukuran ${kode}` };
  };

  // Barcode Scan Handler
  const handleBarcodeScan = (code: string): boolean => {
    const trimmed = code.trim().toUpperCase();
    if (!trimmed) return false;

    const { kode, nama } = resolveUkuranLabel(trimmed);

    // Update scanned items
    setScannedItems(prev => {
      const idx = prev.findIndex(it => it.barcode === trimmed);
      if (idx >= 0) {
        const copy = [...prev];
        copy[idx].qty += 1;
        return copy;
      } else {
        return [...prev, { barcode: trimmed, qty: 1, kode_ukuran: kode, nama_ukuran: nama }];
      }
    });

    playSuccessBeep();
    setScanAlert({
      type: 'success',
      message: `Barcode kasur "${trimmed}" (${nama}) berhasil ditambahkan ke daftar retur!`,
    });

    return true;
  };

  // Hardware Scanner Hook (Debounced USB / Bluetooth)
  useBarcodeScanner({
    onScan: handleBarcodeScan,
    debounceMs: 1000,
    enabled: activeTab === 'input',
  });

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualInput.trim()) return;
    const ok = handleBarcodeScan(manualInput.trim());
    if (ok) {
      setManualInput('');
      barcodeInputRef.current?.focus();
    }
  };

  const handleQuickAddUkuran = (ukuranKode: string) => {
    const today = new Date();
    const dd = String(today.getDate()).padStart(2, '0');
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const yy = String(today.getFullYear()).slice(-2);
    const barcodeToday = `${ukuranKode}-${dd}${mm}${yy}`;
    handleBarcodeScan(barcodeToday);
  };

  const updateItemQty = (barcode: string, delta: number) => {
    setScannedItems(prev =>
      prev
        .map(it => {
          if (it.barcode === barcode) {
            const nextQty = it.qty + delta;
            return nextQty > 0 ? { ...it, qty: nextQty } : null;
          }
          return it;
        })
        .filter(Boolean) as { barcode: string; qty: number; kode_ukuran?: string; nama_ukuran?: string }[]
    );
  };

  const removeItem = (barcode: string) => {
    setScannedItems(prev => prev.filter(it => it.barcode !== barcode));
  };

  const totalReturPcs = scannedItems.reduce((acc, it) => acc + it.qty, 0);

  const handleSubmitRetur = async (e: React.FormEvent) => {
    e.preventDefault();

    if (scannedItems.length === 0) {
      playErrorBeep();
      setScanAlert({
        type: 'error',
        message: 'Belum ada barcode kasur yang di-scan atau diinput untuk diretur!',
      });
      return;
    }

    const pembeliFinal = pembeliNama.trim() || (selectedPembeliId ? pembeliList.find(p => p.id === selectedPembeliId)?.nama : '');
    if (!pembeliFinal) {
      playErrorBeep();
      setScanAlert({
        type: 'error',
        message: 'Mohon isi nama pembeli/customer yang mengembalikan kasur.',
      });
      return;
    }

    if (!alasan.trim()) {
      playErrorBeep();
      setScanAlert({
        type: 'error',
        message: 'Mohon isi alasan pengembalian/pembatalan kasur.',
      });
      return;
    }

    try {
      setIsSubmitting(true);
      const res = await api.simpanPengembalian({
        pembeli_nama: pembeliFinal,
        no_surat_jalan: noSuratJalan.trim() || undefined,
        alasan: alasan.trim(),
        petugas: petugas.trim() || 'Staf Gudang',
        items: scannedItems,
      });

      playSuccessBeep();
      setCompletedRetur(res.pengembalian);
      setScannedItems([]);
      setPembeliNama('');
      setSelectedPembeliId('');
      setNoSuratJalan('');
      setAlasan('');
      setScanAlert(null);
      await loadData();
    } catch (err: any) {
      playErrorBeep();
      setScanAlert({
        type: 'error',
        message: err.message || 'Gagal menyimpan pengembalian barang!',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePrintBuktiRetur = (retur: Pengembalian) => {
    try {
      const doc = generateBuktiReturPdf(retur);
      doc.autoPrint();
      const blobUrl = doc.output('bloburl');
      window.open(blobUrl, '_blank');
    } catch (err) {
      console.error('Error generating Bukti Retur PDF:', err);
      alert('Gagal membuat PDF Surat Bukti Retur.');
    }
  };

  // Filtered history list
  const filteredRetur = returList.filter(r => {
    if (!searchTerm) return true;
    const q = searchTerm.toLowerCase();
    const matchNo = r.no_retur?.toLowerCase().includes(q);
    const matchPembeli = r.pembeli_nama?.toLowerCase().includes(q);
    const matchAlasan = r.alasan?.toLowerCase().includes(q);
    const matchSj = r.no_surat_jalan?.toLowerCase().includes(q);
    const matchItem = r.items?.some(it => it.barcode.toLowerCase().includes(q) || it.nama_ukuran?.toLowerCase().includes(q));
    return matchNo || matchPembeli || matchAlasan || matchSj || matchItem;
  });

  return (
    <div className="space-y-6">
      {/* Title & Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-2xl bg-amber-500/10 text-amber-600 flex items-center justify-center shrink-0">
            <RotateCcw className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-extrabold text-slate-900 tracking-tight">
                Pengembalian Barang (Retur Batal Beli)
              </h1>
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-100 text-amber-800">
                Kembali ke Stok
              </span>
            </div>
            <p className="text-sm text-slate-500 mt-1">
              Catat kasur yang batal dibeli pembeli. Barang yang dikembalikan otomatis masuk kembali ke stok gudang dan langsung siap dijual lagi.
            </p>
          </div>
        </div>

        {/* Tab Switcher */}
        <div className="flex items-center gap-1 bg-slate-100 p-1.5 rounded-2xl self-start md:self-auto shrink-0 border border-slate-200">
          <button
            onClick={() => setActiveTab('input')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition ${
              activeTab === 'input'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <RotateCcw className="w-4 h-4 text-amber-600" />
            <span>Form Pengembalian</span>
          </button>
          <button
            onClick={() => setActiveTab('riwayat')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition ${
              activeTab === 'riwayat'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <History className="w-4 h-4 text-slate-600" />
            <span>Riwayat Retur</span>
            <span className="ml-1 px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-slate-200 text-slate-700">
              {returList.length}
            </span>
          </button>
        </div>
      </div>

      {/* Alert Banner */}
      {scanAlert && (
        <div
          className={`flex items-center justify-between p-4 rounded-2xl border text-sm font-medium animate-fade-in ${
            scanAlert.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
              : 'bg-rose-50 text-rose-800 border-rose-200'
          }`}
        >
          <div className="flex items-center gap-2.5">
            {scanAlert.type === 'success' ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            ) : (
              <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
            )}
            <span>{scanAlert.message}</span>
          </div>
          <button
            onClick={() => setScanAlert(null)}
            className="p-1 rounded-lg hover:bg-black/5 text-slate-500"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {activeTab === 'input' ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Kolom Kiri: Barcode Input & Scanner */}
          <div className="lg:col-span-7 space-y-6">
            {/* Box Barcode Scanner Input */}
            <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs space-y-5">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                    <Keyboard className="w-5 h-5 text-brand-600" />
                    Input / Scan Barcode Kasur
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Gunakan scanner barcode USB/Bluetooth, kamera HP, atau ketik langsung.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setIsCameraOpen(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-brand-50 text-brand-700 hover:bg-brand-100 transition border border-brand-200"
                >
                  <Camera className="w-4 h-4" />
                  <span>Scan Kamera</span>
                </button>
              </div>

              {/* Form Input Manual */}
              <form onSubmit={handleManualSubmit} className="flex gap-2">
                <div className="relative flex-1">
                  <input
                    ref={barcodeInputRef}
                    type="text"
                    value={manualInput}
                    onChange={(e) => setManualInput(e.target.value)}
                    placeholder="Contoh barcode: 200-101126 atau 160-101126"
                    className="w-full pl-4 pr-10 py-3 rounded-2xl bg-slate-50 border border-slate-200 font-mono text-sm uppercase font-semibold text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-500 transition"
                  />
                  {manualInput && (
                    <button
                      type="button"
                      onClick={() => setManualInput('')}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>
                <button
                  type="submit"
                  disabled={!manualInput.trim()}
                  className="px-5 py-3 rounded-2xl bg-brand-600 text-white font-bold text-sm hover:bg-brand-700 disabled:opacity-50 transition shrink-0 flex items-center gap-1.5 shadow-sm shadow-brand-500/20"
                >
                  <Plus className="w-4 h-4" />
                  <span>Tambah</span>
                </button>
              </form>

              {/* Pilihan Cepat Kasur Standar */}
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-2">
                  PILIHAN CEPAT UKURAN KASUR (Dibuatkan kode hari ini):
                </label>
                <div className="flex flex-wrap gap-2">
                  {UKURAN_STANDAR_KASUR.map(size => (
                    <button
                      key={size.kode}
                      type="button"
                      onClick={() => handleQuickAddUkuran(size.kode)}
                      className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-amber-50 hover:border-amber-300 hover:text-amber-800 text-slate-700 text-xs font-bold border border-slate-200 transition"
                    >
                      + Kasur {size.kode}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Daftar Kasur Yang Diretur */}
            <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div>
                  <h3 className="text-sm font-bold text-slate-900">
                    Kasur Yang Akan Dikembalikan ({totalReturPcs} Pcs)
                  </h3>
                  <p className="text-xs text-slate-500">
                    Setiap pcs yang dikonfirmasi akan langsung kembali ke stok <span className="font-semibold text-emerald-600">Di Gudang</span>.
                  </p>
                </div>
                {scannedItems.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setScannedItems([])}
                    className="text-xs font-semibold text-rose-600 hover:underline"
                  >
                    Kosongkan Semua
                  </button>
                )}
              </div>

              {scannedItems.length === 0 ? (
                <div className="py-12 text-center text-slate-400">
                  <RotateCcw className="w-10 h-10 mx-auto text-slate-300 stroke-[1.5] mb-2" />
                  <p className="text-sm font-medium">Belum ada kasur dalam daftar retur</p>
                  <p className="text-xs text-slate-400 mt-1">
                    Scan barcode atau klik tombol ukuran cepat di atas untuk menambahkan.
                  </p>
                </div>
              ) : (
                <div className="space-y-2.5">
                  {scannedItems.map((item) => (
                    <div
                      key={item.barcode}
                      className="flex items-center justify-between p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80 hover:bg-amber-50/40 transition"
                    >
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-sm font-extrabold text-slate-900 bg-white px-2 py-0.5 rounded-lg border border-slate-200">
                            {item.barcode}
                          </span>
                          <span className="text-xs font-bold text-amber-700 bg-amber-100/70 px-2 py-0.5 rounded-md">
                            Kasur {item.kode_ukuran}
                          </span>
                        </div>
                        <p className="text-xs text-slate-500">
                          {item.nama_ukuran || `Kasur Ukuran ${item.kode_ukuran}`}
                        </p>
                      </div>

                      {/* Qty Controls */}
                      <div className="flex items-center gap-3">
                        <div className="flex items-center bg-white rounded-xl border border-slate-200 p-1">
                          <button
                            type="button"
                            onClick={() => updateItemQty(item.barcode, -1)}
                            className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-600 hover:bg-slate-100 font-bold"
                          >
                            -
                          </button>
                          <span className="w-9 text-center font-bold text-sm text-slate-800">
                            {item.qty}
                          </span>
                          <button
                            type="button"
                            onClick={() => updateItemQty(item.barcode, 1)}
                            className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-600 hover:bg-slate-100 font-bold"
                          >
                            +
                          </button>
                        </div>

                        <button
                          type="button"
                          onClick={() => removeItem(item.barcode)}
                          className="p-2 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition"
                          title="Hapus dari daftar"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Kolom Kanan: Formulir Detail Retur */}
          <div className="lg:col-span-5">
            <form
              onSubmit={handleSubmitRetur}
              className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs space-y-5 sticky top-24"
            >
              <div className="pb-3 border-b border-slate-100">
                <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <User className="w-5 h-5 text-amber-600" />
                  Data Pembeli & Keterangan Retur
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Lengkapi identitas customer yang membatalkan pembelian.
                </p>
              </div>

              {/* Nama Customer / Pembeli */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Nama Customer / Pembeli yang Batal Beli *
                </label>
                <div className="space-y-2">
                  <input
                    type="text"
                    required
                    value={pembeliNama}
                    onChange={(e) => {
                      setPembeliNama(e.target.value);
                      setSelectedPembeliId('');
                    }}
                    placeholder="Ketik nama pembeli..."
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                  {pembeliList.length > 0 && (
                    <div>
                      <span className="text-[11px] text-slate-400 block mb-1">
                        Atau pilih dari riwayat pembeli:
                      </span>
                      <select
                        value={selectedPembeliId}
                        onChange={(e) => {
                          const id = e.target.value;
                          setSelectedPembeliId(id);
                          const p = pembeliList.find(x => x.id === id);
                          if (p) setPembeliNama(p.nama);
                        }}
                        className="w-full px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-medium text-slate-700 bg-slate-50"
                      >
                        <option value="">-- Pilih Customer --</option>
                        {pembeliList.map(p => (
                          <option key={p.id} value={p.id}>
                            {p.nama} {p.telepon ? `(${p.telepon})` : ''}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>
              </div>

              {/* No Surat Jalan Sebelumnya (Opsional) */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  No. Surat Jalan Pengeluaran (Opsional)
                </label>
                <div className="space-y-2">
                  <input
                    type="text"
                    value={noSuratJalan}
                    onChange={(e) => setNoSuratJalan(e.target.value)}
                    placeholder="Contoh: SJ-20261110-0001"
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                  {pengeluaranList.length > 0 && (
                    <select
                      onChange={(e) => setNoSuratJalan(e.target.value)}
                      className="w-full px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-medium text-slate-700 bg-slate-50"
                    >
                      <option value="">-- Atau pilih dari surat jalan terakhir --</option>
                      {pengeluaranList.slice(0, 5).map(sj => (
                        <option key={sj.id} value={sj.no_surat_jalan}>
                          {sj.no_surat_jalan} · {sj.pembeli_nama} ({sj.tanggal.slice(0, 10)})
                        </option>
                      ))}
                    </select>
                  )}
                </div>
              </div>

              {/* Alasan Pengembalian */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Alasan Pengembalian Kasur *
                </label>
                <textarea
                  required
                  rows={2}
                  value={alasan}
                  onChange={(e) => setAlasan(e.target.value)}
                  placeholder="Contoh: Pembeli batal beli saat pengantaran, barang masih utuh dan bersih"
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
                {/* Quick chip reasons */}
                <div className="flex flex-wrap gap-1.5 mt-1.5">
                  {[
                    'Customer batal beli',
                    'Salah ukuran oleh pembeli',
                    'Batal ambil di gudang',
                    'Barang tidak jadi dikirim',
                  ].map(quickReason => (
                    <button
                      key={quickReason}
                      type="button"
                      onClick={() => setAlasan(quickReason)}
                      className="text-[11px] px-2 py-0.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 font-medium transition"
                    >
                      {quickReason}
                    </button>
                  ))}
                </div>
              </div>

              {/* Petugas Penerima Retur */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Petugas Penerima Gudang
                </label>
                <input
                  type="text"
                  value={petugas}
                  onChange={(e) => setPetugas(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>

              {/* Ringkasan & Submit */}
              <div className="pt-3 border-t border-slate-100 space-y-3">
                <div className="flex justify-between items-center text-sm font-bold text-slate-800">
                  <span>Total Kasur Kembali:</span>
                  <span className="text-amber-700 font-extrabold text-base bg-amber-50 px-2.5 py-1 rounded-xl border border-amber-200">
                    {totalReturPcs} Pcs
                  </span>
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting || scannedItems.length === 0}
                  className="w-full py-3.5 rounded-2xl bg-amber-600 hover:bg-amber-700 text-white font-extrabold text-sm shadow-md shadow-amber-500/20 disabled:opacity-50 transition flex items-center justify-center gap-2"
                >
                  <PackageCheck className="w-5 h-5" />
                  <span>
                    {isSubmitting ? 'Memproses...' : 'Simpan Retur & Pulihkan ke Stok'}
                  </span>
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : (
        /* Tab Riwayat Retur */
        <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-bold text-slate-900">
                Riwayat Kasur Yang Dikembalikan
              </h2>
              <p className="text-xs text-slate-500">
                Seluruh kasur di riwayat ini telah dikembalikan ke stok gudang dan siap dijual kembali.
              </p>
            </div>

            {/* Search Input */}
            <div className="relative w-full sm:w-72">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Cari no retur / pembeli / kasur..."
                className="w-full pl-9 pr-4 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>
          </div>

          {filteredRetur.length === 0 ? (
            <div className="py-12 text-center text-slate-400">
              <History className="w-10 h-10 mx-auto text-slate-300 stroke-[1.5] mb-2" />
              <p className="text-sm font-medium">Belum ada data pengembalian barang</p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredRetur.map((retur) => (
                <div
                  key={retur.id}
                  className="p-4 rounded-2xl bg-slate-50 border border-slate-200 hover:border-amber-300 transition space-y-3"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200/60 pb-2.5">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-extrabold text-amber-800 bg-amber-100 px-2 py-0.5 rounded-lg border border-amber-200">
                        {retur.no_retur}
                      </span>
                      <span className="text-xs font-bold text-slate-800">
                        Pembeli: {retur.pembeli_nama}
                      </span>
                      {retur.no_surat_jalan && (
                        <span className="text-[11px] font-mono text-slate-500">
                          (Ref: {retur.no_surat_jalan})
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 sm:gap-3 text-xs text-slate-500 flex-wrap">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5" />
                        {new Date(retur.tanggal).toLocaleDateString('id-ID', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                      <span className="px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 text-[10px] font-bold">
                        Stok Dipulihkan ({retur.total_pcs} Pcs)
                      </span>
                      <button
                        type="button"
                        onClick={() => handlePrintBuktiRetur(retur)}
                        className="flex items-center gap-1 px-2.5 py-1 bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 rounded-lg font-bold text-xs transition shadow-2xs ml-auto sm:ml-0"
                        title="Cetak Surat Bukti Retur PDF"
                      >
                        <Printer className="w-3.5 h-3.5 text-slate-500" />
                        <span>Cetak Bukti</span>
                      </button>
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                    <div>
                      <span className="text-slate-500">Alasan: </span>
                      <span className="font-semibold text-slate-800">"{retur.alasan}"</span>
                      <span className="text-slate-400 ml-2">· Petugas: {retur.petugas}</span>
                    </div>

                    {/* Items chips */}
                    <div className="flex flex-wrap gap-1.5">
                      {retur.items?.map((it, idx) => (
                        <span
                          key={idx}
                          className="px-2 py-0.5 rounded-md bg-white border border-slate-200 font-mono text-[11px] text-slate-700 font-medium"
                        >
                          {it.barcode} <strong className="text-amber-700">× {it.qty}</strong>
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Modal Sukses Retur */}
      {completedRetur && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 space-y-5 border border-slate-100 shadow-2xl animate-fade-in">
            <div className="text-center space-y-2">
              <div className="w-14 h-14 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <h3 className="text-lg font-extrabold text-slate-900">
                Pengembalian Kasur Berhasil!
              </h3>
              <p className="text-xs text-slate-500">
                Kasur telah berhasil dikembalikan ke stok gudang dan siap dijual kembali.
              </p>
            </div>

            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-500">No. Bukti Retur:</span>
                <span className="font-mono font-bold text-slate-800">{completedRetur.no_retur}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Customer / Pembeli:</span>
                <span className="font-bold text-slate-800">{completedRetur.pembeli_nama}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Alasan:</span>
                <span className="font-medium text-slate-800">{completedRetur.alasan}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Total Kasur Pulih:</span>
                <span className="font-bold text-emerald-700 text-sm">{completedRetur.total_pcs} pcs</span>
              </div>
              <div className="pt-2 border-t border-slate-200 mt-2">
                <span className="text-slate-400 block mb-1">Rincian Barcode:</span>
                <div className="flex flex-wrap gap-1.5">
                  {completedRetur.items?.map((it, idx) => (
                    <span key={idx} className="bg-white px-2 py-0.5 rounded border border-slate-200 font-mono text-[11px]">
                      {it.barcode} ({it.qty} pcs)
                    </span>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => handlePrintBuktiRetur(completedRetur)}
                className="flex-1 py-2.5 rounded-xl border border-slate-200 font-bold text-xs text-slate-700 hover:bg-slate-50 flex items-center justify-center gap-1.5 transition shadow-2xs"
              >
                <Printer className="w-4 h-4 text-brand-600" />
                <span>Cetak Bukti (PDF)</span>
              </button>
              <button
                type="button"
                onClick={() => setCompletedRetur(null)}
                className="flex-1 py-2.5 rounded-xl bg-slate-900 text-white font-bold text-xs hover:bg-slate-800 transition"
              >
                Tutup & Lanjut
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Scanner Kamera */}
      {isCameraOpen && (
        <CameraScanner
          onScan={(barcode: string) => {
            handleBarcodeScan(barcode);
            setIsCameraOpen(false);
          }}
          onClose={() => setIsCameraOpen(false)}
        />
      )}
    </div>
  );
};
export default PengembalianView;
