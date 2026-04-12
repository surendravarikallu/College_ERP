import React, { useState, useEffect } from 'react';
import { apiClient } from '../../api/client';
import { useToast } from '../../hooks/use-toast';
import { Shield, Search, ChevronLeft, ChevronRight } from 'lucide-react';

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
      toast({ title: 'Error', description: 'Failed to fetch audit logs', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const handleFilter = () => fetchLogs(1);

  const getActionBadgeColor = (action: string) => {
    if (action.includes('CREATE') || action.includes('CREATED')) return 'bg-emerald-500/15 text-emerald-400';
    if (action.includes('DELETE') || action.includes('REMOVED')) return 'bg-red-500/15 text-red-400';
    if (action.includes('UPDATE') || action.includes('UPDATED')) return 'bg-blue-500/15 text-blue-400';
    return 'bg-slate-500/15 text-slate-400';
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Audit Logs</h1>
        <p className="mt-1 text-sm text-slate-500">Security & compliance trail — all system actions</p>
      </div>

      <div className="flex gap-3 items-end">
        <div className="flex-1">
          <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Action</label>
          <input type="text" placeholder="e.g. USER_CREATED" value={filters.action}
            onChange={(e) => setFilters({ ...filters, action: e.target.value })}
            className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm outline-none focus:border-indigo-500" />
        </div>
        <div className="flex-1">
          <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Resource</label>
          <input type="text" placeholder="e.g. User, Settings" value={filters.resource}
            onChange={(e) => setFilters({ ...filters, resource: e.target.value })}
            className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm outline-none focus:border-indigo-500" />
        </div>
        <button onClick={handleFilter} className="px-4 py-2 bg-indigo-600 text-sm font-semibold text-white rounded-lg hover:bg-indigo-500 flex items-center gap-2">
          <Search className="w-4 h-4" /> Filter
        </button>
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
        {loading ? (
          <div className="flex justify-center py-16"><div className="w-8 h-8 border-2 border-slate-700 border-t-indigo-500 rounded-full animate-spin" /></div>
        ) : logs.length === 0 ? (
          <div className="text-center py-16">
            <Shield className="w-12 h-12 text-slate-600 mx-auto mb-4" />
            <p className="text-slate-400 font-medium">No audit logs found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-slate-800/50">
                  {['Timestamp', 'User', 'Action', 'Resource', 'Resource ID'].map(h => (
                    <th key={h} className="text-left px-5 py-3 text-[11px] font-semibold uppercase tracking-wide text-slate-500">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {logs.map((log: any) => (
                  <tr key={log.id} className="border-t border-slate-800 hover:bg-slate-800/30 transition-colors">
                    <td className="px-5 py-3.5 text-xs text-slate-500 font-mono">{new Date(log.createdAt).toLocaleString()}</td>
                    <td className="px-5 py-3.5 text-sm">{log.User?.email || log.userId || '—'}</td>
                    <td className="px-5 py-3.5">
                      <span className={`inline-flex px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${getActionBadgeColor(log.action)}`}>
                        {log.action}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-sm text-slate-400">{log.resourceTable}</td>
                    <td className="px-5 py-3.5 text-xs text-slate-600 font-mono">{log.resourceId}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {pagination.totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-slate-800 px-5 py-3">
            <p className="text-xs text-slate-500">{pagination.total} total entries</p>
            <div className="flex items-center gap-2">
              <button onClick={() => fetchLogs(pagination.page - 1)} disabled={pagination.page <= 1}
                className="p-1.5 rounded-lg hover:bg-slate-700 disabled:opacity-30 disabled:cursor-not-allowed">
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="text-sm text-slate-400">Page {pagination.page} of {pagination.totalPages}</span>
              <button onClick={() => fetchLogs(pagination.page + 1)} disabled={pagination.page >= pagination.totalPages}
                className="p-1.5 rounded-lg hover:bg-slate-700 disabled:opacity-30 disabled:cursor-not-allowed">
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
