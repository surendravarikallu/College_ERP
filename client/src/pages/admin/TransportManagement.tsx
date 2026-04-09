import React, { useState, useEffect } from 'react';
import { apiClient } from '../../api/client';
import { Bus, Plus, Trash2, MapPin, Truck } from 'lucide-react';

const TransportManagement = () => {
  const [stats, setStats] = useState<any>(null);
  const [routes, setRoutes] = useState<any[]>([]);
  const [vehicles, setVehicles] = useState<any[]>([]);
  const [tab, setTab] = useState<'routes' | 'vehicles'>('routes');
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState<any>({});

  const fetch = async () => {
    setLoading(true);
    try {
      const [s, r, v] = await Promise.all([
        apiClient.get('/operations/transport/stats'),
        apiClient.get('/operations/transport/routes'),
        apiClient.get('/operations/transport/vehicles'),
      ]);
      setStats(s.data.data); setRoutes(r.data.data); setVehicles(v.data.data);
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  useEffect(() => { fetch(); }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (tab === 'routes') {
        await apiClient.post('/operations/transport/routes', { name: form.name, stops: form.stops?.split(',').map((s: string) => s.trim()) || [] });
      } else {
        await apiClient.post('/operations/transport/vehicles', { registrationNo: form.registrationNo, capacity: Number(form.capacity) });
      }
      setShowModal(false); setForm({}); fetch();
    } catch (e: any) { alert(e.response?.data?.error || 'Failed'); }
  };

  return (
    <div className="space-y-6">
      {stats && (
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: 'Routes', value: stats.totalRoutes, icon: <MapPin className="w-5 h-5 text-indigo-400" /> },
            { label: 'Vehicles', value: stats.totalVehicles, icon: <Truck className="w-5 h-5 text-emerald-400" /> },
            { label: 'Active Passes', value: stats.totalPasses, icon: <Bus className="w-5 h-5 text-amber-400" /> },
          ].map(s => (
            <div key={s.label} className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex items-center gap-4">
              <div className="p-2.5 bg-slate-800 rounded-lg">{s.icon}</div>
              <div><p className="text-xs text-slate-500 uppercase tracking-wide">{s.label}</p><p className="text-xl font-bold">{s.value}</p></div>
            </div>
          ))}
        </div>
      )}

      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
        <div className="flex items-center justify-between p-4 border-b border-slate-800">
          <div className="flex gap-1 p-1 bg-slate-800 rounded-lg">
            {['routes', 'vehicles'].map(t => (
              <button key={t} onClick={() => setTab(t as any)}
                className={`px-4 py-1.5 rounded-md text-sm font-medium capitalize transition-all ${tab === t ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'}`}>{t}</button>
            ))}
          </div>
          <button onClick={() => { setForm({}); setShowModal(true); }} className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-sm font-semibold">
            <Plus className="w-4 h-4" /> Add
          </button>
        </div>

        {loading ? <div className="flex justify-center py-16"><div className="w-8 h-8 border-2 border-slate-700 border-t-indigo-500 rounded-full animate-spin" /></div> : (
          tab === 'routes' ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4">
              {routes.map((r: any) => (
                <div key={r.id} className="bg-slate-800/50 border border-slate-700 rounded-xl p-4">
                  <h3 className="font-semibold flex items-center gap-2"><MapPin className="w-4 h-4 text-indigo-400" /> {r.name}</h3>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {r.routeStops?.map((s: any) => (
                      <span key={s.id} className="px-2.5 py-0.5 bg-slate-900 rounded-full text-xs text-slate-400">{s.name}</span>
                    ))}
                  </div>
                </div>
              ))}
              {routes.length === 0 && <p className="text-slate-500 col-span-2 text-center py-8">No routes configured.</p>}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead><tr className="bg-slate-800/50">
                  {['Registration', 'Capacity', 'Assigned Route'].map(h => <th key={h} className="text-left px-5 py-3 text-[11px] font-semibold uppercase tracking-wide text-slate-500">{h}</th>)}
                </tr></thead>
                <tbody>
                  {vehicles.map((v: any) => (
                    <tr key={v.id} className="border-t border-slate-800 hover:bg-slate-800/30">
                      <td className="px-5 py-3.5 text-sm font-medium">{v.registrationNo}</td>
                      <td className="px-5 py-3.5 text-sm text-slate-400">{v.capacity} seats</td>
                      <td className="px-5 py-3.5 text-sm text-slate-400">{v.driverAllocations?.[0]?.route?.name || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 w-full max-w-sm animate-slide-up">
            <h3 className="text-lg font-bold mb-5 capitalize">Add {tab.slice(0, -1)}</h3>
            <form onSubmit={handleCreate} className="space-y-4">
              {tab === 'routes' ? (
                <>
                  <div><label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Route Name</label>
                    <input required value={form.name || ''} onChange={e => setForm({ ...form, name: e.target.value })}
                      className="w-full px-3 py-2.5 bg-slate-800 border border-slate-700 rounded-lg text-sm text-white outline-none focus:border-indigo-500" /></div>
                  <div><label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Stops (comma separated)</label>
                    <input value={form.stops || ''} onChange={e => setForm({ ...form, stops: e.target.value })}
                      className="w-full px-3 py-2.5 bg-slate-800 border border-slate-700 rounded-lg text-sm text-white outline-none focus:border-indigo-500" placeholder="Stop 1, Stop 2, Stop 3" /></div>
                </>
              ) : (
                <>
                  <div><label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Registration No</label>
                    <input required value={form.registrationNo || ''} onChange={e => setForm({ ...form, registrationNo: e.target.value })}
                      className="w-full px-3 py-2.5 bg-slate-800 border border-slate-700 rounded-lg text-sm text-white outline-none focus:border-indigo-500" /></div>
                  <div><label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Capacity</label>
                    <input type="number" required value={form.capacity || ''} onChange={e => setForm({ ...form, capacity: e.target.value })}
                      className="w-full px-3 py-2.5 bg-slate-800 border border-slate-700 rounded-lg text-sm text-white outline-none focus:border-indigo-500" /></div>
                </>
              )}
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

export default TransportManagement;
