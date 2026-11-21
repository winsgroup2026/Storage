import React, { useState, useEffect, useRef } from 'react';
import {
  ScanLine,
  Camera,
  Keyboard,
  Plus,
  Trash2,
  AlertCircle,
  CheckCircle2,
  FileText,
  Printer,
  X,
  History,
  RotateCcw,
  Truck,
  User,
  Users,
  Search,
} from 'lucide-react';
import { api } from '../services/api';
import { StokKelompok, Pihak, Pengeluaran, UserRole } from '../types';
import { useBarcodeScanner } from '../hooks/useBarcodeScanner';
import { CameraScanner } from '../components/CameraScanner';
import { generateSuratJalanPdf } from '../utils/suratJalanPdf';

interface BarangKeluarViewProps {
  currentRole: UserRole;
}

interface ScannedItemRow {
  id: string;
  barcode: string;
  qty: number;
  pembeli_nama: string;
}

export const BarangKeluarView: React.FC<BarangKeluarViewProps> = ({ currentRole }) => {
  const [activeTab, setActiveTab] = useState<'scan' | 'history'>('scan');
  const [stokKelompok, setStokKelompok] = useState<StokKelompok[]>([]);
  const [pengirimList, setPengirimList] = useState<Pihak[]>([]);
  const [koordinatorList, setKoordinatorList] = useState<Pihak[]>([]);
  const [pembeliList, setPembeliList] = useState<Pihak[]>([]);
  const [riwayatPengeluaran, setRiwayatPengeluaran] = useState<Pengeluaran[]>([]);

  // Scanning Station State (Mendukung Pembeli per Kasur / Pcs)
  const [scannedItems, setScannedItems] = useState<ScannedItemRow[]>([]);
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [manualInput, setManualInput] = useState('');
  const [scanAlert, setScanAlert] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Form Pengeluaran
  const [selectedPengirimId, setSelectedPengirimId] = useState('');
  const [selectedKoordinatorId, setSelectedKoordinatorId] = useState('');
  const [koordinatorNama, setKoordinatorNama] = useState('');
  const [selectedPembeliId, setSelectedPembeliId] = useState('');
  const [pembeliNama, setPembeliNama] = useState('');
  const [keterangan, setKeterangan] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Success Modal & Cancellation Modal
  const [completedPengeluaran, setCompletedPengeluaran] = useState<Pengeluaran | null>(null);
  const [batalModalOpen, setBatalModalOpen] = useState(false);
  const [targetBatalId, setTargetBatalId] = useState<string | null>(null);
  const [alasanBatal, setAlasanBatal] = useState('');
  const [isCancelling, setIsCancelling] = useState(false);

  const barcodeInputRef = useRef<HTMLInputElement>(null);

  const loadData = async () => {
    try {
      const [stokData, pihakPengirim, pihakKoord, pihakPembeli, pengeluaranData] = await Promise.all([
        api.getStokKelompok(),
        api.getPihak('pengirim'),
        api.getPihak('koordinator'),
        api.getPihak('pembeli'),
        api.getPengeluaranList(),
      ]);
      setStokKelompok(stokData);
      setPengirimList(pihakPengirim);
      setKoordinatorList(pihakKoord);
      setPembeliList(pihakPembeli);
      setRiwayatPengeluaran(pengeluaranData);

      if (pihakPengirim.length > 0 && !selectedPengirimId) {
        setSelectedPengirimId(pihakPengirim[0].id);
      }
      if (pihakKoord.length > 0 && !koordinatorNama) {
        setSelectedKoordinatorId(pihakKoord[0].id);
        setKoordinatorNama(pihakKoord[0].nama);
      }
    } catch (err) {
      console.error('Error loading data for barang keluar:', err);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Total scan count
  const totalScannedPcs = scannedItems.reduce((sum, it) => sum + it.qty, 0);

  // Barcode Scan Handler
  const handleBarcodeScan = (code: string): boolean => {
    const trimmed = code.trim().toUpperCase();
    if (!trimmed) return false;

    // Cari kelompok barcode ini di stok
    const targetGroup = stokKelompok.find(k => k.barcode === trimmed);
    if (!targetGroup) {
      setScanAlert({
        type: 'error',
        message: `Barcode "${trimmed}" tidak terdaftar di sistem!`,
      });
      return false;
    }

    // Hitung berapa yang sudah masuk di antrian scan saat ini untuk barcode ini
    const currentQueued = scannedItems
      .filter(it => it.barcode === trimmed)
      .reduce((sum, it) => sum + it.qty, 0);

    if (currentQueued + 1 > targetGroup.sisa_di_gudang) {
      setScanAlert({
        type: 'error',
        message: `Stok gudang untuk ${trimmed} tidak mencukupi! (Sisa di gudang: ${targetGroup.sisa_di_gudang} pcs, sudah di-scan: ${currentQueued} pcs)`,
      });
      return false;
    }

    // Jika ada baris barcode ini yang belum diisi nama pembelinya, tambahkan qty ke baris itu
    const existingEmptyIdx = scannedItems.findIndex(it => it.barcode === trimmed && !it.pembeli_nama.trim());

    if (existingEmptyIdx >= 0) {
      const updated = [...scannedItems];
      updated[existingEmptyIdx].qty += 1;
      setScannedItems(updated);
    } else {
      // Jika baris yang sudah ada sudah punya nama pembeli, buat baris baru untuk pembeli berikutnya
      setScannedItems(prev => [
        ...prev,
        {
          id: `scan-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
          barcode: trimmed,
          qty: 1,
          pembeli_nama: '',
        },
      ]);
    }

    setScanAlert({
      type: 'success',
      message: `Berhasil scan: ${trimmed} (+1 pcs). Total muatan kode ini: ${currentQueued + 1} pcs.`,
    });

    return true;
  };

  // Hook Barcode Scanner untuk USB / Bluetooth
  useBarcodeScanner({
    onScan: handleBarcodeScan,
    debounceMs: 1000,
    enabled: activeTab === 'scan',
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

  const handleRemoveScan = (id: string) => {
    setScannedItems(prev => prev.filter(it => it.id !== id));
  };

  const handleQtyChange = (id: string, newQty: number) => {
    const item = scannedItems.find(it => it.id === id);
    if (!item) return;

    const targetGroup = stokKelompok.find(k => k.barcode === item.barcode);
    const maxStock = targetGroup?.sisa_di_gudang || 9999;
    const otherRowsQty = scannedItems
      .filter(it => it.barcode === item.barcode && it.id !== id)
      .reduce((sum, it) => sum + it.qty, 0);

    const availableForThis = Math.max(1, maxStock - otherRowsQty);
    const safeQty = Math.max(1, Math.min(newQty, availableForThis));

    setScannedItems(prev =>
      prev.map(it => (it.id === id ? { ...it, qty: safeQty } : it))
    );
  };

  const handleItemPembeliChange = (id: string, name: string) => {
    setScannedItems(prev =>
      prev.map(it => (it.id === id ? { ...it, pembeli_nama: name } : it))
    );
  };

  // Pisah 1 pcs untuk pembeli lain
  const handleSplitItem = (id: string) => {
    const item = scannedItems.find(it => it.id === id);
    if (!item || item.qty <= 1) return;

    setScannedItems(prev => {
      const idx = prev.findIndex(it => it.id === id);
      if (idx < 0) return prev;

      const updated = [...prev];
      updated[idx] = { ...updated[idx], qty: updated[idx].qty - 1 };
      updated.splice(idx + 1, 0, {
        id: `scan-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        barcode: item.barcode,
        qty: 1,
        pembeli_nama: '',
      });
      return updated;
    });
  };

  // Koordinator Selector
  const handleSelectKoordinator = (kId: string) => {
    setSelectedKoordinatorId(kId);
    if (kId === 'custom') {
      setKoordinatorNama('');
    } else {
      const k = koordinatorList.find(item => item.id === kId);
      if (k) setKoordinatorNama(k.nama);
    }
  };

  // Pembeli Selector
  const handleSelectPembeli = (pembeliId: string) => {
    setSelectedPembeliId(pembeliId);
    if (pembeliId === 'new') {
      setPembeliNama('');
    } else {
      const p = pembeliList.find(item => item.id === pembeliId);
      if (p) setPembeliNama(p.nama);
    }
  };

  // Simpan Transaksi Pengeluaran
  const handleSubmitPengeluaran = async (e: React.FormEvent) => {
    e.preventDefault();
    setScanAlert(null);

    if (scannedItems.length === 0) {
      setScanAlert({ type: 'error', message: 'Silakan scan barcode kasur terlebih dahulu' });
      return;
    }

    if (!koordinatorNama.trim()) {
      setScanAlert({ type: 'error', message: 'Nama koordinator wajib diisi / diketik' });
      return;
    }

    // Validasi pembeli: bisa diisi secara global di form kanan atau di bawah masing-masing kasur di kiri
    const hasGlobalBuyer = Boolean(pembeliNama.trim());
    const hasAnyItemBuyer = scannedItems.some(it => Boolean(it.pembeli_nama?.trim()));

    if (!hasGlobalBuyer && !hasAnyItemBuyer) {
      setScanAlert({
        type: 'error',
        message: 'Nama pembeli / penerima wajib diisi (bisa diisi di bawah masing-masing kasur atau di form sebelah kanan).',
      });
      return;
    }

    // Expand scanned items menjadi array barcode + pembeli_nama (FIFO per pcs)
    const flatScans: { barcode: string; pembeli_nama?: string }[] = [];
    for (const it of scannedItems) {
      const buyer = it.pembeli_nama?.trim() || pembeliNama.trim() || undefined;
      for (let i = 0; i < it.qty; i++) {
        flatScans.push({
          barcode: it.barcode,
          pembeli_nama: buyer,
        });
      }
    }

    try {
      setIsSubmitting(true);
      const res = await api.simpanPengeluaran({
        pengirim_id: selectedPengirimId || undefined,
        koordinator_id: selectedKoordinatorId !== 'custom' ? selectedKoordinatorId : undefined,
        koordinator_nama: koordinatorNama.trim(),
        pembeli_id: selectedPembeliId !== 'new' ? selectedPembeliId : undefined,
        pembeli_nama: pembeliNama.trim(),
        keterangan: keterangan.trim(),
        scans: flatScans,
        dibuat_oleh: `Admin (${currentRole})`,
      });

      setCompletedPengeluaran(res.pengeluaran);
      setScannedItems([]);
      setKeterangan('');
      setPembeliNama('');
      setSelectedPembeliId('');

      await loadData();
    } catch (err: any) {
      setScanAlert({
        type: 'error',
        message: err.message || 'Gagal menyimpan transaksi pengeluaran.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Batalkan Transaksi
  const handleCancelTransaction = async () => {
    if (!targetBatalId) return;
    if (!alasanBatal.trim() || alasanBatal.trim().length < 3) {
      alert('Alasan pembatalan wajib diisi minimal 3 karakter.');
      return;
    }

    try {
      setIsCancelling(true);
      await api.batalkanPengeluaran(targetBatalId, alasanBatal.trim(), `Admin (${currentRole})`);
      setBatalModalOpen(false);
      setTargetBatalId(null);
      setAlasanBatal('');
      await loadData();
    } catch (err: any) {
      alert(err.message || 'Gagal membatalkan transaksi');
    } finally {
      setIsCancelling(false);
    }
  };

  const handlePrintSuratJalan = (peng: Pengeluaran) => {
    try {
      const doc = generateSuratJalanPdf(peng);
      doc.autoPrint();
      const blobUrl = doc.output('bloburl');
      window.open(blobUrl, '_blank');
    } catch (err) {
      console.error('Error generating surat jalan PDF:', err);
      alert('Gagal membuat PDF Surat Jalan.');
    }
  };

  return (
    <div className="space-y-6">
      {/* View Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Barang Keluar & Surat Jalan</h1>
          <p className="text-xs text-slate-500 mt-1">
            Scan barcode kasur (USB / Kamera / Manual), verifikasi stok gudang otomatis, dan cetak Surat Jalan.
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="flex p-1 bg-slate-200/80 rounded-2xl w-fit">
          <button
            onClick={() => setActiveTab('scan')}
            className={`px-4 py-1.5 rounded-xl text-xs font-bold transition ${
              activeTab === 'scan' ? 'bg-white text-brand-700 shadow-sm' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Stasiun Scan Keluar
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`px-4 py-1.5 rounded-xl text-xs font-bold transition ${
              activeTab === 'history' ? 'bg-white text-brand-700 shadow-sm' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Riwayat Surat Jalan
          </button>
        </div>
      </div>

      {activeTab === 'scan' ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* SISI KIRI: SCANNER STATION (7 cols) */}
          <div className="lg:col-span-7 space-y-4">
            {/* Box Alert Notifikasi Scan */}
            {scanAlert && (
              <div
                className={`p-3.5 rounded-2xl text-xs flex items-start gap-2.5 transition animate-fade-in ${
                  scanAlert.type === 'success'
                    ? 'bg-emerald-50 border border-emerald-200 text-emerald-800'
                    : 'bg-red-50 border border-red-200 text-red-800'
                }`}
              >
                {scanAlert.type === 'success' ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                )}
                <div className="flex-1 font-medium">{scanAlert.message}</div>
                <button
                  onClick={() => setScanAlert(null)}
                  className="text-slate-400 hover:text-slate-600 text-sm font-bold leading-none"
                >
                  ×
                </button>
              </div>
            )}

            {/* Input Barcode (USB Scanner ready + Manual Input) */}
            <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-sm space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-600 uppercase tracking-wider flex items-center gap-1.5">
                  <ScanLine className="w-4 h-4 text-brand-600" />
                  Stasiun Scan Barcode
                </span>
                <button
                  type="button"
                  onClick={() => setIsCameraOpen(!isCameraOpen)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                    isCameraOpen
                      ? 'bg-red-50 text-red-600 border border-red-200'
                      : 'bg-brand-50 text-brand-700 hover:bg-brand-100 border border-brand-200'
                  }`}
                >
                  <Camera className="w-3.5 h-3.5" />
                  <span>{isCameraOpen ? 'Tutup Kamera' : 'Buka Scanner Kamera'}</span>
                </button>
              </div>

              {/* Kamera Scanner bila dibuka */}
              {isCameraOpen && (
                <CameraScanner
                  onScan={(code) => handleBarcodeScan(code)}
                  onClose={() => setIsCameraOpen(false)}
                />
              )}

              {/* Form Input Manual / USB Scanner */}
              <form onSubmit={handleManualSubmit} className="flex gap-2">
                <div className="relative flex-1">
                  <Keyboard className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    ref={barcodeInputRef}
                    data-barcode-scanner="true"
                    type="text"
                    placeholder="Scan barcode USB atau ketik kode di sini, lalu tekan Enter..."
                    value={manualInput}
                    onChange={(e) => setManualInput(e.target.value)}
                    className="w-full pl-9 pr-4 py-3 text-sm font-mono font-semibold rounded-2xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-500 bg-slate-50/60"
                  />
                </div>
                <button
                  type="submit"
                  className="px-5 py-3 bg-brand-600 hover:bg-brand-700 text-white font-bold text-sm rounded-2xl transition shadow-sm active:scale-95"
                >
                  + Tambah
                </button>
              </form>

              <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1">
                <span>Scanner USB/Bluetooth otomatis terbaca saat jendela aktif.</span>
                <span className="font-medium text-brand-600">Debounce: 1 detik</span>
              </div>
            </div>

            {/* Daftar Barang Di-Scan */}
            <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-sm space-y-3">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div>
                  <h3 className="text-sm font-bold text-slate-800">Daftar Scan Barang Keluar</h3>
                  <p className="text-xs text-slate-500">Satu scan = satu pcs kasur (FIFO)</p>
                </div>
                <div className="text-right">
                  <span className="text-xs text-slate-500 block">Total Muatan</span>
                  <span className="text-lg font-extrabold text-brand-600 font-mono">
                    {totalScannedPcs} pcs
                  </span>
                </div>
              </div>

              {scannedItems.length === 0 ? (
                <div className="py-12 text-center text-slate-400 space-y-2">
                  <ScanLine className="w-10 h-10 mx-auto text-slate-300 stroke-[1.5]" />
                  <p className="text-xs">Belum ada barang di-scan. Mulai scan label di kasur busa.</p>
                </div>
              ) : (
                <div className="space-y-3 max-h-[460px] overflow-y-auto pr-1">
                  {scannedItems.map((item) => {
                    const group = stokKelompok.find(k => k.barcode === item.barcode);
                    const sisaDiGudang = group?.sisa_di_gudang || 0;

                    return (
                      <div
                        key={item.id}
                        className="p-3.5 rounded-2xl border border-slate-200 bg-slate-50/70 hover:bg-slate-50 transition space-y-2.5"
                      >
                        {/* Baris Kasur Utama */}
                        <div className="flex items-start justify-between gap-3 text-sm">
                          <div>
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-mono font-bold text-brand-700 bg-white px-2 py-0.5 rounded-lg border border-slate-200 text-xs">
                                {item.barcode}
                              </span>
                              <span className="font-bold text-slate-800 text-xs">
                                {group?.nama_ukuran || 'Ukuran Kasur'}
                              </span>
                            </div>
                            <p className="text-[11px] text-slate-500 mt-1">
                              Sisa stok gudang: <strong className="text-emerald-700">{sisaDiGudang} pcs</strong> · Tgl Masuk: {group?.tanggal_masuk}
                            </p>
                          </div>

                          <div className="flex items-center gap-2 shrink-0">
                            <div className="flex items-center gap-1">
                              <input
                                type="number"
                                min="1"
                                max={sisaDiGudang}
                                value={item.qty}
                                onChange={(e) => handleQtyChange(item.id, parseInt(e.target.value) || 1)}
                                className="w-16 px-2 py-1 text-center font-bold text-sm font-mono rounded-xl border border-slate-300 bg-white"
                              />
                              <span className="text-xs text-slate-600">pcs</span>
                            </div>

                            <button
                              type="button"
                              onClick={() => handleRemoveScan(item.id)}
                              className="p-1.5 text-slate-400 hover:text-red-600 rounded-lg transition"
                              title="Hapus kasur ini dari daftar scan"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>

                        {/* Input Nama Pembeli di Bawah Kasur / Pcs (Multi-buyer per koordinator) */}
                        <div className="pt-2 border-t border-slate-200/80 flex flex-col sm:flex-row sm:items-center gap-2">
                          <div className="flex items-center gap-1 text-[11px] font-semibold text-slate-600 shrink-0">
                            <User className="w-3.5 h-3.5 text-brand-600" />
                            <span>Nama Pembeli:</span>
                          </div>
                          <input
                            type="text"
                            placeholder="Ketik nama pembeli kasur ini..."
                            value={item.pembeli_nama || ''}
                            onChange={(e) => handleItemPembeliChange(item.id, e.target.value)}
                            className="flex-1 px-3 py-1.5 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-500 bg-white font-medium placeholder:text-slate-400"
                          />
                          {item.qty > 1 && (
                            <button
                              type="button"
                              onClick={() => handleSplitItem(item.id)}
                              className="text-[11px] font-bold text-brand-700 bg-brand-50 hover:bg-brand-100 border border-brand-200 px-2.5 py-1.5 rounded-xl transition shrink-0 flex items-center gap-1"
                              title="Pisahkan 1 pcs ke baris baru jika kasur ini untuk pembeli yang berbeda"
                            >
                              <Users className="w-3 h-3 text-brand-600" />
                              <span>+ Pisah Pembeli</span>
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* SISI KANAN: FORM SURAT JALAN & PIHAK (5 cols) */}
          <div className="lg:col-span-5 space-y-4">
            <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-sm space-y-4">
              <h2 className="text-base font-bold text-slate-800 flex items-center gap-2 border-b border-slate-100 pb-3">
                <Truck className="w-5 h-5 text-brand-600" />
                <span>Data Pengiriman & Pembeli</span>
              </h2>

              <form onSubmit={handleSubmitPengeluaran} className="space-y-4 text-xs">
                {/* Supir / Pengirim */}
                <div>
                  <label className="block font-semibold text-slate-600 uppercase mb-1">
                    Supir / Pengirim *
                  </label>
                  <select
                    value={selectedPengirimId}
                    onChange={(e) => setSelectedPengirimId(e.target.value)}
                    required
                    className="w-full px-3 py-2.5 text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-500 bg-white font-medium"
                  >
                    {pengirimList.map(p => (
                      <option key={p.id} value={p.id}>
                        {p.nama} ({p.telepon})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Koordinator: Bisa dipilih atau diketik sendiri */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="font-semibold text-slate-600 uppercase">
                      Koordinator Gudang / Wilayah *
                    </label>
                    <span className="text-[10px] text-brand-600 font-medium">Bisa diketik sendiri</span>
                  </div>

                  <select
                    value={selectedKoordinatorId}
                    onChange={(e) => handleSelectKoordinator(e.target.value)}
                    className="w-full px-3 py-2.5 text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-500 bg-white font-medium mb-2"
                  >
                    <option value="">-- Pilih Koordinator Terdaftar / Ketik Sendiri --</option>
                    {koordinatorList.map(p => (
                      <option key={p.id} value={p.id}>
                        {p.nama} {p.telepon ? `(${p.telepon})` : ''}
                      </option>
                    ))}
                    <option value="custom">+ Ketik Nama Koordinator Sendiri</option>
                  </select>

                  <input
                    type="text"
                    placeholder="Ketik nama koordinator gudang / pengiriman..."
                    value={koordinatorNama}
                    onChange={(e) => setKoordinatorNama(e.target.value)}
                    required
                    className="w-full px-3 py-2.5 text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-500 bg-white font-medium"
                  />
                </div>

                {/* Pembeli: Pilih dari master atau ketik nama baru */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="font-semibold text-slate-600 uppercase">
                      Penerima / Pembeli
                    </label>
                    <span className="text-[10px] text-brand-600 font-medium">Bisa diisi per-kasur di kiri</span>
                  </div>

                  <select
                    value={selectedPembeliId}
                    onChange={(e) => handleSelectPembeli(e.target.value)}
                    className="w-full px-3 py-2.5 text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-500 bg-white font-medium mb-2"
                  >
                    <option value="">-- Pilih Pembeli Terdaftar / Ketik Baru --</option>
                    {pembeliList.map(p => (
                      <option key={p.id} value={p.id}>{p.nama} ({p.telepon})</option>
                    ))}
                    <option value="new">+ Ketik Pembeli Baru Secara Langsung</option>
                  </select>

                  <input
                    type="text"
                    placeholder="Ketik nama pembeli global (opsional jika sudah diisi di kartu kasur)..."
                    value={pembeliNama}
                    onChange={(e) => setPembeliNama(e.target.value)}
                    className="w-full px-3 py-2.5 text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-500 bg-white font-medium"
                  />
                  <p className="text-[11px] text-slate-400 mt-1">
                    Jika 1 koordinator membawa untuk banyak pembeli, ketik nama pembeli di bawah masing-masing kasur di sebelah kiri.
                  </p>
                </div>

                {/* Keterangan */}
                <div>
                  <label className="block font-semibold text-slate-600 uppercase mb-1">
                    Keterangan / Alamat Kirim (Opsional)
                  </label>
                  <textarea
                    rows={2}
                    placeholder="Contoh: Kirim ke Toko Bintang Mebel Blok C, supir bawa nota fisik"
                    value={keterangan}
                    onChange={(e) => setKeterangan(e.target.value)}
                    className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-500 bg-white"
                  />
                </div>

                {/* Action Submit */}
                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={isSubmitting || scannedItems.length === 0}
                    className="w-full flex items-center justify-center gap-2 px-5 py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm rounded-2xl transition shadow-lg shadow-emerald-600/20 active:scale-95 disabled:opacity-50"
                  >
                    <CheckCircle2 className="w-5 h-5" />
                    <span>
                      {isSubmitting
                        ? 'Menyimpan Transaksi...'
                        : `Simpan Pengeluaran (${totalScannedPcs} pcs)`}
                    </span>
                  </button>
                  <p className="text-center text-[11px] text-slate-400 mt-2">
                    Stok barang akan otomatis dipotong dan nomor Surat Jalan terbit.
                  </p>
                </div>
              </form>
            </div>
          </div>
        </div>
      ) : (
        /* TAB RIWAYAT PENGELUARAN & SURAT JALAN */
        <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-slate-100 flex items-center justify-between">
            <div>
              <h3 className="font-bold text-slate-800 text-sm">Riwayat Surat Jalan & Barang Keluar</h3>
              <p className="text-xs text-slate-500">Daftar transaksi pengiriman kasur yang telah dicatat</p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50/75 border-b border-slate-200 text-xs font-bold text-slate-500 uppercase">
                <tr>
                  <th className="py-3 px-4">No. Surat Jalan</th>
                  <th className="py-3 px-4">Tanggal</th>
                  <th className="py-3 px-4">Penerima / Pembeli</th>
                  <th className="py-3 px-4">Pengirim / Supir</th>
                  <th className="py-3 px-4 text-center">Total Pcs</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {riwayatPengeluaran.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-slate-400 text-xs italic">
                      Belum ada transaksi pengeluaran.
                    </td>
                  </tr>
                ) : (
                  riwayatPengeluaran.map((peng) => {
                    const totalPcs = (peng.items || []).filter(it => !it.is_batal).length;
                    const isBatal = peng.status === 'batal';

                    return (
                      <tr key={peng.id} className="hover:bg-slate-50">
                        <td className="py-3.5 px-4 font-mono font-bold text-brand-700">{peng.no_surat_jalan}</td>
                        <td className="py-3.5 px-4 text-xs text-slate-500">
                          {new Date(peng.tanggal).toLocaleDateString('id-ID', {
                            day: '2-digit',
                            month: 'short',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </td>
                        <td className="py-3.5 px-4 font-semibold text-slate-800 text-xs">{peng.pembeli_nama}</td>
                        <td className="py-3.5 px-4 text-slate-600 text-xs">{peng.pengirim?.nama || '-'}</td>
                        <td className="py-3.5 px-4 text-center font-mono font-bold text-brand-700">
                          {totalPcs} pcs
                        </td>
                        <td className="py-3.5 px-4">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              isBatal ? 'bg-red-100 text-red-700' : 'bg-emerald-100 text-emerald-700'
                            }`}
                          >
                            {isBatal ? 'Batal' : 'Aktif'}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => handlePrintSuratJalan(peng)}
                              className="flex items-center gap-1 px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg transition"
                              title="Cetak Surat Jalan"
                            >
                              <Printer className="w-3.5 h-3.5 text-slate-500" />
                              <span>Cetak SJ</span>
                            </button>

                            {/* Batalkan hanya untuk Admin dan transaksi aktif */}
                            {currentRole === 'admin' && !isBatal && (
                              <button
                                onClick={() => {
                                  setTargetBatalId(peng.id);
                                  setBatalModalOpen(true);
                                }}
                                className="flex items-center gap-1 px-2 py-1 text-red-600 hover:bg-red-50 text-xs font-semibold rounded-lg transition"
                                title="Batalkan Transaksi"
                              >
                                <RotateCcw className="w-3.5 h-3.5" />
                                <span>Batal</span>
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* MODAL SUKSES PENGELUARAN & PRINT SURAT JALAN */}
      {completedPengeluaran && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white w-full max-w-lg rounded-3xl shadow-2xl border border-slate-200 overflow-hidden text-center p-6 space-y-4">
            <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-9 h-9" />
            </div>

            <div>
              <span className="font-mono text-xs font-bold text-brand-700 bg-brand-50 px-2.5 py-1 rounded-lg">
                {completedPengeluaran.no_surat_jalan}
              </span>
              <h3 className="text-xl font-bold text-slate-900 mt-2">Barang Keluar Berhasil Dicatat!</h3>
              <p className="text-xs text-slate-500 mt-1">
                Sebanyak{' '}
                <strong className="text-emerald-700 font-mono text-sm">
                  {completedPengeluaran.items?.length || 0} pcs kasur
                </strong>{' '}
                berhasil dialokasikan untuk <strong>{completedPengeluaran.pembeli_nama}</strong>.
              </p>
            </div>

            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 text-left text-xs space-y-1.5">
              <div className="flex justify-between">
                <span className="text-slate-500">Supir / Pengirim:</span>
                <span className="font-semibold text-slate-800">{completedPengeluaran.pengirim?.nama || '-'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Koordinator:</span>
                <span className="font-semibold text-slate-800">{completedPengeluaran.koordinator_nama || completedPengeluaran.koordinator?.nama || '-'}</span>
              </div>
              {completedPengeluaran.keterangan && (
                <div className="flex justify-between">
                  <span className="text-slate-500">Keterangan:</span>
                  <span className="text-slate-700">{completedPengeluaran.keterangan}</span>
                </div>
              )}
              {completedPengeluaran.items && completedPengeluaran.items.some(it => it.pembeli_nama) && (
                <div className="mt-3 pt-2 border-t border-slate-200">
                  <span className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Rincian Pembeli per Kasur:</span>
                  <div className="space-y-1 max-h-28 overflow-y-auto pr-1">
                    {completedPengeluaran.items.map((it, idx) => (
                      <div key={idx} className="flex justify-between items-center text-[11px] bg-white px-2 py-1 rounded border border-slate-200/60">
                        <span className="font-mono text-slate-600 font-semibold">{it.barcode_scan}</span>
                        <span className="font-medium text-slate-800">
                          {it.pembeli_nama ? `Pembeli: ${it.pembeli_nama}` : (completedPengeluaran.pembeli_nama || '-')}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="flex flex-col sm:flex-row items-center gap-3 pt-2">
              <button
                onClick={() => handlePrintSuratJalan(completedPengeluaran)}
                className="w-full flex items-center justify-center gap-2 px-5 py-3 bg-brand-600 hover:bg-brand-700 text-white font-bold text-sm rounded-2xl transition shadow-lg shadow-brand-500/20 active:scale-95"
              >
                <Printer className="w-4 h-4" />
                <span>Cetak / Unduh Surat Jalan (PDF)</span>
              </button>

              <button
                onClick={() => setCompletedPengeluaran(null)}
                className="w-full sm:w-auto px-5 py-3 text-slate-600 font-semibold text-sm hover:bg-slate-100 rounded-2xl"
              >
                Selesai
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL BATALKAN TRANSAKSI */}
      {batalModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl border border-slate-200 overflow-hidden p-6 space-y-4">
            <div className="flex items-center gap-2 text-red-600">
              <AlertCircle className="w-5 h-5" />
              <h3 className="font-bold text-base text-slate-900">Batalkan Transaksi Pengeluaran</h3>
            </div>

            <p className="text-xs text-slate-500">
              Kasur pada transaksi ini akan dikembalikan ke status <strong className="text-slate-700">di_gudang</strong>. Alasan pembatalan wajib diisi untuk pencatatan di audit log.
            </p>

            <div>
              <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">
                Alasan Pembatalan (Wajib) *
              </label>
              <textarea
                rows={3}
                placeholder="Contoh: Salah scan ukuran kasur, pembeli minta ganti tanggal pengiriman"
                value={alasanBatal}
                onChange={(e) => setAlasanBatal(e.target.value)}
                required
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-red-500 bg-white"
              />
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setBatalModalOpen(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
              >
                Batal
              </button>
              <button
                type="button"
                disabled={isCancelling || !alasanBatal.trim()}
                onClick={handleCancelTransaction}
                className="px-5 py-2 text-xs font-bold text-white bg-red-600 hover:bg-red-700 rounded-xl transition shadow-sm disabled:opacity-50"
              >
                {isCancelling ? 'Membatalkan...' : 'Konfirmasi Batalkan'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

