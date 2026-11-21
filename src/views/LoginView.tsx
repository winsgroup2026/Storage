import React, { useState } from 'react';
import {
  Lock,
  Mail,
  Eye,
  EyeOff,
  ArrowRight,
  AlertCircle,
} from 'lucide-react';
import { api } from '../services/api';
import { UserAccount } from '../types';

interface LoginViewProps {
  onLoginSuccess: (user: UserAccount) => void;
}

export const LoginView: React.FC<LoginViewProps> = ({ onLoginSuccess }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleManualLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    let finalEmail = email.trim();
    if (!finalEmail) {
      setErrorMsg('Mohon masukkan email @wins.com Anda.');
      return;
    }

    // Auto-append @wins.com jika hanya mengetik nama akun
    if (!finalEmail.includes('@')) {
      finalEmail = `${finalEmail}@wins.com`;
      setEmail(finalEmail);
    }

    setIsLoading(true);
    try {
      const res = await api.login(finalEmail, password);
      if (res.success && res.user) {
        onLoginSuccess(res.user);
      } else {
        setErrorMsg(res.error || 'Login gagal, periksa email dan password.');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Terjadi kesalahan sistem saat login.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-linear-to-br from-slate-100 via-brand-50/40 to-slate-100 flex flex-col justify-center items-center p-4 sm:p-6 font-sans">
      <div className="max-w-md w-full space-y-6">
        {/* Brand Header */}
        <div className="text-center space-y-3">
          <div className="inline-flex p-3 bg-white rounded-3xl shadow-md border border-slate-200/90 hover:scale-105 transition-transform duration-300">
            <img
              src="/logo.png"
              alt="Win's Group"
              className="w-16 h-16 object-contain"
            />
          </div>
          <div>
            <h1 className="text-2xl font-black tracking-tight text-slate-900 flex items-center justify-center gap-2">
              <span>Win's Group</span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-brand-100 text-brand-800 tracking-wide uppercase">
                Portal Gudang
              </span>
            </h1>
            <p className="text-xs text-slate-500 font-bold mt-1">
              Sistem Gudang Barcode & Payroll Kasur Busa
            </p>
          </div>
        </div>

        {/* Card Login */}
        <div className="bg-white rounded-3xl border border-slate-200/90 shadow-xl p-6 sm:p-8 space-y-6">
          <div className="border-b border-slate-100 pb-4">
            <h2 className="text-lg font-black text-slate-900">Masuk ke Akun Anda</h2>
            <p className="text-xs text-slate-500 font-semibold mt-0.5">
              Silakan login menggunakan email resmi <span className="font-bold text-brand-700">@wins.com</span>
            </p>
          </div>

          {/* Error Alert */}
          {errorMsg && (
            <div className="p-3.5 bg-red-50 border border-red-200 rounded-2xl flex items-start gap-2.5 text-xs text-red-700 animate-fade-in">
              <AlertCircle className="w-4 h-4 shrink-0 text-red-600 mt-0.5" />
              <div className="flex-1 font-bold leading-relaxed">{errorMsg}</div>
            </div>
          )}

          {/* Form Login */}
          <form onSubmit={handleManualLogin} className="space-y-4 text-xs">
            <div>
              <label className="block font-black text-slate-800 uppercase tracking-wider text-xs mb-1.5">
                Alamat Email (@wins.com) *
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Mail className="w-4 h-4" />
                </div>
                <input
                  type="text"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="sukesti@wins.com / deva@wins.com / wiwin@wins.com / raka@wins.com"
                  required
                  autoFocus
                  className="w-full pl-10 pr-4 py-2.5 text-xs sm:text-sm font-bold rounded-xl border border-slate-200 bg-slate-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 transition"
                />
              </div>
            </div>

            <div>
              <label className="block font-black text-slate-800 uppercase tracking-wider text-xs mb-1.5">
                Password *
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Masukkan password akun..."
                  required
                  className="w-full pl-10 pr-10 py-2.5 text-xs sm:text-sm font-bold rounded-xl border border-slate-200 bg-slate-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 transition"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3.5 px-4 bg-brand-600 hover:bg-brand-700 text-white font-black rounded-xl transition shadow-md shadow-brand-600/20 active:scale-98 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 text-sm mt-3"
            >
              {isLoading ? (
                <span>Memproses Login...</span>
              ) : (
                <>
                  <span>Masuk ke Sistem</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>
        </div>

        {/* Footer info */}
        <div className="text-center text-xs text-slate-400 font-bold space-y-1">
          <p>© 2026 Win's Group · Gudang Kasur Busa</p>
        </div>
      </div>
    </div>
  );
};
