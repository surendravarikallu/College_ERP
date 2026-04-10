import React, { useState, useEffect } from 'react';
import { apiClient } from '../../api/client';
import { toast } from 'sonner';
import {
  Wallet, Plus, Receipt, TrendingUp, IndianRupee, Users,
  CheckCircle2, Clock, AlertTriangle, Search, FileDown
} from 'lucide-react';

const FinanceManagement = () => {
  const [tab, setTab] = useState<'overview' | 'structures' | 'invoices'>('overview');
  const [stats, setStats] = useState<any>(null);
  const [structures, setStructures] = useState<any[]>([]);
  const [invoices, setInvoices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  // Create Fee Structure modal state
  const [showCreate, setShowCreate] = useState(false);
  const [newStructure, setNewStructure] = useState({
    name: '', feeType: 'TUITION', amount: '', semester: 1, departmentId: '', dueDate: '',
  });

  useEffect(() => {
    const load = async () => {
      try {
        const [statsRes, structRes] = await Promise.all([
          apiClient.get('/analytics/overview'),
          apiClient.get('/fees/structures'),
        ]);
        setStats(statsRes.data.data);
        setStructures(structRes.data.data || []);
      } catch { /* noop */ }
      setLoading(false);
    };
    load();
  }, []);

  const loadInvoices = async () => {
    try {
      const res = await apiClient.get('/fees/invoices');
      setInvoices(res.data.data || []);
    } catch { /* noop */ }
  };

  useEffect(() => {
    if (tab === 'invoices') loadInvoices();
  }, [tab]);

  const handleCreateStructure = async () => {
    try {
      await apiClient.post('/fees/structures', {
        ...newStructure,
        amount: parseFloat(newStructure.amount as string),
      });
      toast.success('Fee structure created');
      setShowCreate(false);
      const structRes = await apiClient.get('/fees/structures');
      setStructures(structRes.data.data || []);
    } catch (err: any) {
      toast.error(err?.response?.data?.error || 'Failed to create');
    }
  };

  if (loading) return <div className="flex justify-center py-16"><div className="w-8 h-8 border-2 border-slate-700 border-t-indigo-500 rounded-full animate-spin" /></div>;

  const finance = stats?.finance || {};

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 p-6 bg-slate-900 border border-slate-800 rounded-2xl">
        <div>
          <h2 className="text-2xl font-bold bg-gradient-to-r from-white to-slate-400 bg-clip-text text-transparent flex items-center gap-3">
            <Wallet className="w-6 h-6 text-emerald-400" /> Finance Management
          </h2>
          <p className="text-slate-400 mt-1">Manage fee structures, invoices, and track collections.</p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-semibold transition-all shadow-lg shadow-emerald-500/20"
        >
          <Plus className="w-4 h-4" /> New Fee Structure
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-slate-900 border border-slate-800 border-l-4 border-l-emerald-500 rounded-2xl p-5">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">This Month Collection</p>
          <p className="text-3xl font-bold text-emerald-400 mt-2">₹{(finance.currentMonthCollection || 0).toLocaleString()}</p>
        </div>
        <div className="bg-slate-900 border border-slate-800 border-l-4 border-l-amber-500 rounded-2xl p-5">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Pending Dues</p>
          <p className="text-3xl font-bold text-amber-400 mt-2">₹{(finance.pendingDues || 0).toLocaleString()}</p>
        </div>
        <div className="bg-slate-900 border border-slate-800 border-l-4 border-l-indigo-500 rounded-2xl p-5">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">This Month Billed</p>
          <p className="text-3xl font-bold mt-2">₹{(finance.currentMonthBilled || 0).toLocaleString()}</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-slate-900 border border-slate-800 rounded-xl p-1 w-fit">
        {(['overview', 'structures', 'invoices'] as const).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-5 py-2 rounded-lg text-sm font-semibold transition-all ${
              tab === t ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            {t.charAt(0).toUpperCase() + t.slice(1)}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {tab === 'structures' && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-slate-950/50">
                  <th className="text-left px-6 py-4 text-xs font-semibold uppercase tracking-wider text-slate-400">Name</th>
                  <th className="text-left px-6 py-4 text-xs font-semibold uppercase tracking-wider text-slate-400">Type</th>
                  <th className="text-left px-6 py-4 text-xs font-semibold uppercase tracking-wider text-slate-400">Amount</th>
                  <th className="text-left px-6 py-4 text-xs font-semibold uppercase tracking-wider text-slate-400">Semester</th>
                  <th className="text-left px-6 py-4 text-xs font-semibold uppercase tracking-wider text-slate-400">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {structures.length === 0 ? (
                  <tr><td colSpan={5} className="text-center py-12 text-slate-500">No fee structures created yet.</td></tr>
                ) : structures.map((s: any) => (
                  <tr key={s.id} className="hover:bg-slate-800/30 transition-colors">
                    <td className="px-6 py-4 text-sm font-medium">{s.name}</td>
                    <td className="px-6 py-4">
                      <span className="px-2.5 py-1 bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 rounded-full text-xs font-semibold">{s.feeType}</span>
                    </td>
                    <td className="px-6 py-4 text-sm font-semibold">₹{s.amount.toLocaleString()}</td>
                    <td className="px-6 py-4 text-sm text-slate-400">Sem {s.semester}</td>
                    <td className="px-6 py-4">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${s.isActive ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-slate-600/20 text-slate-400 border border-slate-600/30'}`}>
                        {s.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === 'invoices' && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
          <div className="p-4 border-b border-slate-800 flex items-center gap-3">
            <Search className="w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search by invoice number or student..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="flex-1 bg-transparent text-sm outline-none placeholder-slate-500"
            />
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-slate-950/50">
                  <th className="text-left px-6 py-4 text-xs font-semibold uppercase tracking-wider text-slate-400">Invoice #</th>
                  <th className="text-left px-6 py-4 text-xs font-semibold uppercase tracking-wider text-slate-400">Student</th>
                  <th className="text-left px-6 py-4 text-xs font-semibold uppercase tracking-wider text-slate-400">Amount</th>
                  <th className="text-left px-6 py-4 text-xs font-semibold uppercase tracking-wider text-slate-400">Status</th>
                  <th className="text-left px-6 py-4 text-xs font-semibold uppercase tracking-wider text-slate-400">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {invoices.filter(i =>
                  i.invoiceNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                  i.student?.name?.toLowerCase().includes(searchTerm.toLowerCase())
                ).map((inv: any) => (
                  <tr key={inv.id} className="hover:bg-slate-800/30 transition-colors">
                    <td className="px-6 py-4">
                      <span className="text-sm font-mono bg-slate-950 px-2 py-1 rounded border border-slate-800">{inv.invoiceNumber}</span>
                    </td>
                    <td className="px-6 py-4 text-sm">{inv.student?.name}</td>
                    <td className="px-6 py-4 text-sm font-semibold">₹{inv.finalAmount?.toLocaleString()}</td>
                    <td className="px-6 py-4">
                      {inv.status === 'SUCCESS' ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400"><CheckCircle2 className="w-3 h-3" /> Paid</span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-400"><Clock className="w-3 h-3" /> Pending</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-400">{new Date(inv.createdAt).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === 'overview' && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 text-center">
          <TrendingUp className="w-12 h-12 text-indigo-400 mx-auto mb-4 opacity-50" />
          <h3 className="text-lg font-semibold">Finance Overview</h3>
          <p className="text-sm text-slate-400 mt-2 max-w-md mx-auto">
            Use the tabs above to manage fee structures and track invoice payments.
            Charts and payment trends will be displayed here as data accumulates.
          </p>
        </div>
      )}

      {/* Create Fee Structure Modal */}
      {showCreate && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => setShowCreate(false)}>
          <div className="bg-slate-900 border border-slate-700 rounded-2xl p-6 w-full max-w-md space-y-4" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-bold">Create Fee Structure</h3>
            <input placeholder="Name (e.g. Tuition Fee - CSE)" value={newStructure.name} onChange={e => setNewStructure(p => ({ ...p, name: e.target.value }))}
              className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-emerald-500" />
            <select value={newStructure.feeType} onChange={e => setNewStructure(p => ({ ...p, feeType: e.target.value }))}
              className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-emerald-500">
              {['TUITION', 'HOSTEL', 'TRANSPORT', 'LIBRARY', 'LAB', 'EXAM', 'OTHER'].map(t => <option key={t} value={t}>{t}</option>)}
            </select>
            <div className="grid grid-cols-2 gap-3">
              <input type="number" placeholder="Amount (₹)" value={newStructure.amount} onChange={e => setNewStructure(p => ({ ...p, amount: e.target.value }))}
                className="bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-emerald-500" />
              <input type="number" placeholder="Semester" min={1} max={8} value={newStructure.semester} onChange={e => setNewStructure(p => ({ ...p, semester: parseInt(e.target.value) }))}
                className="bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-emerald-500" />
            </div>
            <input type="date" value={newStructure.dueDate} onChange={e => setNewStructure(p => ({ ...p, dueDate: e.target.value }))}
              className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-emerald-500" />
            <div className="flex gap-3 pt-2">
              <button onClick={() => setShowCreate(false)} className="flex-1 px-4 py-2.5 bg-slate-800 hover:bg-slate-700 rounded-xl text-sm font-semibold transition-all">Cancel</button>
              <button onClick={handleCreateStructure} className="flex-1 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-sm font-semibold transition-all shadow-lg shadow-emerald-500/20">Create</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default FinanceManagement;
