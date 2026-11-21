import React, { useState, useEffect } from 'react';
import {
  LayoutDashboard,
  ScanLine,
  Package,
  RotateCcw,
  FileSpreadsheet,
  Banknote,
  Users,
  Menu,
  X,
  UserCheck,
  LogOut,
  Crown,
  Sparkles,
  ChevronDown,
  Check,
} from 'lucide-react';
import { UserRole, UserAccount, OFFICIAL_ACCOUNTS } from './types';
import { isSupabaseConfigured } from './lib/supabase';
import { api } from './services/api';
import { DashboardView } from './views/DashboardView';
import { BarangKeluarView } from './views/BarangKeluarView';
import { PenerimaanView } from './views/PenerimaanView';
import { PengembalianView } from './views/PengembalianView';
import { LaporanView } from './views/LaporanView';
import { KaryawanView } from './views/KaryawanView';
import { PayrollView } from './views/PayrollView';
import { LoginView } from './views/LoginView';

export function App() {
  const [currentUser, setCurrentUser] = useState<UserAccount | null>(() => api.getAuthUser());
  const [currentView, setCurrentView] = useState<string>('dashboard');
  const [currentRole, setCurrentRole] = useState<UserRole>(() => currentUser?.role || 'admin');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isMobileAccountOpen, setIsMobileAccountOpen] = useState(false);
  const [activePoIdForReceive, setActivePoIdForReceive] = useState<string | undefined>(undefined);
  const [activeKaryawanIdForPayroll, setActiveKaryawanIdForPayroll] = useState<string | undefined>(undefined);

  useEffect(() => {
    if (currentUser) {
      setCurrentRole(currentUser.role);
    }
  }, [currentUser]);

  const handleNavigate = (view: string, extra?: any) => {
    if (view === 'penerimaan' && extra?.poId) {
      setActivePoIdForReceive(extra.poId);
    } else if (view !== 'penerimaan') {
      setActivePoIdForReceive(undefined);
    }

    if (view === 'payroll' && extra?.karyawanId) {
      setActiveKaryawanIdForPayroll(extra.karyawanId);
    } else if (view !== 'payroll') {
      setActiveKaryawanIdForPayroll(undefined);
    }

    setCurrentView(view);
    setIsMobileMenuOpen(false);
    setIsMobileAccountOpen(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSwitchAccount = async (targetEmail: string) => {
    const switched = await api.switchAccount(targetEmail);
    if (switched) {
      setCurrentUser(switched);
      setCurrentRole(switched.role);
      setIsMobileAccountOpen(false);
    }
  };

  const handleLogout = async () => {
    setIsMobileAccountOpen(false);
    if (confirm(`Yakin ingin logout dari akun ${currentUser?.nama || ''}?`)) {
      await api.logout();
      setCurrentUser(null);
    }
  };

  // Jika belum login, tampilkan halaman Login
  if (!currentUser) {
    return (
      <LoginView
        onLoginSuccess={(user) => {
          setCurrentUser(user);
          setCurrentRole(user.role);
        }}
      />
    );
  }

  const navItems = [
    { id: 'dashboard', label: 'Dashboard Stok', icon: LayoutDashboard },
    { id: 'penerimaan', label: 'Catat Barang Datang', icon: Package },
    { id: 'scan_keluar', label: 'Scan Barang Keluar', icon: ScanLine, highlight: true },
    { id: 'retur', label: 'Pengembalian (Retur)', icon: RotateCcw },
    { id: 'laporan', label: 'Laporan & Rekap', icon: FileSpreadsheet },
    { id: 'karyawan', label: 'Data Karyawan', icon: Users },
    { id: 'payroll', label: 'Payroll & Slip Gaji', icon: Banknote },
  ];

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans text-slate-800">
      {/* Top Navbar Header (2 Tingkat Rapi & Huruf BOLD Jelas untuk Orang Tua) */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200/90 shadow-xs">
        {/* Baris 1: Logo Brand & Profil Akun Pengguna */}
        <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-2 sm:gap-4">
          {/* Logo & Brand */}
          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="lg:hidden p-2 -ml-1 rounded-xl text-slate-600 hover:text-slate-900 hover:bg-slate-100"
              title="Menu Navigasi"
            >
              {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>

            <button
              onClick={() => handleNavigate('dashboard')}
              className="flex items-center gap-2 sm:gap-3 text-left group shrink-0"
            >
              <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl overflow-hidden bg-white border border-slate-200/90 shadow-2xs flex items-center justify-center group-hover:scale-105 transition shrink-0 p-1">
                <img
                  src="/logo.png"
                  alt="Win's Group"
                  className="w-full h-full object-contain"
                />
              </div>
              <div className="shrink-0">
                <span className="font-black text-base sm:text-lg tracking-tight text-slate-900 group-hover:text-brand-600 transition flex items-center gap-1.5 whitespace-nowrap">
                  Win's Group
                </span>
                <span className="text-[10px] sm:text-xs text-slate-500 block font-bold -mt-0.5 tracking-wide whitespace-nowrap">
                  Gudang Kasur Busa
                </span>
              </div>
            </button>
          </div>

          {/* Right Header: Profile, Switch Account & Database Status */}
          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            {/* Database indicator (Desktop & Tablet) */}
            <div
              className={`hidden md:flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border ${
                isSupabaseConfigured
                  ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                  : 'bg-amber-50 text-amber-800 border-amber-200'
              }`}
              title={isSupabaseConfigured ? 'Terkoneksi ke Supabase' : 'Berjalan di mode demo lokal'}
            >
              <div
                className={`w-2 h-2 rounded-full ${
                  isSupabaseConfigured ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'
                }`}
              />
              <span>{isSupabaseConfigured ? 'Supabase Live' : 'Demo Lokal'}</span>
            </div>

            {/* DESKTOP (md:flex): Bar Navigasi Akun Lengkap & Rapi */}
            <div className="hidden md:flex items-center gap-2 bg-slate-100/90 p-1 pl-2.5 rounded-2xl border border-slate-200 shadow-2xs">
              <div className="flex items-center gap-2 shrink-0">
                <div
                  className={`w-8 h-8 rounded-xl flex items-center justify-center font-black text-sm text-white shadow-2xs shrink-0 ${
                    currentUser.email === 'raka@wins.com'
                      ? 'bg-cyan-600'
                      : currentUser.role === 'owner'
                      ? 'bg-purple-600'
                      : 'bg-emerald-600'
                  }`}
                  title={`${currentUser.nama} (${currentUser.email})`}
                >
                  {currentUser.nama.charAt(0)}
                </div>

                <div className="flex flex-col text-left">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs sm:text-sm font-black text-slate-900 leading-tight whitespace-nowrap">
                      {currentUser.nama}
                    </span>
                    <span
                      className={`text-[10px] font-black px-1.5 py-0.2 rounded-md uppercase whitespace-nowrap ${
                        currentUser.email === 'raka@wins.com'
                          ? 'bg-cyan-100 text-cyan-800'
                          : currentUser.role === 'owner'
                          ? 'bg-purple-100 text-purple-800'
                          : 'bg-emerald-100 text-emerald-800'
                      }`}
                    >
                      {currentUser.email === 'raka@wins.com'
                        ? 'Developer'
                        : currentUser.role === 'owner'
                        ? 'Owner'
                        : 'Admin'}
                    </span>
                  </div>
                  <span className="text-[11px] text-slate-500 font-mono -mt-0.5 whitespace-nowrap">
                    {currentUser.email}
                  </span>
                </div>
              </div>

              {/* Quick Switch Dropdown */}
              <div className="pl-1 border-l border-slate-200">
                <select
                  value={currentUser.email}
                  onChange={(e) => handleSwitchAccount(e.target.value)}
                  className="bg-transparent text-xs sm:text-sm font-bold text-slate-700 py-1 pl-1 pr-1 focus:outline-none cursor-pointer"
                  title="Ganti Akun Resmi (@wins.com)"
                >
                  {OFFICIAL_ACCOUNTS.map((acc) => (
                    <option key={acc.id} value={acc.email}>
                      Ganti: {acc.nama} ({acc.email === 'raka@wins.com' ? 'Developer' : acc.role === 'owner' ? 'Owner' : 'Admin'})
                    </option>
                  ))}
                </select>
              </div>

              {/* Logout Button */}
              <button
                type="button"
                onClick={handleLogout}
                className="flex items-center gap-1 px-2.5 py-1 text-slate-600 hover:text-red-700 hover:bg-red-50 rounded-xl transition cursor-pointer font-bold text-xs"
                title="Keluar / Logout Akun"
              >
                <LogOut className="w-3.5 h-3.5 text-red-500" />
                <span className="hidden sm:inline">Keluar</span>
              </button>
            </div>

            {/* MOBILE (md:hidden): Tombol Navigasi Akun Ringkas & Popover Menu Rapi (Tidak Terpotong) */}
            <div className="relative md:hidden">
              <button
                type="button"
                onClick={() => setIsMobileAccountOpen(!isMobileAccountOpen)}
                className="flex items-center gap-1.5 bg-slate-100 hover:bg-slate-200/80 p-1 pr-2 rounded-2xl border border-slate-200 transition cursor-pointer active:scale-95 shadow-2xs"
                title="Menu Akun & Ganti Akun"
              >
                <div
                  className={`w-7 h-7 rounded-xl flex items-center justify-center font-black text-xs text-white shadow-2xs shrink-0 ${
                    currentUser.email === 'raka@wins.com'
                      ? 'bg-cyan-600'
                      : currentUser.role === 'owner'
                      ? 'bg-purple-600'
                      : 'bg-emerald-600'
                  }`}
                >
                  {currentUser.nama.charAt(0)}
                </div>
                <div className="flex flex-col text-left">
                  <span className="text-xs font-black text-slate-900 leading-tight max-w-[75px] truncate">
                    {currentUser.nama}
                  </span>
                  <span
                    className={`text-[9px] font-black px-1 rounded-xs uppercase leading-tight inline-block w-fit ${
                      currentUser.email === 'raka@wins.com'
                        ? 'bg-cyan-100 text-cyan-800'
                        : currentUser.role === 'owner'
                        ? 'bg-purple-100 text-purple-800'
                        : 'bg-emerald-100 text-emerald-800'
                    }`}
                  >
                    {currentUser.email === 'raka@wins.com'
                      ? 'Dev'
                      : currentUser.role === 'owner'
                      ? 'Owner'
                      : 'Admin'}
                  </span>
                </div>
                <ChevronDown className={`w-3.5 h-3.5 text-slate-500 transition-transform ${isMobileAccountOpen ? 'rotate-180' : ''}`} />
              </button>

              {/* Popover Dropdown Menu di HP */}
              {isMobileAccountOpen && (
                <>
                  <div
                    className="fixed inset-0 z-40"
                    onClick={() => setIsMobileAccountOpen(false)}
                  />
                  <div className="absolute right-0 top-full mt-2 w-72 max-w-[calc(100vw-1.5rem)] bg-white rounded-2xl border border-slate-200 shadow-xl p-3 z-50 animate-scale-in">
                    {/* Profil Singkat */}
                    <div className="flex items-center gap-2.5 pb-2.5 border-b border-slate-100">
                      <div
                        className={`w-9 h-9 rounded-xl flex items-center justify-center font-black text-sm text-white shrink-0 ${
                          currentUser.email === 'raka@wins.com'
                            ? 'bg-cyan-600'
                            : currentUser.role === 'owner'
                            ? 'bg-purple-600'
                            : 'bg-emerald-600'
                        }`}
                      >
                        {currentUser.nama.charAt(0)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="font-black text-sm text-slate-900 truncate">
                            {currentUser.nama}
                          </span>
                          <span
                            className={`text-[9px] font-black px-1.5 py-0.2 rounded-md uppercase shrink-0 ${
                              currentUser.email === 'raka@wins.com'
                                ? 'bg-cyan-100 text-cyan-800'
                                : currentUser.role === 'owner'
                                ? 'bg-purple-100 text-purple-800'
                                : 'bg-emerald-100 text-emerald-800'
                            }`}
                          >
                            {currentUser.email === 'raka@wins.com'
                              ? 'Developer'
                              : currentUser.role === 'owner'
                              ? 'Owner'
                              : 'Admin'}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-500 font-mono truncate">{currentUser.email}</p>
                      </div>
                    </div>

                    {/* Pilihan Ganti Akun */}
                    <div className="py-2 space-y-1">
                      <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider px-1 block">
                        Ganti Akun Resmi:
                      </span>
                      {OFFICIAL_ACCOUNTS.map((acc) => {
                        const isSelected = acc.email === currentUser.email;
                        return (
                          <button
                            key={acc.id}
                            type="button"
                            onClick={() => handleSwitchAccount(acc.email)}
                            className={`w-full flex items-center justify-between p-2 rounded-xl text-xs font-bold transition cursor-pointer ${
                              isSelected
                                ? 'bg-brand-50 text-brand-700 border border-brand-200'
                                : 'text-slate-700 hover:bg-slate-50'
                            }`}
                          >
                            <div className="flex items-center gap-2 min-w-0">
                              <div
                                className={`w-5 h-5 rounded-lg flex items-center justify-center text-[10px] font-black text-white shrink-0 ${
                                  acc.email === 'raka@wins.com'
                                    ? 'bg-cyan-600'
                                    : acc.role === 'owner'
                                    ? 'bg-purple-600'
                                    : 'bg-emerald-600'
                                }`}
                              >
                                {acc.nama.charAt(0)}
                              </div>
                              <span className="truncate">{acc.nama}</span>
                              <span className="text-[10px] text-slate-400 shrink-0">
                                ({acc.email === 'raka@wins.com' ? 'Developer' : acc.role === 'owner' ? 'Owner' : 'Admin'})
                              </span>
                            </div>
                            {isSelected && <Check className="w-4 h-4 text-brand-600 shrink-0" />}
                          </button>
                        );
                      })}
                    </div>

                    {/* Tombol Logout */}
                    <div className="pt-2 border-t border-slate-100">
                      <button
                        type="button"
                        onClick={handleLogout}
                        className="w-full flex items-center justify-center gap-1.5 py-2 text-xs font-black text-red-600 bg-red-50 hover:bg-red-100 rounded-xl transition cursor-pointer"
                      >
                        <LogOut className="w-3.5 h-3.5" />
                        <span>Keluar dari Akun</span>
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Baris 2: Navigasi Menu Desktop dengan Huruf BOLD BESAR & Ruang Lega (Sangat Mudah Dibaca Orang Tua) */}
        <div className="hidden lg:block border-t border-slate-200/70 bg-slate-50/70">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2">
            <nav className="flex items-center gap-2 overflow-x-auto">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = currentView === item.id;

                return (
                  <button
                    key={item.id}
                    onClick={() => handleNavigate(item.id)}
                    className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-black whitespace-nowrap transition cursor-pointer ${
                      isActive
                        ? 'bg-brand-600 text-white shadow-sm ring-2 ring-brand-600/30 font-black'
                        : item.highlight
                        ? 'bg-slate-900 text-white hover:bg-slate-800 font-black'
                        : 'text-slate-800 hover:text-slate-950 hover:bg-white border border-transparent hover:border-slate-200 font-black'
                    }`}
                  >
                    <Icon className="w-4.5 h-4.5 shrink-0" />
                    <span className="tracking-tight">{item.label}</span>
                  </button>
                );
              })}
            </nav>
          </div>
        </div>
      </header>

      {/* Owner Banner Alert jika login sebagai Wiwin (Owner) */}
      {currentUser.role === 'owner' && (
        <div className="bg-linear-to-r from-purple-50 via-indigo-50 to-purple-50 border-b border-purple-200 px-4 py-2 text-xs font-semibold text-purple-900 shadow-2xs">
          <div className="max-w-7xl mx-auto flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Crown className="w-4 h-4 text-purple-600 shrink-0" />
              <span>
                <strong>Mode Owner (Wiwin):</strong> Hak akses pantau stok, laporan ekspor Excel, dan riwayat transaksi (Read-Only).
              </span>
            </div>
            <span className="px-2 py-0.5 rounded-full bg-purple-200/80 text-purple-800 text-[10px] font-extrabold uppercase shrink-0">
              Read-Only
            </span>
          </div>
        </div>
      )}

      {/* Mobile Drawer Navigation */}
      {isMobileMenuOpen && (
        <div className="lg:hidden fixed inset-0 z-30 bg-slate-900/40 backdrop-blur-xs pt-16">
          <div className="bg-white border-b border-slate-200 p-4 space-y-2 shadow-xl animate-fade-in">
            {/* User Profile in Mobile Drawer */}
            <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200 mb-2 space-y-2.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div
                    className={`w-9 h-9 rounded-xl flex items-center justify-center font-black text-sm text-white ${
                      currentUser.email === 'raka@wins.com'
                        ? 'bg-cyan-600'
                        : currentUser.role === 'owner'
                        ? 'bg-purple-600'
                        : 'bg-emerald-600'
                    }`}
                  >
                    {currentUser.nama.charAt(0)}
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="font-bold text-sm text-slate-900">{currentUser.nama}</span>
                      <span
                        className={`text-[10px] font-bold px-1.5 py-0.2 rounded-md ${
                          currentUser.email === 'raka@wins.com'
                            ? 'bg-cyan-100 text-cyan-800'
                            : currentUser.role === 'owner'
                            ? 'bg-purple-100 text-purple-800'
                            : 'bg-emerald-100 text-emerald-800'
                        }`}
                      >
                        {currentUser.email === 'raka@wins.com'
                          ? 'Developer'
                          : currentUser.role === 'owner'
                          ? 'Owner'
                          : 'Admin'}
                      </span>
                    </div>
                    <span className="text-xs text-slate-500 font-mono">{currentUser.email}</span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleLogout}
                  className="flex items-center gap-1 text-xs font-bold text-red-600 bg-red-50 hover:bg-red-100 px-3 py-1.5 rounded-xl transition cursor-pointer"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Keluar</span>
                </button>
              </div>

              {/* Quick Switch in Drawer */}
              <div className="pt-2 border-t border-slate-200/80 flex items-center justify-between gap-2">
                <span className="text-[11px] font-bold text-slate-500 shrink-0">Ganti Akun:</span>
                <select
                  value={currentUser.email}
                  onChange={(e) => handleSwitchAccount(e.target.value)}
                  className="w-full bg-white text-xs font-bold text-slate-800 py-1.5 px-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-1 focus:ring-brand-500 cursor-pointer"
                  title="Ganti Akun Resmi (@wins.com)"
                >
                  {OFFICIAL_ACCOUNTS.map((acc) => (
                    <option key={acc.id} value={acc.email}>
                      {acc.nama} ({acc.email === 'raka@wins.com' ? 'Developer' : acc.role === 'owner' ? 'Owner' : 'Admin'})
                    </option>
                  ))}
                </select>
              </div>
            </div>
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = currentView === item.id;

              return (
                <button
                  key={item.id}
                  onClick={() => handleNavigate(item.id)}
                  className={`w-full flex items-center gap-3.5 px-4 py-3.5 rounded-2xl text-base font-black transition ${
                    isActive
                      ? 'bg-brand-600 text-white shadow-sm'
                      : 'text-slate-800 hover:bg-slate-100'
                  }`}
                >
                  <Icon className="w-5 h-5 text-current shrink-0" />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 pb-24 lg:pb-12">
        {currentView === 'dashboard' && <DashboardView onNavigate={handleNavigate} />}
        {currentView === 'penerimaan' && <PenerimaanView initialPoId={activePoIdForReceive} />}
        {currentView === 'scan_keluar' && <BarangKeluarView currentRole={currentRole} />}
        {currentView === 'retur' && <PengembalianView currentRole={currentRole} />}
        {currentView === 'laporan' && <LaporanView />}
        {currentView === 'karyawan' && <KaryawanView currentRole={currentRole} onNavigate={handleNavigate} />}
        {currentView === 'payroll' && (
          <PayrollView
            currentRole={currentRole}
            initialKaryawanId={activeKaryawanIdForPayroll}
            onNavigate={handleNavigate}
          />
        )}
      </main>

      {/* Mobile Bottom Navigation Bar (Huruf Tebal & Jelas untuk Orang Tua) */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200 px-2 py-2 flex items-center justify-around shadow-lg">
        <button
          onClick={() => handleNavigate('dashboard')}
          className={`flex flex-col items-center py-1 px-1 text-[10px] font-black transition ${
            currentView === 'dashboard' ? 'text-brand-600' : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          <LayoutDashboard className="w-4 h-4" />
          <span className="mt-0.5">Beranda</span>
        </button>

        <button
          onClick={() => handleNavigate('penerimaan')}
          className={`flex flex-col items-center py-1 px-1 text-[10px] font-black transition ${
            currentView === 'penerimaan' ? 'text-brand-600' : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          <Package className="w-4 h-4" />
          <span className="mt-0.5">Datang</span>
        </button>

        <button
          onClick={() => handleNavigate('scan_keluar')}
          className={`flex flex-col items-center py-1 px-2.5 text-[10px] font-black rounded-xl transition ${
            currentView === 'scan_keluar'
              ? 'bg-brand-600 text-white shadow-xs'
              : 'text-brand-800 bg-brand-50 hover:bg-brand-100'
          }`}
        >
          <ScanLine className="w-4 h-4" />
          <span className="mt-0.5">Scan</span>
        </button>

        <button
          onClick={() => handleNavigate('retur')}
          className={`flex flex-col items-center py-1 px-1 text-[10px] font-black transition ${
            currentView === 'retur' ? 'text-amber-600' : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          <RotateCcw className="w-4 h-4" />
          <span className="mt-0.5">Retur</span>
        </button>

        <button
          onClick={() => handleNavigate('karyawan')}
          className={`flex flex-col items-center py-1 px-1 text-[10px] font-black transition ${
            currentView === 'karyawan' ? 'text-brand-600' : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          <Users className="w-4 h-4" />
          <span className="mt-0.5">Karyawan</span>
        </button>

        <button
          onClick={() => handleNavigate('payroll')}
          className={`flex flex-col items-center py-1 px-1 text-[10px] font-black transition ${
            currentView === 'payroll' ? 'text-emerald-700' : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          <Banknote className="w-4 h-4" />
          <span className="mt-0.5">Payroll</span>
        </button>
      </div>
    </div>
  );
}

export default App;
