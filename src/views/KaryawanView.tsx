import React, { useState, useEffect, useMemo } from 'react';
import {
  Users,
  UserPlus,
  Search,
  Filter,
  Edit2,
  Trash2,
  Briefcase,
  Calendar,
  Banknote,
  Sparkles,
  LayoutGrid,
  List,
  CheckCircle2,
  XCircle,
  X,
  AlertCircle,
  TrendingUp,
  CreditCard,
  UserCheck,
  ChevronRight,
  ShieldAlert,
} from 'lucide-react';
import { api } from '../services/api';
import { Karyawan, UserRole } from '../types';
import { formatRupiah, formatNumber } from '../utils/currency';

interface KaryawanViewProps {
  currentRole?: UserRole;
  onNavigate?: (view: string, extra?: any) => void;
}

const QUICK_JABATAN_SUGGESTIONS = [
  'Driver / Supir Ekspedisi',
  'Koordinator Gudang Barat',
  'Koordinator Gudang Timur',
  'Staf Gudang & Barcode Operator',
  'Operator Mesin Busa',
  'Staf Administrasi & Kasir',
  'Helper / Kernet Pengiriman',
  'Supervisor Gudang & Logistik',
];

export const KaryawanView: React.FC<KaryawanViewProps> = ({
  currentRole = 'admin',
  onNavigate,
}) => {
  const [karyawanList, setKaryawanList] = useState<Karyawan[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'aktif' | 'resign'>('all');
  const [jabatanFilter, setJabatanFilter] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Form Fields
  const [formNik, setFormNik] = useState('');
  const [formNama, setFormNama] = useState('');
  const [formJabatan, setFormJabatan] = useState('');
  const [formTglMasuk, setFormTglMasuk] = useState('');
  const [formTglResign, setFormTglResign] = useState('');
  const [formGajiPokok, setFormGajiPokok] = useState<number>(0);
  const [formUangMakan, setFormUangMakan] = useState<number>(0);
  const [formTransport, setFormTransport] = useState<number>(0);
  const [formTunjanganJabatan, setFormTunjanganJabatan] = useState<number>(0);
  const [formTunjanganOperasional, setFormTunjanganOperasional] = useState<number>(0);
  const [formAktif, setFormAktif] = useState<boolean>(true);

  // Notification Toast
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const showNotification = (type: 'success' | 'error', message: string) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 4000);
  };

  const loadKaryawan = async () => {
    try {
      setIsLoading(true);
      const data = await api.getKaryawanList();
      setKaryawanList(data);
    } catch (err) {
      console.error('Gagal mengambil data karyawan:', err);
      showNotification('error', 'Gagal memuat data karyawan');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadKaryawan();
  }, []);

  // Filter & Search Logic
  const filteredList = useMemo(() => {
    return karyawanList.filter(k => {
      const matchSearch =
        k.nama.toLowerCase().includes(searchQuery.toLowerCase()) ||
        k.nik.toLowerCase().includes(searchQuery.toLowerCase()) ||
        k.jabatan.toLowerCase().includes(searchQuery.toLowerCase());

      const matchStatus =
        statusFilter === 'all'
          ? true
          : statusFilter === 'aktif'
          ? k.aktif
          : !k.aktif;

      const matchJabatan =
        jabatanFilter === 'all' ? true : k.jabatan === jabatanFilter;

      return matchSearch && matchStatus && matchJabatan;
    });
  }, [karyawanList, searchQuery, statusFilter, jabatanFilter]);

  // Unique list of jabatans for filter dropdown
  const uniqueJabatans = useMemo(() => {
    const set = new Set<string>();
    karyawanList.forEach(k => {
      if (k.jabatan) set.add(k.jabatan);
    });
    return Array.from(set);
  }, [karyawanList]);

  // KPI Metrics
  const stats = useMemo(() => {
    const total = karyawanList.length;
    const aktif = karyawanList.filter(k => k.aktif).length;
    const resign = karyawanList.filter(k => !k.aktif).length;
    const totalGajiPokokAktif = karyawanList
      .filter(k => k.aktif)
      .reduce((sum, k) => sum + (k.gaji_pokok_standar || 0), 0);
    return { total, aktif, resign, totalGajiPokokAktif };
  }, [karyawanList]);

  // Form Handlers
  const handleOpenAddModal = () => {
    if (currentRole === 'owner') {
      showNotification('error', 'Akun Owner memiliki hak akses pantau (Read-Only).');
      return;
    }
    const year = new Date().getFullYear();
    const nextSeq = String(karyawanList.length + 1).padStart(3, '0');
    setEditingId(null);
    setFormNik(`KB-${year}${nextSeq}`);
    setFormNama('');
    setFormJabatan('Driver / Supir Ekspedisi');
    setFormTglMasuk(new Date().toISOString().slice(0, 10));
    setFormTglResign('');
    setFormGajiPokok(4500000);
    setFormUangMakan(650000);
    setFormTransport(350000);
    setFormTunjanganJabatan(250000);
    setFormTunjanganOperasional(200000);
    setFormAktif(true);
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (k: Karyawan) => {
    if (currentRole === 'owner') {
      showNotification('error', 'Akun Owner memiliki hak akses pantau (Read-Only).');
      return;
    }
    setEditingId(k.id);
    setFormNik(k.nik);
    setFormNama(k.nama);
    setFormJabatan(k.jabatan);
    setFormTglMasuk(k.tanggal_masuk);
    setFormTglResign(k.tanggal_resign || '');
    setFormGajiPokok(k.gaji_pokok_standar || 0);
    setFormUangMakan(k.uang_makan_standar || 0);
    setFormTransport(k.transport_standar || 0);
    setFormTunjanganJabatan(k.tunjangan_jabatan_standar || 0);
    setFormTunjanganOperasional(k.tunjangan_operasional_standar || 0);
    setFormAktif(k.aktif);
    setIsModalOpen(true);
  };

  const handleGenerateAutoNik = () => {
    const year = new Date().getFullYear();
    const rand = Math.floor(100 + Math.random() * 900);
    setFormNik(`KB-${year}${rand}`);
  };

  const handleSaveKaryawan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formNama.trim()) {
      alert('Mohon isi nama lengkap karyawan.');
      return;
    }
    if (!formJabatan.trim()) {
      alert('Mohon tentukan jabatan karyawan.');
      return;
    }

    try {
      await api.saveKaryawan({
        id: editingId || undefined,
        nik: formNik.trim(),
        nama: formNama.trim(),
        jabatan: formJabatan.trim(),
        tanggal_masuk: formTglMasuk || new Date().toISOString().slice(0, 10),
        tanggal_resign: formAktif ? undefined : (formTglResign || undefined),
        gaji_pokok_standar: Number(formGajiPokok) || 0,
        uang_makan_standar: Number(formUangMakan) || 0,
        transport_standar: Number(formTransport) || 0,
        tunjangan_jabatan_standar: Number(formTunjanganJabatan) || 0,
        tunjangan_operasional_standar: Number(formTunjanganOperasional) || 0,
        aktif: formAktif,
      });

      setIsModalOpen(false);
      await loadKaryawan();
      showNotification(
        'success',
        editingId
          ? `Data karyawan ${formNama} berhasil diperbarui!`
          : `Karyawan baru ${formNama} berhasil ditambahkan!`
      );
    } catch (err) {
      console.error('Error saat menyimpan karyawan:', err);
      showNotification('error', 'Gagal menyimpan data karyawan');
    }
  };

  const handleDeleteKaryawan = async (id: string, nama: string) => {
    if (currentRole === 'owner') {
      showNotification('error', 'Akun Owner tidak dapat menghapus data karyawan (Read-Only).');
      return;
    }
    if (confirm(`Apakah Anda yakin ingin menghapus data karyawan "${nama}"? Tindakan ini tidak dapat dibatalkan.`)) {
      try {
        await api.deleteKaryawan(id);
        await loadKaryawan();
        showNotification('success', `Karyawan "${nama}" berhasil dihapus.`);
      } catch (err) {
        console.error('Gagal menghapus karyawan:', err);
        showNotification('error', 'Gagal menghapus data karyawan');
      }
    }
  };

  const handleBuatSlipGaji = (karyawan: Karyawan) => {
    if (onNavigate) {
      onNavigate('payroll', { karyawanId: karyawan.id });
    }
  };

  // Hitung total standar pendapatan bulanan di modal
  const totalStandarBulananModal =
    (Number(formGajiPokok) || 0) +
    (Number(formUangMakan) || 0) +
    (Number(formTransport) || 0) +
    (Number(formTunjanganJabatan) || 0) +
    (Number(formTunjanganOperasional) || 0);

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {notification && (
        <div
          className={`fixed top-20 right-4 z-50 p-4 rounded-2xl shadow-xl flex items-center gap-3 border animate-bounce ${
            notification.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
              : 'bg-red-50 border-red-200 text-red-900'
          }`}
        >
          {notification.type === 'success' ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          ) : (
            <AlertCircle className="w-5 h-5 text-red-600 shrink-0" />
          )}
          <span className="text-sm font-bold">{notification.message}</span>
        </div>
      )}

      {/* Header Halaman & Tombol Tambah Karyawan */}
      <div className="bg-white p-5 sm:p-6 rounded-3xl border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-brand-50 border border-brand-200 flex items-center justify-center text-brand-700">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                Data & Manajemen Karyawan
              </h1>
              <p className="text-xs sm:text-sm font-medium text-slate-500 mt-0.5">
                Kelola seluruh data karyawan, riwayat kerja, standar gaji & tunjangan bulanan
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5 self-start md:self-auto">
          {currentRole !== 'owner' ? (
            <button
              type="button"
              onClick={handleOpenAddModal}
              className="flex items-center gap-2 px-5 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-sm rounded-2xl transition shadow-md hover:shadow-lg active:scale-95 cursor-pointer"
            >
              <UserPlus className="w-5 h-5" />
              <span>+ Tambah Karyawan Baru</span>
            </button>
          ) : (
            <div className="flex items-center gap-2 px-3 py-2 bg-purple-50 text-purple-800 rounded-xl border border-purple-200 text-xs font-bold">
              <ShieldAlert className="w-4 h-4 text-purple-600" />
              <span>Akses Pantau Owner (Read-Only)</span>
            </div>
          )}
        </div>
      </div>

      {/* Ringkasan Statistik / KPI Karyawan */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Total Karyawan</span>
            <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-slate-900 mt-2">{stats.total}</div>
          <p className="text-[11px] font-semibold text-slate-500 mt-1">Terdaftar di sistem Win's Group</p>
        </div>

        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-emerald-700 uppercase tracking-wider">Karyawan Aktif</span>
            <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
              <UserCheck className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-emerald-600 mt-2">{stats.aktif}</div>
          <p className="text-[11px] font-semibold text-slate-500 mt-1">Status kerja aktif di gudang</p>
        </div>

        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-red-600 uppercase tracking-wider">Karyawan Resign</span>
            <div className="w-8 h-8 rounded-xl bg-red-50 text-red-600 flex items-center justify-center font-bold">
              <XCircle className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-red-600 mt-2">{stats.resign}</div>
          <p className="text-[11px] font-semibold text-slate-500 mt-1">Mantan karyawan / selesai kontrak</p>
        </div>

        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-brand-700 uppercase tracking-wider">Total Beban Pokok</span>
            <div className="w-8 h-8 rounded-xl bg-brand-50 text-brand-600 flex items-center justify-center font-bold">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="text-lg sm:text-xl font-black text-brand-700 mt-2">
            {formatRupiah(stats.totalGajiPokokAktif)}
          </div>
          <p className="text-[11px] font-semibold text-slate-500 mt-1">Estimasi gaji pokok aktif / bln</p>
        </div>
      </div>

      {/* Filter & Kontrol Pencarian */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        {/* Search Bar */}
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Cari nama karyawan, NIK (KB-...), atau jabatan..."
            className="w-full pl-10 pr-9 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:bg-white transition"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Status Filter Buttons */}
          <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200">
            <button
              onClick={() => setStatusFilter('all')}
              className={`px-3 py-1.5 rounded-lg text-xs font-black transition cursor-pointer ${
                statusFilter === 'all'
                  ? 'bg-white text-slate-900 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Semua ({karyawanList.length})
            </button>
            <button
              onClick={() => setStatusFilter('aktif')}
              className={`px-3 py-1.5 rounded-lg text-xs font-black transition cursor-pointer ${
                statusFilter === 'aktif'
                  ? 'bg-emerald-600 text-white shadow-2xs'
                  : 'text-emerald-700 hover:text-emerald-900'
              }`}
            >
              Aktif ({stats.aktif})
            </button>
            <button
              onClick={() => setStatusFilter('resign')}
              className={`px-3 py-1.5 rounded-lg text-xs font-black transition cursor-pointer ${
                statusFilter === 'resign'
                  ? 'bg-red-600 text-white shadow-2xs'
                  : 'text-red-700 hover:text-red-900'
              }`}
            >
              Resign ({stats.resign})
            </button>
          </div>

          {/* Jabatan Filter Dropdown */}
          <select
            value={jabatanFilter}
            onChange={e => setJabatanFilter(e.target.value)}
            className="bg-slate-100 border border-slate-200 text-xs font-bold text-slate-700 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-500 cursor-pointer"
          >
            <option value="all">Semua Jabatan</option>
            {uniqueJabatans.map(j => (
              <option key={j} value={j}>
                {j}
              </option>
            ))}
          </select>

          {/* View Mode Toggle */}
          <div className="hidden sm:flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-1.5 rounded-lg transition cursor-pointer ${
                viewMode === 'grid' ? 'bg-white text-brand-600 shadow-2xs' : 'text-slate-500 hover:text-slate-800'
              }`}
              title="Tampilan Kartu (Grid)"
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('table')}
              className={`p-1.5 rounded-lg transition cursor-pointer ${
                viewMode === 'table' ? 'bg-white text-brand-600 shadow-2xs' : 'text-slate-500 hover:text-slate-800'
              }`}
              title="Tampilan Tabel Lengkap"
            >
              <List className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Konten Daftar Karyawan */}
      {isLoading ? (
        <div className="p-12 text-center bg-white rounded-3xl border border-slate-200">
          <div className="w-8 h-8 border-4 border-brand-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-sm font-bold text-slate-600">Memuat data seluruh karyawan...</p>
        </div>
      ) : filteredList.length === 0 ? (
        <div className="p-12 text-center bg-white rounded-3xl border border-slate-200 space-y-3">
          <div className="w-16 h-16 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
            <Users className="w-8 h-8" />
          </div>
          <h3 className="text-base font-black text-slate-800">Tidak ada data karyawan ditemukan</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            {searchQuery
              ? `Pencarian "${searchQuery}" tidak cocok dengan data karyawan manapun.`
              : 'Belum ada data karyawan. Tambahkan karyawan baru menggunakan tombol di atas.'}
          </p>
          {currentRole !== 'owner' && (
            <button
              onClick={handleOpenAddModal}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white font-bold text-xs rounded-xl transition shadow-xs cursor-pointer"
            >
              <UserPlus className="w-4 h-4" />
              <span>Tambah Karyawan Baru</span>
            </button>
          )}
        </div>
      ) : viewMode === 'grid' ? (
        /* GRID VIEW */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredList.map(k => {
            const totalStandar =
              (k.gaji_pokok_standar || 0) +
              (k.uang_makan_standar || 0) +
              (k.transport_standar || 0) +
              (k.tunjangan_jabatan_standar || 0) +
              (k.tunjangan_operasional_standar || 0);

            return (
              <div
                key={k.id}
                className="bg-white p-5 rounded-3xl border border-slate-200/90 shadow-sm hover:shadow-md hover:border-brand-300 transition duration-150 flex flex-col justify-between space-y-4"
              >
                <div>
                  {/* Top: Avatar, Name & Status */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3">
                      <div className="w-12 h-12 rounded-2xl bg-linear-to-br from-brand-50 to-brand-100 border border-brand-200 text-brand-800 flex items-center justify-center font-black text-lg shadow-2xs shrink-0">
                        {k.nama.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-mono text-[11px] font-black text-brand-700 bg-brand-50 px-2 py-0.5 rounded-lg border border-brand-200">
                            {k.nik}
                          </span>
                          <span
                            className={`px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider ${
                              k.aktif
                                ? 'bg-emerald-100 text-emerald-800'
                                : 'bg-red-100 text-red-700'
                            }`}
                          >
                            {k.aktif ? '● Aktif' : 'Resign'}
                          </span>
                        </div>
                        <h3 className="text-base font-black text-slate-900 mt-1 leading-snug">
                          {k.nama}
                        </h3>
                        <p className="text-xs font-bold text-slate-600 flex items-center gap-1.5 mt-0.5">
                          <Briefcase className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span>{k.jabatan}</span>
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Riwayat Tanggal Kerja */}
                  <div className="mt-3.5 bg-slate-50 p-3 rounded-2xl border border-slate-200/80 text-xs space-y-1.5">
                    <div className="flex justify-between items-center">
                      <span className="text-slate-500 font-semibold flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5 text-slate-400" />
                        Tgl Masuk:
                      </span>
                      <span className="font-bold text-slate-800">{k.tanggal_masuk}</span>
                    </div>
                    {k.tanggal_resign && (
                      <div className="flex justify-between items-center text-red-700 font-bold pt-1 border-t border-slate-200">
                        <span className="flex items-center gap-1">
                          <XCircle className="w-3.5 h-3.5 text-red-500" />
                          Tgl Resign:
                        </span>
                        <span>{k.tanggal_resign}</span>
                      </div>
                    )}
                  </div>

                  {/* Rincian Standar Gaji & Tunjangan */}
                  <div className="mt-3 p-3 bg-linear-to-b from-slate-50 to-white rounded-2xl border border-slate-200/80 text-xs space-y-1">
                    <div className="flex justify-between items-center text-slate-700">
                      <span className="text-slate-500 font-medium">Gaji Pokok:</span>
                      <span className="font-bold font-mono text-slate-900">
                        {formatRupiah(k.gaji_pokok_standar || 0)}
                      </span>
                    </div>

                    {(k.uang_makan_standar || 0) > 0 && (
                      <div className="flex justify-between items-center text-slate-600">
                        <span className="text-slate-500">Uang Makan:</span>
                        <span className="font-semibold font-mono text-slate-800">
                          {formatRupiah(k.uang_makan_standar || 0)}
                        </span>
                      </div>
                    )}

                    {(k.transport_standar || 0) > 0 && (
                      <div className="flex justify-between items-center text-slate-600">
                        <span className="text-slate-500">Transport:</span>
                        <span className="font-semibold font-mono text-slate-800">
                          {formatRupiah(k.transport_standar || 0)}
                        </span>
                      </div>
                    )}

                    {((k.tunjangan_jabatan_standar || 0) > 0 || (k.tunjangan_operasional_standar || 0) > 0) && (
                      <div className="flex justify-between items-center text-slate-600">
                        <span className="text-slate-500">Tunjangan:</span>
                        <span className="font-semibold font-mono text-slate-800">
                          {formatRupiah(
                            (k.tunjangan_jabatan_standar || 0) + (k.tunjangan_operasional_standar || 0)
                          )}
                        </span>
                      </div>
                    )}

                    <div className="flex justify-between items-center pt-1.5 border-t border-slate-200">
                      <span className="font-black text-brand-900">Total Standar:</span>
                      <span className="font-black font-mono text-brand-700 text-sm">
                        {formatRupiah(totalStandar)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Footer Action Buttons */}
                <div className="flex items-center justify-between gap-2 pt-3 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => handleBuatSlipGaji(k)}
                    className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-brand-50 hover:bg-brand-100 text-brand-700 rounded-xl text-xs font-black transition cursor-pointer active:scale-95"
                    title="Buat Slip Gaji untuk karyawan ini"
                  >
                    <Banknote className="w-4 h-4 text-brand-600" />
                    <span>Buat Slip Gaji</span>
                  </button>

                  {currentRole !== 'owner' && (
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => handleOpenEditModal(k)}
                        className="p-2 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition cursor-pointer"
                        title="Edit Data Karyawan"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteKaryawan(k.id, k.nama)}
                        className="p-2 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-xl transition cursor-pointer"
                        title="Hapus Karyawan"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* TABLE VIEW */
        <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-2xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-700">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-800 font-black uppercase tracking-wider">
                <tr>
                  <th className="py-3 px-4">NIK</th>
                  <th className="py-3 px-4">Nama Lengkap</th>
                  <th className="py-3 px-4">Jabatan</th>
                  <th className="py-3 px-4">Tgl Masuk</th>
                  <th className="py-3 px-4 text-right">Gaji Pokok</th>
                  <th className="py-3 px-4 text-right">Uang Makan</th>
                  <th className="py-3 px-4 text-right">Transport</th>
                  <th className="py-3 px-4 text-right">Tunjangan</th>
                  <th className="py-3 px-4 text-center">Status</th>
                  <th className="py-3 px-4 text-center">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredList.map(k => (
                  <tr key={k.id} className="hover:bg-slate-50/80 transition">
                    <td className="py-3 px-4 font-mono font-bold text-brand-700">
                      {k.nik}
                    </td>
                    <td className="py-3 px-4 font-bold text-slate-900 text-sm">
                      {k.nama}
                    </td>
                    <td className="py-3 px-4 font-semibold text-slate-600">
                      {k.jabatan}
                    </td>
                    <td className="py-3 px-4 text-slate-600 whitespace-nowrap">
                      {k.tanggal_masuk}
                    </td>
                    <td className="py-3 px-4 text-right font-mono font-bold text-slate-900">
                      {formatRupiah(k.gaji_pokok_standar || 0)}
                    </td>
                    <td className="py-3 px-4 text-right font-mono text-slate-600">
                      {formatRupiah(k.uang_makan_standar || 0)}
                    </td>
                    <td className="py-3 px-4 text-right font-mono text-slate-600">
                      {formatRupiah(k.transport_standar || 0)}
                    </td>
                    <td className="py-3 px-4 text-right font-mono text-slate-600">
                      {formatRupiah(
                        (k.tunjangan_jabatan_standar || 0) + (k.tunjangan_operasional_standar || 0)
                      )}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span
                        className={`px-2 py-0.5 rounded-md text-[10px] font-black uppercase ${
                          k.aktif
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-red-100 text-red-700'
                        }`}
                      >
                        {k.aktif ? 'Aktif' : 'Resign'}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          type="button"
                          onClick={() => handleBuatSlipGaji(k)}
                          className="px-2.5 py-1 bg-brand-50 hover:bg-brand-100 text-brand-700 rounded-lg text-xs font-bold transition cursor-pointer flex items-center gap-1"
                          title="Buat Slip Gaji"
                        >
                          <Banknote className="w-3.5 h-3.5" />
                          <span>Slip</span>
                        </button>
                        {currentRole !== 'owner' && (
                          <>
                            <button
                              type="button"
                              onClick={() => handleOpenEditModal(k)}
                              className="p-1 text-slate-400 hover:text-blue-600 hover:bg-slate-100 rounded-lg transition cursor-pointer"
                              title="Edit Data"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteKaryawan(k.id, k.nama)}
                              className="p-1 text-slate-400 hover:text-red-600 hover:bg-slate-100 rounded-lg transition cursor-pointer"
                              title="Hapus Karyawan"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* MODAL INPUT & EDIT DATA KARYAWAN */}
      {/* ==================================================================== */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto animate-scale-in">
            {/* Modal Header */}
            <div className="p-5 sm:p-6 border-b border-slate-200 flex items-center justify-between sticky top-0 bg-white/95 backdrop-blur-xs z-10">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-brand-50 border border-brand-200 text-brand-700 flex items-center justify-center">
                  <UserPlus className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-black text-slate-900">
                    {editingId ? 'Edit Data Karyawan' : '+ Tambah Karyawan Baru'}
                  </h3>
                  <p className="text-xs text-slate-500 font-medium">
                    {editingId
                      ? 'Perbarui profil dan standar penghasilan karyawan'
                      : 'Masukkan identitas karyawan untuk otomatisasi payroll & slip gaji'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="p-2 text-slate-400 hover:text-slate-700 rounded-xl hover:bg-slate-100 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSaveKaryawan} className="p-5 sm:p-6 space-y-5">
              {/* Seksi 1: Data Diri & Jabatan */}
              <div className="space-y-4">
                <h4 className="text-xs font-black uppercase tracking-wider text-slate-500 border-b border-slate-100 pb-2 flex items-center gap-1.5">
                  <Users className="w-4 h-4 text-brand-600" />
                  Identitas Karyawan
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* NIK */}
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-xs font-bold text-slate-700">NIK (Nomor Induk Karyawan) *</label>
                      <button
                        type="button"
                        onClick={handleGenerateAutoNik}
                        className="text-[11px] text-brand-600 hover:text-brand-800 font-bold flex items-center gap-0.5 cursor-pointer"
                        title="Buat kode NIK otomatis"
                      >
                        <Sparkles className="w-3 h-3" />
                        <span>Auto NIK</span>
                      </button>
                    </div>
                    <input
                      type="text"
                      required
                      value={formNik}
                      onChange={e => setFormNik(e.target.value)}
                      placeholder="Contoh: KB-2026010"
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-mono font-bold text-slate-900 focus:bg-white focus:ring-2 focus:ring-brand-500 focus:outline-none"
                    />
                  </div>

                  {/* Nama Lengkap */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Nama Lengkap Karyawan *</label>
                    <input
                      type="text"
                      required
                      value={formNama}
                      onChange={e => setFormNama(e.target.value)}
                      placeholder="Contoh: Budi Santoso"
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-900 focus:bg-white focus:ring-2 focus:ring-brand-500 focus:outline-none"
                    />
                  </div>
                </div>

                {/* Jabatan & Rekomendasi Pilihan Cepat */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Jabatan / Posisi Kerja *</label>
                  <input
                    type="text"
                    required
                    value={formJabatan}
                    onChange={e => setFormJabatan(e.target.value)}
                    placeholder="Contoh: Driver / Supir Ekspedisi"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-900 focus:bg-white focus:ring-2 focus:ring-brand-500 focus:outline-none"
                  />
                  {/* Quick pills */}
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    <span className="text-[11px] text-slate-400 font-semibold self-center">Pilihan cepat:</span>
                    {QUICK_JABATAN_SUGGESTIONS.map(sug => (
                      <button
                        key={sug}
                        type="button"
                        onClick={() => setFormJabatan(sug)}
                        className={`text-[11px] font-semibold px-2 py-0.5 rounded-lg border transition cursor-pointer ${
                          formJabatan === sug
                            ? 'bg-brand-50 border-brand-300 text-brand-700 font-bold'
                            : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                        }`}
                      >
                        {sug}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Tanggal Masuk, Tanggal Resign & Status */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Tanggal Masuk Bekerja *</label>
                    <input
                      type="date"
                      required
                      value={formTglMasuk}
                      onChange={e => setFormTglMasuk(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-800 focus:bg-white focus:ring-2 focus:ring-brand-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Tanggal Resign (Jika sudah keluar)
                    </label>
                    <input
                      type="date"
                      value={formTglResign}
                      disabled={formAktif}
                      onChange={e => setFormTglResign(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-800 disabled:opacity-50 disabled:bg-slate-100 focus:bg-white focus:ring-2 focus:ring-brand-500 focus:outline-none"
                    />
                  </div>
                </div>

                {/* Status Aktif Switch */}
                <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-2xl border border-slate-200">
                  <input
                    type="checkbox"
                    id="formAktifCheckbox"
                    checked={formAktif}
                    onChange={e => {
                      setFormAktif(e.target.checked);
                      if (e.target.checked) setFormTglResign('');
                    }}
                    className="w-4 h-4 text-brand-600 rounded-md focus:ring-brand-500 cursor-pointer"
                  />
                  <label htmlFor="formAktifCheckbox" className="text-xs font-bold text-slate-800 cursor-pointer">
                    Karyawan Masih Aktif Bekerja di Win's Group
                    <span className="block text-[11px] font-normal text-slate-500">
                      Jika dicentang, nama karyawan akan selalu muncul di dropdown pembuatan Slip Gaji.
                    </span>
                  </label>
                </div>
              </div>

              {/* Seksi 2: Standar Finansial Gaji & Tunjangan */}
              <div className="space-y-4 pt-2 border-t border-slate-100">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-black uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                    <Banknote className="w-4 h-4 text-emerald-600" />
                    Standar Gaji & Tunjangan Bulanan (Rp)
                  </h4>
                  <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-lg border border-emerald-200">
                    Otomatis Isi di Slip Gaji
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Gaji Pokok */}
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-bold text-slate-700 mb-1">Standar Gaji Pokok (Rp) *</label>
                    <div className="relative">
                      <span className="absolute left-3.5 top-1/2 -translate-y-1/2 font-bold text-slate-400 text-xs">Rp</span>
                      <input
                        type="number"
                        min="0"
                        step="50000"
                        value={formGajiPokok || ''}
                        onChange={e => setFormGajiPokok(Number(e.target.value) || 0)}
                        placeholder="0"
                        className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-mono font-bold text-slate-900 focus:bg-white focus:ring-2 focus:ring-brand-500 focus:outline-none"
                      />
                    </div>
                  </div>

                  {/* Uang Makan */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Standar Uang Makan (Rp)</label>
                    <div className="relative">
                      <span className="absolute left-3.5 top-1/2 -translate-y-1/2 font-bold text-slate-400 text-xs">Rp</span>
                      <input
                        type="number"
                        min="0"
                        step="50000"
                        value={formUangMakan || ''}
                        onChange={e => setFormUangMakan(Number(e.target.value) || 0)}
                        placeholder="0"
                        className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-mono font-bold text-slate-900 focus:bg-white focus:ring-2 focus:ring-brand-500 focus:outline-none"
                      />
                    </div>
                  </div>

                  {/* Transport */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Standar Uang Transport (Rp)</label>
                    <div className="relative">
                      <span className="absolute left-3.5 top-1/2 -translate-y-1/2 font-bold text-slate-400 text-xs">Rp</span>
                      <input
                        type="number"
                        min="0"
                        step="50000"
                        value={formTransport || ''}
                        onChange={e => setFormTransport(Number(e.target.value) || 0)}
                        placeholder="0"
                        className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-mono font-bold text-slate-900 focus:bg-white focus:ring-2 focus:ring-brand-500 focus:outline-none"
                      />
                    </div>
                  </div>

                  {/* Tunjangan Jabatan */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Tunjangan Jabatan (Rp)</label>
                    <div className="relative">
                      <span className="absolute left-3.5 top-1/2 -translate-y-1/2 font-bold text-slate-400 text-xs">Rp</span>
                      <input
                        type="number"
                        min="0"
                        step="50000"
                        value={formTunjanganJabatan || ''}
                        onChange={e => setFormTunjanganJabatan(Number(e.target.value) || 0)}
                        placeholder="0"
                        className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-mono font-bold text-slate-900 focus:bg-white focus:ring-2 focus:ring-brand-500 focus:outline-none"
                      />
                    </div>
                  </div>

                  {/* Tunjangan Operasional */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Tunjangan Operasional (Rp)</label>
                    <div className="relative">
                      <span className="absolute left-3.5 top-1/2 -translate-y-1/2 font-bold text-slate-400 text-xs">Rp</span>
                      <input
                        type="number"
                        min="0"
                        step="50000"
                        value={formTunjanganOperasional || ''}
                        onChange={e => setFormTunjanganOperasional(Number(e.target.value) || 0)}
                        placeholder="0"
                        className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-mono font-bold text-slate-900 focus:bg-white focus:ring-2 focus:ring-brand-500 focus:outline-none"
                      />
                    </div>
                  </div>
                </div>

                {/* Total Preview */}
                <div className="p-3.5 bg-emerald-50 rounded-2xl border border-emerald-200 flex items-center justify-between">
                  <div>
                    <span className="text-xs font-black text-emerald-900 block">
                      Total Standar Pendapatan Bulanan:
                    </span>
                    <span className="text-[11px] text-emerald-700 font-medium">
                      Gaji Pokok + Makan + Transport + Tunjangan
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="text-base sm:text-lg font-black font-mono text-emerald-800">
                      {formatRupiah(totalStandarBulananModal)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Modal Action Buttons */}
              <div className="pt-4 border-t border-slate-200 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-sm rounded-xl transition cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-sm rounded-xl transition shadow-md hover:shadow-lg active:scale-95 cursor-pointer flex items-center gap-2"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>{editingId ? 'Simpan Perubahan' : 'Simpan Karyawan'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
