import React, { useState, useEffect } from 'react';
import { apiClient } from '../../api/client';
import { useToast } from '../../hooks/use-toast';
import { Shield, Search, ChevronLeft, ChevronRight, Activity, ShieldCheck, Clock, Layers, Filter, Printer, FileDown, Plus, BookOpen, CheckCircle2 } from 'lucide-react';

export const AdminExamsPage = () => {
    const { toast } = useToast();
    const [sessions, setSessions] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchSessions();
    }, []);

    const fetchSessions = async () => {
        try {
            setLoading(true);
            const res = await apiClient.get('/exams/sessions');
            setSessions(res.data.data || []);
        } catch {
            toast({ title: 'System Error', description: 'Failed to synchronize exam sessions', variant: 'destructive' });
        } finally {
            setLoading(false);
        }
    };

    const publishResults = async (sessionId: string) => {
        try {
            await apiClient.post('/exams/results/publish', { examSessionId: sessionId });
            toast({ title: 'Authorization Success', description: 'Results synchronized and published successfully' });
            fetchSessions();
        } catch {
            toast({ title: 'Error', description: 'Failed to publish results', variant: 'destructive' });
        }
    };

    return (
        <div className="bg-white min-h-screen text-slate-800 p-2 space-y-4">
            {/* 1. Module Header */}
            <div className="border border-slate-300 rounded shadow-sm overflow-hidden bg-white">
                <div className="erp-header-blue px-3 py-1.5 text-[14px] flex justify-between items-center font-bold">
                    <div className="flex items-center gap-2 uppercase tracking-tight">
                        <BookOpen className="w-4 h-4" />
                        Generic Exam Administration & Session Matrix
                    </div>
                    <div className="flex gap-2">
                        <button className="erp-btn-rect bg-white/10 hover:bg-white/20 flex items-center gap-1 text-[9px] py-1 uppercase font-black">
                            <Plus className="w-3.5 h-3.5" /> Initialize Exam Session
                        </button>
                    </div>
                </div>
                <div className="erp-strip-green px-3 py-1.5 text-[11px] font-bold text-emerald-800 flex justify-between uppercase italic tracking-tighter">
                    <span>Authorized oversight for hall ticket generation, session locking, and result synchronization.</span>
                    <span className="flex items-center gap-1.5"><ShieldCheck className="w-3.5 h-3.5" /> Audit Priority: High</span>
                </div>
            </div>

            {/* 2. Content Matrix */}
            <div className="border border-slate-300 rounded shadow-sm overflow-hidden bg-white">
                <div className="bg-slate-50 px-3 py-2 border-b border-slate-300 flex justify-between items-center">
                    <div className="flex items-center gap-2">
                        <Layers className="w-3.5 h-3.5 text-slate-400" />
                        <span className="text-[11px] font-black uppercase tracking-widest text-[#004b93]">Active Exam Session Ledger</span>
                    </div>
                    <div className="flex gap-2">
                        <div className="relative">
                            <input className="erp-input h-7 pl-8 text-[10px] w-48 font-bold" placeholder="Search Session..." />
                            <Search className="w-3 h-3 absolute left-2.5 top-2 text-slate-400" />
                        </div>
                        <button className="p-1.5 bg-white border border-slate-300 rounded hover:bg-slate-50 text-slate-500"><Printer className="w-4 h-4" /></button>
                    </div>
                </div>

                <div className="overflow-x-auto min-h-[400px]">
                    {loading ? (
                        <div className="p-20 text-center animate-pulse text-slate-400 font-bold uppercase tracking-widest text-xs">Accessing Examination Database...</div>
                    ) : (
                        <table className="w-full erp-table-dense">
                            <thead>
                                <tr className="bg-slate-100 text-slate-600 font-bold border-b border-slate-300 uppercase text-[10px]">
                                    <th className="px-5 py-2.5 text-left border-r border-slate-200">Session Nomenclature (Name)</th>
                                    <th className="px-5 py-2.5 text-center w-40 border-r border-slate-200">Category Type</th>
                                    <th className="px-5 py-2.5 text-center w-40 border-r border-slate-200">Sync Status</th>
                                    <th className="px-5 py-2.5 text-center w-64">Administrative Directives</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {sessions.length === 0 ? (
                                    <tr><td colSpan={4} className="p-16 text-center text-slate-400 font-black uppercase tracking-widest text-xs">Zero Exam Sessions Identified in Active Domain.</td></tr>
                                ) : sessions.map((session: any) => (
                                    <tr key={session.id} className="hover:bg-blue-50/30 transition-colors group">
                                        <td className="px-5 py-3 text-sm font-black text-[#004b93] uppercase tracking-tighter border-r border-slate-100">
                                            {session.name}
                                        </td>
                                        <td className="px-5 py-3 text-center border-r border-slate-100 text-[10px] font-bold text-slate-500 uppercase">
                                            {session.examType}
                                        </td>
                                        <td className="px-5 py-3 text-center border-r border-slate-100">
                                            {session.isLocked ? (
                                                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded border border-emerald-200 bg-emerald-100 text-emerald-800 text-[9px] font-black uppercase tracking-tighter">
                                                    <ShieldCheck className="w-3 h-3" /> Locked & Published
                                                </span>
                                            ) : (
                                                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded border border-blue-200 bg-blue-100 text-blue-800 text-[9px] font-black uppercase tracking-tighter">
                                                    <Activity className="w-3 h-3" /> Active / Draft
                                                </span>
                                            )}
                                        </td>
                                        <td className="px-5 py-3 text-center">
                                            <div className="flex gap-2 justify-center">
                                                <button className="px-3 py-1 bg-slate-100 text-slate-700 border border-slate-300 rounded text-[9px] font-black uppercase tracking-widest hover:bg-slate-200 transition-colors shadow-sm flex items-center gap-1.5">
                                                    <Printer className="w-3 h-3" /> Hall Tickets
                                                </button>
                                                <button
                                                    onClick={() => publishResults(session.id)}
                                                    disabled={session.isLocked}
                                                    className={`px-3 py-1 rounded text-[9px] font-black uppercase tracking-widest transition-all shadow-sm flex items-center gap-1.5 ${session.isLocked ? 'bg-slate-50 text-slate-300 border border-slate-200 cursor-not-allowed' : 'bg-[#004b93] text-white hover:bg-[#003870] border border-blue-800'}`}
                                                >
                                                    <CheckCircle2 className="w-3 h-3" /> {session.isLocked ? 'Published' : 'Publish Results'}
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>
            </div>
            <div className="flex justify-between items-center text-[10px] text-slate-400 font-bold uppercase tracking-tighter italic">
                <span>* Institutional Examination Management Automation v4.2</span>
                <span className="text-blue-800 uppercase flex items-center gap-1"><ShieldCheck className="w-3 h-3" /> Authorized Admin Console Access</span>
            </div>
        </div>
    );
};
