import React, { useState, useEffect } from 'react';
import { apiClient } from '../../api/client';
import { Package, Plus, RotateCcw, ShieldCheck, Activity, Search, Printer, FileDown, AlertTriangle, CheckCircle2, Clock } from 'lucide-react';
import { toast } from 'sonner';

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
            setStats(s.data.data);
            setAssets(a.data.data?.assets || []);
        } catch (e) { console.error(e); }
        setLoading(false);
    };

    useEffect(() => { fetch(); }, [filter]);

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await apiClient.post('/operations/inventory/assets', form);
            toast.success("Asset added to inventory");
            setShowModal(false);
            setForm({ name: '' });
            fetch();
        }
        catch (e: any) { toast.error(e.response?.data?.error || 'Authorization Failed'); }
    };

    const statusConfig: Record<string, { color: string; icon: any }> = {
        AVAILABLE: { color: 'bg-emerald-100 text-emerald-800', icon: <CheckCircle2 className="w-3 h-3" /> },
        DEPLOYED: { color: 'bg-blue-100 text-blue-800', icon: <Activity className="w-3 h-3" /> },
        MAINTENANCE: { color: 'bg-amber-100 text-amber-800', icon: <RotateCcw className="w-3 h-3" /> },
        DAMAGED: { color: 'bg-rose-100 text-rose-800', icon: <AlertTriangle className="w-3 h-3" /> },
    };

    return (
        <div className="bg-white min-h-screen text-slate-800 p-2 space-y-4">
            {/* 1. Module Header */}
            <div className="border border-slate-300 rounded shadow-sm overflow-hidden bg-white">
                <div className="erp-header-blue px-3 py-1.5 text-[14px] flex justify-between items-center font-bold">
                    <div className="flex items-center gap-2 uppercase tracking-tight">
                        <Package className="w-4 h-4" />
                        Institution Inventory Ledger & Asset Audit Matrix
                    </div>
                    <div className="flex gap-2">
                        <button onClick={() => setShowModal(true)} className="erp-btn-rect bg-white/10 hover:bg-white/20 flex items-center gap-1 text-[9px] py-1 uppercase font-black">
                            <Plus className="w-3.5 h-3.5" /> Acquire New Asset
                        </button>
                    </div>
                </div>
                <div className="erp-strip-green px-3 py-1.5 text-[11px] font-bold text-emerald-800 flex justify-between uppercase italic tracking-tighter">
                    <span>Centralized tracking for institutional hardware, consumables, and fixed assets.</span>
                    <span className="flex items-center gap-1"><ShieldCheck className="w-3.5 h-3.5" /> Inventory Audit Level: 1</span>
                </div>
            </div>

            {/* 2. Inventory Stats KPI */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                <InventoryKPICard label="Total Assets" value={stats?.total} sub="In Registry" color="text-[#004b93]" />
                <InventoryKPICard label="Available" value={stats?.available} sub="Ready for Use" color="text-emerald-700" />
                <InventoryKPICard label="In Service" value={stats?.deployed} sub="Deployed" color="text-blue-600" />
                <InventoryKPICard label="Maintenace" value={stats?.maintenance} sub="In Service" color="text-amber-700" />
                <InventoryKPICard label="Scrapped" value={stats?.damaged} sub="Decommissioned" color="text-rose-600" />
            </div>

            {/* 3. Asset Management Matrix */}
            <div className="border border-slate-300 rounded shadow-sm overflow-hidden bg-white">
                <div className="bg-slate-50 px-3 py-2 border-b border-slate-300 flex justify-between items-center overflow-x-auto">
                    <div className="flex gap-1 bg-slate-200/50 p-1 rounded min-w-fit">
                        {['', 'AVAILABLE', 'DEPLOYED', 'MAINTENANCE', 'DAMAGED'].map(s => (
                            <button key={s} onClick={() => setFilter(s)}
                                className={`px-4 py-1.5 rounded text-[10px] font-black uppercase transition-all whitespace-nowrap ${filter === s ? 'bg-[#004b93] text-white shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}>
                                {s || 'Consolidated View'}
                            </button>
                        ))}
                    </div>
                    <div className="flex gap-2 min-w-fit">
                        <div className="relative">
                            <input className="erp-input h-7 pl-8 text-[10px] w-48 font-bold" placeholder="Filter Assets..." />
                            <Search className="w-3 h-3 absolute left-2.5 top-2 text-slate-400" />
                        </div>
                        <button className="p-1.5 bg-white border border-slate-300 rounded hover:bg-slate-50 text-slate-500 transition-colors"><Printer className="w-4 h-4" /></button>
                        <button className="p-1.5 bg-white border border-slate-300 rounded hover:bg-slate-50 text-slate-500 transition-colors"><FileDown className="w-4 h-4" /></button>
                    </div>
                </div>

                <div className="overflow-x-auto min-h-[400px]">
                    {loading ? (
                        <div className="p-20 text-center animate-pulse text-slate-400 font-bold uppercase tracking-widest text-xs">Synchronizing Asset Database...</div>
                    ) : (
                        <table className="w-full erp-table-dense">
                            <thead>
                                <tr className="bg-slate-100 text-slate-600 font-bold border-b border-slate-300 text-[11px] uppercase">
                                    <th className="px-5 py-2.5 text-left border-r border-slate-200">Asset Nomenclature (Name)</th>
                                    <th className="px-5 py-2.5 text-center w-40 border-r border-slate-200">System Status</th>
                                    <th className="px-5 py-2.5 text-center w-48 border-r border-slate-200">Last Activity Node</th>
                                    <th className="px-5 py-2.5 text-center w-32">Directive</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {assets.length === 0 ? (
                                    <tr><td colSpan={4} className="p-16 text-center text-slate-400 font-black uppercase tracking-widest text-xs">Zero inventory records matching the criteria.</td></tr>
                                ) : assets.map((a: any) => {
                                    const config = statusConfig[a.status] || { color: 'bg-slate-100', icon: null };
                                    return (
                                        <tr key={a.id} className="hover:bg-blue-50/30 transition-colors">
                                            <td className="px-5 py-3 text-sm font-black text-[#004b93] uppercase tracking-tighter border-r border-slate-100">{a.name}</td>
                                            <td className="px-5 py-3 border-r border-slate-100">
                                                <div className={`px-2 py-0.5 rounded text-[9px] font-black uppercase flex items-center justify-center gap-1.5 mx-auto w-fit ${config.color}`}>
                                                    {config.icon}
                                                    {a.status}
                                                </div>
                                            </td>
                                            <td className="px-5 py-3 text-center border-r border-slate-100 font-bold text-slate-500 text-[11px] flex items-center justify-center gap-2">
                                                <Clock className="w-3.5 h-3.5 text-slate-300" />
                                                {a.allocations?.[0] ? new Date(a.allocations[0].dateIssued).toLocaleDateString() : <span className="text-slate-300 italic">No Active Log</span>}
                                            </td>
                                            <td className="px-5 py-3 text-center">
                                                <button className="px-3 py-1 bg-[#004b93] text-white rounded text-[9px] font-black uppercase tracking-widest hover:bg-[#003870] transition-colors shadow-sm">
                                                    Audit Asset
                                                </button>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    )}
                </div>
            </div>

            {/* 4. Asset Acquisition Modal */}
            {showModal && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white border-2 border-[#004b93] shadow-2xl rounded-lg overflow-hidden w-full max-w-sm animate-in fade-in zoom-in duration-200">
                        <div className="erp-header-blue px-4 py-3 flex items-center gap-3">
                            <Plus className="w-5 h-5 flex-shrink-0" />
                            <h3 className="text-sm font-black uppercase tracking-widest">Acquire Institutional Asset</h3>
                        </div>
                        <form onSubmit={handleCreate} className="p-6 space-y-5">
                            <div className="space-y-1.5">
                                <label className="text-[11px] font-black text-slate-500 uppercase">Asset Nomenclature</label>
                                <input required value={form.name} onChange={e => setForm({ name: e.target.value })}
                                    className="erp-input w-full uppercase font-black" placeholder="e.g. LATITUDE LAPTOP SV-02" />
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-[11px] font-black text-slate-500 uppercase">Asset Category</label>
                                <select className="erp-input w-full font-bold">
                                    <option>IT HARDWARE</option>
                                    <option>OFFICE FURNITURE</option>
                                    <option>ELECTRICAL APPLIANCE</option>
                                    <option>MISC CONSUMABLE</option>
                                </select>
                            </div>
                            <div className="flex gap-3 pt-2">
                                <button type="button" onClick={() => setShowModal(false)} className="flex-1 px-4 py-2.5 bg-slate-100 rounded text-[11px] font-black text-slate-500 uppercase hover:bg-slate-200 transition-colors tracking-widest">Abort</button>
                                <button type="submit" className="flex-1 px-4 py-2.5 bg-[#004b93] text-white rounded text-[11px] font-black uppercase tracking-widest hover:bg-[#003870] transition-colors shadow-lg shadow-blue-500/20">Authorize</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
            <div className="flex justify-between items-center text-[10px] text-slate-400 font-bold uppercase tracking-tighter italic">
                <span>* Institutional Inventory Management Automation v2.4</span>
                <span className="flex items-center gap-1 text-[#004b93]"><ShieldCheck className="w-3 h-3" /> Ledger Reliability: 100%</span>
            </div>
        </div>
    );
};

const InventoryKPICard = ({ label, value, sub, color }: any) => (
    <div className={`border border-slate-200 rounded p-3 bg-white shadow-sm border-b-2 hover:border-b-[#004b93] transition-all`}>
        <span className="text-[9px] font-black uppercase tracking-wider text-slate-400">{label}</span>
        <p className={`text-xl font-black ${color} tracking-tight leading-none mt-1`}>{value || 0}</p>
        <p className="text-[9px] font-bold text-slate-400 italic mt-0.5">{sub}</p>
    </div>
);

export default InventoryManagement;
