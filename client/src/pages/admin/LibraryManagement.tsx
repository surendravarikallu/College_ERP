import React, { useState, useEffect } from 'react';
import { apiClient } from '../../api/client';
import { BookOpen, Plus, RotateCcw, AlertTriangle, Book, Search, Activity, Clock, ShieldCheck, Printer, FileDown } from 'lucide-react';
import { toast } from 'sonner';

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
        try {
            await apiClient.put(`/operations/library/return/${id}`);
            toast.success("Book returned successfully");
            fetch();
        }
        catch (e: any) { toast.error(e.response?.data?.error || 'Failed'); }
    };

    return (
        <div className="bg-white min-h-screen text-slate-800 p-2 space-y-4">
            {/* 1. Module Header */}
            <div className="border border-slate-300 rounded shadow-sm overflow-hidden bg-white">
                <div className="erp-header-blue px-3 py-1.5 text-[14px] flex justify-between items-center font-bold">
                    <div className="flex items-center gap-2 uppercase tracking-tight">
                        <Book className="w-4 h-4" />
                        Institutional Library Ledger & Asset Matrix
                    </div>
                    <div className="flex gap-2">
                        <button className="erp-btn-rect bg-white/10 hover:bg-white/20 flex items-center gap-1 text-[9px] py-1 uppercase">
                            <Plus className="w-3.5 h-3.5" /> New Acquisition
                        </button>
                    </div>
                </div>
                <div className="erp-strip-green px-3 py-1.5 text-[11px] font-bold text-emerald-800 flex justify-between uppercase italic">
                    <span>Centralized monitoring for book issuance, returns, and overdue liabilities.</span>
                    <span>Audit Status: Healthy</span>
                </div>
            </div>

            {/* 2. Stats Matrix */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
                <LibraryKPICard label="Total Catalog" value={stats?.totalCopies} sub="Registered" color="text-[#004b93]" />
                <LibraryKPICard label="In Stock" value={stats?.available} sub="Available" color="text-emerald-700" />
                <LibraryKPICard label="Circulation" value={stats?.issued} sub="Issued" color="text-indigo-600" />
                <LibraryKPICard label="Inactive" value={stats?.lost} sub="Lost/Damaged" color="text-rose-600" />
                <LibraryKPICard label="Live Loans" value={stats?.activeTransactions} sub="Ongoing" color="text-blue-500" />
                <LibraryKPICard label="Overdue" value={stats?.overdue} sub="Attention Required" color="text-amber-700" isWarning={stats?.overdue > 0} />
            </div>

            {/* 3. Transaction Matrix */}
            <div className="border border-slate-300 rounded shadow-sm overflow-hidden bg-white">
                <div className="bg-slate-50 px-3 py-2 border-b border-slate-300 flex justify-between items-center">
                    <div className="flex gap-1 bg-slate-200/50 p-1 rounded">
                        <button onClick={() => setTab('overview')} className={`px-4 py-1.5 rounded text-[11px] font-black uppercase transition-all ${tab === 'overview' ? 'bg-[#004b93] text-white shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}>General Ledger</button>
                        <button onClick={() => setTab('overdue')} className={`px-4 py-1.5 rounded text-[11px] font-black uppercase transition-all flex items-center gap-1.5 ${tab === 'overdue' ? 'bg-rose-700 text-white shadow-sm' : 'text-rose-500 hover:bg-rose-50'}`}>
                            <Clock className="w-3.5 h-3.5" /> Defaulter List
                        </button>
                    </div>
                    <div className="flex gap-2">
                        <button className="p-1.5 bg-white border border-slate-300 rounded hover:bg-slate-50 text-slate-500"><Printer className="w-4 h-4" /></button>
                        <button className="p-1.5 bg-white border border-slate-300 rounded hover:bg-slate-50 text-slate-500"><FileDown className="w-4 h-4" /></button>
                    </div>
                </div>

                <div className="overflow-x-auto min-h-[400px]">
                    {loading ? (
                        <div className="p-20 text-center animate-pulse text-slate-400 font-bold uppercase tracking-widest text-xs">Synchronizing Library Database...</div>
                    ) : (
                        <table className="w-full erp-table-dense">
                            <thead>
                                <tr className="bg-slate-100 text-slate-600 font-bold border-b border-slate-300">
                                    <th className="px-4 py-2 text-left w-32 border-r border-slate-200">Asset Identity</th>
                                    <th className="px-4 py-2 text-left w-32 border-r border-slate-200">User Context</th>
                                    <th className="px-4 py-2 text-center w-32 border-r border-slate-200">Issue Date</th>
                                    <th className="px-4 py-2 text-center w-32 border-r border-slate-200">Due Deadline</th>
                                    <th className="px-4 py-2 text-center w-32 border-r border-slate-200">Current Status</th>
                                    <th className="px-4 py-2 text-right w-24 border-r border-slate-200">Fine Accrued</th>
                                    <th className="px-4 py-2 text-center">Directive</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {transactions.length === 0 ? (
                                    <tr><td colSpan={7} className="p-16 text-center text-slate-400 font-black uppercase tracking-widest text-xs">No active transactions identified.</td></tr>
                                ) : transactions.map((t: any) => {
                                    const isOverdue = !t.returnDate && new Date(t.dueDate) < new Date();
                                    return (
                                        <tr key={t.id} className="hover:bg-blue-50/30 transition-colors group">
                                            <td className="px-4 py-2 text-sm font-black text-[#004b93] font-mono border-r border-slate-100">{t.copy?.bookId?.substring(0, 10) || '—'}</td>
                                            <td className="px-4 py-2 text-[11px] font-bold text-slate-600 border-r border-slate-100 uppercase">{t.userId?.substring(0, 10)}</td>
                                            <td className="px-4 py-2 text-center text-[10px] font-bold text-slate-400 border-r border-slate-100">{new Date(t.issueDate).toLocaleDateString()}</td>
                                            <td className="px-4 py-2 text-center text-[10px] font-black text-slate-500 border-r border-slate-100">{new Date(t.dueDate).toLocaleDateString()}</td>
                                            <td className="px-4 py-2 text-center border-r border-slate-100">
                                                {t.returnDate ? (
                                                    <span className="text-[9px] font-black px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 uppercase tracking-tighter flex items-center justify-center gap-1 mx-auto w-fit">
                                                        <ShieldCheck className="w-3 h-3" /> Returned
                                                    </span>
                                                ) : isOverdue ? (
                                                    <span className="text-[9px] font-black px-2 py-0.5 rounded bg-rose-100 text-rose-800 uppercase tracking-tighter flex items-center justify-center gap-1 mx-auto w-fit animate-pulse">
                                                        <AlertTriangle className="w-3 h-3" /> Defaulter
                                                    </span>
                                                ) : (
                                                    <span className="text-[9px] font-black px-2 py-0.5 rounded bg-blue-100 text-blue-800 uppercase tracking-tighter flex items-center justify-center gap-1 mx-auto w-fit">
                                                        <Activity className="w-3 h-3" /> Active Loan
                                                    </span>
                                                )}
                                            </td>
                                            <td className="px-4 py-2 text-right border-r border-slate-100 font-black">
                                                {t.fineAmount > 0 ? <span className="text-rose-600">₹{t.fineAmount}</span> : <span className="text-slate-300">₹ 0</span>}
                                            </td>
                                            <td className="px-4 py-2 text-center">
                                                {!t.returnDate && (
                                                    <button onClick={() => handleReturn(t.id)} className="px-3 py-1 bg-[#004b93] text-white rounded text-[9px] font-black uppercase tracking-widest flex items-center gap-1.5 mx-auto hover:bg-[#003870] transition-colors shadow-sm">
                                                        <RotateCcw className="w-3 h-3" /> Rollback
                                                    </button>
                                                )}
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    )}
                </div>
            </div>
            <div className="flex justify-between items-center text-[10px] text-slate-400 font-bold uppercase tracking-tighter italic p-1">
                <span>* Institutional Financial Ledger Automation v4.1</span>
                <span>* Fine calculations are updated in real-time based on system cron-jobs</span>
            </div>
        </div>
    );
};

const LibraryKPICard = ({ label, value, sub, color, isWarning }: any) => (
    <div className={`border border-slate-200 rounded p-3 bg-white shadow-sm border-b-2 ${isWarning ? 'border-b-rose-500' : 'hover:border-b-[#004b93]'} transition-all`}>
        <span className="text-[9px] font-black uppercase tracking-wider text-slate-400">{label}</span>
        <p className={`text-xl font-black ${color} tracking-tight mt-1`}>{value || 0}</p>
        <p className="text-[9px] font-bold text-slate-400 italic mt-0.5">{sub}</p>
    </div>
);

export default LibraryManagement;
