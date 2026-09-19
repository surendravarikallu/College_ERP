import React, { useState, useEffect } from 'react';
import { apiClient } from '../../api/client';
import { useToast } from '../../hooks/use-toast';
import { Shield, Search, ChevronLeft, ChevronRight, Activity, ShieldCheck, Clock, Layers, Filter, Printer, FileDown } from 'lucide-react';

export const AuditLogPage = () => {
    const { toast } = useToast();
    const [logs, setLogs] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [pagination, setPagination] = useState({ page: 1, totalPages: 1, total: 0 });
    const [filters, setFilters] = useState({ action: '', resource: '' });

    useEffect(() => {
        fetchLogs(1);
    }, []);

    const fetchLogs = async (page: number) => {
        try {
            setLoading(true);
            const params = new URLSearchParams({ page: String(page), limit: '25' });
            if (filters.action) params.set('action', filters.action);
            if (filters.resource) params.set('resource', filters.resource);

            const res = await apiClient.get(`/audit/logs?${params}`);
            setLogs(res.data.logs || []);
            setPagination(res.data.pagination || { page: 1, totalPages: 1, total: 0 });
        } catch {
            toast({ title: 'System Error', description: 'Failed to synchronize audit trail', variant: 'destructive' });
        } finally {
            setLoading(false);
        }
    };

    const handleFilter = () => fetchLogs(1);

    const getActionBadgeColor = (action: string) => {
        if (action.includes('CREATE') || action.includes('CREATED')) return 'bg-emerald-100 text-emerald-800 border-emerald-200';
        if (action.includes('DELETE') || action.includes('REMOVED')) return 'bg-rose-100 text-rose-800 border-rose-200';
        if (action.includes('UPDATE') || action.includes('UPDATED')) return 'bg-blue-100 text-blue-800 border-blue-200';
        return 'bg-slate-100 text-slate-700 border-slate-200';
    };

    return (
        <div className="bg-white min-h-screen text-slate-800 p-2 space-y-4">
            {/* 1. Module Header */}
            <div className="border border-slate-300 rounded shadow-sm overflow-hidden bg-white">
                <div className="erp-header-blue px-3 py-1.5 text-[14px] flex justify-between items-center font-bold">
                    <div className="flex items-center gap-2 uppercase tracking-tight">
                        <Shield className="w-4 h-4" />
                        Institutional Security & Audit Trail Matrix
                    </div>
                </div>
                <div className="erp-strip-green px-3 py-1.5 text-[11px] font-bold text-emerald-800 flex justify-between uppercase italic tracking-tighter">
                    <span>Authorized forensic monitoring for all administrative and user-level system operations.</span>
                    <span className="flex items-center gap-1.5"><ShieldCheck className="w-3.5 h-3.5" /> Compliance Level: Tier 1</span>
                </div>
            </div>

            {/* 2. Filter Matrix */}
            <div className="border border-slate-300 rounded shadow-sm bg-slate-50 p-3">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
                    <div className="space-y-1">
                        <label className="erp-label flex items-center gap-1.5"><Activity className="w-3.5 h-3.5" /> Operation Action</label>
                        <input type="text" placeholder="e.g. USER_CREATED" value={filters.action}
                            onChange={(e) => setFilters({ ...filters, action: e.target.value })}
                            className="erp-input w-full uppercase font-black tracking-widest" />
                    </div>
                    <div className="space-y-1">
                        <label className="erp-label flex items-center gap-1.5"><Layers className="w-3.5 h-3.5" /> Target Resource</label>
                        <input type="text" placeholder="e.g. User, Finance" value={filters.resource}
                            onChange={(e) => setFilters({ ...filters, resource: e.target.value })}
                            className="erp-input w-full uppercase font-black" />
                    </div>
                    <div className="flex gap-2">
                        <button onClick={handleFilter} className="erp-btn-rect px-8 py-2 bg-[#004b93] hover:bg-[#003870] font-black uppercase tracking-widest text-[11px] flex-1 flex items-center justify-center gap-2">
                            <Search className="w-4 h-4" /> Apply Filter
                        </button>
                        <button className="p-2 bg-white border border-slate-300 rounded hover:bg-slate-50 text-slate-500"><Printer className="w-4 h-4" /></button>
                    </div>
                </div>
            </div>

            {/* 3. Audit Ledger Table */}
            <div className="border border-slate-300 rounded shadow-sm overflow-hidden bg-white">
                <div className="bg-slate-50 px-3 py-2 border-b border-slate-300 flex justify-between items-center">
                    <div className="flex items-center gap-2">
                        <Filter className="w-3.5 h-3.5 text-slate-400" />
                        <span className="text-[11px] font-black uppercase tracking-widest text-[#004b93]">Forensic Log Sequence</span>
                    </div>
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-tighter">Real-time Stream: Active</span>
                </div>

                <div className="overflow-x-auto min-h-[450px]">
                    {loading ? (
                        <div className="p-20 text-center animate-pulse text-slate-400 font-bold uppercase tracking-widest text-xs">Synchronizing Audit Registry...</div>
                    ) : logs.length === 0 ? (
                        <div className="text-center py-24">
                            <Shield className="w-12 h-12 text-slate-200 mx-auto mb-4" />
                            <p className="text-slate-400 font-black uppercase tracking-widest text-xs">Zero Forensic Records Identified.</p>
                        </div>
                    ) : (
                        <table className="w-full erp-table-dense">
                            <thead>
                                <tr className="bg-slate-100 text-slate-600 font-bold border-b border-slate-300 uppercase text-[10px]">
                                    <th className="px-4 py-2.5 text-left border-r border-slate-200 w-48">Audit Timestamp</th>
                                    <th className="px-4 py-2.5 text-left border-r border-slate-200 w-64">Authorized Identity</th>
                                    <th className="px-4 py-2.5 text-center border-r border-slate-200 w-40">Operational Action</th>
                                    <th className="px-4 py-2.5 text-left border-r border-slate-200 w-40">Resource Target</th>
                                    <th className="px-4 py-2.5 text-left font-mono">Forensic ID</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {logs.map((log: any) => (
                                    <tr key={log.id} className="hover:bg-blue-50/30 transition-colors group">
                                        <td className="px-4 py-3 text-[10px] font-black text-slate-400 font-mono border-r border-slate-100">
                                            <div className="flex items-center gap-2">
                                                <Clock className="w-3 h-3" />
                                                {new Date(log.createdAt).toLocaleString()}
                                            </div>
                                        </td>
                                        <td className="px-4 py-3 text-[11px] font-bold text-slate-600 border-r border-slate-100 flex items-center gap-2">
                                            <div className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center text-[10px] font-black text-[#004b93] font-mono">
                                                {log.User?.email?.charAt(0).toUpperCase() || '?'}
                                            </div>
                                            {log.User?.email || log.userId || 'SYSTEM_DAEMON'}
                                        </td>
                                        <td className="px-4 py-3 text-center border-r border-slate-100">
                                            <span className={`inline-flex px-2 py-0.5 rounded border text-[9px] font-black uppercase tracking-tighter ${getActionBadgeColor(log.action)}`}>
                                                {log.action}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 text-[11px] font-black text-indigo-700 border-r border-slate-100 uppercase italic">
                                            {log.resourceTable}
                                        </td>
                                        <td className="px-4 py-3 text-[10px] text-slate-400 font-mono tracking-tighter group-hover:text-amber-600 transition-colors">
                                            {log.resourceId}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>

                {/* Pagination Matrix */}
                {pagination.totalPages > 1 && (
                    <div className="bg-slate-50 border-t border-slate-300 px-4 py-2 flex items-center justify-between">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{pagination.total} ENTRIES TOTAL</p>
                        <div className="flex items-center gap-4">
                            <button onClick={() => fetchLogs(pagination.page - 1)} disabled={pagination.page <= 1}
                                className="p-1 px-3 bg-white border border-slate-300 rounded text-slate-600 disabled:opacity-30 flex items-center gap-1 text-[10px] font-black uppercase hover:bg-slate-100 transition-colors">
                                <ChevronLeft className="w-3 h-3" /> Previous
                            </button>
                            <span className="text-[11px] font-black text-slate-600 uppercase tracking-tighter">Record Section {pagination.page} / {pagination.totalPages}</span>
                            <button onClick={() => fetchLogs(pagination.page + 1)} disabled={pagination.page >= pagination.totalPages}
                                className="p-1 px-3 bg-white border border-slate-300 rounded text-slate-600 disabled:opacity-30 flex items-center gap-1 text-[10px] font-black uppercase hover:bg-slate-100 transition-colors">
                                Next <ChevronRight className="w-3 h-3" />
                            </button>
                        </div>
                    </div>
                )}
            </div>
            <div className="flex justify-between items-center text-[10px] text-slate-400 font-bold uppercase tracking-tighter italic">
                <span>* Permanent Security Log Automation v6.1</span>
                <span className="text-emerald-600 flex items-center gap-1"><ShieldCheck className="w-3 h-3" /> Data Immutable & Digitally Signed</span>
            </div>
        </div>
    );
};
