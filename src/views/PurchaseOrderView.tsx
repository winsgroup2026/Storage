import React, { useState, useEffect } from 'react';
import {
  Plus,
  Search,
  Filter,
  FileText,
  Calendar,
  Building,
  CheckCircle2,
  Clock,
  PackageCheck,
  AlertCircle,
  Eye,
  ArrowRight,
  X,
  Trash2,
} from 'lucide-react';
import { api } from '../services/api';
import { PurchaseOrder, Pabrik, Ukuran, UserRole } from '../types';

interface PurchaseOrderViewProps {
  currentRole: UserRole;
  onNavigateToTerima: (poId: string) => void;
}

export const PurchaseOrderView: React.FC<PurchaseOrderViewProps> = ({ currentRole, onNavigateToTerima }) => {
  const [pos, setPos] = useState<PurchaseOrder[]>([]);
  const [pabriks, setPabriks] = useState<Pabrik[]>([]);
  const [ukurans, setUkurans] = useState<Ukuran[]>([]);
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [selectedPabrik, setSelectedPabrik] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);

  // Modal State
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [selectedPoDetail, setSelectedPoDetail] = useState<PurchaseOrder | null>(null);

  // Form State
  const [formPabrikId, setFormPabrikId] = useState('');
  const [formTanggalPesan, setFormTanggalPesan] = useState(() => new Date().toISOString().slice(0, 10));
  const [formCatatan, setFormCatatan] = useState('');
  const [formItems, setFormItems] = useState<{ ukuran_id: string; qty_pesan: number }[]>([
    { ukuran_id: '', qty_pesan: 20 },
  ]);
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const loadData = async () => {
    try {
      setLoading(true);
      const [posData, pabrikData, ukuranData] = await Promise.all([
        api.getPurchaseOrders(),
        api.getPabrik(),
        api.getUkuran(),
      ]);
      setPos(posData);
      setPabriks(pabrikData);
      setUkurans(ukuranData);
      if (pabrikData.length > 0 && !formPabrikId) {
        setFormPabrikId(pabrikData[0].id);
      }
      if (ukuranData.length > 0 && !formItems[0].ukuran_id) {
        setFormItems([{ ukuran_id: ukuranData[0].id, qty_pesan: 20 }]);
      }
    } catch (err) {
      console.error('Error loading POs:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const filteredPOs = pos.filter(po => {
    const matchStatus = selectedStatus === 'all' || po.status === selectedStatus;
    const matchPabrik = selectedPabrik === 'all' || po.pabrik_id === selectedPabrik;
    const matchQuery =
      po.no_po.toLowerCase().includes(searchQuery.toLowerCase()) ||
      po.pabrik?.nama.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (po.catatan && po.catatan.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchStatus && matchPabrik && matchQuery;
  });

  const handleAddItemRow = () => {
    const defaultUkuranId = ukurans[0]?.id || '';
    setFormItems([...formItems, { ukuran_id: defaultUkuranId, qty_pesan: 10 }]);
  };

  const handleRemoveItemRow = (index: number) => {
    if (formItems.length <= 1) return;
    setFormItems(formItems.filter((_, i) => i !== index));
  };

  const handleItemChange = (index: number, field: 'ukuran_id' | 'qty_pesan', val: any) => {
    const updated = [...formItems];
    updated[index] = { ...updated[index], [field]: val };
    setFormItems(updated);
  };

  const handleCreatePO = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!formPabrikId) {
      setFormError('Silakan pilih pabrik pemasok');
      return;
    }

    const validItems = formItems.filter(it => it.ukuran_id && it.qty_pesan > 0);
    if (validItems.length === 0) {
      setFormError('Tambahkan minimal 1 ukuran dengan jumlah pcs > 0');
      return;
    }

    try {
      setIsSubmitting(true);
      await api.createPurchaseOrder(
        {
          pabrik_id: formPabrikId,
          tanggal_pesan: formTanggalPesan,
          catatan: formCatatan,
          dibuat_oleh: `Admin (${currentRole})`,
        },
        validItems
      );
      setIsCreateOpen(false);
      setFormCatatan('');
      await loadData();
    } catch (err: any) {
      setFormError(err.message || 'Gagal menyimpan Purchase Order');
    } finally {
      setIsSubmitting(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'dipesan':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-800">
            <Clock className="w-3 h-3" /> Dipesan
          </span>
        );
      case 'sebagian_datang':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-800">
            <PackageCheck className="w-3 h-3" /> Sebagian Datang
          </span>
        );
      case 'selesai':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800">
            <CheckCircle2 className="w-3 h-3" /> Selesai
          </span>
        );
      case 'batal':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-red-100 text-red-800">
            <AlertCircle className="w-3 h-3" /> Batal
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-800">
            {status}
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Purchase Order (PO Pabrik)</h1>
          <p className="text-xs text-slate-500 mt-1">
            Mencatat pemesanan kasur ke pabrik dan melacak status pemenuhan barang yang belum tiba.
          </p>
        </div>
        {currentRole === 'admin' && (
          <button
            onClick={() => setIsCreateOpen(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-brand-600 hover:bg-brand-700 text-white font-semibold text-sm rounded-xl transition shadow-sm shadow-brand-500/20 active:scale-95"
          >
            <Plus className="w-4 h-4" />
            <span>Buat PO Baru</span>
          </button>
        )}
      </div>

      {/* Filter & Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm flex flex-col md:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Cari nomor PO, pabrik, atau catatan..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-500 bg-slate-50/50"
          />
        </div>

        <div className="flex flex-wrap sm:flex-nowrap gap-2">
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="px-3 py-2 text-sm rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-brand-500 text-slate-700 font-medium"
          >
            <option value="all">Semua Status</option>
            <option value="dipesan">Dipesan</option>
            <option value="sebagian_datang">Sebagian Datang</option>
            <option value="selesai">Selesai</option>
            <option value="batal">Batal</option>
          </select>

          <select
            value={selectedPabrik}
            onChange={(e) => setSelectedPabrik(e.target.value)}
            className="px-3 py-2 text-sm rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-brand-500 text-slate-700 font-medium"
          >
            <option value="all">Semua Pabrik</option>
            {pabriks.map(p => (
              <option key={p.id} value={p.id}>{p.nama}</option>
            ))}
          </select>
        </div>
      </div>

      {/* PO Table Card */}
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/75 text-xs font-bold text-slate-500 uppercase tracking-wider">
                <th className="py-3.5 px-4">No. PO</th>
                <th className="py-3.5 px-4">Pabrik Pemasok</th>
                <th className="py-3.5 px-4">Tanggal Pesan</th>
                <th className="py-3.5 px-4">Status</th>
                <th className="py-3.5 px-4 text-center">Total Pesan</th>
                <th className="py-3.5 px-4 text-center">Telah Diterima</th>
                <th className="py-3.5 px-4 text-center">Sisa Belum Tiba</th>
                <th className="py-3.5 px-4 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredPOs.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-400 text-xs italic">
                    Tidak ada Purchase Order yang cocok dengan filter.
                  </td>
                </tr>
              ) : (
                filteredPOs.map((po) => {
                  const totalPesan = (po.items || []).reduce((sum, it) => sum + it.qty_pesan, 0);
                  const totalDiterima = (po.items || []).reduce((sum, it) => sum + it.qty_diterima, 0);
                  const sisa = Math.max(0, totalPesan - totalDiterima);

                  return (
                    <tr key={po.id} className="hover:bg-slate-50/80 transition">
                      <td className="py-3.5 px-4 font-mono font-bold text-brand-700">{po.no_po}</td>
                      <td className="py-3.5 px-4 font-medium text-slate-800">{po.pabrik?.nama || '-'}</td>
                      <td className="py-3.5 px-4 text-slate-500 text-xs">
                        {new Date(po.tanggal_pesan).toLocaleDateString('id-ID')}
                      </td>
                      <td className="py-3.5 px-4">{getStatusBadge(po.status)}</td>
                      <td className="py-3.5 px-4 text-center font-mono font-semibold text-slate-800">
                        {totalPesan} pcs
                      </td>
                      <td className="py-3.5 px-4 text-center font-mono font-semibold text-emerald-600">
                        {totalDiterima} pcs
                      </td>
                      <td className="py-3.5 px-4 text-center font-mono font-bold">
                        <span className={sisa > 0 ? 'text-amber-600' : 'text-slate-400'}>
                          {sisa} pcs
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => setSelectedPoDetail(po)}
                            className="p-1.5 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition"
                            title="Lihat Detail Item"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          {(po.status === 'dipesan' || po.status === 'sebagian_datang') && (
                            <button
                              onClick={() => onNavigateToTerima(po.id)}
                              className="flex items-center gap-1 px-3 py-1 bg-brand-50 hover:bg-brand-100 text-brand-700 font-semibold text-xs rounded-lg transition"
                            >
                              <span>Terima Barang</span>
                              <ArrowRight className="w-3 h-3" />
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

      {/* Modal Buat PO Baru */}
      {isCreateOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white w-full max-w-2xl rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/50">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-brand-50 rounded-xl text-brand-600">
                  <FileText className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-slate-800">Buat Purchase Order Baru</h2>
                  <p className="text-xs text-slate-500">Pesan kasur ke pabrik supplier</p>
                </div>
              </div>
              <button
                onClick={() => setIsCreateOpen(false)}
                className="p-2 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreatePO} className="p-6 overflow-y-auto space-y-4">
              {formError && (
                <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">
                    Pabrik Pemasok *
                  </label>
                  <select
                    value={formPabrikId}
                    onChange={(e) => setFormPabrikId(e.target.value)}
                    required
                    className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-500 bg-white"
                  >
                    {pabriks.map(p => (
                      <option key={p.id} value={p.id}>{p.nama}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">
                    Tanggal Pesan *
                  </label>
                  <input
                    type="date"
                    value={formTanggalPesan}
                    onChange={(e) => setFormTanggalPesan(e.target.value)}
                    required
                    className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-500 bg-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">
                  Catatan Pemesanan (Opsional)
                </label>
                <input
                  type="text"
                  placeholder="Contoh: Pengiriman via truk pabrik batch 1"
                  value={formCatatan}
                  onChange={(e) => setFormCatatan(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-500 bg-white"
                />
              </div>

              {/* Item Pemesanan Baris */}
              <div className="pt-2 border-t border-slate-100">
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                    Daftar Item Ukuran & Qty
                  </label>
                  <button
                    type="button"
                    onClick={handleAddItemRow}
                    className="text-xs text-brand-600 font-bold hover:underline flex items-center gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" /> Tambah Baris
                  </button>
                </div>

                <div className="space-y-2">
                  {formItems.map((item, index) => (
                    <div key={index} className="flex items-center gap-2 p-2 rounded-xl bg-slate-50 border border-slate-200">
                      <div className="flex-1">
                        <select
                          value={item.ukuran_id}
                          onChange={(e) => handleItemChange(index, 'ukuran_id', e.target.value)}
                          className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 bg-white"
                        >
                          {ukurans.map(u => (
                            <option key={u.id} value={u.id}>
                              [{u.kode}] {u.nama} ({u.panjang_cm}×{u.lebar_cm} cm)
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="w-24 flex items-center gap-1">
                        <input
                          type="number"
                          min="1"
                          max="1000"
                          value={item.qty_pesan}
                          onChange={(e) => handleItemChange(index, 'qty_pesan', parseInt(e.target.value) || 1)}
                          className="w-full px-2 py-1.5 text-center text-xs font-bold rounded-lg border border-slate-200 bg-white"
                        />
                        <span className="text-[11px] text-slate-500">pcs</span>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleRemoveItemRow(index)}
                        disabled={formItems.length === 1}
                        className="p-1.5 text-slate-400 hover:text-red-500 disabled:opacity-30"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsCreateOpen(false)}
                  className="px-4 py-2 text-sm text-slate-600 font-medium hover:bg-slate-100 rounded-xl"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 text-sm font-semibold text-white bg-brand-600 hover:bg-brand-700 rounded-xl transition shadow-sm"
                >
                  {isSubmitting ? 'Menyimpan...' : 'Simpan Purchase Order'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Detail PO */}
      {selectedPoDetail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white w-full max-w-xl rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/50">
              <div>
                <span className="text-xs font-mono font-bold text-brand-700">{selectedPoDetail.no_po}</span>
                <h3 className="text-base font-bold text-slate-900">Rincian Item Purchase Order</h3>
              </div>
              <button
                onClick={() => setSelectedPoDetail(null)}
                className="p-2 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-4">
              <div className="grid grid-cols-2 gap-3 text-xs bg-slate-50 p-3.5 rounded-2xl border border-slate-200">
                <div>
                  <span className="text-slate-500 block">Pabrik Pemasok:</span>
                  <strong className="text-slate-800">{selectedPoDetail.pabrik?.nama}</strong>
                </div>
                <div>
                  <span className="text-slate-500 block">Tanggal Pesan:</span>
                  <strong className="text-slate-800">{selectedPoDetail.tanggal_pesan}</strong>
                </div>
                <div>
                  <span className="text-slate-500 block">Status:</span>
                  {getStatusBadge(selectedPoDetail.status)}
                </div>
                <div>
                  <span className="text-slate-500 block">Catatan:</span>
                  <span className="text-slate-700">{selectedPoDetail.catatan || '-'}</span>
                </div>
              </div>

              <div>
                <h4 className="text-xs font-bold text-slate-600 uppercase mb-2">Item Barang yang Dipesan</h4>
                <div className="border border-slate-200 rounded-2xl overflow-hidden text-xs">
                  <table className="w-full text-left">
                    <thead className="bg-slate-100 text-slate-600 font-bold uppercase">
                      <tr>
                        <th className="py-2 px-3">Ukuran</th>
                        <th className="py-2 px-3 text-center">Qty Pesan</th>
                        <th className="py-2 px-3 text-center">Diterima</th>
                        <th className="py-2 px-3 text-center">Sisa</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {(selectedPoDetail.items || []).map((it, idx) => {
                        const sisa = Math.max(0, it.qty_pesan - it.qty_diterima);
                        return (
                          <tr key={idx} className="hover:bg-slate-50">
                            <td className="py-2.5 px-3">
                              <strong>[{it.ukuran?.kode}]</strong> {it.ukuran?.nama}
                            </td>
                            <td className="py-2.5 px-3 text-center font-mono font-bold text-slate-800">
                              {it.qty_pesan} pcs
                            </td>
                            <td className="py-2.5 px-3 text-center font-mono font-bold text-emerald-600">
                              {it.qty_diterima} pcs
                            </td>
                            <td className="py-2.5 px-3 text-center font-mono font-bold">
                              <span className={sisa > 0 ? 'text-amber-600' : 'text-slate-400'}>
                                {sisa} pcs
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-slate-100 bg-slate-50/50">
              <button
                type="button"
                onClick={() => setSelectedPoDetail(null)}
                className="px-4 py-2 text-sm text-slate-600 font-semibold hover:bg-slate-200/50 rounded-xl"
              >
                Tutup
              </button>
              {(selectedPoDetail.status === 'dipesan' || selectedPoDetail.status === 'sebagian_datang') && (
                <button
                  type="button"
                  onClick={() => {
                    const id = selectedPoDetail.id;
                    setSelectedPoDetail(null);
                    onNavigateToTerima(id);
                  }}
                  className="flex items-center gap-1.5 px-4 py-2 text-sm font-semibold text-white bg-brand-600 hover:bg-brand-700 rounded-xl transition shadow-sm"
                >
                  <span>Terima Barang Sekarang</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

