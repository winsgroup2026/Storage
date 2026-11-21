import React, { useState, useEffect } from 'react';
import { ShieldCheck, Clock, User, FileText, ChevronRight } from 'lucide-react';
import { api } from '../services/api';
import { AuditLog } from '../types';

export const AuditLogView: React.FC = () => {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);

  useEffect(() => {
    async function loadLogs() {
      try {
        setLoading(true);
        const data = await api.getAuditLogs();
        setLogs(data);
      } catch (err) {
        console.error('Error loading audit logs:', err);
      } finally {
        setLoading(false);
      }
    }
    loadLogs();
  }, []);

  const getAksiBadge = (aksi: string) => {
    switch (aksi) {
      case 'SIMPAN_PENGELUARAN':
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-100 text-blue-800">Scan Keluar</span>;
      case 'TERIMA_BARANG':
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800">Terima PO</span>;
      case 'BATALKAN_PENGELUARAN':
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-red-100 text-red-800">Batal Transaksi</span>;
      case 'CREATE':
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-purple-100 text-purple-800">Tambah Data</span>;
      case 'UPDATE':
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-800">Ubah Data</span>;
      default:
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-slate-100 text-slate-800">{aksi}</span>;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Audit Log Aktivitas</h1>
          <p className="text-xs text-slate-500 mt-1">
            Rekam jejak setiap mutasi barang, penerimaan, surat jalan, dan pembatalan transaksi secara akuntabel.
          </p>
        </div>
      </div>

      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50/75 border-b border-slate-200 text-xs font-bold text-slate-500 uppercase">
              <tr>
                <th className="py-3 px-4">Waktu</th>
                <th className="py-3 px-4">Pengguna</th>
                <th className="py-3 px-4">Aksi</th>
                <th className="py-3 px-4">Tabel Terkait</th>
                <th className="py-3 px-4">Rincian Data</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {logs.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-slate-400 italic">
                    Belum ada catatan aktivitas di log.
                  </td>
                </tr>
              ) : (
                logs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50">
                    <td className="py-3.5 px-4 text-slate-500 whitespace-nowrap">
                      {new Date(log.waktu).toLocaleDateString('id-ID', {
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                        second: '2-digit',
                      })}
                    </td>
                    <td className="py-3.5 px-4 font-semibold text-slate-800">{log.user_email || 'Petugas'}</td>
                    <td className="py-3.5 px-4">{getAksiBadge(log.aksi)}</td>
                    <td className="py-3.5 px-4 font-mono text-slate-600">{log.tabel}</td>
                    <td className="py-3.5 px-4">
                      <pre className="max-w-md overflow-x-auto text-[11px] bg-slate-100 p-2 rounded-lg text-slate-700 font-mono">
                        {JSON.stringify(log.data_sesudah || log.data_sebelum || {}, null, 1)}
                      </pre>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

