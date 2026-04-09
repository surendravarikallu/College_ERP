import React, { useState, useEffect } from 'react';
import { apiClient } from '../../api/client';
import { BookOpen, Plus, RotateCcw, AlertTriangle } from 'lucide-react';

const LibraryManagement = () => {
  const [stats, setStats] = useState<any>(null);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [tab, setTab] = useState<'overview' | 'overdue'>('overview');
  const [loading, setLoading] = useState(true);

  const fetch = async () => {
    setLoading(true);
    try {
      const [s, t] = await Promise.all([
        apiClient.get('/operations/library/stats'),
        apiClient.get(`/operations/library/transactions?overdue=${tab === 'overdue'}`),
      ]);
      setStats(s.data.data);
      setTransactions(t.data.data?.transactions || []);
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  useEffect(() => { fetch(); }, [tab]);

  const handleReturn = async (id: string) => {
    try { await apiClient.put(`/operations/library/return/${id}`); fetch(); }
    catch (e: any) { alert(e.response?.data?.error || 'Failed'); }
  };

  return (
    <div className="space-y-6">
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {[
            { label: 'Total Copies', value: stats.totalCopies, color: 'text-indigo-400' },
            { label: 'Available', value: stats.available, color: 'text-emerald-400' },
            { label: 'Issued', value: stats.issued, color: 'text-blue-400' },
            { label: 'Lost', value: stats.lost, color: 'text-red-400' },
            { label: 'Active Loans', value: stats.activeTransactions, color: 'text-amber-400' },
            { label: 'Overdue', value: stats.overdue, color: 'text-red-400' },
          ].map(s => (
            <div key={s.label} className="bg-slate-900 border border-slate-800 rounded-xl p-4">
              <p className="text-xs text-slate-500 uppercase tracking-wide">{s.label}</p>
              <p className={`text-2xl font-bold mt-1 ${s.color}`}>{s.value}</p>
            </div>
          ))}
        </div>
      )}

      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
        <div className="flex items-center gap-3 p-4 border-b border-slate-800">
          <div className="flex gap-1 p-1 bg-slate-800 rounded-lg">
            {['overview', 'overdue'].map(t => (
              <button key={t} onClick={() => setTab(t as any)}
                className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${tab === t ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'}`}>
                {t === 'overview' ? 'All Transactions' : '⚠️ Overdue'}
              </button>
            ))}
          </div>
        </div>

        {loading ? <div className="flex justify-center py-16"><div className="w-8 h-8 border-2 border-slate-700 border-t-indigo-500 rounded-full animate-spin" /></div> : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead><tr className="bg-slate-800/50">
                {['Book ID', 'User ID', 'Issue Date', 'Due Date', 'Status', 'Fine', 'Actions'].map(h =>
                  <th key={h} className="text-left px-5 py-3 text-[11px] font-semibold uppercase tracking-wide text-slate-500">{h}</th>)}
              </tr></thead>
              <tbody>
                {transactions.length === 0 ? (
                  <tr><td colSpan={7} className="text-center py-12 text-slate-500">No transactions found.</td></tr>
                ) : transactions.map((t: any) => (
                  <tr key={t.id} className="border-t border-slate-800 hover:bg-slate-800/30">
                    <td className="px-5 py-3.5 text-sm text-slate-300">{t.copy?.bookId?.substring(0, 8) || '—'}</td>
                    <td className="px-5 py-3.5 text-sm text-slate-300">{t.userId?.substring(0, 8)}</td>
                    <td className="px-5 py-3.5 text-sm text-slate-400">{new Date(t.issueDate).toLocaleDateString()}</td>
                    <td className="px-5 py-3.5 text-sm text-slate-400">{new Date(t.dueDate).toLocaleDateString()}</td>
                    <td className="px-5 py-3.5">
                      <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${t.returnDate ? 'bg-emerald-500/15 text-emerald-400' : (new Date(t.dueDate) < new Date() ? 'bg-red-500/15 text-red-400' : 'bg-blue-500/15 text-blue-400')}`}>
                        {t.returnDate ? 'Returned' : (new Date(t.dueDate) < new Date() ? 'Overdue' : 'Active')}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-sm">{t.fineAmount > 0 ? <span className="text-amber-400">₹{t.fineAmount}</span> : '—'}</td>
                    <td className="px-5 py-3.5">
                      {!t.returnDate && <button onClick={() => handleReturn(t.id)} className="flex items-center gap-1 px-3 py-1.5 bg-emerald-500/10 text-emerald-400 rounded-lg text-xs font-semibold hover:bg-emerald-500/20">
                        <RotateCcw className="w-3 h-3" /> Return
                      </button>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default LibraryManagement;
