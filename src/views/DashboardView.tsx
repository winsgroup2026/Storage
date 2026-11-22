import React, { useState, useEffect, useMemo } from 'react';
import {
  Package,
  TrendingUp,
  RotateCcw,
  Boxes,
  Search,
  ScanLine,
  ArrowRight,
  Printer,
  Calendar,
  AlertTriangle,
  CheckCircle,
  Filter,
  History,
  Info,
} from 'lucide-react';
import { api } from '../services/api';
import { StokKelompok, Ukuran, Pengembalian, Penerimaan, Pengeluaran } from '../types';
import { CetakLabelModal } from '../components/CetakLabelModal';
import { LabelData } from '../utils/labelGenerator';

interface DashboardViewProps {
  onNavigate: (view: string, extra?: any) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({ onNavigate }) => {
  const [stokKelompok, setStokKelompok] = useState<StokKelompok[]>([]);
  const [ukurans, setUkurans] = useState<Ukuran[]>([]);
  const [returs, setReturs] = useState<Pengembalian[]>([]);
  const [penerimaans, setPenerimaans] = useState<Penerimaan[]>([]);
  const [pengeluarans, setPengeluarans] = useState<Pengeluaran[]>([]);
  const [selectedDate, setSelectedDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [viewMode, setViewMode] = useState<'harian' | 'buku_besar'>('harian');
  const [selectedUkuranFilter, setSelectedUkuranFilter] = useState<string>('all');
  const [searchBarcode, setSearchBarcode] = useState('');
  const [barcodeDetail, setBarcodeDetail] = useState<any | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [labelModalData, setLabelModalData] = useState<LabelData[] | null>(null);
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    try {
      setLoading(true);
      const [stokData, ukuranData, returData, rcvData, pengData] = await Promise.all([
        api.getStokKelompok(),
        api.getUkuranList(),
        api.getPengembalianList(),
        api.getPenerimaanList(),
        api.getPengeluaranList(),
      ]);
      setStokKelompok(stokData);
      setUkurans(ukuranData);
      setReturs(returData);
      setPenerimaans(rcvData);
      setPengeluarans(pengData);
    } catch (err) {
      console.error('Error loading dashboard data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Hitung KPI
  const totalDiGudang = stokKelompok.reduce((sum, item) => sum + item.sisa_di_gudang, 0);
  const totalKeluar = stokKelompok.reduce((sum, item) => sum + item.jumlah_keluar, 0);
  const totalReturPcs = returs.reduce((sum, r) => sum + (r.total_pcs || 0), 0);
  const totalKelompokAktif = stokKelompok.filter(k => k.sisa_di_gudang > 0).length;

  const handleSearchBarcode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchBarcode.trim()) return;
    setIsSearching(true);
    try {
      const detail = await api.getBarcodeDetail(searchBarcode.trim());
      // Cari juga riwayat retur untuk barcode ini
      const matchingReturs = returs.filter(r =>
        r.items?.some(it => it.barcode.toUpperCase() === searchBarcode.trim().toUpperCase())
      );
      setBarcodeDetail({ ...detail, matchingReturs });
    } catch (err) {
      console.error('Error searching barcode:', err);
    } finally {
      setIsSearching(false);
    }
  };

  // --------------------------------------------------------------------------
  // BUKU MUTASI STOK KASUR (LEDGER PER UKURAN & PER TANGGAL)
  // Logika: Saldo Awal (hari ini) = Sisa Saldo (kemarin)
  // Sisa Saldo (hari ini) = Saldo Awal + Debit (PO Masuk) - Kredit (Keluar)
  // --------------------------------------------------------------------------
  const { ledgerPerUkuran, debitMap, kreditMap } = useMemo(() => {
    const dMap: Record<string, Record<string, number>> = {};
    const kMap: Record<string, Record<string, number>> = {};
    const dateSet = new Set<string>();
    dateSet.add(new Date().toISOString().slice(0, 10)); // Selalu sertakan hari ini
    if (selectedDate) dateSet.add(selectedDate);

    // 1. Debit dari Penerimaan (PO Kasur Masuk)
    penerimaans.forEach((rcv) => {
      const tgl = rcv.tanggal_terima;
      if (!tgl) return;
      dateSet.add(tgl);

      if (rcv.barcodes && rcv.barcodes.length > 0) {
        rcv.barcodes.forEach((b) => {
          const kode = (b.kode_ukuran || '').toUpperCase();
          if (!dMap[kode]) dMap[kode] = {};
          dMap[kode][tgl] = (dMap[kode][tgl] || 0) + (Number(b.qty) || 0);
        });
      } else if (rcv.po && rcv.po.items) {
        rcv.po.items.forEach((it) => {
          const u = ukurans.find((uk) => uk.id === it.ukuran_id);
          const kode = (u?.kode || '').toUpperCase();
          if (!dMap[kode]) dMap[kode] = {};
          dMap[kode][tgl] = (dMap[kode][tgl] || 0) + (Number(it.qty_diterima || it.qty_pesan) || 0);
        });
      }
    });

    // 2. Debit dari stokKelompok (cadangan jika ada kelompok tanpa record rcv terpisah)
    stokKelompok.forEach((k) => {
      const tgl = k.tanggal_masuk;
      if (tgl) dateSet.add(tgl);
      const kode = (k.kode_ukuran || k.barcode.split('-')[0] || '').toUpperCase();
      if (!dMap[kode]) dMap[kode] = {};
      if (!dMap[kode][tgl]) {
        dMap[kode][tgl] = k.jumlah_masuk;
      }
    });

    // 3. Kredit dari Pengeluaran (Surat Jalan / Scan Keluar)
    pengeluarans.forEach((peng) => {
      const tgl = peng.tanggal;
      if (!tgl) return;
      dateSet.add(tgl);

      (peng.items || []).forEach((it) => {
        if (it.is_batal) return;
        const kode = (it.barcode_scan ? it.barcode_scan.split('-')[0] : (it.barang?.ukuran?.kode || '')).toUpperCase();
        if (!kode) return;
        if (!kMap[kode]) kMap[kode] = {};
        kMap[kode][tgl] = (kMap[kode][tgl] || 0) + 1;
      });
    });

    // 4. Retur Kembali ke Stok (menambah kembali ke debit gudang)
    returs.forEach((ret) => {
      const tgl = ret.tanggal;
      if (!tgl) return;
      dateSet.add(tgl);

      (ret.items || []).forEach((it) => {
        const kode = (it.kode_ukuran || (it.barcode ? it.barcode.split('-')[0] : '')).toUpperCase();
        if (!kode) return;
        if (!dMap[kode]) dMap[kode] = {};
        dMap[kode][tgl] = (dMap[kode][tgl] || 0) + (Number(it.qty) || 0);
      });
    });

    // Bangun ledger kronologis per ukuran
    const sortedDatesAsc = Array.from(dateSet).sort();
    const ledgerMap: Record<string, {
      tanggal: string;
      kode_ukuran: string;
      nama_ukuran: string;
      saldo: number;
      debit: number;
      kredit: number;
      sisa_saldo: number;
    }[]> = {};

    ukurans.forEach((u) => {
      const kode = u.kode.toUpperCase();
      let currentBalance = 0;
      const rows: {
        tanggal: string;
        kode_ukuran: string;
        nama_ukuran: string;
        saldo: number;
        debit: number;
        kredit: number;
        sisa_saldo: number;
      }[] = [];

      sortedDatesAsc.forEach((d) => {
        const debitHariIni = dMap[kode]?.[d] || 0;
        const kreditHariIni = kMap[kode]?.[d] || 0;
        const saldoAwal = currentBalance;
        const sisa = saldoAwal + debitHariIni - kreditHariIni;

        rows.push({
          tanggal: d,
          kode_ukuran: u.kode,
          nama_ukuran: u.nama,
          saldo: saldoAwal,
          debit: debitHariIni,
          kredit: kreditHariIni,
          sisa_saldo: sisa,
        });

        // Sisa saldo hari ini menjadi saldo awal esok hari!
        currentBalance = sisa;
      });

      ledgerMap[kode] = rows;
    });

    return { ledgerPerUkuran: ledgerMap, debitMap: dMap, kreditMap: kMap };
  }, [penerimaans, pengeluarans, returs, stokKelompok, ukurans, selectedDate]);

  // Baris yang ditampilkan di tabel
  const rowsToDisplay = useMemo(() => {
    const targetUkurans = selectedUkuranFilter === 'all'
      ? ukurans
      : ukurans.filter(u => u.kode.toUpperCase() === selectedUkuranFilter.toUpperCase());

    if (viewMode === 'harian') {
      return targetUkurans.map((u) => {
        const kode = u.kode.toUpperCase();
        const rows = ledgerPerUkuran[kode] || [];
        const exactMatch = rows.find(r => r.tanggal === selectedDate);
        if (exactMatch) return exactMatch;

        // Jika tanggal belum tercatat spesifik, cari sisa saldo penutupan sebelum tanggal ini
        const priorRows = rows.filter(r => r.tanggal < selectedDate);
        const lastBalance = priorRows.length > 0 ? priorRows[priorRows.length - 1].sisa_saldo : 0;
        const debitToday = debitMap[kode]?.[selectedDate] || 0;
        const kreditToday = kreditMap[kode]?.[selectedDate] || 0;
        const sisaToday = lastBalance + debitToday - kreditToday;

        return {
          tanggal: selectedDate,
          kode_ukuran: u.kode,
          nama_ukuran: u.nama,
          saldo: lastBalance,
          debit: debitToday,
          kredit: kreditToday,
          sisa_saldo: sisaToday,
        };
      });
    } else {
      // viewMode === 'buku_besar': tampilkan riwayat kronologis seluruh tanggal
      const allRows: {
        tanggal: string;
        kode_ukuran: string;
        nama_ukuran: string;
        saldo: number;
        debit: number;
        kredit: number;
        sisa_saldo: number;
      }[] = [];

      targetUkurans.forEach((u) => {
        const kode = u.kode.toUpperCase();
        const rows = ledgerPerUkuran[kode] || [];
        allRows.push(...rows);
      });

      // Urutkan tanggal terbaru di atas
      return allRows.sort((a, b) => b.tanggal.localeCompare(a.tanggal) || a.kode_ukuran.localeCompare(b.kode_ukuran));
    }
  }, [viewMode, selectedDate, selectedUkuranFilter, ukurans, ledgerPerUkuran, debitMap, kreditMap]);

  return (
    <div className="space-y-6">
      {/* Welcome Banner */}
      <div className="bg-gradient-to-r from-brand-600 to-brand-800 rounded-3xl p-6 sm:p-8 text-white shadow-xl shadow-brand-900/10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-3 py-1 rounded-full bg-white/15 text-xs font-semibold tracking-wide flex items-center gap-1.5">
              <img src="/logo.png" alt="Win's Group" className="w-4 h-4 object-contain rounded-full bg-white p-0.5" />
              Win's Group · Sistem Gudang Barcode
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold mt-2 tracking-tight">
            Pantau Stok & Alur Barang Real-Time
          </h1>
          <p className="text-brand-100 text-sm mt-1 max-w-xl">
            Alur barang ringkas & akurat: catat barang datang dari pabrik, cetak label barcode, scan barang keluar, dan kelola pengembalian kasur batal beli.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto">
          <button
            onClick={() => onNavigate('scan_keluar')}
            className="flex-1 md:flex-initial flex items-center justify-center gap-2 px-4 py-3 rounded-2xl bg-white text-brand-700 font-bold text-xs hover:bg-brand-50 active:scale-95 transition shadow-lg shadow-black/10"
          >
            <ScanLine className="w-4 h-4 text-brand-600" />
            <span>Scan Barang Keluar</span>
          </button>
          <button
            onClick={() => onNavigate('penerimaan')}
            className="flex-1 md:flex-initial flex items-center justify-center gap-2 px-4 py-3 rounded-2xl bg-brand-700/80 hover:bg-brand-700 border border-brand-400/30 text-white font-semibold text-xs transition"
          >
            <Package className="w-4 h-4" />
            <span>Purchase Order (PO)</span>
          </button>
          <button
            onClick={() => onNavigate('retur')}
            className="flex-1 md:flex-initial flex items-center justify-center gap-2 px-4 py-3 rounded-2xl bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs transition shadow-md shadow-amber-900/20"
          >
            <RotateCcw className="w-4 h-4" />
            <span>Pengembalian (Retur)</span>
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Stok di gudang */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs hover:shadow-md transition">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Di Gudang</span>
            <div className="p-2.5 bg-emerald-50 text-emerald-600 rounded-xl">
              <Boxes className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-slate-900">{totalDiGudang}</span>
            <span className="text-xs font-semibold text-slate-500">pcs</span>
          </div>
          <p className="text-[11px] text-emerald-600 font-medium mt-1 flex items-center gap-1">
            <CheckCircle className="w-3.5 h-3.5" /> Siap dikirim ke pembeli
          </p>
        </div>

        {/* Card 2: Keluar */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs hover:shadow-md transition">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Barang Keluar</span>
            <div className="p-2.5 bg-blue-50 text-blue-600 rounded-xl">
              <TrendingUp className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-slate-900">{totalKeluar}</span>
            <span className="text-xs font-semibold text-slate-500">pcs</span>
          </div>
          <p className="text-[11px] text-slate-500 mt-1">Total kasur terdistribusi</p>
        </div>

        {/* Card 3: Barang Retur / Batal Beli */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs hover:shadow-md transition">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Barang Retur</span>
            <div className="p-2.5 bg-amber-50 text-amber-600 rounded-xl">
              <RotateCcw className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-amber-700">{totalReturPcs}</span>
            <span className="text-xs font-semibold text-slate-500">pcs</span>
          </div>
          <p className="text-[11px] text-amber-600 font-medium mt-1">Kasur kembali ke stok gudang</p>
        </div>

        {/* Card 4: Kelompok Barcode Aktif */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs hover:shadow-md transition">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Kelompok Barcode</span>
            <div className="p-2.5 bg-purple-50 text-purple-600 rounded-xl">
              <Package className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-slate-900">{totalKelompokAktif}</span>
            <span className="text-xs font-semibold text-slate-500">batch</span>
          </div>
          <p className="text-[11px] text-slate-500 mt-1">Kombinasi ukuran + tgl masuk</p>
        </div>
      </div>

      {/* Global Barcode Search & History Inspector */}
      <div className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-xs">
        <div className="max-w-xl">
          <h2 className="text-lg font-bold text-slate-800">Cari Riwayat Barcode</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Ketik atau scan barcode (mis. <code className="text-brand-600 font-mono">200-101126</code>) untuk melihat asal pabrik, tanggal masuk, sisa stok, transaksi keluar, serta riwayat retur.
          </p>
        </div>

        <form onSubmit={handleSearchBarcode} className="mt-4 flex gap-2 max-w-xl">
          <div className="relative flex-1">
            <Search className="w-5 h-5 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Ketik kode barcode, contoh: 200-101126"
              value={searchBarcode}
              onChange={(e) => setSearchBarcode(e.target.value)}
              className="w-full pl-11 pr-4 py-2.5 text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-500 bg-slate-50/50 font-mono"
            />
          </div>
          <button
            type="submit"
            disabled={isSearching}
            className="px-5 py-2.5 bg-brand-600 hover:bg-brand-700 text-white font-semibold text-sm rounded-xl transition shadow-xs"
          >
            {isSearching ? 'Mencari...' : 'Cari'}
          </button>
        </form>

        {/* Hasil Pencarian Barcode */}
        {barcodeDetail && (
          <div className="mt-6 p-5 bg-slate-50 rounded-2xl border border-slate-200 animate-fade-in space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
              <div>
                <span className="text-xs font-bold text-brand-600 font-mono px-2.5 py-1 bg-brand-50 rounded-lg">
                  {barcodeDetail.kelompok?.barcode || searchBarcode}
                </span>
                <h3 className="text-base font-bold text-slate-900 mt-1">
                  {barcodeDetail.kelompok?.nama_ukuran || 'Ukuran tidak dikenal'}
                </h3>
                <p className="text-xs text-slate-500 flex items-center gap-1.5 mt-0.5">
                  <Calendar className="w-3.5 h-3.5" />
                  Tanggal Masuk: {barcodeDetail.kelompok?.tanggal_masuk || '-'}
                  {barcodeDetail.po && <span>· Dari PO: <strong>{barcodeDetail.po.no_po}</strong></span>}
                </p>
              </div>

              <div className="flex items-center gap-4">
                <div className="text-right">
                  <span className="text-xs text-slate-500 block">Sisa di Gudang</span>
                  <span className="text-xl font-extrabold text-emerald-600 font-mono">
                    {barcodeDetail.kelompok?.sisa_di_gudang ?? 0} pcs
                  </span>
                </div>
                {barcodeDetail.kelompok && (
                  <button
                    onClick={() => {
                      setLabelModalData([
                        {
                          barcode: barcodeDetail.kelompok.barcode,
                          nama_ukuran: barcodeDetail.kelompok.nama_ukuran,
                          dimensi_str: `${barcodeDetail.kelompok.panjang_cm || 200} x ${barcodeDetail.kelompok.lebar_cm || 200} x ${barcodeDetail.kelompok.tebal_cm || 20} cm`,
                          tanggal_masuk: barcodeDetail.kelompok.tanggal_masuk,
                          qty: Math.max(1, barcodeDetail.kelompok.sisa_di_gudang || 1),
                        },
                      ]);
                    }}
                    className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-200 hover:bg-slate-100 rounded-xl transition"
                  >
                    <Printer className="w-4 h-4 text-slate-500" />
                    <span>Cetak Label</span>
                  </button>
                )}
              </div>
            </div>

            {/* Riwayat Pengeluaran Barcode Ini */}
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
                Riwayat Transaksi Keluar Untuk Kode Ini
              </h4>
              {barcodeDetail.pengeluarans && barcodeDetail.pengeluarans.length > 0 ? (
                <div className="space-y-2">
                  {barcodeDetail.pengeluarans.map((pRecord: any, idx: number) => {
                    const p = pRecord.pengeluaran;
                    return (
                      <div
                        key={idx}
                        className="p-3 bg-white rounded-xl border border-slate-200 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2"
                      >
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-bold text-slate-800">{p.no_surat_jalan}</span>
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              p.status === 'batal' ? 'bg-red-100 text-red-700' : 'bg-emerald-100 text-emerald-700'
                            }`}>
                              {p.status === 'batal' ? 'Batal' : 'Aktif'}
                            </span>
                          </div>
                          <p className="text-slate-600 mt-1">
                            Pembeli: <strong>{p.pembeli_nama}</strong> · Pengirim: {p.pengirim?.nama || '-'} · Koordinator: {p.koordinator?.nama || '-'}
                          </p>
                          {p.keterangan && <p className="text-slate-400 mt-0.5">Catatan: {p.keterangan}</p>}
                        </div>
                        <div className="text-right shrink-0">
                          <span className="font-bold text-brand-600 font-mono text-sm block">
                            {pRecord.pcs_count} pcs keluar
                          </span>
                          <span className="text-[11px] text-slate-400">
                            {new Date(p.tanggal).toLocaleDateString('id-ID')}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-xs text-slate-400 italic">Belum ada barang dari kode ini yang dikeluarkan.</p>
              )}
            </div>

            {/* Riwayat Retur Barcode Ini */}
            {barcodeDetail.matchingReturs && barcodeDetail.matchingReturs.length > 0 && (
              <div className="pt-3 border-t border-slate-200">
                <h4 className="text-xs font-bold uppercase tracking-wider text-amber-700 mb-2 flex items-center gap-1.5">
                  <RotateCcw className="w-3.5 h-3.5" />
                  Riwayat Pengembalian (Retur Batal Beli)
                </h4>
                <div className="space-y-2">
                  {barcodeDetail.matchingReturs.map((r: Pengembalian, idx: number) => (
                    <div
                      key={idx}
                      className="p-3 bg-amber-50/60 rounded-xl border border-amber-200 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-amber-800">{r.no_retur}</span>
                          <span className="text-slate-700 font-semibold">
                            Pembeli: {r.pembeli_nama}
                          </span>
                        </div>
                        <p className="text-slate-600 mt-0.5">Alasan: "{r.alasan}"</p>
                      </div>
                      <div className="text-right shrink-0">
                        <span className="font-bold text-emerald-700 font-mono text-sm block">
                          Kembali ke Stok
                        </span>
                        <span className="text-[11px] text-slate-500">
                          {new Date(r.tanggal).toLocaleDateString('id-ID')}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Tabel Ringkasan Buku Mutasi Stok & Saldo Kasur */}
      <div className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-xs space-y-4">
        {/* Header Bagian */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded-lg bg-brand-50 text-brand-700">
                <Boxes className="w-4 h-4" />
              </span>
              <h2 className="text-lg font-bold text-slate-800">Buku Mutasi Stok & Saldo Kasur</h2>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Pantau arus mutasi kasur busa per ukuran: Saldo Awal + Debit (PO Masuk) - Kredit (Keluar) = Sisa Saldo.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Mode Switcher */}
            <div className="flex p-1 bg-slate-100 rounded-xl">
              <button
                type="button"
                onClick={() => setViewMode('harian')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
                  viewMode === 'harian'
                    ? 'bg-white text-brand-700 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Calendar className="w-3.5 h-3.5" />
                <span>Mutasi Tanggal</span>
              </button>
              <button
                type="button"
                onClick={() => setViewMode('buku_besar')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
                  viewMode === 'buku_besar'
                    ? 'bg-white text-brand-700 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <History className="w-3.5 h-3.5" />
                <span>Riwayat Buku Besar</span>
              </button>
            </div>

            <button
              onClick={() => onNavigate('laporan')}
              className="flex items-center gap-1 text-xs font-semibold text-brand-600 hover:text-brand-700 hover:underline px-2 py-1"
            >
              <span>Laporan Lengkap</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Filter Bar: Tanggal & Ukuran */}
        <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 bg-slate-50/80 rounded-2xl border border-slate-200/70">
          <div className="flex flex-wrap items-center gap-3">
            {/* Filter Tanggal (Mode Harian) */}
            {viewMode === 'harian' && (
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-600 flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5 text-slate-400" />
                  Tanggal:
                </span>
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="px-2.5 py-1 text-xs font-mono font-bold bg-white border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:ring-1 focus:ring-brand-500"
                />
                <button
                  type="button"
                  onClick={() => setSelectedDate(new Date().toISOString().slice(0, 10))}
                  className="px-2 py-1 text-[11px] font-bold text-brand-700 hover:bg-brand-50 rounded-md transition"
                >
                  Hari Ini
                </button>
              </div>
            )}

            {/* Filter Ukuran */}
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-600 flex items-center gap-1">
                <Filter className="w-3.5 h-3.5 text-slate-400" />
                Ukuran:
              </span>
              <select
                value={selectedUkuranFilter}
                onChange={(e) => setSelectedUkuranFilter(e.target.value)}
                className="px-2.5 py-1 text-xs font-bold bg-white border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:ring-1 focus:ring-brand-500"
              >
                <option value="all">Semua Ukuran Kasur</option>
                {ukurans.map((u) => (
                  <option key={u.id} value={u.kode}>
                    {u.nama} ({u.kode})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Info Logika Akuntansi Saldo */}
          <div className="text-[11px] text-slate-500 flex items-center gap-1.5 bg-white px-2.5 py-1 rounded-lg border border-slate-200">
            <Info className="w-3.5 h-3.5 text-brand-600 shrink-0" />
            <span>
              <strong>Logika:</strong> Saldo Kemarin + Debit (PO Masuk) - Kredit (Keluar) = Sisa Saldo
            </span>
          </div>
        </div>

        {/* Tabel Mutasi Stok */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-xs font-bold text-slate-500 uppercase tracking-wider bg-slate-50/50">
                <th className="py-3 px-4">Tanggal</th>
                <th className="py-3 px-4">Nama Ukuran Kasur</th>
                <th className="py-3 px-4 text-center">Saldo</th>
                <th className="py-3 px-4 text-center">Debit</th>
                <th className="py-3 px-4 text-center">Kredit</th>
                <th className="py-3 px-4 text-center">Sisa Saldo</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rowsToDisplay.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-400 text-xs italic">
                    Belum ada data mutasi kasur.
                  </td>
                </tr>
              ) : (
                rowsToDisplay.map((r, idx) => (
                  <tr key={`${r.kode_ukuran}-${r.tanggal}-${idx}`} className="hover:bg-slate-50/80 transition">
                    <td className="py-3.5 px-4 font-mono font-bold text-slate-700 text-xs">
                      {new Date(r.tanggal).toLocaleDateString('id-ID')}
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="font-bold text-slate-900">{r.nama_ukuran}</div>
                      <span className="font-mono text-[11px] text-brand-600 font-semibold">Ukuran {r.kode_ukuran}</span>
                    </td>
                    <td className="py-3.5 px-4 text-center font-mono font-bold text-slate-700">
                      <span className="inline-block px-2.5 py-0.5 rounded-full text-xs bg-slate-100 text-slate-800">
                        {r.saldo} pcs
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-center font-mono font-bold">
                      <span className={`inline-block px-2.5 py-0.5 rounded-full text-xs ${
                        r.debit > 0 ? 'bg-emerald-100 text-emerald-800' : 'text-slate-400'
                      }`}>
                        {r.debit > 0 ? `+${r.debit} pcs` : '0 pcs'}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-center font-mono font-bold">
                      <span className={`inline-block px-2.5 py-0.5 rounded-full text-xs ${
                        r.kredit > 0 ? 'bg-amber-100 text-amber-800' : 'text-slate-400'
                      }`}>
                        {r.kredit > 0 ? `-${r.kredit} pcs` : '0 pcs'}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-center font-mono font-bold">
                      <span className={`inline-block px-3 py-1 rounded-full text-xs font-extrabold ${
                        r.sisa_saldo > 0 ? 'bg-brand-100 text-brand-900 border border-brand-200' : 'bg-slate-100 text-slate-500'
                      }`}>
                        {r.sisa_saldo} pcs
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
            {/* Total Footer */}
            {rowsToDisplay.length > 0 && (
              <tfoot className="border-t-2 border-slate-200 bg-slate-50/75 font-bold text-xs text-slate-700">
                <tr>
                  <td colSpan={2} className="py-3 px-4 uppercase tracking-wider text-slate-600">
                    Total
                  </td>
                  <td className="py-3 px-4 text-center font-mono text-slate-800">
                    {rowsToDisplay.reduce((s, r) => s + r.saldo, 0)} pcs
                  </td>
                  <td className="py-3 px-4 text-center font-mono text-emerald-700">
                    +{rowsToDisplay.reduce((s, r) => s + r.debit, 0)} pcs
                  </td>
                  <td className="py-3 px-4 text-center font-mono text-amber-700">
                    -{rowsToDisplay.reduce((s, r) => s + r.kredit, 0)} pcs
                  </td>
                  <td className="py-3 px-4 text-center font-mono text-brand-800 text-sm">
                    {rowsToDisplay.reduce((s, r) => s + r.sisa_saldo, 0)} pcs
                  </td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>

      {/* Daftar Kelompok Barcode Aktif */}
      <div className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-xs">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-bold text-slate-800">Kelompok Barcode di Gudang</h2>
            <p className="text-xs text-slate-500">
              Format barcode: <code className="font-mono text-brand-600">{'{UKURAN}-{DDMMYY Tanggal PO}'}</code>
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {stokKelompok.map((k, idx) => (
            <div
              key={idx}
              className="p-4 rounded-2xl border border-slate-200 bg-slate-50/50 hover:bg-slate-50 transition flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between">
                  <span className="font-mono font-bold text-sm text-brand-700 bg-white px-2 py-0.5 rounded-md border border-slate-200">
                    {k.barcode}
                  </span>
                  <span className={`px-2 py-0.5 rounded text-[11px] font-bold font-mono ${
                    k.sisa_di_gudang > 0 ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-600'
                  }`}>
                    {k.sisa_di_gudang} pcs tersisa
                  </span>
                </div>
                <h4 className="font-semibold text-sm text-slate-800 mt-2">{k.nama_ukuran}</h4>
                <p className="text-xs text-slate-500 mt-0.5">Tgl Masuk: {k.tanggal_masuk}</p>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-200/60 flex items-center justify-between text-xs text-slate-500">
                <span>Total Masuk: {k.jumlah_masuk} pcs</span>
                <button
                  onClick={() => {
                    setLabelModalData([
                      {
                        barcode: k.barcode,
                        nama_ukuran: k.nama_ukuran,
                        dimensi_str: `${k.panjang_cm || 200} x ${k.lebar_cm || 200} cm`,
                        tanggal_masuk: k.tanggal_masuk,
                        qty: Math.max(1, k.sisa_di_gudang || 1),
                      },
                    ]);
                  }}
                  className="flex items-center gap-1 text-brand-600 hover:text-brand-800 font-semibold"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Cetak Label</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

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
