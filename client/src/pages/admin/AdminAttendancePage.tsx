import React, { useState, useEffect } from 'react';
import { apiClient } from '../../api/client';
import { AlertTriangle, Filter, BarChart3, TrendingDown, ShieldCheck, Activity, Search, Printer, FileDown, Calendar, Clock, ArrowRightCircle, UserX, UserCheck } from 'lucide-react';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export const AdminAttendancePage = () => {
    const [defaulters, setDefaulters] = useState<any[]>([]);
    const [trends, setTrends] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [month, setMonth] = useState(new Date().getMonth() + 1);
    const [year, setYear] = useState(new Date().getFullYear());

    const fetchAll = async () => {
        setLoading(true);
        try {
            const [d, t] = await Promise.all([
                apiClient.get('/attendance/defaulters?threshold=75').catch(() => ({ data: { data: [] } })),
                apiClient.get('/analytics/attendance-trends').catch(() => ({ data: { data: [] } })),
            ]);
            setDefaulters(d.data.data || []);
            setTrends(t.data.data || []);
        } catch { }
        setLoading(false);
    };

    useEffect(() => { fetchAll(); }, [month, year]);

    return (
        <div className="bg-white min-h-screen text-slate-800 p-2 space-y-4">
            {/* 1. Module Header */}
            <div className="border border-slate-300 rounded shadow-sm overflow-hidden bg-white">
                <div className="erp-header-blue px-3 py-1.5 text-[14px] flex justify-between items-center font-bold">
                    <div className="flex items-center gap-2 uppercase tracking-tight">
                        <BarChart3 className="w-4 h-4" />
                        Institution Attendance Monitoring & Compliance Hub
                    </div>
                    <div className="flex gap-2 items-center">
                        <div className="flex bg-white/10 rounded overflow-hidden border border-white/20">
                            <select value={month} onChange={e => setMonth(Number(e.target.value))}
                                className="bg-transparent text-[10px] font-black text-white px-2 py-1 outline-none uppercase cursor-pointer">
                                {MONTHS.map((m, i) => <option key={m} value={i + 1} className="text-slate-800">{m}</option>)}
                            </select>
                            <span className="w-px bg-white/20"></span>
                            <input type="number" value={year} onChange={e => setYear(Number(e.target.value))}
                                className="bg-transparent text-[10px] font-black text-white px-2 py-1 outline-none w-14 cursor-pointer" />
                        </div>
                    </div>
                </div>
                <div className="erp-strip-green px-3 py-1.5 text-[11px] font-bold text-emerald-800 flex justify-between uppercase italic tracking-tighter">
                    <span>Authorized tracking of departmental benchmarks, individual shortfalls, and compliance thresholds.</span>
                    <span className="flex items-center gap-1.5"><ShieldCheck className="w-3.5 h-3.5" /> Compliance Threshold: 75%</span>
                </div>
            </div>

            {/* 2. Departmental Density Ribbon */}
            {trends.length > 0 && (
                <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                    {trends.map((dept: any, idx: number) => (
                        <div key={idx} className="border border-slate-200 rounded p-2.5 bg-white shadow-sm border-b-2 hover:border-b-[#004b93] transition-all relative overflow-hidden group">
                            <span className="text-[9px] font-black uppercase tracking-widest text-slate-400 block truncate">{dept.department}</span>
                            <p className={`text-xl font-black mt-1 leading-none ${dept.percentage >= 80 ? 'text-emerald-700' : dept.percentage >= 60 ? 'text-amber-600' : 'text-rose-600'}`}>{dept.percentage}%</p>
                            <div className="mt-2 w-full bg-slate-100 h-1.5 rounded-full overflow-hidden border border-slate-50">
                                <div className={`h-full group-hover:animate-pulse transition-all ${dept.percentage >= 80 ? 'bg-emerald-500' : dept.percentage >= 60 ? 'bg-amber-500' : 'bg-rose-500'}`} style={{ width: `${Math.min(dept.percentage, 100)}%` }} />
                            </div>
                            <div className="absolute -right-1 -top-1 opacity-5 text-slate-800">
                                <Activity className="w-8 h-8" />
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* 3. Defaulter Matrix Ledger */}
            <div className="border border-slate-300 rounded shadow-sm overflow-hidden bg-white">
                <div className="bg-slate-50 px-3 py-2 border-b border-slate-300 flex justify-between items-center">
                    <div className="flex items-center gap-2">
                        <TrendingDown className="w-3.5 h-3.5 text-rose-500" />
                        <span className="text-[11px] font-black uppercase tracking-widest text-rose-900">Attendance Defaulter Registry (Below 75%)</span>
                    </div>
                    <div className="flex gap-2">
                        <div className="relative">
                            <input className="erp-input h-7 pl-8 text-[10px] w-48 font-bold" placeholder="Search Identity..." />
                            <Search className="w-3 h-3 absolute left-2.5 top-2 text-slate-400" />
                        </div>
                        <button className="p-1.5 bg-white border border-slate-300 rounded hover:bg-slate-50 text-slate-500 transition-colors"><Printer className="w-4 h-4" /></button>
                        <button className="p-1.5 bg-white border border-slate-300 rounded hover:bg-slate-50 text-slate-500 transition-colors"><FileDown className="w-4 h-4" /></button>
                    </div>
                </div>

                <div className="overflow-x-auto min-h-[450px]">
                    {loading ? (
                        <div className="p-24 text-center animate-pulse text-slate-400 font-bold uppercase tracking-widest text-xs italic">Compiling Comprehensive Attendance Audit...</div>
                    ) : defaulters.length === 0 ? (
                        <div className="text-center py-24 group">
                            <ShieldCheck className="w-16 h-16 text-emerald-100 mx-auto mb-4 group-hover:scale-110 transition-transform" />
                            <p className="text-emerald-700 font-black uppercase tracking-widest text-[11px]">Optimal Compliance: Zero Defaulters Identified.</p>
                        </div>
                    ) : (
                        <table className="w-full erp-table-dense border-collapse">
                            <thead>
                                <tr className="bg-slate-100 text-slate-600 font-bold uppercase text-[10px] border-b border-slate-200">
                                    <th className="px-5 py-2.5 text-center w-12 border-r border-slate-100">SN</th>
                                    <th className="px-5 py-2.5 text-left border-r border-slate-100">Authorized Identity</th>
                                    <th className="px-5 py-2.5 text-center border-r border-slate-100 w-40">System Roll No.</th>
                                    <th className="px-5 py-2.5 text-center border-r border-slate-100 w-32">Aggregate %</th>
                                    <th className="px-5 py-2.5 text-left border-r border-slate-100">Structural Shortfalls (Subject-Wise)</th>
                                    <th className="px-5 py-2.5 text-center w-40">Compliance Status</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {defaulters.map((d, i) => (
                                    <tr key={i} className="hover:bg-rose-50/20 transition-colors group">
                                        <td className="px-5 py-3 text-center font-mono text-slate-300 text-[10px] border-r border-slate-100">{i + 1}</td>
                                        <td className="px-5 py-3 text-[11px] font-black text-slate-700 uppercase tracking-tight border-r border-slate-100 flex items-center gap-2">
                                            <div className="w-6 h-6 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center text-[10px] font-black border border-rose-100 truncate">
                                                {d.student?.name?.charAt(0) || d.name?.charAt(0)}
                                            </div>
                                            {d.student?.name || d.name}
                                        </td>
                                        <td className="px-5 py-3 text-center border-r border-slate-100 font-mono text-[#004b93] font-black uppercase text-[11px]">{d.student?.rollNumber || d.rollNumber}</td>
                                        <td className="px-5 py-3 text-center border-r border-slate-100">
                                            <span className="text-rose-600 font-black text-[14px] leading-none">{d.overallPercentage || d.percentage}%</span>
                                        </td>
                                        <td className="px-5 py-2.5 border-r border-slate-100">
                                            <div className="flex flex-wrap gap-2">
                                                {(d.shortageSubjects || []).map((s: any, j: number) => (
                                                    <div key={j} className="flex items-center gap-1.5 px-2 py-0.5 bg-rose-50 border border-rose-100 rounded group/pin relative">
                                                        <span className="text-[9px] font-black text-rose-700 uppercase tracking-tighter max-w-[80px] truncate">{s.name}</span>
                                                        <span className="w-px h-2.5 bg-rose-200"></span>
                                                        <span className="text-[10px] font-black text-rose-800">{s.percentage}%</span>
                                                    </div>
                                                ))}
                                            </div>
                                        </td>
                                        <td className="px-5 py-3 text-center">
                                            <span className="px-2 py-0.5 bg-rose-100 text-rose-800 border border-rose-200 rounded text-[9px] font-black uppercase tracking-widest flex items-center justify-center gap-1.5 mx-auto w-fit">
                                                <UserX className="w-3 h-3" /> Condonation Req.
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>
            </div>
            <div className="flex justify-between items-center text-[10px] text-slate-400 font-bold uppercase tracking-tighter italic">
                <span>* Institutional Attendance Forensic Automation v5.2</span>
                <span className="text-rose-600 flex items-center gap-1"><AlertCircle className="w-3 h-3" /> Automatic deficit notifications dispatched to registered electronic IDs.</span>
            </div>
        </div>
    );
};

const AlertCircle = ({ className }: { className?: string }) => (
    <Activity className={className} />
);

export default AdminAttendancePage;
