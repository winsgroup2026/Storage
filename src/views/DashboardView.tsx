import React, { useState, useEffect } from 'react';
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
} from 'lucide-react';
import { api } from '../services/api';
import { StokKelompok, Ukuran, Pengembalian } from '../types';
import { CetakLabelModal } from '../components/CetakLabelModal';
import { LabelData } from '../utils/labelGenerator';

interface DashboardViewProps {
  onNavigate: (view: string, extra?: any) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({ onNavigate }) => {
  const [stokKelompok, setStokKelompok] = useState<StokKelompok[]>([]);
  const [ukurans, setUkurans] = useState<Ukuran[]>([]);
  const [returs, setReturs] = useState<Pengembalian[]>([]);
  const [searchBarcode, setSearchBarcode] = useState('');
  const [barcodeDetail, setBarcodeDetail] = useState<any | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [labelModalData, setLabelModalData] = useState<LabelData[] | null>(null);
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    try {
      setLoading(true);
      const [stokData, ukuranData, returData] = await Promise.all([
        api.getStokKelompok(),
        api.getUkuranList(),
        api.getPengembalianList(),
      ]);
      setStokKelompok(stokData);
      setUkurans(ukuranData);
      setReturs(returData);
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
            <span>Catat Barang Datang</span>
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

      {/* Tabel Ringkasan Stok per Ukuran */}
      <div className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
          <div>
            <h2 className="text-lg font-bold text-slate-800">Ringkasan Stok per Ukuran</h2>
            <p className="text-xs text-slate-500">
              Total kasur siap kirim di gudang berdasarkan tipe ukuran (80, 90, 100, 120, 140, 160, 200, dan kustom)
            </p>
          </div>
          <button
            onClick={() => onNavigate('laporan')}
            className="flex items-center gap-1 text-xs font-semibold text-brand-600 hover:text-brand-700 hover:underline"
          >
            <span>Buka Laporan Lengkap</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-xs font-bold text-slate-500 uppercase tracking-wider">
                <th className="py-3 px-4">Kode Ukuran</th>
                <th className="py-3 px-4">Nama Ukuran Kasur</th>
                <th className="py-3 px-4">Dimensi (P×L×T)</th>
                <th className="py-3 px-4 text-center">Di Gudang</th>
                <th className="py-3 px-4 text-center">Keluar</th>
                <th className="py-3 px-4 text-center">Total Diterima</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {ukurans.map((u) => {
                const stokForUkuran = stokKelompok.filter(s => s.ukuran_id === u.id || s.barcode?.startsWith(`${u.kode}-`));
                const sisa = stokForUkuran.reduce((sum, s) => sum + s.sisa_di_gudang, 0);
                const keluar = stokForUkuran.reduce((sum, s) => sum + s.jumlah_keluar, 0);
                const total = stokForUkuran.reduce((sum, s) => sum + s.jumlah_masuk, 0);

                return (
                  <tr key={u.id} className="hover:bg-slate-50/80 transition">
                    <td className="py-3.5 px-4 font-mono font-bold text-brand-700">{u.kode}</td>
                    <td className="py-3.5 px-4 font-medium text-slate-900">{u.nama}</td>
                    <td className="py-3.5 px-4 text-xs text-slate-500">
                      {u.panjang_cm} × {u.lebar_cm} {u.tebal_cm ? `× ${u.tebal_cm}` : ''} cm
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold font-mono ${
                        sisa > 0 ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-500'
                      }`}>
                        {sisa} pcs
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-center font-mono text-slate-600 text-xs">{keluar} pcs</td>
                    <td className="py-3.5 px-4 text-center font-mono text-slate-500 text-xs">{total} pcs</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Daftar Kelompok Barcode Aktif */}
      <div className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-xs">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-bold text-slate-800">Kelompok Barcode di Gudang</h2>
            <p className="text-xs text-slate-500">
              Format barcode: <code className="font-mono text-brand-600">{'{UKURAN}-{DDMMYY}'}</code>
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
