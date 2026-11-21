import React, { useState, useEffect } from 'react';
import {
  FileSpreadsheet,
  Download,
  Filter,
  Calendar,
  Layers,
  Truck,
  Package,
  RotateCcw,
} from 'lucide-react';
import { api } from '../services/api';
import { StokKelompok, Pengeluaran, Penerimaan, Ukuran, Pihak, Pengembalian } from '../types';
import { exportToExcel } from '../utils/excelExport';

export const LaporanView: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'stok' | 'keluar' | 'terima' | 'retur'>('stok');

  const [stokData, setStokData] = useState<StokKelompok[]>([]);
  const [pengeluaranData, setPengeluaranData] = useState<Pengeluaran[]>([]);
  const [penerimaanData, setPenerimaanData] = useState<Penerimaan[]>([]);
  const [returData, setReturData] = useState<Pengembalian[]>([]);
  const [ukurans, setUkurans] = useState<Ukuran[]>([]);
  const [pihaks, setPihaks] = useState<Pihak[]>([]);

  // Filters
  const [filterUkuran, setFilterUkuran] = useState('all');
  const [filterPembeli, setFilterPembeli] = useState('all');
  const [filterPengirim, setFilterPengirim] = useState('all');
  const [filterStartDate, setFilterStartDate] = useState('');
  const [filterEndDate, setFilterEndDate] = useState('');

  const loadData = async () => {
    try {
      const [stok, peng, rcv, retur, uList, phList] = await Promise.all([
        api.getStokKelompok(),
        api.getPengeluaranList(),
        api.getPenerimaanList(),
        api.getPengembalianList(),
        api.getUkuranList(),
        api.getPihak(),
      ]);
      setStokData(stok);
      setPengeluaranData(peng);
      setPenerimaanData(rcv);
      setReturData(retur);
      setUkurans(uList);
      setPihaks(phList);
    } catch (err) {
      console.error('Error loading laporan data:', err);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // 1. Ekspor Excel: Stok Saat Ini
  const handleExportStok = () => {
    const header = [
      'Kode Barcode',
      'Kode Ukuran',
      'Nama Ukuran Kasur',
      'Dimensi (P x L x T)',
      'Tanggal Masuk',
      'Jumlah Diterima (Pcs)',
      'Sisa di Gudang (Pcs)',
      'Jumlah Keluar (Pcs)',
    ];

    const rows = stokData.map(k => [
      k.barcode,
      k.kode_ukuran,
      k.nama_ukuran,
      `${k.panjang_cm || 200} x ${k.lebar_cm || 200} ${k.tebal_cm ? 'x ' + k.tebal_cm : ''} cm`,
      k.tanggal_masuk,
      k.jumlah_masuk,
      k.sisa_di_gudang,
      k.jumlah_keluar,
    ]);

    exportToExcel({
      filename: `Laporan_Stok_KasurBusa_${new Date().toISOString().slice(0, 10)}.xlsx`,
      sheetName: 'Stok Kasur Busa',
      headers: header,
      data: rows,
      columnWidths: [18, 14, 26, 22, 16, 22, 22, 20],
    });
  };

  // 2. Ekspor Excel: Barang Keluar per Periode
  const filteredPengeluaran = pengeluaranData.filter(peng => {
    if (filterPembeli !== 'all' && peng.pembeli_id !== filterPembeli && peng.pembeli_nama !== filterPembeli) {
      return false;
    }
    if (filterPengirim !== 'all' && peng.pengirim_id !== filterPengirim) {
      return false;
    }
    if (filterStartDate) {
      const d = peng.tanggal.slice(0, 10);
      if (d < filterStartDate) return false;
    }
    if (filterEndDate) {
      const d = peng.tanggal.slice(0, 10);
      if (d > filterEndDate) return false;
    }
    return true;
  });

  const handleExportKeluar = () => {
    const header = [
      'No. Surat Jalan',
      'Tanggal & Waktu',
      'Penerima / Pembeli',
      'Supir / Pengirim',
      'Koordinator',
      'Kode Barcode Scan',
      'Ukuran Kasur',
      'Status Surat Jalan',
      'Alasan Batal',
      'Dibuat Oleh',
    ];

    const rows: (string | number)[][] = [];
    filteredPengeluaran.forEach(peng => {
      const d = new Date(peng.tanggal);
      const tglFormatted = !isNaN(d.getTime())
        ? `${d.toLocaleDateString('id-ID')} ${d.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}`
        : peng.tanggal;

      (peng.items || []).forEach(it => {
        rows.push([
          peng.no_surat_jalan,
          tglFormatted,
          it.pembeli_nama || peng.pembeli_nama || '-',
          peng.pengirim?.nama || '-',
          peng.koordinator_nama || peng.koordinator?.nama || '-',
          it.barcode_scan,
          it.barang?.ukuran?.nama || `Kasur Ukuran ${it.barcode_scan.split('-')[0]}`,
          peng.status === 'batal' ? 'BATAL' : 'AKTIF',
          peng.alasan_batal || '-',
          peng.dibuat_oleh,
        ]);
      });
    });

    exportToExcel({
      filename: `Laporan_Barang_Keluar_${new Date().toISOString().slice(0, 10)}.xlsx`,
      sheetName: 'Barang Keluar',
      headers: header,
      data: rows,
      columnWidths: [20, 20, 24, 20, 22, 18, 26, 18, 25, 20],
    });
  };

  // 3. Ekspor Excel: Penerimaan Barang
  const handleExportPenerimaan = () => {
    const header = [
      'ID Penerimaan',
      'Nomor PO / Batch',
      'Pabrik Pemasok',
      'Tanggal Diterima',
      'Petugas Penerima',
      'Total Pcs',
      'Daftar Barcode',
      'Catatan',
    ];

    const rows = penerimaanData.map(rcv => [
      rcv.id,
      rcv.po?.no_po || 'Penerimaan Langsung',
      rcv.po?.pabrik?.nama || rcv.pabrik_nama || 'UMKM Comet',
      rcv.tanggal_terima,
      rcv.penerima,
      rcv.total_pcs || 0,
      rcv.barcodes?.map(b => `${b.barcode} (${b.qty} pcs)`).join(', ') || '-',
      rcv.catatan || '-',
    ]);

    exportToExcel({
      filename: `Laporan_Penerimaan_Barang_${new Date().toISOString().slice(0, 10)}.xlsx`,
      sheetName: 'Penerimaan Pabrik',
      headers: header,
      data: rows,
      columnWidths: [18, 22, 22, 18, 20, 14, 35, 25],
    });
  };

  // 4. Ekspor Excel: Pengembalian Barang (Retur Batal Beli)
  const handleExportRetur = () => {
    const header = [
      'No. Bukti Retur',
      'Tanggal & Jam',
      'Customer / Pembeli',
      'Ref No. Surat Jalan',
      'Alasan Retur',
      'Petugas Gudang',
      'Total Kasur Pulih (Pcs)',
      'Rincian Barcode Kasur',
    ];

    const rows = returData.map(r => {
      const d = new Date(r.tanggal);
      const tglFormatted = !isNaN(d.getTime())
        ? `${d.toLocaleDateString('id-ID')} ${d.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}`
        : r.tanggal;

      return [
        r.no_retur,
        tglFormatted,
        r.pembeli_nama,
        r.no_surat_jalan || 'Langsung (Batal Beli)',
        r.alasan,
        r.petugas,
        r.total_pcs,
        (r.items || []).map(it => `${it.barcode} (${it.qty} pcs)`).join(', '),
      ];
    });

    exportToExcel({
      filename: `Laporan_Pengembalian_Retur_${new Date().toISOString().slice(0, 10)}.xlsx`,
      sheetName: 'Pengembalian Retur',
      headers: header,
      data: rows,
      columnWidths: [20, 20, 24, 22, 28, 20, 24, 32],
    });
  };

  return (
    <div className="space-y-6">
      {/* Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Laporan & Ekspor Data</h1>
          <p className="text-xs text-slate-500 mt-1">
            Unduh laporan stok real-time, mutasi barang keluar, penerimaan pabrik, dan pengembalian (retur) dalam format Excel (.xlsx) yang rapi.
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="flex p-1 bg-slate-200/80 rounded-2xl w-fit flex-wrap gap-1">
          <button
            onClick={() => setActiveTab('stok')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
              activeTab === 'stok' ? 'bg-white text-brand-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Stok Saat Ini
          </button>
          <button
            onClick={() => setActiveTab('keluar')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
              activeTab === 'keluar' ? 'bg-white text-brand-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Barang Keluar
          </button>
          <button
            onClick={() => setActiveTab('terima')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
              activeTab === 'terima' ? 'bg-white text-brand-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Barang Datang
          </button>
          <button
            onClick={() => setActiveTab('retur')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
              activeTab === 'retur' ? 'bg-white text-amber-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Retur Batal Beli
          </button>
        </div>
      </div>

      {/* TAB 1: STOK SAAT INI */}
      {activeTab === 'stok' && (
        <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs p-6 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
            <div>
              <h2 className="text-base font-bold text-slate-800">Laporan Stok per Kelompok Barcode</h2>
              <p className="text-xs text-slate-500">Kombinasi ukuran kasur dan tanggal barang masuk gudang</p>
            </div>
            <button
              onClick={handleExportStok}
              className="flex items-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl transition shadow-xs active:scale-95"
            >
              <FileSpreadsheet className="w-4 h-4" />
              <span>Ekspor Excel (.xlsx)</span>
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-slate-500 text-xs font-bold uppercase">
                <tr>
                  <th className="py-2.5 px-3">Barcode</th>
                  <th className="py-2.5 px-3">Ukuran Kasur</th>
                  <th className="py-2.5 px-3">Tgl Masuk</th>
                  <th className="py-2.5 px-3 text-center">Masuk</th>
                  <th className="py-2.5 px-3 text-center">Keluar</th>
                  <th className="py-2.5 px-3 text-center">Sisa di Gudang</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {stokData.map((k) => (
                  <tr key={k.barcode} className="hover:bg-slate-50">
                    <td className="py-3 px-3 font-mono font-bold text-brand-700">{k.barcode}</td>
                    <td className="py-3 px-3 font-medium text-slate-800">{k.nama_ukuran}</td>
                    <td className="py-3 px-3 text-slate-500">{k.tanggal_masuk}</td>
                    <td className="py-3 px-3 text-center font-mono text-slate-600">{k.jumlah_masuk} pcs</td>
                    <td className="py-3 px-3 text-center font-mono text-slate-600">{k.jumlah_keluar} pcs</td>
                    <td className="py-3 px-3 text-center font-mono font-bold text-emerald-700 bg-emerald-50/50">
                      {k.sisa_di_gudang} pcs
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 2: BARANG KELUAR */}
      {activeTab === 'keluar' && (
        <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs p-6 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
            <div>
              <h2 className="text-base font-bold text-slate-800">Laporan Pengeluaran Barang</h2>
              <p className="text-xs text-slate-500">Mutasi pengeluaran kasur berdasarkan surat jalan</p>
            </div>
            <button
              onClick={handleExportKeluar}
              className="flex items-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl transition shadow-xs active:scale-95"
            >
              <FileSpreadsheet className="w-4 h-4" />
              <span>Ekspor Excel (.xlsx)</span>
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-slate-500 text-xs font-bold uppercase">
                <tr>
                  <th className="py-2.5 px-3">No. Surat Jalan</th>
                  <th className="py-2.5 px-3">Tanggal</th>
                  <th className="py-2.5 px-3">Pembeli</th>
                  <th className="py-2.5 px-3">Pengirim</th>
                  <th className="py-2.5 px-3 text-center">Total Pcs</th>
                  <th className="py-2.5 px-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {filteredPengeluaran.map((peng) => (
                  <tr key={peng.id} className="hover:bg-slate-50">
                    <td className="py-3 px-3 font-mono font-bold text-brand-700">{peng.no_surat_jalan}</td>
                    <td className="py-3 px-3 text-slate-500">
                      {new Date(peng.tanggal).toLocaleDateString('id-ID')}
                    </td>
                    <td className="py-3 px-3 font-medium text-slate-800">{peng.pembeli_nama}</td>
                    <td className="py-3 px-3 text-slate-600">{peng.pengirim?.nama || '-'}</td>
                    <td className="py-3 px-3 text-center font-mono font-bold text-brand-700">
                      {(peng.items || []).filter(it => !it.is_batal).length} pcs
                    </td>
                    <td className="py-3 px-3">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        peng.status === 'batal' ? 'bg-red-100 text-red-700' : 'bg-emerald-100 text-emerald-700'
                      }`}>
                        {peng.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: PENERIMAAN BARANG */}
      {activeTab === 'terima' && (
        <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs p-6 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
            <div>
              <h2 className="text-base font-bold text-slate-800">Laporan Penerimaan Barang Pabrik</h2>
              <p className="text-xs text-slate-500">Rekap kasur masuk dari pabrik pemasok (UMKM Comet)</p>
            </div>
            <button
              onClick={handleExportPenerimaan}
              className="flex items-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl transition shadow-xs active:scale-95"
            >
              <FileSpreadsheet className="w-4 h-4" />
              <span>Ekspor Excel (.xlsx)</span>
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-slate-500 text-xs font-bold uppercase">
                <tr>
                  <th className="py-2.5 px-3">Nomor Ref / PO</th>
                  <th className="py-2.5 px-3">Pabrik Pemasok</th>
                  <th className="py-2.5 px-3">Tgl Diterima</th>
                  <th className="py-2.5 px-3">Petugas</th>
                  <th className="py-2.5 px-3 text-center">Total Diterima</th>
                  <th className="py-2.5 px-3">Catatan</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {penerimaanData.map((rcv) => (
                  <tr key={rcv.id} className="hover:bg-slate-50">
                    <td className="py-3 px-3 font-mono font-bold text-brand-700">{rcv.po?.no_po || 'Barang Datang'}</td>
                    <td className="py-3 px-3 font-medium text-slate-800">{rcv.po?.pabrik?.nama || rcv.pabrik_nama || 'UMKM Comet'}</td>
                    <td className="py-3 px-3 text-slate-500">{rcv.tanggal_terima}</td>
                    <td className="py-3 px-3 text-slate-600">{rcv.penerima}</td>
                    <td className="py-3 px-3 text-center font-mono font-bold text-emerald-700">
                      {rcv.total_pcs || 0} pcs
                    </td>
                    <td className="py-3 px-3 text-slate-500">{rcv.catatan || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 4: RETUR BATAL BELI */}
      {activeTab === 'retur' && (
        <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs p-6 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
            <div>
              <h2 className="text-base font-bold text-slate-800">Laporan Pengembalian Barang (Retur)</h2>
              <p className="text-xs text-slate-500">
                Rekap kasur batal beli customer yang telah dipulihkan kembali ke stok gudang
              </p>
            </div>
            <button
              onClick={handleExportRetur}
              className="flex items-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl transition shadow-xs active:scale-95"
            >
              <FileSpreadsheet className="w-4 h-4" />
              <span>Ekspor Excel (.xlsx)</span>
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-slate-500 text-xs font-bold uppercase">
                <tr>
                  <th className="py-2.5 px-3">No. Bukti Retur</th>
                  <th className="py-2.5 px-3">Tanggal & Jam</th>
                  <th className="py-2.5 px-3">Customer / Pembeli</th>
                  <th className="py-2.5 px-3">Ref No. SJ</th>
                  <th className="py-2.5 px-3">Alasan Retur</th>
                  <th className="py-2.5 px-3">Petugas</th>
                  <th className="py-2.5 px-3 text-center">Kasur Pulih</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {returData.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-slate-400">
                      Belum ada data pengembalian kasur
                    </td>
                  </tr>
                ) : (
                  returData.map((r) => (
                    <tr key={r.id} className="hover:bg-slate-50">
                      <td className="py-3 px-3 font-mono font-bold text-amber-800">{r.no_retur}</td>
                      <td className="py-3 px-3 text-slate-500">
                        {new Date(r.tanggal).toLocaleDateString('id-ID', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric',
                        })}
                      </td>
                      <td className="py-3 px-3 font-semibold text-slate-800">{r.pembeli_nama}</td>
                      <td className="py-3 px-3 font-mono text-slate-500">{r.no_surat_jalan || '-'}</td>
                      <td className="py-3 px-3 text-slate-600">"{r.alasan}"</td>
                      <td className="py-3 px-3 text-slate-600">{r.petugas}</td>
                      <td className="py-3 px-3 text-center font-mono font-bold text-emerald-700 bg-emerald-50/50">
                        {r.total_pcs} pcs
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
export default LaporanView;
