import React, { useState, useEffect } from 'react';
import {
  Ruler,
  Building,
  Users,
  Plus,
  Edit2,
  Trash2,
  Check,
  X,
  AlertCircle,
  Phone,
  MapPin,
} from 'lucide-react';
import { api } from '../services/api';
import { Ukuran, Pabrik, Pihak, UserRole, PihakTipe } from '../types';

interface MasterDataViewProps {
  currentRole: UserRole;
}

export const MasterDataView: React.FC<MasterDataViewProps> = ({ currentRole }) => {
  const [activeTab, setActiveTab] = useState<'ukuran' | 'pabrik' | 'pihak'>('ukuran');
  const [ukurans, setUkurans] = useState<Ukuran[]>([]);
  const [pabriks, setPabriks] = useState<Pabrik[]>([]);
  const [pihaks, setPihaks] = useState<Pihak[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal / Form States
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<any | null>(null);

  // Ukuran Form
  const [uKode, setUKode] = useState('');
  const [uNama, setUNama] = useState('');
  const [uPanjang, setUPanjang] = useState(200);
  const [uLebar, setULebar] = useState(160);
  const [uTebal, setUTebal] = useState<number | undefined>(20);

  // Pabrik Form
  const [pNama, setPNama] = useState('');
  const [pKontak, setPKontak] = useState('');
  const [pAlamat, setPAlamat] = useState('');

  // Pihak Form
  const [phNama, setPhNama] = useState('');
  const [phTelepon, setPhTelepon] = useState('');
  const [phTipe, setPhTipe] = useState<PihakTipe>('pembeli');

  const [formError, setFormError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const loadData = async () => {
    try {
      setLoading(true);
      const [uData, pData, phData] = await Promise.all([
        api.getUkuran(),
        api.getPabrik(),
        api.getPihak(),
      ]);
      setUkurans(uData);
      setPabriks(pData);
      setPihaks(phData);
    } catch (err) {
      console.error('Error loading master data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const openCreateModal = () => {
    setEditingItem(null);
    setFormError(null);
    if (activeTab === 'ukuran') {
      setUKode('');
      setUNama('');
      setUPanjang(200);
      setULebar(160);
      setUTebal(20);
    } else if (activeTab === 'pabrik') {
      setPNama('');
      setPKontak('');
      setPAlamat('');
    } else {
      setPhNama('');
      setPhTelepon('');
      setPhTipe('pembeli');
    }
    setIsModalOpen(true);
  };

  const openEditModal = (item: any) => {
    setEditingItem(item);
    setFormError(null);
    if (activeTab === 'ukuran') {
      setUKode(item.kode);
      setUNama(item.nama);
      setUPanjang(item.panjang_cm);
      setULebar(item.lebar_cm);
      setUTebal(item.tebal_cm);
    } else if (activeTab === 'pabrik') {
      setPNama(item.nama);
      setPKontak(item.kontak);
      setPAlamat(item.alamat);
    } else {
      setPhNama(item.nama);
      setPhTelepon(item.telepon);
      setPhTipe(item.tipe);
    }
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setIsSaving(true);

    try {
      if (activeTab === 'ukuran') {
        if (!uKode.trim() || !uNama.trim()) {
          throw new Error('Kode dan nama ukuran wajib diisi');
        }
        await api.saveUkuran({
          id: editingItem?.id,
          kode: uKode.trim(),
          nama: uNama.trim(),
          panjang_cm: Number(uPanjang),
          lebar_cm: Number(uLebar),
          tebal_cm: uTebal ? Number(uTebal) : undefined,
          aktif: true,
        });
      } else if (activeTab === 'pabrik') {
        if (!pNama.trim()) throw new Error('Nama pabrik wajib diisi');
        await api.savePabrik({
          id: editingItem?.id,
          nama: pNama.trim(),
          kontak: pKontak.trim(),
          alamat: pAlamat.trim(),
          aktif: true,
        });
      } else {
        if (!phNama.trim()) throw new Error('Nama pihak wajib diisi');
        await api.savePihak({
          id: editingItem?.id,
          nama: phNama.trim(),
          telepon: phTelepon.trim(),
          tipe: phTipe,
          aktif: true,
        });
      }

      setIsModalOpen(false);
      await loadData();
    } catch (err: any) {
      setFormError(err.message || 'Gagal menyimpan data');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Title & Tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Master Data Gudang</h1>
          <p className="text-xs text-slate-500 mt-1">
            Kelola master ukuran kasur, pabrik supplier, serta pihak (pengirim, koordinator, dan pembeli).
          </p>
        </div>

        {currentRole !== 'owner' && (
          <button
            onClick={openCreateModal}
            className="flex items-center gap-2 px-4 py-2.5 bg-brand-600 hover:bg-brand-700 text-white font-semibold text-sm rounded-xl transition shadow-sm shadow-brand-500/20 active:scale-95"
          >
            <Plus className="w-4 h-4" />
            <span>Tambah Data</span>
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex p-1 bg-slate-200/80 rounded-2xl w-fit">
        <button
          onClick={() => setActiveTab('ukuran')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition ${
            activeTab === 'ukuran' ? 'bg-white text-brand-700 shadow-sm' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Ruler className="w-4 h-4" />
          <span>Ukuran Kasur ({ukurans.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('pabrik')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition ${
            activeTab === 'pabrik' ? 'bg-white text-brand-700 shadow-sm' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Building className="w-4 h-4" />
          <span>Pabrik Pemasok ({pabriks.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('pihak')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition ${
            activeTab === 'pihak' ? 'bg-white text-brand-700 shadow-sm' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>Pihak Logistik & Pembeli ({pihaks.length})</span>
        </button>
      </div>

      {/* TAB CONTENT: UKURAN */}
      {activeTab === 'ukuran' && (
        <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50/75 border-b border-slate-200 text-xs font-bold text-slate-500 uppercase">
                <tr>
                  <th className="py-3 px-4">Kode Barcode</th>
                  <th className="py-3 px-4">Nama Ukuran Kasur</th>
                  <th className="py-3 px-4">Panjang (cm)</th>
                  <th className="py-3 px-4">Lebar (cm)</th>
                  <th className="py-3 px-4">Tebal (cm)</th>
                  <th className="py-3 px-4">Status</th>
                  {currentRole === 'admin' && <th className="py-3 px-4 text-right">Aksi</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {ukurans.map((u) => (
                  <tr key={u.id} className="hover:bg-slate-50">
                    <td className="py-3.5 px-4 font-mono font-bold text-brand-700">{u.kode}</td>
                    <td className="py-3.5 px-4 font-semibold text-slate-800">{u.nama}</td>
                    <td className="py-3.5 px-4 text-slate-600">{u.panjang_cm} cm</td>
                    <td className="py-3.5 px-4 text-slate-600">{u.lebar_cm} cm</td>
                    <td className="py-3.5 px-4 text-slate-600">{u.tebal_cm ? `${u.tebal_cm} cm` : '-'}</td>
                    <td className="py-3.5 px-4">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-700">
                        Aktif
                      </span>
                    </td>
                    {currentRole === 'admin' && (
                      <td className="py-3.5 px-4 text-right">
                        <button
                          onClick={() => openEditModal(u)}
                          className="p-1.5 text-slate-400 hover:text-brand-600 rounded-lg hover:bg-slate-100 transition"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB CONTENT: PABRIK */}
      {activeTab === 'pabrik' && (
        <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50/75 border-b border-slate-200 text-xs font-bold text-slate-500 uppercase">
                <tr>
                  <th className="py-3 px-4">Nama Pabrik</th>
                  <th className="py-3 px-4">Kontak / Person</th>
                  <th className="py-3 px-4">Alamat Pabrik</th>
                  <th className="py-3 px-4">Status</th>
                  {currentRole === 'admin' && <th className="py-3 px-4 text-right">Aksi</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {pabriks.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-50">
                    <td className="py-3.5 px-4 font-semibold text-slate-800">{p.nama}</td>
                    <td className="py-3.5 px-4 text-slate-600 text-xs">{p.kontak || '-'}</td>
                    <td className="py-3.5 px-4 text-slate-600 text-xs max-w-xs">{p.alamat || '-'}</td>
                    <td className="py-3.5 px-4">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-700">
                        Aktif
                      </span>
                    </td>
                    {currentRole === 'admin' && (
                      <td className="py-3.5 px-4 text-right">
                        <button
                          onClick={() => openEditModal(p)}
                          className="p-1.5 text-slate-400 hover:text-brand-600 rounded-lg hover:bg-slate-100 transition"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB CONTENT: PIHAK */}
      {activeTab === 'pihak' && (
        <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50/75 border-b border-slate-200 text-xs font-bold text-slate-500 uppercase">
                <tr>
                  <th className="py-3 px-4">Nama Lengkap / Instansi</th>
                  <th className="py-3 px-4">Peran / Tipe</th>
                  <th className="py-3 px-4">Nomor Telepon / WhatsApp</th>
                  <th className="py-3 px-4">Status</th>
                  {currentRole === 'admin' && <th className="py-3 px-4 text-right">Aksi</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {pihaks.map((ph) => {
                  let badgeColor = 'bg-slate-100 text-slate-700';
                  if (ph.tipe === 'pengirim') badgeColor = 'bg-blue-100 text-blue-800';
                  if (ph.tipe === 'koordinator') badgeColor = 'bg-purple-100 text-purple-800';
                  if (ph.tipe === 'pembeli') badgeColor = 'bg-emerald-100 text-emerald-800';

                  return (
                    <tr key={ph.id} className="hover:bg-slate-50">
                      <td className="py-3.5 px-4 font-semibold text-slate-800">{ph.nama}</td>
                      <td className="py-3.5 px-4">
                        <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold capitalize ${badgeColor}`}>
                          {ph.tipe}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-slate-600 text-xs font-mono">{ph.telepon || '-'}</td>
                      <td className="py-3.5 px-4">
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-700">
                          Aktif
                        </span>
                      </td>
                      {currentRole === 'admin' && (
                        <td className="py-3.5 px-4 text-right">
                          <button
                            onClick={() => openEditModal(ph)}
                            className="p-1.5 text-slate-400 hover:text-brand-600 rounded-lg hover:bg-slate-100 transition"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal Tambah / Edit Data */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/50">
              <h3 className="text-base font-bold text-slate-900">
                {editingItem ? 'Edit Data' : 'Tambah Data Baru'}{' '}
                {activeTab === 'ukuran' ? 'Ukuran' : activeTab === 'pabrik' ? 'Pabrik' : 'Pihak'}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-2 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSave} className="p-6 space-y-4 text-xs">
              {formError && (
                <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              {/* Form Ukuran */}
              {activeTab === 'ukuran' && (
                <>
                  <div>
                    <label className="block font-semibold text-slate-600 uppercase mb-1">
                      Kode Ukuran (Digunakan di Barcode) *
                    </label>
                    <input
                      type="text"
                      placeholder="Contoh: 200, 180, 160, 200T30"
                      value={uKode}
                      onChange={(e) => setUKode(e.target.value.toUpperCase())}
                      required
                      className="w-full px-3 py-2 text-sm font-mono font-bold rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-500 bg-white"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-600 uppercase mb-1">
                      Nama Ukuran Kasur *
                    </label>
                    <input
                      type="text"
                      placeholder="Contoh: Kasur Busa No. 1 (King 200x200)"
                      value={uNama}
                      onChange={(e) => setUNama(e.target.value)}
                      required
                      className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-500 bg-white"
                    />
                  </div>

                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <label className="block font-semibold text-slate-600 uppercase mb-1">Panjang (cm)</label>
                      <input
                        type="number"
                        value={uPanjang}
                        onChange={(e) => setUPanjang(Number(e.target.value))}
                        required
                        className="w-full px-2 py-1.5 text-center font-bold text-sm rounded-xl border border-slate-200 bg-white"
                      />
                    </div>
                    <div>
                      <label className="block font-semibold text-slate-600 uppercase mb-1">Lebar (cm)</label>
                      <input
                        type="number"
                        value={uLebar}
                        onChange={(e) => setULebar(Number(e.target.value))}
                        required
                        className="w-full px-2 py-1.5 text-center font-bold text-sm rounded-xl border border-slate-200 bg-white"
                      />
                    </div>
                    <div>
                      <label className="block font-semibold text-slate-600 uppercase mb-1">Tebal (cm)</label>
                      <input
                        type="number"
                        value={uTebal ?? ''}
                        onChange={(e) => setUTebal(e.target.value ? Number(e.target.value) : undefined)}
                        placeholder="Opsional"
                        className="w-full px-2 py-1.5 text-center font-bold text-sm rounded-xl border border-slate-200 bg-white"
                      />
                    </div>
                  </div>
                </>
              )}

              {/* Form Pabrik */}
              {activeTab === 'pabrik' && (
                <>
                  <div>
                    <label className="block font-semibold text-slate-600 uppercase mb-1">Nama Pabrik *</label>
                    <input
                      type="text"
                      placeholder="Contoh: PT Busa Prima Nusantara"
                      value={pNama}
                      onChange={(e) => setPNama(e.target.value)}
                      required
                      className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-500 bg-white"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-600 uppercase mb-1">Kontak Person / No. HP</label>
                    <input
                      type="text"
                      placeholder="Contoh: 0812-3456-7890 (Bpk. Joko)"
                      value={pKontak}
                      onChange={(e) => setPKontak(e.target.value)}
                      className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-500 bg-white"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-600 uppercase mb-1">Alamat Pabrik</label>
                    <textarea
                      rows={2}
                      placeholder="Contoh: Kawasan Industri Cikarang Blok B4, Bekasi"
                      value={pAlamat}
                      onChange={(e) => setPAlamat(e.target.value)}
                      className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-500 bg-white"
                    />
                  </div>
                </>
              )}

              {/* Form Pihak */}
              {activeTab === 'pihak' && (
                <>
                  <div>
                    <label className="block font-semibold text-slate-600 uppercase mb-1">Nama Pihak *</label>
                    <input
                      type="text"
                      placeholder="Contoh: Budi Santoso (Supir Truk 1)"
                      value={phNama}
                      onChange={(e) => setPhNama(e.target.value)}
                      required
                      className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-500 bg-white"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-600 uppercase mb-1">Peran / Tipe *</label>
                    <select
                      value={phTipe}
                      onChange={(e) => setPhTipe(e.target.value as PihakTipe)}
                      required
                      className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-500 bg-white"
                    >
                      <option value="pengirim">Pengirim / Supir</option>
                      <option value="koordinator">Koordinator Gudang</option>
                      <option value="pembeli">Pembeli / Toko</option>
                    </select>
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-600 uppercase mb-1">Nomor Telepon / WhatsApp</label>
                    <input
                      type="text"
                      placeholder="Contoh: 0821-1122-3344"
                      value={phTelepon}
                      onChange={(e) => setPhTelepon(e.target.value)}
                      className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-500 bg-white"
                    />
                  </div>
                </>
              )}

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-slate-600 font-semibold hover:bg-slate-100 rounded-xl"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-5 py-2 font-bold text-white bg-brand-600 hover:bg-brand-700 rounded-xl transition shadow-sm"
                >
                  {isSaving ? 'Menyimpan...' : 'Simpan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

