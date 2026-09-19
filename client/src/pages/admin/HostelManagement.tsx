import React, { useState, useEffect } from 'react';
import { apiClient } from '../../api/client';
import { Building2, Plus, UserMinus, Bed, ShieldCheck, Activity, Users, Home, AlertCircle, Printer, FileDown, Search } from 'lucide-react';
import { toast } from 'sonner';

const HostelManagement = () => {
    const [rooms, setRooms] = useState<any[]>([]);
    const [stats, setStats] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [form, setForm] = useState({ roomNo: '', capacity: 4 });

    const fetch = async () => {
        setLoading(true);
        try {
            const [r, s] = await Promise.all([
                apiClient.get('/operations/hostel/rooms'),
                apiClient.get('/operations/hostel/stats'),
            ]);
            setRooms(r.data.data);
            setStats(s.data.data);
        } catch (e) { console.error(e); }
        setLoading(false);
    };

    useEffect(() => { fetch(); }, []);

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await apiClient.post('/operations/hostel/rooms', form);
            toast.success("Room registered successfully");
            setShowModal(false);
            fetch();
        } catch (e) { toast.error("Failed to register room"); }
    };

    return (
        <div className="bg-white min-h-screen text-slate-800 p-2 space-y-4">
            {/* 1. Module Header */}
            <div className="border border-slate-300 rounded shadow-sm overflow-hidden bg-white">
                <div className="erp-header-blue px-3 py-1.5 text-[14px] flex justify-between items-center font-bold">
                    <div className="flex items-center gap-2 uppercase tracking-tight">
                        <Home className="w-4 h-4" />
                        Institution Hostel Administration & Occupancy Matrix
                    </div>
                    <div className="flex gap-2">
                        <button onClick={() => setShowModal(true)} className="erp-btn-rect bg-white/10 hover:bg-white/20 flex items-center gap-1 text-[9px] py-1 uppercase font-black">
                            <Plus className="w-3.5 h-3.5" /> Register New Room
                        </button>
                    </div>
                </div>
                <div className="erp-strip-green px-3 py-1.5 text-[11px] font-bold text-emerald-800 flex justify-between uppercase italic tracking-tighter">
                    <span>Centralized monitoring for room allocations, availability, and residential audits.</span>
                    <span className="flex items-center gap-1"><ShieldCheck className="w-3.5 h-3.5" /> Surveillance Active</span>
                </div>
            </div>

            {/* 2. Occupancy Stats Matrix */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <HostelKPICard label="Total Inventory" value={stats?.totalRooms} sub="Registered Rooms" color="text-[#004b93]" icon={<Building2 className="w-4 h-4" />} />
                <HostelKPICard label="Total Beds" value={stats?.totalBeds} sub="Capacity" color="text-indigo-600" icon={<Bed className="w-4 h-4" />} />
                <HostelKPICard label="Residential" value={stats?.occupiedBeds} sub="Occupied" color="text-amber-700" icon={<Users className="w-4 h-4" />} />
                <HostelKPICard label="Vacant Slips" value={stats?.availableBeds} sub="Available" color="text-emerald-700" icon={<Activity className="w-4 h-4" />} />
            </div>

            {/* 3. Room Management Matrix */}
            <div className="border border-slate-300 rounded shadow-sm overflow-hidden bg-white">
                <div className="bg-slate-50 px-3 py-2 border-b border-slate-300 flex justify-between items-center">
                    <div className="flex items-center gap-4">
                        <span className="text-[11px] font-black uppercase tracking-widest text-[#004b93]">Room Grid View</span>
                        <div className="relative">
                            <input className="erp-input h-7 pl-8 text-[10px] w-48 font-bold" placeholder="Search Room No..." />
                            <Search className="w-3 h-3 absolute left-2.5 top-2 text-slate-400" />
                        </div>
                    </div>
                    <div className="flex gap-2">
                        <button className="p-1.5 bg-white border border-slate-300 rounded hover:bg-slate-50 text-slate-500 transition-colors"><Printer className="w-4 h-4" /></button>
                        <button className="p-1.5 bg-white border border-slate-300 rounded hover:bg-slate-50 text-slate-500 transition-colors"><FileDown className="w-4 h-4" /></button>
                    </div>
                </div>

                <div className="p-3 bg-slate-100/50 min-h-[400px]">
                    {loading ? (
                        <div className="p-20 text-center animate-pulse text-slate-400 font-bold uppercase tracking-widest text-xs">Synchronizing Residential Database...</div>
                    ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                            {rooms.map(room => {
                                const occupancy = room.bedAllocations?.length || 0;
                                const isFull = occupancy >= room.capacity;
                                return (
                                    <div key={room.id} className={`bg-white border-2 rounded shadow-sm overflow-hidden transition-all hover:shadow-md cursor-pointer ${isFull ? 'border-rose-100 bg-rose-50/20' : 'border-slate-200 hover:border-[#004b93]'}`}>
                                        <div className={`px-3 py-1.5 flex justify-between items-center border-b ${isFull ? 'bg-rose-100/50 border-rose-200' : 'bg-slate-50 border-slate-200'}`}>
                                            <div className="flex items-center gap-2">
                                                <Home className={`w-3.5 h-3.5 ${isFull ? 'text-rose-600' : 'text-[#004b93]'}`} />
                                                <span className="text-[12px] font-black text-slate-700 uppercase">Room {room.roomNo}</span>
                                            </div>
                                            <span className={`text-[10px] font-black px-2 py-0.5 rounded tracking-tighter ${isFull ? 'bg-rose-200 text-rose-800' : 'bg-[#004b93] text-white'}`}>
                                                {occupancy}/{room.capacity} BEDS
                                            </span>
                                        </div>
                                        <div className="p-2 space-y-1.5 min-h-[100px]">
                                            {room.bedAllocations?.map((b: any, idx: number) => (
                                                <div key={b.id} className="flex items-center justify-between text-[11px] font-bold bg-slate-50 border border-slate-200 rounded px-2 py-1 group">
                                                    <div className="flex items-center gap-1.5 text-slate-600">
                                                        <span className="w-4 h-4 rounded-full bg-slate-200 text-[10px] flex items-center justify-center text-slate-500 font-mono">{idx + 1}</span>
                                                        <span className="truncate max-w-[120px] uppercase">{b.student?.firstName} {b.student?.lastName}</span>
                                                    </div>
                                                    <UserMinus className="w-3.5 h-3.5 text-slate-300 hover:text-rose-500 transition-colors cursor-pointer" />
                                                </div>
                                            ))}
                                            {occupancy < room.capacity && (
                                                <div className="flex items-center justify-center p-2 border-2 border-dashed border-slate-200 rounded text-slate-300 hover:border-blue-300 hover:text-blue-400 transition-all text-[10px] font-black uppercase group">
                                                    <Plus className="w-3.5 h-3.5 group-hover:rotate-90 transition-transform" /> Allocate
                                                </div>
                                            )}
                                        </div>
                                        <div className="px-3 py-1.5 border-t border-slate-100 flex justify-between items-center flex-wrap gap-1">
                                            <div className="flex gap-1">
                                                {Array.from({ length: room.capacity }).map((_, i) => (
                                                    <div key={i} className={`w-2 h-2 rounded-full ${i < occupancy ? 'bg-emerald-500' : 'bg-slate-200'}`} />
                                                ))}
                                            </div>
                                            <span className="text-[9px] font-black text-slate-400 uppercase tracking-tighter">Verified: 12-Apr</span>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>

            {/* 4. Registration Modal Overlay */}
            {showModal && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white border-2 border-[#004b93] shadow-2xl rounded-lg overflow-hidden w-full max-w-sm animate-in fade-in zoom-in duration-200">
                        <div className="erp-header-blue px-4 py-3 flex items-center gap-3">
                            <Plus className="w-5 h-5" />
                            <h3 className="text-sm font-black uppercase tracking-widest">Register Residential Asset</h3>
                        </div>
                        <form onSubmit={handleCreate} className="p-6 space-y-5">
                            <div className="space-y-1.5">
                                <label className="text-[11px] font-black text-slate-500 uppercase flex items-center gap-1.5">
                                    <Building2 className="w-3.5 h-3.5" /> Room Narrative (No.)
                                </label>
                                <input required value={form.roomNo} onChange={e => setForm({ ...form, roomNo: e.target.value })}
                                    className="erp-input w-full uppercase font-black tracking-widest" placeholder="e.g. A-101" />
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-[11px] font-black text-slate-500 uppercase flex items-center gap-1.5">
                                    <Bed className="w-3.5 h-3.5" /> Static Capacity
                                </label>
                                <div className="grid grid-cols-4 gap-2">
                                    {[1, 2, 4, 6].map(c => (
                                        <button key={c} type="button" onClick={() => setForm({ ...form, capacity: c })}
                                            className={`py-2 rounded border-2 font-black transition-all ${form.capacity === c ? 'border-[#004b93] bg-blue-50 text-[#004b93]' : 'border-slate-100 hover:border-slate-300 text-slate-400'}`}>
                                            {c}
                                        </button>
                                    ))}
                                </div>
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
                <span>* Institutional Residential Management Automation v3.2</span>
                <span className="flex items-center gap-1 text-emerald-600"><AlertCircle className="w-3 h-3" /> All allocations are logged into permanent audit trail</span>
            </div>
        </div>
    );
};

const HostelKPICard = ({ label, value, sub, color, icon }: any) => (
    <div className={`border border-slate-200 rounded p-3 bg-white shadow-sm border-b-2 hover:border-b-[#004b93] transition-all flex items-center gap-4`}>
        <div className={`p-2 rounded-lg bg-slate-50 ${color} border border-slate-100`}>{icon}</div>
        <div>
            <span className="text-[9px] font-black uppercase tracking-wider text-slate-400">{label}</span>
            <p className={`text-xl font-black ${color} tracking-tight leading-none mt-1`}>{value || 0}</p>
            <p className="text-[9px] font-bold text-slate-400 italic mt-0.5">{sub}</p>
        </div>
    </div>
);

export default HostelManagement;
