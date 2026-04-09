import React, { useState, useEffect } from 'react';
import { apiClient } from '../../api/client';
import { Package, Plus, RotateCcw } from 'lucide-react';

const InventoryManagement = () => {
  const [stats, setStats] = useState<any>(null);
  const [assets, setAssets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ name: '' });
  const [filter, setFilter] = useState('');

  const fetch = async () => {
    setLoading(true);
    try {
      const params = filter ? `?status=${filter}` : '';
      const [s, a] = await Promise.all([
        apiClient.get('/operations/inventory/stats'),
        apiClient.get(`/operations/inventory/assets${params}`),
      ]);
      setStats(s.data.data); setAssets(a.data.data?.assets || []);
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  useEffect(() => { fetch(); }, [filter]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try { await apiClient.post('/operations/inventory/assets', form); setShowModal(false); setForm({ name: '' }); fetch(); }
    catch (e: any) { alert(e.response?.data?.error || 'Failed'); }
  };

  const statusColors: Record<string, string> = {
    AVAILABLE: 'bg-emerald-500/15 text-emerald-400',
    DEPLOYED: 'bg-blue-500/15 text-blue-400',
    MAINTENANCE: 'bg-amber-500/15 text-amber-400',
    DAMAGED: 'bg-red-500/15 text-red-400',
  };

  return (
    <div className="space-y-6">
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          {[
            { label: 'Total', value: stats.total },
            { label: 'Available', value: stats.available },
            { label: 'Deployed', value: stats.deployed },
            { label: 'Maintenance', value: stats.maintenance },
            { label: 'Damaged', value: stats.damaged },
          ].map(s => (
            <div key={s.label} className="bg-slate-900 border border-slate-800 rounded-xl p-4">
              <p className="text-xs text-slate-500 uppercase tracking-wide">{s.label}</p>
              <p className="text-2xl font-bold mt-1">{s.value}</p>
            </div>
          ))}
        </div>
      )}

      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
        <div className="flex items-center justify-between p-4 border-b border-slate-800 flex-wrap gap-3">
          <div className="flex gap-1 p-1 bg-slate-800 rounded-lg">
            {['', 'AVAILABLE', 'DEPLOYED', 'MAINTENANCE', 'DAMAGED'].map(s => (
              <button key={s} onClick={() => setFilter(s)}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${filter === s ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'}`}>
                {s || 'All'}
              </button>
            ))}
          </div>
          <button onClick={() => setShowModal(true)} className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-sm font-semibold">
            <Plus className="w-4 h-4" /> Add Asset
          </button>
        </div>

        {loading ? <div className="flex justify-center py-16"><div className="w-8 h-8 border-2 border-slate-700 border-t-indigo-500 rounded-full animate-spin" /></div> : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead><tr className="bg-slate-800/50">
                {['Asset Name', 'Status', 'Last Activity'].map(h => <th key={h} className="text-left px-5 py-3 text-[11px] font-semibold uppercase tracking-wide text-slate-500">{h}</th>)}
              </tr></thead>
              <tbody>
                {assets.length === 0 ? (
                  <tr><td colSpan={3} className="text-center py-12 text-slate-500">No assets found.</td></tr>
                ) : assets.map((a: any) => (
                  <tr key={a.id} className="border-t border-slate-800 hover:bg-slate-800/30">
                    <td className="px-5 py-3.5 text-sm font-medium">{a.name}</td>
                    <td className="px-5 py-3.5"><span className={`px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${statusColors[a.status] || ''}`}>{a.status}</span></td>
                    <td className="px-5 py-3.5 text-sm text-slate-400">{a.allocations?.[0] ? new Date(a.allocations[0].dateIssued).toLocaleDateString() : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 w-full max-w-sm animate-slide-up">
            <h3 className="text-lg font-bold mb-5">Add Asset</h3>
            <form onSubmit={handleCreate} className="space-y-4">
              <div><label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Asset Name</label>
                <input required value={form.name} onChange={e => setForm({ name: e.target.value })}
                  className="w-full px-3 py-2.5 bg-slate-800 border border-slate-700 rounded-lg text-sm text-white outline-none focus:border-indigo-500" /></div>
              <div className="flex justify-end gap-3">
                <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-slate-300">Cancel</button>
                <button type="submit" className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-sm font-semibold">Create</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default InventoryManagement;
