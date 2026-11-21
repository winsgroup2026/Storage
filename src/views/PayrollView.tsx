import React, { useState, useEffect } from 'react';
import {
  Banknote,
  Plus,
  Search,
  Filter,
  Download,
  Printer,
  Eye,
  Edit2,
  Trash2,
  Users,
  Calendar,
  AlertCircle,
  CheckCircle2,
  X,
  FileSpreadsheet,
  Receipt,
  UserCheck,
  TrendingUp,
  CreditCard,
  Briefcase,
  Clock,
  Sparkles,
} from 'lucide-react';
import { api } from '../services/api';
import { Karyawan, PayrollRecord, UserRole } from '../types';
import { formatRupiah, terbilang, formatNumber } from '../utils/currency';
import { generateSlipGajiPdf } from '../utils/slipGajiPdf';
import { exportToExcel } from '../utils/excelExport';

interface PayrollViewProps {
  currentRole?: UserRole;
  initialKaryawanId?: string;
  onNavigate?: (view: string, extra?: any) => void;
}

export const PayrollView: React.FC<PayrollViewProps> = ({
  currentRole = 'admin',
  initialKaryawanId,
  onNavigate,
}) => {
  const [activeTab, setActiveTab] = useState<'payroll' | 'karyawan'>('payroll');
  const [payrollList, setPayrollList] = useState<PayrollRecord[]>([]);
  const [karyawanList, setKaryawanList] = useState<Karyawan[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Filters
  const [selectedPeriode, setSelectedPeriode] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Modals
  const [isPayrollModalOpen, setIsPayrollModalOpen] = useState(false);
  const [previewPayroll, setPreviewPayroll] = useState<PayrollRecord | null>(null);
  const [isKaryawanModalOpen, setIsKaryawanModalOpen] = useState(false);

  // Form Payroll State
  const [editingPayrollId, setEditingPayrollId] = useState<string | null>(null);
  const [karyawanInputMode, setKaryawanInputMode] = useState<'pilih' | 'manual'>('pilih');
  const [autoSaveKaryawanBaru, setAutoSaveKaryawanBaru] = useState(true);
  const [formKaryawanId, setFormKaryawanId] = useState('');
  const [formNik, setFormNik] = useState('');
  const [formNama, setFormNama] = useState('');
  const [formJabatan, setFormJabatan] = useState('');
  const [formTglMasuk, setFormTglMasuk] = useState('');
  const [formTglResign, setFormTglResign] = useState('');
  const [formPeriode, setFormPeriode] = useState('November 2026');
  const [formTglBayar, setFormTglBayar] = useState(new Date().toISOString().slice(0, 10));

  // Pendapatan Form
  const [formGajiPokok, setFormGajiPokok] = useState(0);
  const [formUangMakan, setFormUangMakan] = useState(0);
  const [formTransport, setFormTransport] = useState(0);
  const [formTunjanganJabatan, setFormTunjanganJabatan] = useState(0);
  const [formTunjanganOperasional, setFormTunjanganOperasional] = useState(0);
  const [formThr, setFormThr] = useState(0);
  const [formLembur, setFormLembur] = useState(0);

  // Potongan Absensi Form
  const [formHariAlpha, setFormHariAlpha] = useState(0);
  const [formPotonganAlpha, setFormPotonganAlpha] = useState(0);
  const [formHariIzin, setFormHariIzin] = useState(0);
  const [formPotonganIzin, setFormPotonganIzin] = useState(0);
  const [formHariSakit, setFormHariSakit] = useState(0);
  const [formPotonganSakit, setFormPotonganSakit] = useState(0);
  const [formHariWfh, setFormHariWfh] = useState(0);
  const [formPotonganWfh, setFormPotonganWfh] = useState(0);

  // Potongan Lainnya Form
  const [formJamsostek, setFormJamsostek] = useState(0);
  const [formBpjs, setFormBpjs] = useState(0);
  const [formPinjaman, setFormPinjaman] = useState(0);
  const [formPotonganTransport, setFormPotonganTransport] = useState(0);
  const [formCatatan, setFormCatatan] = useState('');

  // Form Karyawan State
  const [editingKaryawanId, setEditingKaryawanId] = useState<string | null>(null);
  const [karNik, setKarNik] = useState('');
  const [karNama, setKarNama] = useState('');
  const [karJabatan, setKarJabatan] = useState('');
  const [karTglMasuk, setKarTglMasuk] = useState('');
  const [karTglResign, setKarTglResign] = useState('');
  const [karGajiPokok, setKarGajiPokok] = useState(0);
  const [karUangMakan, setKarUangMakan] = useState(0);
  const [karTransport, setKarTransport] = useState(0);
  const [karTunjanganJabatan, setKarTunjanganJabatan] = useState(0);
  const [karTunjanganOperasional, setKarTunjanganOperasional] = useState(0);
  const [karAktif, setKarAktif] = useState(true);

  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const loadData = async () => {
    try {
      setIsLoading(true);
      const [allPayroll, allKaryawan] = await Promise.all([
        api.getPayrollList(),
        api.getKaryawanList(),
      ]);
      setPayrollList(allPayroll);
      setKaryawanList(allKaryawan);
    } catch (err) {
      console.error('Error loading payroll data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Calculated Totals for Form
  const calcJumlahPendapatan =
    (Number(formGajiPokok) || 0) +
    (Number(formUangMakan) || 0) +
    (Number(formTransport) || 0) +
    (Number(formTunjanganJabatan) || 0) +
    (Number(formTunjanganOperasional) || 0) +
    (Number(formThr) || 0) +
    (Number(formLembur) || 0);

  const calcTotalAbsensi =
    (Number(formPotonganAlpha) || 0) +
    (Number(formPotonganIzin) || 0) +
    (Number(formPotonganSakit) || 0) +
    (Number(formPotonganWfh) || 0);

  const calcTotalPotongan =
    calcTotalAbsensi +
    (Number(formJamsostek) || 0) +
    (Number(formBpjs) || 0) +
    (Number(formPinjaman) || 0) +
    (Number(formPotonganTransport) || 0);

  const calcTakeHomePay = Math.max(0, calcJumlahPendapatan - calcTotalPotongan);

  // Auto-fill when Karyawan selected in Payroll Form
  const handleSelectKaryawan = (kId: string) => {
    if (kId === 'manual') {
      setKaryawanInputMode('manual');
      setFormKaryawanId('');
      if (!formNik) {
        setFormNik(`KB-${new Date().getFullYear()}${Math.floor(100 + Math.random() * 900)}`);
      }
      if (!formTglMasuk) {
        setFormTglMasuk(new Date().toISOString().slice(0, 10));
      }
      if (!formJabatan) {
        setFormJabatan('Staf Gudang');
      }
      return;
    }

    setKaryawanInputMode('pilih');
    setFormKaryawanId(kId);
    const k = karyawanList.find(item => item.id === kId);
    if (k) {
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

      // Otomatis hitung perkiraan Jamsostek (3% Gaji Pokok) & BPJS Kesehatan (1% Gaji Pokok)
      const gjp = k.gaji_pokok_standar || 0;
      setFormJamsostek(Math.round(gjp * 0.03));
      setFormBpjs(Math.round(gjp * 0.01));
    }
  };

  // Quick auto-calculate Alpha deduction based on standard daily rate
  const handleAutoCalcAlpha = (days: number) => {
    setFormHariAlpha(days);
    if (formGajiPokok > 0) {
      // Standar 25 hari kerja
      const dailyRate = Math.round(formGajiPokok / 25);
      setFormPotonganAlpha(dailyRate * days);
    }
  };

  const handleOpenNewPayrollModal = () => {
    setEditingPayrollId(null);
    setKaryawanInputMode('pilih');
    setAutoSaveKaryawanBaru(true);
    setFormKaryawanId('');
    setFormNik(`KB-${new Date().getFullYear()}${Math.floor(100 + Math.random() * 900)}`);
    setFormNama('');
    setFormJabatan('Staf Gudang');
    setFormTglMasuk(new Date().toISOString().slice(0, 10));
    setFormTglResign('');
    setFormGajiPokok(0);
    setFormUangMakan(0);
    setFormTransport(0);
    setFormTunjanganJabatan(0);
    setFormTunjanganOperasional(0);
    setFormThr(0);
    setFormLembur(0);
    setFormHariAlpha(0);
    setFormPotonganAlpha(0);
    setFormHariIzin(0);
    setFormPotonganIzin(0);
    setFormHariSakit(0);
    setFormPotonganSakit(0);
    setFormHariWfh(0);
    setFormPotonganWfh(0);
    setFormJamsostek(0);
    setFormBpjs(0);
    setFormPinjaman(0);
    setFormPotonganTransport(0);
    setFormCatatan('');
    setIsPayrollModalOpen(true);
  };

  useEffect(() => {
    if (initialKaryawanId && karyawanList.length > 0) {
      const k = karyawanList.find(item => item.id === initialKaryawanId);
      if (k) {
        handleOpenNewPayrollModal();
        handleSelectKaryawan(k.id);
      }
    }
  }, [initialKaryawanId, karyawanList]);

  const handleEditPayroll = (p: PayrollRecord) => {
    setEditingPayrollId(p.id);
    setFormKaryawanId(p.karyawan_id || '');
    setFormNik(p.nik);
    setFormNama(p.nama);
    setFormJabatan(p.jabatan);
    setFormTglMasuk(p.tanggal_masuk);
    setFormTglResign(p.tanggal_resign || '');
    setFormPeriode(p.periode_bulan);
    setFormTglBayar(p.tanggal_pembayaran);
    setFormGajiPokok(p.gaji_pokok);
    setFormUangMakan(p.uang_makan);
    setFormTransport(p.transport);
    setFormTunjanganJabatan(p.tunjangan_jabatan);
    setFormTunjanganOperasional(p.tunjangan_operasional);
    setFormThr(p.thr);
    setFormLembur(p.lembur);
    setFormHariAlpha(p.hari_alpha);
    setFormPotonganAlpha(p.potongan_alpha);
    setFormHariIzin(p.hari_izin);
    setFormPotonganIzin(p.potongan_izin);
    setFormHariSakit(p.hari_sakit);
    setFormPotonganSakit(p.potongan_sakit);
    setFormHariWfh(p.hari_wfh);
    setFormPotonganWfh(p.potongan_wfh);
    setFormJamsostek(p.jamsostek);
    setFormBpjs(p.bpjs);
    setFormPinjaman(p.pinjaman);
    setFormPotonganTransport(p.potongan_transport);
    setFormCatatan(p.catatan || '');
    setIsPayrollModalOpen(true);
  };

  const handleSubmitPayroll = async (e: React.FormEvent) => {
    e.preventDefault();
    const finalNama = formNama.trim();
    if (!finalNama) {
      alert('Mohon masukkan Nama Karyawan.');
      return;
    }

    const finalNik = formNik.trim() || `KB-${Date.now().toString().slice(-6)}`;
    const finalJabatan = formJabatan.trim() || 'Staf Gudang';
    const finalTglMasuk = formTglMasuk || new Date().toISOString().slice(0, 10);

    let linkedKaryawanId = formKaryawanId || undefined;

    // Jika mode ketik nama sendiri dan auto-save ke master dicentang
    if (autoSaveKaryawanBaru && !formKaryawanId) {
      try {
        const existing = karyawanList.find(
          k => k.nama.toLowerCase() === finalNama.toLowerCase() || k.nik === finalNik
        );
        if (existing) {
          linkedKaryawanId = existing.id;
        } else {
          const newKaryawan = await api.saveKaryawan({
            nama: finalNama,
            nik: finalNik,
            jabatan: finalJabatan,
            tanggal_masuk: finalTglMasuk,
            tanggal_resign: formTglResign.trim() || undefined,
            gaji_pokok_standar: formGajiPokok,
            uang_makan_standar: formUangMakan,
            transport_standar: formTransport,
            tunjangan_jabatan_standar: formTunjanganJabatan,
            tunjangan_operasional_standar: formTunjanganOperasional,
            aktif: !formTglResign.trim(),
          });
          linkedKaryawanId = newKaryawan.id;
        }
      } catch (errAuto) {
        console.warn('Gagal auto-save karyawan ke master:', errAuto);
      }
    }

    try {
      const res = await api.simpanPayroll({
        id: editingPayrollId || undefined,
        karyawan_id: linkedKaryawanId,
        nik: finalNik,
        nama: finalNama,
        jabatan: finalJabatan,
        tanggal_masuk: finalTglMasuk,
        tanggal_resign: formTglResign.trim() || undefined,
        periode_bulan: formPeriode.trim() || 'November 2026',
        tanggal_pembayaran: formTglBayar || new Date().toISOString().slice(0, 10),
        gaji_pokok: formGajiPokok,
        uang_makan: formUangMakan,
        transport: formTransport,
        tunjangan_jabatan: formTunjanganJabatan,
        tunjangan_operasional: formTunjanganOperasional,
        thr: formThr,
        lembur: formLembur,
        hari_alpha: formHariAlpha,
        potongan_alpha: formPotonganAlpha,
        hari_izin: formHariIzin,
        potongan_izin: formPotonganIzin,
        hari_sakit: formHariSakit,
        potongan_sakit: formPotonganSakit,
        hari_wfh: formHariWfh,
        potongan_wfh: formPotonganWfh,
        jamsostek: formJamsostek,
        bpjs: formBpjs,
        pinjaman: formPinjaman,
        potongan_transport: formPotonganTransport,
        catatan: formCatatan.trim(),
        dibuat_oleh: `Admin (${currentRole})`,
      });

      setIsPayrollModalOpen(false);
      setNotification({
        type: 'success',
        message: `Slip Gaji untuk ${res.payroll.nama} (${res.payroll.no_slip}) berhasil disimpan! THP: ${formatRupiah(res.payroll.take_home_pay)}`,
      });
      await loadData();
      setPreviewPayroll(res.payroll);
    } catch (err: any) {
      alert(err.message || 'Gagal menyimpan data slip gaji');
    }
  };

  const handleDeletePayroll = async (id: string, nama: string) => {
    if (!confirm(`Yakin ingin menghapus slip gaji untuk ${nama}?`)) return;
    try {
      await api.deletePayroll(id);
      setNotification({
        type: 'success',
        message: `Slip gaji untuk ${nama} berhasil dihapus.`,
      });
      await loadData();
    } catch (err: any) {
      alert(err.message || 'Gagal menghapus data slip gaji');
    }
  };

  const handlePrintSlip = (payroll: PayrollRecord) => {
    try {
      const doc = generateSlipGajiPdf(payroll);
      doc.autoPrint();
      const blobUrl = doc.output('bloburl');
      window.open(blobUrl, '_blank');
    } catch (err) {
      console.error('Error generating slip gaji PDF:', err);
      alert('Gagal mencetak dokumen Slip Gaji PDF.');
    }
  };

  // Export Rekap Payroll ke Excel
  const handleExportPayrollExcel = () => {
    const headers = [
      'No. Slip Gaji',
      'Periode',
      'Tanggal Bayar',
      'NIK',
      'Nama Karyawan',
      'Jabatan',
      'Tgl Masuk',
      'Tgl Resign',
      'Gaji Pokok',
      'Uang Makan',
      'Transport',
      'Tunjangan Jabatan',
      'Tunjangan Operasional',
      'THR',
      'Lembur',
      'Jumlah Pendapatan',
      'Potongan Alpha',
      'Potongan Izin',
      'Potongan Sakit',
      'Potongan WFH',
      'Total Potongan Absensi',
      'Jamsostek',
      'BPJS Kesehatan',
      'Pinjaman',
      'Potongan Transport',
      'Total Potongan',
      'Take Home Pay (THP)',
      'Status',
    ];

    const data = filteredPayroll.map(p => [
      p.no_slip,
      p.periode_bulan,
      p.tanggal_pembayaran,
      p.nik,
      p.nama,
      p.jabatan,
      p.tanggal_masuk,
      p.tanggal_resign || '-',
      p.gaji_pokok,
      p.uang_makan,
      p.transport,
      p.tunjangan_jabatan,
      p.tunjangan_operasional,
      p.thr,
      p.lembur,
      p.jumlah_pendapatan,
      p.potongan_alpha,
      p.potongan_izin,
      p.potongan_sakit,
      p.potongan_wfh,
      p.total_potongan_absensi,
      p.jamsostek,
      p.bpjs,
      p.pinjaman,
      p.potongan_transport,
      p.total_potongan,
      p.take_home_pay,
      p.status.toUpperCase(),
    ]);

    exportToExcel({
      filename: `Rekap_Payroll_Gaji_${new Date().toISOString().slice(0, 10)}.xlsx`,
      sheetName: 'Rekap Gaji Karyawan',
      headers,
      data,
    });
  };

  // Karyawan CRUD Handlers
  const handleOpenKaryawanModal = (k?: Karyawan) => {
    if (k) {
      setEditingKaryawanId(k.id);
      setKarNik(k.nik);
      setKarNama(k.nama);
      setKarJabatan(k.jabatan);
      setKarTglMasuk(k.tanggal_masuk);
      setKarTglResign(k.tanggal_resign || '');
      setKarGajiPokok(k.gaji_pokok_standar || 0);
      setKarUangMakan(k.uang_makan_standar || 0);
      setKarTransport(k.transport_standar || 0);
      setKarTunjanganJabatan(k.tunjangan_jabatan_standar || 0);
      setKarTunjanganOperasional(k.tunjangan_operasional_standar || 0);
      setKarAktif(k.aktif);
    } else {
      setEditingKaryawanId(null);
      setKarNik(`KB-${new Date().getFullYear()}${String(karyawanList.length + 1).padStart(3, '0')}`);
      setKarNama('');
      setKarJabatan('Staf Gudang');
      setKarTglMasuk(new Date().toISOString().slice(0, 10));
      setKarTglResign('');
      setKarGajiPokok(3500000);
      setKarUangMakan(650000);
      setKarTransport(500000);
      setKarTunjanganJabatan(0);
      setKarTunjanganOperasional(0);
      setKarAktif(true);
    }
    setIsKaryawanModalOpen(true);
  };

  const handleSubmitKaryawan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!karNik.trim() || !karNama.trim()) {
      alert('NIK dan Nama Karyawan wajib diisi.');
      return;
    }

    try {
      await api.saveKaryawan({
        id: editingKaryawanId || undefined,
        nik: karNik.trim(),
        nama: karNama.trim(),
        jabatan: karJabatan.trim(),
        tanggal_masuk: karTglMasuk,
        tanggal_resign: karTglResign.trim() || undefined,
        gaji_pokok_standar: Number(karGajiPokok) || 0,
        uang_makan_standar: Number(karUangMakan) || 0,
        transport_standar: Number(karTransport) || 0,
        tunjangan_jabatan_standar: Number(karTunjanganJabatan) || 0,
        tunjangan_operasional_standar: Number(karTunjanganOperasional) || 0,
        aktif: karAktif,
      });

      setIsKaryawanModalOpen(false);
      setNotification({
        type: 'success',
        message: `Data karyawan ${karNama} berhasil disimpan!`,
      });
      await loadData();
    } catch (err: any) {
      alert(err.message || 'Gagal menyimpan data karyawan');
    }
  };

  const handleDeleteKaryawan = async (id: string, nama: string) => {
    if (!confirm(`Hapus data master karyawan ${nama}?`)) return;
    try {
      await api.deleteKaryawan(id);
      setNotification({ type: 'success', message: `Data karyawan ${nama} berhasil dihapus.` });
      await loadData();
    } catch (err: any) {
      alert(err.message || 'Gagal menghapus karyawan');
    }
  };

  // Filtered List
  const periodes = Array.from(new Set(payrollList.map(p => p.periode_bulan)));
  const filteredPayroll = payrollList.filter(p => {
    if (selectedPeriode !== 'all' && p.periode_bulan !== selectedPeriode) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const mNik = p.nik.toLowerCase().includes(q);
      const mNama = p.nama.toLowerCase().includes(q);
      const mJabatan = p.jabatan.toLowerCase().includes(q);
      const mNo = p.no_slip.toLowerCase().includes(q);
      return mNik || mNama || mJabatan || mNo;
    }
    return true;
  });

  // Summary Metrics
  const totalEmployeesPaid = filteredPayroll.length;
  const totalGrossEarnings = filteredPayroll.reduce((acc, it) => acc + it.jumlah_pendapatan, 0);
  const totalDeductions = filteredPayroll.reduce((acc, it) => acc + it.total_potongan, 0);
  const totalThpPaid = filteredPayroll.reduce((acc, it) => acc + it.take_home_pay, 0);

  return (
    <div className="space-y-6">
      {/* Title & Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center shrink-0">
            <Banknote className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-extrabold text-slate-900 tracking-tight">
                Sistem Payroll & Slip Gaji Karyawan
              </h1>
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800">
                Win's Group
              </span>
            </div>
            <p className="text-sm text-slate-500 mt-1">
              Perhitungan penggajian akurat: Gaji Pokok, Tunjangan, THR, Lembur dikurangi Potongan Absensi (Alpha, Izin, Sakit, WFH), BPJS & Pinjaman menghasilkan Take Home Pay (THP) serta Slip Gaji resmi.
            </p>
          </div>
        </div>

        {/* Tab Switcher */}
        <div className="flex items-center gap-1 bg-slate-100 p-1.5 rounded-2xl self-start md:self-auto shrink-0 border border-slate-200">
          <button
            onClick={() => setActiveTab('payroll')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition ${
              activeTab === 'payroll'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Receipt className="w-4 h-4 text-emerald-600" />
            <span>Slip Gaji & Payroll</span>
          </button>
          <button
            onClick={() => setActiveTab('karyawan')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition ${
              activeTab === 'karyawan'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Users className="w-4 h-4 text-slate-600" />
            <span>Master Karyawan</span>
            <span className="ml-1 px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-slate-200 text-slate-700">
              {karyawanList.length}
            </span>
          </button>
        </div>
      </div>

      {/* Notification Toast */}
      {notification && (
        <div
          className={`p-4 rounded-2xl border text-xs sm:text-sm font-medium flex items-center justify-between animate-fade-in ${
            notification.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
              : 'bg-red-50 text-red-800 border-red-200'
          }`}
        >
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
            <span>{notification.message}</span>
          </div>
          <button onClick={() => setNotification(null)} className="text-slate-400 hover:text-slate-600">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* TAB 1: PAYROLL & SLIP GAJI */}
      {activeTab === 'payroll' && (
        <div className="space-y-6">
          {/* Summary Stat Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-1">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">
                Total Slip Gaji
              </span>
              <div className="flex items-baseline justify-between">
                <span className="text-2xl font-extrabold text-slate-900">{totalEmployeesPaid}</span>
                <span className="text-xs text-slate-400">Karyawan</span>
              </div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-1">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">
                Jumlah Pendapatan
              </span>
              <div className="flex items-baseline justify-between">
                <span className="text-lg font-extrabold text-blue-700">
                  {formatRupiah(totalGrossEarnings)}
                </span>
              </div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-1">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">
                Total Potongan
              </span>
              <div className="flex items-baseline justify-between">
                <span className="text-lg font-extrabold text-red-700">
                  {formatRupiah(totalDeductions)}
                </span>
              </div>
            </div>

            <div className="bg-emerald-50/80 p-5 rounded-2xl border border-emerald-200 shadow-2xs space-y-1">
              <span className="text-xs font-bold text-emerald-800 uppercase tracking-wider block">
                Total Take Home Pay (THP)
              </span>
              <div className="flex items-baseline justify-between">
                <span className="text-lg font-black text-emerald-700">
                  {formatRupiah(totalThpPaid)}
                </span>
              </div>
            </div>
          </div>

          {/* Action & Filter Bar */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div className="flex flex-col sm:flex-row sm:items-center gap-3 flex-1">
              {/* Filter Periode */}
              <div className="flex items-center gap-2">
                <Filter className="w-4 h-4 text-slate-400" />
                <select
                  value={selectedPeriode}
                  onChange={(e) => setSelectedPeriode(e.target.value)}
                  className="px-3 py-2 text-xs font-semibold rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-brand-500"
                >
                  <option value="all">Semua Periode Penggajian</option>
                  {periodes.map(p => (
                    <option key={p} value={p}>{p}</option>
                  ))}
                </select>
              </div>

              {/* Search Bar */}
              <div className="relative flex-1 max-w-md">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Cari NIK, Nama Karyawan, atau Jabatan..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 text-xs font-medium rounded-xl border border-slate-200 bg-slate-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>
            </div>

            <div className="flex items-center gap-2 self-end sm:self-auto">
              <button
                type="button"
                onClick={handleExportPayrollExcel}
                className="flex items-center gap-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl transition shadow-2xs active:scale-95"
              >
                <FileSpreadsheet className="w-4 h-4" />
                <span>Ekspor Excel (.xlsx)</span>
              </button>

              {currentRole === 'admin' && (
                <button
                  type="button"
                  onClick={handleOpenNewPayrollModal}
                  className="flex items-center gap-1.5 px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white font-bold text-xs rounded-xl transition shadow-2xs active:scale-95"
                >
                  <Plus className="w-4 h-4" />
                  <span>+ Buat Slip Gaji</span>
                </button>
              )}
            </div>
          </div>

          {/* Table List of Payroll & Slips */}
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 border-b border-slate-200 text-xs font-bold text-slate-500 uppercase">
                  <tr>
                    <th className="py-3 px-4">No. Slip</th>
                    <th className="py-3 px-4">Karyawan</th>
                    <th className="py-3 px-4">Jabatan</th>
                    <th className="py-3 px-4">Periode</th>
                    <th className="py-3 px-4 text-right">Pendapatan</th>
                    <th className="py-3 px-4 text-right">Potongan</th>
                    <th className="py-3 px-4 text-right">Take Home Pay</th>
                    <th className="py-3 px-4 text-center">Status</th>
                    <th className="py-3 px-4 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {filteredPayroll.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="py-10 text-center text-slate-400 italic">
                        Belum ada data slip gaji untuk filter ini.
                      </td>
                    </tr>
                  ) : (
                    filteredPayroll.map((p) => (
                      <tr key={p.id} className="hover:bg-slate-50/80 transition">
                        <td className="py-3 px-4 font-mono font-bold text-brand-700">
                          {p.no_slip}
                        </td>
                        <td className="py-3 px-4">
                          <div className="font-bold text-slate-900">{p.nama}</div>
                          <div className="text-[11px] text-slate-400 font-mono">{p.nik}</div>
                        </td>
                        <td className="py-3 px-4 text-slate-600 font-medium">
                          {p.jabatan}
                        </td>
                        <td className="py-3 px-4 text-slate-500 whitespace-nowrap">
                          {p.periode_bulan}
                        </td>
                        <td className="py-3 px-4 text-right font-mono font-semibold text-blue-700">
                          {formatRupiah(p.jumlah_pendapatan)}
                        </td>
                        <td className="py-3 px-4 text-right font-mono text-red-600">
                          -{formatRupiah(p.total_potongan)}
                        </td>
                        <td className="py-3 px-4 text-right font-mono font-extrabold text-emerald-700 text-sm bg-emerald-50/30">
                          {formatRupiah(p.take_home_pay)}
                        </td>
                        <td className="py-3 px-4 text-center">
                          <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-100 text-emerald-800 uppercase">
                            {p.status}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              type="button"
                              onClick={() => setPreviewPayroll(p)}
                              className="p-1.5 text-slate-500 hover:text-brand-600 hover:bg-slate-100 rounded-lg transition"
                              title="Lihat Preview Slip Gaji"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handlePrintSlip(p)}
                              className="flex items-center gap-1 px-2.5 py-1 bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 rounded-lg font-bold text-xs transition shadow-2xs"
                              title="Cetak Slip Gaji PDF"
                            >
                              <Printer className="w-3.5 h-3.5 text-brand-600" />
                              <span className="hidden sm:inline">Cetak</span>
                            </button>
                            {currentRole === 'admin' && (
                              <>
                                <button
                                  type="button"
                                  onClick={() => handleEditPayroll(p)}
                                  className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-slate-100 rounded-lg transition"
                                  title="Edit Data Slip"
                                >
                                  <Edit2 className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleDeletePayroll(p.id, p.nama)}
                                  className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-slate-100 rounded-lg transition"
                                  title="Hapus Slip Gaji"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: DATA MASTER KARYAWAN */}
      {activeTab === 'karyawan' && (
        <div className="space-y-4">
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold text-slate-800">Daftar Karyawan Win's Group</h2>
              <p className="text-xs text-slate-500">Master data profil, posisi, tanggal masuk/resign & standar gaji pokok</p>
            </div>
            <div className="flex items-center gap-2">
              {onNavigate && (
                <button
                  type="button"
                  onClick={() => onNavigate('karyawan')}
                  className="flex items-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs rounded-xl transition cursor-pointer"
                >
                  <Users className="w-4 h-4 text-brand-600" />
                  <span>Buka Menu Data Karyawan</span>
                </button>
              )}
              {currentRole === 'admin' && (
                <button
                  type="button"
                  onClick={() => handleOpenKaryawanModal()}
                  className="flex items-center gap-1.5 px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white font-bold text-xs rounded-xl transition shadow-2xs active:scale-95 cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>+ Tambah Karyawan</span>
                </button>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {karyawanList.map(k => (
              <div
                key={k.id}
                className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs hover:border-brand-300 transition space-y-3"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <span className="font-mono text-xs font-bold text-brand-700 bg-brand-50 px-2 py-0.5 rounded-lg border border-brand-200">
                      {k.nik}
                    </span>
                    <h3 className="text-base font-extrabold text-slate-900 mt-1">{k.nama}</h3>
                    <p className="text-xs text-slate-500 font-medium flex items-center gap-1 mt-0.5">
                      <Briefcase className="w-3.5 h-3.5 text-slate-400" />
                      {k.jabatan}
                    </p>
                  </div>

                  <span
                    className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                      k.aktif
                        ? 'bg-emerald-100 text-emerald-800'
                        : 'bg-red-100 text-red-700'
                    }`}
                  >
                    {k.aktif ? 'Aktif' : 'Resign'}
                  </span>
                </div>

                <div className="bg-slate-50 p-3 rounded-xl border border-slate-200/80 text-xs space-y-1">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Tanggal Masuk:</span>
                    <span className="font-semibold text-slate-800">{k.tanggal_masuk}</span>
                  </div>
                  {k.tanggal_resign && (
                    <div className="flex justify-between text-red-600">
                      <span>Tanggal Resign:</span>
                      <span className="font-bold">{k.tanggal_resign}</span>
                    </div>
                  )}
                  <div className="flex justify-between pt-1 border-t border-slate-200">
                    <span className="text-slate-500">Standar Gaji Pokok:</span>
                    <span className="font-mono font-bold text-slate-900">
                      {formatRupiah(k.gaji_pokok_standar || 0)}
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2 pt-1 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => {
                      handleOpenNewPayrollModal();
                      handleSelectKaryawan(k.id);
                    }}
                    className="flex items-center gap-1 px-3 py-1.5 bg-brand-50 hover:bg-brand-100 text-brand-700 rounded-lg text-xs font-bold transition"
                  >
                    <Banknote className="w-3.5 h-3.5" />
                    <span>Buat Slip</span>
                  </button>
                  {currentRole === 'admin' && (
                    <>
                      <button
                        type="button"
                        onClick={() => handleOpenKaryawanModal(k)}
                        className="p-1.5 text-slate-400 hover:text-blue-600 rounded-lg hover:bg-slate-100"
                        title="Edit Karyawan"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteKaryawan(k.id, k.nama)}
                        className="p-1.5 text-slate-400 hover:text-red-600 rounded-lg hover:bg-slate-100"
                        title="Hapus Karyawan"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* MODAL INPUT / HITUNG SLIP GAJI */}
      {/* ==================================================================== */}
      {isPayrollModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-4xl w-full p-5 sm:p-6 space-y-5 border border-slate-200 shadow-2xl my-auto animate-fade-in max-h-[92vh] overflow-y-auto">
            {/* Header Modal */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
                  <Receipt className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-slate-900">
                    {editingPayrollId ? 'Edit Data Slip Gaji' : 'Hitung & Terbitkan Slip Gaji'}
                  </h3>
                  <p className="text-xs text-slate-500">
                    Semua variabel pendapatan dan potongan absensi terhitung otomatis ke Take Home Pay (THP)
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsPayrollModalOpen(false)}
                className="p-2 text-slate-400 hover:text-slate-700 rounded-xl hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitPayroll} className="space-y-5 text-xs">
              {/* Bagian 1: Pilih Karyawan & Periode */}
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                  <div className="sm:col-span-2 md:col-span-1">
                    <div className="flex items-center justify-between mb-1">
                      <label className="font-bold text-slate-700 uppercase">
                        Karyawan / Penerima Gaji *
                      </label>
                      <span className="text-[10px] text-emerald-600 font-bold">
                        Bisa diketik sendiri
                      </span>
                    </div>

                    {/* Mode Selector Toggle: Pilih Master vs Ketik Sendiri */}
                    <div className="flex rounded-xl bg-slate-200/90 p-0.5 mb-1.5 text-[11px] font-bold">
                      <button
                        type="button"
                        onClick={() => {
                          setKaryawanInputMode('pilih');
                        }}
                        className={`flex-1 py-1 rounded-lg transition flex items-center justify-center gap-1 ${
                          karyawanInputMode === 'pilih'
                            ? 'bg-white text-slate-900 shadow-2xs'
                            : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        <Users className="w-3.5 h-3.5 text-blue-600" />
                        <span>Pilih dari Master</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          handleSelectKaryawan('manual');
                        }}
                        className={`flex-1 py-1 rounded-lg transition flex items-center justify-center gap-1 ${
                          karyawanInputMode === 'manual'
                            ? 'bg-emerald-600 text-white shadow-2xs'
                            : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                        <span>✍️ Ketik Sendiri</span>
                      </button>
                    </div>

                    {karyawanInputMode === 'pilih' ? (
                      <select
                        value={formKaryawanId}
                        onChange={(e) => {
                          if (e.target.value === 'manual') {
                            handleSelectKaryawan('manual');
                          } else {
                            handleSelectKaryawan(e.target.value);
                          }
                        }}
                        className="w-full px-3 py-2 text-xs font-semibold rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-brand-500"
                      >
                        <option value="">-- Pilih Karyawan (Otomatis Isi Data) --</option>
                        {karyawanList.map(k => (
                          <option key={k.id} value={k.id}>
                            {k.nama} ({k.nik} - {k.jabatan})
                          </option>
                        ))}
                        <option value="manual" className="font-bold text-emerald-700 bg-emerald-50">
                          ✍️ + Ketik Nama Karyawan Sendiri / Baru (Manual)
                        </option>
                      </select>
                    ) : (
                      <div className="space-y-1">
                        <div className="relative">
                          <input
                            type="text"
                            placeholder="Ketik Nama Lengkap Karyawan..."
                            value={formNama}
                            onChange={(e) => setFormNama(e.target.value)}
                            required
                            autoFocus
                            className="w-full px-3 py-2 text-xs font-bold rounded-xl border-2 border-emerald-500 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-400 placeholder:text-slate-400"
                          />
                        </div>
                        <div className="flex items-center justify-between text-[10px] text-emerald-700">
                          <span>Mode nama sendiri aktif</span>
                          <button
                            type="button"
                            onClick={() => setKaryawanInputMode('pilih')}
                            className="underline hover:text-emerald-900 font-semibold cursor-pointer"
                          >
                            Pilih dari master
                          </button>
                        </div>
                      </div>
                    )}
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 uppercase mb-1">
                      Periode Bulan *
                    </label>
                    <input
                      type="text"
                      placeholder="Contoh: November 2026"
                      value={formPeriode}
                      onChange={(e) => setFormPeriode(e.target.value)}
                      required
                      className="w-full px-3 py-2 text-xs font-semibold rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-brand-500"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 uppercase mb-1">
                      Tanggal Pembayaran *
                    </label>
                    <input
                      type="date"
                      value={formTglBayar}
                      onChange={(e) => setFormTglBayar(e.target.value)}
                      required
                      className="w-full px-3 py-2 text-xs font-semibold rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-brand-500"
                    />
                  </div>
                </div>

                {/* Detail Identitas Karyawan */}
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2 pt-2 border-t border-slate-200/80">
                  <div>
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] text-slate-500 uppercase font-bold block">NIK *</span>
                      <button
                        type="button"
                        onClick={() => setFormNik(`KB-${new Date().getFullYear()}${Math.floor(100 + Math.random() * 900)}`)}
                        className="text-[9px] text-brand-600 hover:underline font-semibold cursor-pointer"
                        title="Generate NIK otomatis"
                      >
                        Auto NIK
                      </button>
                    </div>
                    <input
                      type="text"
                      value={formNik}
                      onChange={(e) => setFormNik(e.target.value)}
                      required
                      placeholder="KB-2023001"
                      className="w-full px-2 py-1 text-xs font-mono font-bold rounded-lg border border-slate-200 bg-white"
                    />
                  </div>

                  <div className="col-span-2 sm:col-span-1 md:col-span-1">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] text-slate-500 uppercase font-bold block">Nama Lengkap *</span>
                      <span className="text-[9px] text-emerald-600 font-semibold">Bisa diedit</span>
                    </div>
                    <input
                      type="text"
                      value={formNama}
                      onChange={(e) => setFormNama(e.target.value)}
                      required
                      placeholder="Ketik Nama Karyawan"
                      className="w-full px-2 py-1 text-xs font-bold rounded-lg border border-slate-200 bg-white focus:ring-1 focus:ring-brand-500"
                    />
                  </div>

                  <div>
                    <span className="text-[10px] text-slate-500 uppercase font-bold block">Jabatan *</span>
                    <input
                      type="text"
                      value={formJabatan}
                      onChange={(e) => setFormJabatan(e.target.value)}
                      required
                      placeholder="Driver / Staf"
                      list="jabatan-list-suggestions"
                      className="w-full px-2 py-1 text-xs font-semibold rounded-lg border border-slate-200 bg-white focus:ring-1 focus:ring-brand-500"
                    />
                    <datalist id="jabatan-list-suggestions">
                      <option value="Driver / Supir Ekspedisi" />
                      <option value="Koordinator Gudang Barat" />
                      <option value="Staf Gudang & Barcode Operator" />
                      <option value="Operator Mesin Busa" />
                      <option value="Supervisor Gudang & Logistik" />
                      <option value="Staf Administrasi & Kasir" />
                      <option value="Helper Gudang" />
                    </datalist>
                  </div>

                  <div>
                    <span className="text-[10px] text-slate-500 uppercase font-bold block">Tanggal Masuk *</span>
                    <input
                      type="date"
                      value={formTglMasuk}
                      onChange={(e) => setFormTglMasuk(e.target.value)}
                      required
                      className="w-full px-2 py-1 text-xs rounded-lg border border-slate-200 bg-white"
                    />
                  </div>

                  <div>
                    <span className="text-[10px] text-slate-500 uppercase font-bold block">Tanggal Resign</span>
                    <input
                      type="date"
                      value={formTglResign}
                      onChange={(e) => setFormTglResign(e.target.value)}
                      className="w-full px-2 py-1 text-xs rounded-lg border border-slate-200 bg-white text-red-600 font-semibold"
                    />
                  </div>
                </div>

                {/* Auto Save Checkbox jika mode manual / nama sendiri */}
                {(!formKaryawanId || karyawanInputMode === 'manual') && (
                  <div className="pt-2 border-t border-slate-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-[11px]">
                    <label className="flex items-center gap-2 cursor-pointer text-slate-700 font-semibold">
                      <input
                        type="checkbox"
                        checked={autoSaveKaryawanBaru}
                        onChange={(e) => setAutoSaveKaryawanBaru(e.target.checked)}
                        className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                      />
                      <span>Simpan otomatis nama karyawan ini ke Master Data Karyawan</span>
                    </label>
                    <span className="text-[10px] text-slate-500">
                      Tersimpan permanen untuk periode berikutnya
                    </span>
                  </div>
                )}
              </div>

              {/* Bagian 2: 2 Kolom Berdampingan (PENDAPATAN vs POTONGAN) */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* KOLOM KIRI: PENDAPATAN */}
                <div className="p-4 rounded-2xl border border-blue-200 bg-blue-50/30 space-y-3">
                  <div className="flex items-center justify-between border-b border-blue-200 pb-2">
                    <span className="font-extrabold text-blue-900 uppercase text-xs flex items-center gap-1.5">
                      <TrendingUp className="w-4 h-4 text-blue-600" />
                      Komponen Pendapatan
                    </span>
                    <span className="font-mono font-bold text-xs text-blue-700 bg-blue-100 px-2 py-0.5 rounded-md">
                      Subtotal: {formatRupiah(calcJumlahPendapatan)}
                    </span>
                  </div>

                  <div className="space-y-2">
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-600 mb-0.5">Gaji Pokok (Rp)</label>
                      <input
                        type="number"
                        min="0"
                        value={formGajiPokok || ''}
                        onChange={(e) => setFormGajiPokok(Number(e.target.value))}
                        className="w-full px-3 py-1.5 text-xs font-mono font-bold rounded-xl border border-slate-200 bg-white focus:ring-1 focus:ring-blue-500"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-600 mb-0.5">Uang Makan (Rp)</label>
                        <input
                          type="number"
                          min="0"
                          value={formUangMakan || ''}
                          onChange={(e) => setFormUangMakan(Number(e.target.value))}
                          className="w-full px-3 py-1.5 text-xs font-mono font-semibold rounded-xl border border-slate-200 bg-white focus:ring-1 focus:ring-blue-500"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-600 mb-0.5">Transport (Rp)</label>
                        <input
                          type="number"
                          min="0"
                          value={formTransport || ''}
                          onChange={(e) => setFormTransport(Number(e.target.value))}
                          className="w-full px-3 py-1.5 text-xs font-mono font-semibold rounded-xl border border-slate-200 bg-white focus:ring-1 focus:ring-blue-500"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-600 mb-0.5">Tunjangan Jabatan (Rp)</label>
                        <input
                          type="number"
                          min="0"
                          value={formTunjanganJabatan || ''}
                          onChange={(e) => setFormTunjanganJabatan(Number(e.target.value))}
                          className="w-full px-3 py-1.5 text-xs font-mono font-semibold rounded-xl border border-slate-200 bg-white focus:ring-1 focus:ring-blue-500"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-600 mb-0.5">Tunjangan Operasional (Rp)</label>
                        <input
                          type="number"
                          min="0"
                          value={formTunjanganOperasional || ''}
                          onChange={(e) => setFormTunjanganOperasional(Number(e.target.value))}
                          className="w-full px-3 py-1.5 text-xs font-mono font-semibold rounded-xl border border-slate-200 bg-white focus:ring-1 focus:ring-blue-500"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-600 mb-0.5">THR (Rp)</label>
                        <input
                          type="number"
                          min="0"
                          value={formThr || ''}
                          onChange={(e) => setFormThr(Number(e.target.value))}
                          placeholder="0"
                          className="w-full px-3 py-1.5 text-xs font-mono font-semibold rounded-xl border border-slate-200 bg-white focus:ring-1 focus:ring-blue-500"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-600 mb-0.5">Uang Lembur (Rp)</label>
                        <input
                          type="number"
                          min="0"
                          value={formLembur || ''}
                          onChange={(e) => setFormLembur(Number(e.target.value))}
                          placeholder="0"
                          className="w-full px-3 py-1.5 text-xs font-mono font-semibold rounded-xl border border-slate-200 bg-white focus:ring-1 focus:ring-blue-500"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* KOLOM KANAN: POTONGAN ABSENSI & LAINNYA */}
                <div className="p-4 rounded-2xl border border-red-200 bg-red-50/30 space-y-3">
                  <div className="flex items-center justify-between border-b border-red-200 pb-2">
                    <span className="font-extrabold text-red-900 uppercase text-xs flex items-center gap-1.5">
                      <CreditCard className="w-4 h-4 text-red-600" />
                      Komponen Potongan Gaji
                    </span>
                    <span className="font-mono font-bold text-xs text-red-700 bg-red-100 px-2 py-0.5 rounded-md">
                      Total: -{formatRupiah(calcTotalPotongan)}
                    </span>
                  </div>

                  {/* Rincian Potongan Absensi */}
                  <div className="bg-white p-3 rounded-xl border border-red-100 space-y-2">
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                      Potongan Absensi (Hari & Nominal)
                    </span>

                    {/* Alpha */}
                    <div className="flex items-center gap-2">
                      <span className="w-14 text-[11px] font-semibold text-slate-700">Alpha:</span>
                      <input
                        type="number"
                        min="0"
                        value={formHariAlpha || ''}
                        onChange={(e) => handleAutoCalcAlpha(Number(e.target.value))}
                        placeholder="0"
                        className="w-12 px-1.5 py-1 text-center font-bold font-mono rounded-lg border border-slate-200 text-xs"
                      />
                      <span className="text-[10px] text-slate-400">hr</span>
                      <input
                        type="number"
                        min="0"
                        value={formPotonganAlpha || ''}
                        onChange={(e) => setFormPotonganAlpha(Number(e.target.value))}
                        placeholder="Rp Potongan"
                        className="flex-1 px-2 py-1 text-xs font-mono rounded-lg border border-slate-200 text-red-700"
                      />
                    </div>

                    {/* Izin */}
                    <div className="flex items-center gap-2">
                      <span className="w-14 text-[11px] font-semibold text-slate-700">Izin:</span>
                      <input
                        type="number"
                        min="0"
                        value={formHariIzin || ''}
                        onChange={(e) => setFormHariIzin(Number(e.target.value))}
                        placeholder="0"
                        className="w-12 px-1.5 py-1 text-center font-bold font-mono rounded-lg border border-slate-200 text-xs"
                      />
                      <span className="text-[10px] text-slate-400">hr</span>
                      <input
                        type="number"
                        min="0"
                        value={formPotonganIzin || ''}
                        onChange={(e) => setFormPotonganIzin(Number(e.target.value))}
                        placeholder="Rp Potongan"
                        className="flex-1 px-2 py-1 text-xs font-mono rounded-lg border border-slate-200 text-red-700"
                      />
                    </div>

                    {/* Sakit */}
                    <div className="flex items-center gap-2">
                      <span className="w-14 text-[11px] font-semibold text-slate-700">Sakit:</span>
                      <input
                        type="number"
                        min="0"
                        value={formHariSakit || ''}
                        onChange={(e) => setFormHariSakit(Number(e.target.value))}
                        placeholder="0"
                        className="w-12 px-1.5 py-1 text-center font-bold font-mono rounded-lg border border-slate-200 text-xs"
                      />
                      <span className="text-[10px] text-slate-400">hr</span>
                      <input
                        type="number"
                        min="0"
                        value={formPotonganSakit || ''}
                        onChange={(e) => setFormPotonganSakit(Number(e.target.value))}
                        placeholder="Rp Potongan"
                        className="flex-1 px-2 py-1 text-xs font-mono rounded-lg border border-slate-200 text-red-700"
                      />
                    </div>

                    {/* WFH */}
                    <div className="flex items-center gap-2">
                      <span className="w-14 text-[11px] font-semibold text-slate-700">WFH:</span>
                      <input
                        type="number"
                        min="0"
                        value={formHariWfh || ''}
                        onChange={(e) => setFormHariWfh(Number(e.target.value))}
                        placeholder="0"
                        className="w-12 px-1.5 py-1 text-center font-bold font-mono rounded-lg border border-slate-200 text-xs"
                      />
                      <span className="text-[10px] text-slate-400">hr</span>
                      <input
                        type="number"
                        min="0"
                        value={formPotonganWfh || ''}
                        onChange={(e) => setFormPotonganWfh(Number(e.target.value))}
                        placeholder="Rp Potongan"
                        className="flex-1 px-2 py-1 text-xs font-mono rounded-lg border border-slate-200 text-red-700"
                      />
                    </div>
                  </div>

                  {/* Potongan Wajib & Lainnya */}
                  <div className="space-y-2">
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-600 mb-0.5">Jamsostek (Rp)</label>
                        <input
                          type="number"
                          min="0"
                          value={formJamsostek || ''}
                          onChange={(e) => setFormJamsostek(Number(e.target.value))}
                          className="w-full px-3 py-1.5 text-xs font-mono rounded-xl border border-slate-200 bg-white"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-600 mb-0.5">BPJS Kesehatan (Rp)</label>
                        <input
                          type="number"
                          min="0"
                          value={formBpjs || ''}
                          onChange={(e) => setFormBpjs(Number(e.target.value))}
                          className="w-full px-3 py-1.5 text-xs font-mono rounded-xl border border-slate-200 bg-white"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-600 mb-0.5">Pinjaman / Kasbon (Rp)</label>
                        <input
                          type="number"
                          min="0"
                          value={formPinjaman || ''}
                          onChange={(e) => setFormPinjaman(Number(e.target.value))}
                          placeholder="0"
                          className="w-full px-3 py-1.5 text-xs font-mono rounded-xl border border-slate-200 bg-white"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-600 mb-0.5">Potongan Transport (Rp)</label>
                        <input
                          type="number"
                          min="0"
                          value={formPotonganTransport || ''}
                          onChange={(e) => setFormPotonganTransport(Number(e.target.value))}
                          placeholder="0"
                          className="w-full px-3 py-1.5 text-xs font-mono rounded-xl border border-slate-200 bg-white"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Bagian 3: Live Highlight Take Home Pay (THP) */}
              <div className="p-4 bg-emerald-50 rounded-2xl border-2 border-emerald-400 space-y-1.5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                  <div>
                    <span className="text-xs font-bold text-emerald-800 uppercase tracking-wider block">
                      Take Home Pay (THP) Karyawan
                    </span>
                    <span className="text-[11px] text-emerald-700">
                      = Jumlah Pendapatan ({formatRupiah(calcJumlahPendapatan)}) - Total Potongan ({formatRupiah(calcTotalPotongan)})
                    </span>
                  </div>
                  <span className="text-2xl font-black font-mono text-emerald-800">
                    {formatRupiah(calcTakeHomePay)}
                  </span>
                </div>

                <div className="pt-2 border-t border-emerald-200 text-[11px] text-emerald-800 italic">
                  Terbilang: <strong>{terbilang(calcTakeHomePay)}</strong>
                </div>
              </div>

              {/* Catatan */}
              <div>
                <label className="block font-semibold text-slate-600 mb-1">Catatan Tambahan (Opsional)</label>
                <input
                  type="text"
                  placeholder="Contoh: Termasuk lembur kiriman kasur luar kota"
                  value={formCatatan}
                  onChange={(e) => setFormCatatan(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 bg-white"
                />
              </div>

              {/* Submit Buttons */}
              <div className="flex items-center justify-end gap-3 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsPayrollModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition shadow-sm active:scale-95 flex items-center gap-1.5"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Simpan & Terbitkan Slip Gaji</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* MODAL PREVIEW SLIP GAJI */}
      {/* ==================================================================== */}
      {previewPayroll && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 space-y-5 border border-slate-200 shadow-2xl my-auto animate-fade-in max-h-[92vh] overflow-y-auto">
            {/* Header Preview */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <Receipt className="w-5 h-5 text-emerald-600" />
                <h3 className="font-extrabold text-base text-slate-900">
                  Preview Slip Gaji Resmi
                </h3>
              </div>
              <button
                onClick={() => setPreviewPayroll(null)}
                className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Slip Paper Visual */}
            <div className="p-6 bg-slate-50/70 rounded-2xl border border-slate-200 space-y-4 text-xs">
              {/* Kop Win's Group */}
              <div className="text-center pb-3 border-b border-slate-300">
                <h2 className="text-base font-extrabold text-blue-900 tracking-tight">WIN'S GROUP — KASUR BUSA</h2>
                <p className="text-[10px] text-slate-500">Gudang Distribusi & Logistik Kasur Busa Berkualitas</p>
                <div className="text-[11px] font-bold text-slate-800 uppercase tracking-wider mt-1 bg-blue-50 py-0.5 rounded">
                  SLIP GAJI KARYAWAN · PERIODE: {previewPayroll.periode_bulan}
                </div>
              </div>

              {/* Identitas */}
              <div className="grid grid-cols-2 gap-2 text-[11px] bg-white p-3 rounded-xl border border-slate-200">
                <div>
                  <span className="text-slate-400 block">NIK / Nama:</span>
                  <span className="font-mono font-bold text-slate-800">{previewPayroll.nik}</span> - <span className="font-bold text-slate-900">{previewPayroll.nama}</span>
                </div>
                <div>
                  <span className="text-slate-400 block">Jabatan:</span>
                  <span className="font-semibold text-slate-800">{previewPayroll.jabatan}</span>
                </div>
                <div>
                  <span className="text-slate-400 block">Tanggal Masuk:</span>
                  <span className="font-medium text-slate-800">{previewPayroll.tanggal_masuk}</span>
                </div>
                <div>
                  <span className="text-slate-400 block">Tanggal Resign:</span>
                  <span className="font-medium text-slate-800">{previewPayroll.tanggal_resign || '-'}</span>
                </div>
              </div>

              {/* Rincian Dual Table */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Penerimaan */}
                <div className="bg-white p-3 rounded-xl border border-blue-200 space-y-1">
                  <span className="font-bold text-blue-800 block border-b pb-1 mb-1">PENERIMAAN</span>
                  <div className="flex justify-between">
                    <span className="text-slate-600">Gaji Pokok:</span>
                    <span className="font-mono font-bold">{formatRupiah(previewPayroll.gaji_pokok)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-600">Uang Makan:</span>
                    <span className="font-mono">{formatRupiah(previewPayroll.uang_makan)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-600">Transport:</span>
                    <span className="font-mono">{formatRupiah(previewPayroll.transport)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-600">Tunjangan Jabatan:</span>
                    <span className="font-mono">{formatRupiah(previewPayroll.tunjangan_jabatan)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-600">Tunjangan Operasional:</span>
                    <span className="font-mono">{formatRupiah(previewPayroll.tunjangan_operasional)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-600">THR:</span>
                    <span className="font-mono">{formatRupiah(previewPayroll.thr)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-600">Lembur:</span>
                    <span className="font-mono">{formatRupiah(previewPayroll.lembur)}</span>
                  </div>
                  <div className="flex justify-between pt-1 border-t border-blue-200 font-bold text-blue-900">
                    <span>Jumlah Pendapatan:</span>
                    <span className="font-mono">{formatRupiah(previewPayroll.jumlah_pendapatan)}</span>
                  </div>
                </div>

                {/* Potongan */}
                <div className="bg-white p-3 rounded-xl border border-red-200 space-y-1">
                  <span className="font-bold text-red-800 block border-b pb-1 mb-1">POTONGAN</span>
                  <div className="flex justify-between text-slate-600">
                    <span>Potongan Alpha ({previewPayroll.hari_alpha} hr):</span>
                    <span className="font-mono text-red-700">{formatRupiah(previewPayroll.potongan_alpha)}</span>
                  </div>
                  <div className="flex justify-between text-slate-600">
                    <span>Potongan Izin ({previewPayroll.hari_izin} hr):</span>
                    <span className="font-mono text-red-700">{formatRupiah(previewPayroll.potongan_izin)}</span>
                  </div>
                  <div className="flex justify-between text-slate-600">
                    <span>Potongan Sakit ({previewPayroll.hari_sakit} hr):</span>
                    <span className="font-mono text-red-700">{formatRupiah(previewPayroll.potongan_sakit)}</span>
                  </div>
                  <div className="flex justify-between text-slate-600">
                    <span>Potongan WFH ({previewPayroll.hari_wfh} hr):</span>
                    <span className="font-mono text-red-700">{formatRupiah(previewPayroll.potongan_wfh)}</span>
                  </div>
                  <div className="flex justify-between text-slate-600">
                    <span>Jamsostek:</span>
                    <span className="font-mono text-red-700">{formatRupiah(previewPayroll.jamsostek)}</span>
                  </div>
                  <div className="flex justify-between text-slate-600">
                    <span>BPJS Kesehatan:</span>
                    <span className="font-mono text-red-700">{formatRupiah(previewPayroll.bpjs)}</span>
                  </div>
                  <div className="flex justify-between text-slate-600">
                    <span>Pinjaman:</span>
                    <span className="font-mono text-red-700">{formatRupiah(previewPayroll.pinjaman)}</span>
                  </div>
                  <div className="flex justify-between text-slate-600">
                    <span>Potongan Transport:</span>
                    <span className="font-mono text-red-700">{formatRupiah(previewPayroll.potongan_transport)}</span>
                  </div>
                  <div className="flex justify-between pt-1 border-t border-red-200 font-bold text-red-900">
                    <span>Total Potongan:</span>
                    <span className="font-mono">{formatRupiah(previewPayroll.total_potongan)}</span>
                  </div>
                </div>
              </div>

              {/* Highlight THP */}
              <div className="p-3 bg-emerald-100 rounded-xl border border-emerald-300 flex items-center justify-between">
                <div>
                  <span className="font-bold text-emerald-900 block">TAKE HOME PAY (THP)</span>
                  <span className="text-[10px] text-emerald-800 italic">Terbilang: {terbilang(previewPayroll.take_home_pay)}</span>
                </div>
                <span className="text-xl font-black font-mono text-emerald-900">
                  {formatRupiah(previewPayroll.take_home_pay)}
                </span>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => handlePrintSlip(previewPayroll)}
                className="flex-1 py-3 rounded-2xl bg-brand-600 hover:bg-brand-700 text-white font-bold text-xs flex items-center justify-center gap-2 transition shadow-md active:scale-95"
              >
                <Printer className="w-4 h-4" />
                <span>Cetak / Unduh Slip Gaji (PDF)</span>
              </button>
              <button
                type="button"
                onClick={() => setPreviewPayroll(null)}
                className="px-5 py-3 rounded-2xl border border-slate-200 font-bold text-xs text-slate-600 hover:bg-slate-100"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* MODAL TAMBAH / EDIT MASTER KARYAWAN */}
      {/* ==================================================================== */}
      {isKaryawanModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 space-y-4 border border-slate-200 shadow-2xl animate-fade-in">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <Users className="w-5 h-5 text-brand-600" />
                <h3 className="font-bold text-base text-slate-900">
                  {editingKaryawanId ? 'Edit Data Karyawan' : 'Tambah Karyawan Baru'}
                </h3>
              </div>
              <button onClick={() => setIsKaryawanModalOpen(false)} className="text-slate-400 hover:text-slate-700">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitKaryawan} className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 uppercase mb-1">NIK *</label>
                  <input
                    type="text"
                    value={karNik}
                    onChange={(e) => setKarNik(e.target.value)}
                    required
                    className="w-full px-3 py-2 text-xs font-mono font-bold rounded-xl border border-slate-200 bg-white"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 uppercase mb-1">Nama Lengkap *</label>
                  <input
                    type="text"
                    value={karNama}
                    onChange={(e) => setKarNama(e.target.value)}
                    required
                    className="w-full px-3 py-2 text-xs font-semibold rounded-xl border border-slate-200 bg-white"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 uppercase mb-1">Jabatan *</label>
                <input
                  type="text"
                  value={karJabatan}
                  onChange={(e) => setKarJabatan(e.target.value)}
                  required
                  placeholder="Contoh: Driver / Staf Gudang / Koordinator"
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 bg-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 uppercase mb-1">Tanggal Masuk *</label>
                  <input
                    type="date"
                    value={karTglMasuk}
                    onChange={(e) => setKarTglMasuk(e.target.value)}
                    required
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 bg-white"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 uppercase mb-1">Tanggal Resign (Jika Ada)</label>
                  <input
                    type="date"
                    value={karTglResign}
                    onChange={(e) => setKarTglResign(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 bg-white text-red-600"
                  />
                </div>
              </div>

              <div className="pt-2 border-t border-slate-100">
                <span className="text-[10px] font-bold text-slate-500 uppercase block mb-2">Standar Gaji & Tunjangan Bulanan</span>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-slate-600 mb-0.5">Gaji Pokok (Rp)</label>
                    <input
                      type="number"
                      min="0"
                      value={karGajiPokok}
                      onChange={(e) => setKarGajiPokok(Number(e.target.value))}
                      className="w-full px-2.5 py-1.5 text-xs font-mono font-bold rounded-lg border border-slate-200"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-600 mb-0.5">Uang Makan (Rp)</label>
                    <input
                      type="number"
                      min="0"
                      value={karUangMakan}
                      onChange={(e) => setKarUangMakan(Number(e.target.value))}
                      className="w-full px-2.5 py-1.5 text-xs font-mono rounded-lg border border-slate-200"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-600 mb-0.5">Transport (Rp)</label>
                    <input
                      type="number"
                      min="0"
                      value={karTransport}
                      onChange={(e) => setKarTransport(Number(e.target.value))}
                      className="w-full px-2.5 py-1.5 text-xs font-mono rounded-lg border border-slate-200"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-600 mb-0.5">Tunjangan Jabatan (Rp)</label>
                    <input
                      type="number"
                      min="0"
                      value={karTunjanganJabatan}
                      onChange={(e) => setKarTunjanganJabatan(Number(e.target.value))}
                      className="w-full px-2.5 py-1.5 text-xs font-mono rounded-lg border border-slate-200"
                    />
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="karAktif"
                  checked={karAktif}
                  onChange={(e) => setKarAktif(e.target.checked)}
                  className="rounded text-brand-600"
                />
                <label htmlFor="karAktif" className="font-semibold text-slate-700 cursor-pointer">
                  Karyawan Aktif Bekerja
                </label>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsKaryawanModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 font-bold"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-brand-600 hover:bg-brand-700 text-white font-bold transition shadow-xs"
                >
                  Simpan Karyawan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default PayrollView;
