import React, { useState, useEffect } from 'react';
import { apiClient } from '../../api/client';
import { Bus, Plus, Trash2, MapPin, Truck, ShieldCheck, Activity, Users, Settings, Printer, FileDown, Search, ArrowRightCircle } from 'lucide-react';
import { toast } from 'sonner';

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
            setStats(s.data.data);
            setRoutes(r.data.data);
            setVehicles(v.data.data);
        } catch (e) { console.error(e); }
        setLoading(false);
    };

    useEffect(() => { fetch(); }, []);

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            if (tab === 'routes') {
                await apiClient.post('/operations/transport/routes', { name: form.name, stops: form.stops?.split(',').map((s: string) => s.trim()) || [] });
                toast.success("Logistics route defined successfully");
            } else {
                await apiClient.post('/operations/transport/vehicles', { registrationNo: form.registrationNo, capacity: Number(form.capacity) });
                toast.success("Vehicle registered in fleet");
            }
            setShowModal(false);
            setForm({});
            fetch();
        } catch (e: any) { toast.error(e.response?.data?.error || 'Authorization Failed'); }
    };

    return (
        <div className="bg-white min-h-screen text-slate-800 p-2 space-y-4">
            {/* 1. Module Header */}
            <div className="border border-slate-300 rounded shadow-sm overflow-hidden bg-white">
                <div className="erp-header-blue px-3 py-1.5 text-[14px] flex justify-between items-center font-bold">
                    <div className="flex items-center gap-2 uppercase tracking-tight">
                        <Bus className="w-4 h-4" />
                        Institution Logistic & Transport Matrix
                    </div>
                    <div className="flex gap-2">
                        <button onClick={() => { setForm({}); setShowModal(true); }} className="erp-btn-rect bg-white/10 hover:bg-white/20 flex items-center gap-1 text-[9px] py-1 uppercase font-black">
                            <Plus className="w-3.5 h-3.5" /> Register Fleet Asset
                        </button>
                    </div>
                </div>
                <div className="erp-strip-green px-3 py-1.5 text-[11px] font-bold text-emerald-800 flex justify-between uppercase italic tracking-tighter">
                    <span>Active monitoring for vehicle deployment, route optimization, and pass synchronization.</span>
                    <span className="flex items-center gap-1"><ShieldCheck className="w-3.5 h-3.5" /> Fleet Safety Sync Active</span>
                </div>
            </div>

            {/* 2. Logistic Stats Matrix */}
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
                <TransportKPICard label="Defined Routes" value={stats?.totalRoutes} sub="Operational" color="text-[#004b93]" icon={<MapPin className="w-4 h-4" />} />
                <TransportKPICard label="Fleet Size" value={stats?.totalVehicles} sub="Verified Vehicles" color="text-indigo-600" icon={<Truck className="w-4 h-4" />} />
                <TransportKPICard label="Active Passes" value={stats?.totalPasses} sub="Authorized Boarding" color="text-emerald-700" icon={<Users className="w-4 h-4" />} />
            </div>

            {/* 3. Operational Control Section */}
            <div className="border border-slate-300 rounded shadow-sm overflow-hidden bg-white">
                <div className="bg-slate-50 px-3 py-2 border-b border-slate-300 flex justify-between items-center">
                    <div className="flex gap-1 bg-slate-200/50 p-1 rounded">
                        <button onClick={() => setTab('routes')} className={`px-4 py-1.5 rounded text-[11px] font-black uppercase transition-all ${tab === 'routes' ? 'bg-[#004b93] text-white shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}>Route Ledger</button>
                        <button onClick={() => setTab('vehicles')} className={`px-4 py-1.5 rounded text-[11px] font-black uppercase transition-all ${tab === 'vehicles' ? 'bg-[#004b93] text-white shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}>Vehicle Inventory</button>
                    </div>
                    <div className="flex gap-2">
                        <div className="relative">
                            <input className="erp-input h-7 pl-8 text-[10px] w-48 font-bold" placeholder={`Filter ${tab}...`} />
                            <Search className="w-3 h-3 absolute left-2.5 top-2 text-slate-400" />
                        </div>
                        <button className="p-1.5 bg-white border border-slate-300 rounded hover:bg-slate-50 text-slate-500 transition-colors"><Printer className="w-4 h-4" /></button>
                    </div>
                </div>

                <div className="p-3 bg-slate-100/50 min-h-[400px]">
                    {loading ? (
                        <div className="p-20 text-center animate-pulse text-slate-400 font-bold uppercase tracking-widest text-xs">Accessing Logistics Server...</div>
                    ) : tab === 'routes' ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                            {routes.map((r: any) => (
                                <div key={r.id} className="bg-white border-2 border-slate-200 rounded shadow-sm p-4 hover:border-[#004b93] transition-all group overflow-hidden relative">
                                    <div className="absolute top-0 right-0 p-1.5 opacity-10 group-hover:opacity-100 transition-opacity">
                                        <Trash2 className="w-3.5 h-3.5 text-rose-500 cursor-pointer" />
                                    </div>
                                    <h3 className="font-black text-[#004b93] flex items-center gap-2 uppercase text-[12px] mb-3">
                                        <MapPin className="w-4 h-4" /> {r.name}
                                    </h3>
                                    <div className="space-y-2">
                                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                                            <Activity className="w-3 h-3" /> Stop Sequence
                                        </p>
                                        <div className="flex flex-wrap gap-1.5">
                                            {r.routeStops?.map((s: any, idx: number) => (
                                                <div key={s.id} className="flex items-center gap-1">
                                                    <span className="px-2 py-0.5 bg-slate-100 border border-slate-200 rounded text-[9px] font-bold text-slate-600 uppercase">
                                                        {s.name}
                                                    </span>
                                                    {idx < r.routeStops.length - 1 && <ArrowRightCircle className="w-3 h-3 text-slate-200" />}
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                    <div className="mt-4 pt-3 border-t border-slate-100 flex justify-between items-center">
                                        <span className="text-[9px] font-black p-1 rounded bg-[#004b93]/5 text-[#004b93] uppercase">{r.routeStops?.length || 0} TOTAL STOPS</span>
                                        <span className="text-[9px] font-bold text-slate-400 italic">Audit: 14-Apr</span>
                                    </div>
                                </div>
                            ))}
                            {routes.length === 0 && <div className="p-16 text-center text-slate-400 font-black uppercase tracking-widest text-xs col-span-full">No logistics routes identified.</div>}
                        </div>
                    ) : (
                        <div className="bg-white border border-slate-300 rounded overflow-hidden">
                            <table className="w-full erp-table-dense">
                                <thead>
                                    <tr className="bg-slate-100 text-slate-600 font-bold border-b border-slate-300">
                                        <th className="px-4 py-2 text-left w-48 border-r border-slate-200 uppercase text-[11px]">Fleet Identification</th>
                                        <th className="px-4 py-2 text-center w-32 border-r border-slate-200 uppercase text-[11px]">Static Capacity</th>
                                        <th className="px-4 py-2 text-left border-r border-slate-200 uppercase text-[11px]">Operational Deployment (Route)</th>
                                        <th className="px-4 py-2 text-center w-32 uppercase text-[11px]">Directive</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {vehicles.length === 0 ? (
                                        <tr><td colSpan={4} className="p-16 text-center text-slate-400 font-black uppercase tracking-widest text-xs">Zero fleet assets registered.</td></tr>
                                    ) : vehicles.map((v: any) => (
                                        <tr key={v.id} className="hover:bg-blue-50/30 transition-colors">
                                            <td className="px-4 py-2.5 text-sm font-black text-[#004b93] font-mono border-r border-slate-100 flex items-center gap-2">
                                                <div className="w-8 h-8 rounded bg-slate-100 flex items-center justify-center"><Truck className="w-4 h-4 text-slate-400" /></div>
                                                {v.registrationNo}
                                            </td>
                                            <td className="px-4 py-2.5 text-center text-[11px] font-black text-slate-600 border-r border-slate-100">{v.capacity} SEATS</td>
                                            <td className="px-4 py-2.5 text-[11px] font-black text-indigo-700 border-r border-slate-100 uppercase italic">
                                                {v.driverAllocations?.[0]?.route?.name || <span className="text-rose-400 font-bold not-italic">PENDING ALLOCATION</span>}
                                            </td>
                                            <td className="px-4 py-2.5 text-center">
                                                <button className="px-3 py-1 bg-[#004b93] text-white rounded text-[9px] font-black uppercase tracking-widest hover:bg-[#003870] transition-colors shadow-sm">
                                                    Manage Access
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </div>

            {/* 4. Logistic Asset Modal */}
            {showModal && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white border-2 border-[#004b93] shadow-2xl rounded-lg overflow-hidden w-full max-w-sm animate-in fade-in zoom-in duration-200">
                        <div className="erp-header-blue px-4 py-3 flex items-center gap-3">
                            <Settings className="w-5 h-5 flex-shrink-0" />
                            <h3 className="text-sm font-black uppercase tracking-widest">Register {tab === 'routes' ? 'Logistic Path' : 'Fleet Asset'}</h3>
                        </div>
                        <form onSubmit={handleCreate} className="p-6 space-y-5">
                            {tab === 'routes' ? (
                                <>
                                    <div className="space-y-1.5">
                                        <label className="text-[11px] font-black text-slate-500 uppercase flex items-center gap-1.5">Route Narrative (Name)</label>
                                        <input required value={form.name || ''} onChange={e => setForm({ ...form, name: e.target.value })}
                                            className="erp-input w-full uppercase font-black" placeholder="e.g. NORTH CAMPUS LINE" />
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-[11px] font-black text-slate-500 uppercase flex items-center gap-1.5">Stops (Comma Separated)</label>
                                        <textarea required value={form.stops || ''} onChange={e => setForm({ ...form, stops: e.target.value })}
                                            className="erp-input w-full h-20 resize-none font-bold text-xs" placeholder="Main Gate, Railway Station, City Square..." />
                                    </div>
                                </>
                            ) : (
                                <>
                                    <div className="space-y-1.5">
                                        <label className="text-[11px] font-black text-slate-500 uppercase flex items-center gap-1.5">Registration Identifier</label>
                                        <input required value={form.registrationNo || ''} onChange={e => setForm({ ...form, registrationNo: e.target.value })}
                                            className="erp-input w-full uppercase font-black tracking-widest" placeholder="AP 01 AB 1234" />
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-[11px] font-black text-slate-500 uppercase flex items-center gap-1.5">Static Seating Capacity</label>
                                        <input type="number" required value={form.capacity || ''} onChange={e => setForm({ ...form, capacity: e.target.value })}
                                            className="erp-input w-full font-black" placeholder="45" />
                                    </div>
                                </>
                            )}
                            <div className="flex gap-3 pt-2">
                                <button type="button" onClick={() => setShowModal(false)} className="flex-1 px-4 py-2.5 bg-slate-100 rounded text-[11px] font-black text-slate-500 uppercase hover:bg-slate-200 transition-colors tracking-widest">Abort</button>
                                <button type="submit" className="flex-1 px-4 py-2.5 bg-[#004b93] text-white rounded text-[11px] font-black uppercase tracking-widest hover:bg-[#003870] transition-colors shadow-lg shadow-blue-500/20">Authorize</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            <div className="flex justify-between items-center text-[10px] text-slate-400 font-bold uppercase tracking-tighter italic">
                <span>* Institutional Logistics Management Automation v5.4</span>
                <span className="text-[#004b93] flex items-center gap-1"><Activity className="w-3 h-3" /> System Integrity Verified</span>
            </div>
        </div>
    );
};

const TransportKPICard = ({ label, value, sub, color, icon }: any) => (
    <div className={`border border-slate-200 rounded p-3 bg-white shadow-sm border-b-2 hover:border-b-[#004b93] transition-all flex items-center gap-4`}>
        <div className={`p-2 rounded-lg bg-slate-50 ${color} border border-slate-100`}>{icon}</div>
        <div>
            <span className="text-[9px] font-black uppercase tracking-wider text-slate-400">{label}</span>
            <p className={`text-xl font-black ${color} tracking-tight leading-none mt-1`}>{value || 0}</p>
            <p className="text-[9px] font-bold text-slate-400 italic mt-0.5">{sub}</p>
        </div>
    </div>
);

export default TransportManagement;
