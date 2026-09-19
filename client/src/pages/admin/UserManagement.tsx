import React, { useState, useEffect, useCallback } from 'react';
import { apiClient } from '../../api/client';
import { Users, UserPlus, Search, ToggleLeft, ToggleRight, Key, ChevronLeft, ChevronRight, Filter, ShieldCheck, Activity, Printer, FileDown, MoreHorizontal, UserCheck, UserX } from 'lucide-react';
import { toast } from 'sonner';

const UserManagement = () => {
    const [users, setUsers] = useState<any[]>([]);
    const [stats, setStats] = useState<any>(null);
    const [pagination, setPagination] = useState({ page: 1, total: 0, totalPages: 1 });
    const [filters, setFilters] = useState({ role: '', search: '' });
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [form, setForm] = useState({ email: '', password: '', role: 'STUDENT', firstName: '', lastName: '', enrollmentNo: '', batchId: '', departmentId: '' });
    const [formError, setFormError] = useState('');

    const fetchUsers = useCallback(async (page = 1) => {
        setLoading(true);
        try {
            const params = new URLSearchParams({ page: String(page), limit: '15' });
            if (filters.role) params.set('role', filters.role);
            if (filters.search) params.set('search', filters.search);
            const res = await apiClient.get(`/admin/users?${params}`);
            setUsers(res.data.data.users);
            setPagination(res.data.data.pagination);
        } catch (e) { console.error(e); }
        setLoading(false);
    }, [filters]);

    const fetchStats = async () => {
        try {
            const res = await apiClient.get('/admin/users/stats');
            setStats(res.data.data);
        } catch (e) { console.error(e); }
    };

    useEffect(() => { fetchUsers(); fetchStats(); }, [fetchUsers]);

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();
        setFormError('');
        try {
            await apiClient.post('/admin/users', form);
            toast.success('Institutional account provisioned successfully');
            setShowModal(false);
            setForm({ email: '', password: '', role: 'STUDENT', firstName: '', lastName: '', enrollmentNo: '', batchId: '', departmentId: '' });
            fetchUsers();
            fetchStats();
        } catch (err: any) {
            setFormError(err.response?.data?.error || 'Failed to provision user');
        }
    };

    const toggleActive = async (userId: string, currentlyActive: boolean) => {
        try {
            await apiClient.patch(`/admin/users/${userId}/status`, { isActive: !currentlyActive });
            toast.success(`User access ${currentlyActive ? 'suspended' : 'restored'}`);
            fetchUsers(pagination.page);
            fetchStats();
        } catch (e) { console.error(e); }
    };

    const resetPassword = async (userId: string) => {
        const newPass = prompt('Enter authorized new password:');
        if (!newPass) return;
        try {
            await apiClient.post(`/admin/users/${userId}/reset-password`, { newPassword: newPass });
            toast.success('Security credential updated successfully');
        } catch (e: any) {
            toast.error(e.response?.data?.error || 'Failed to update credentials');
        }
    };

    return (
        <div className="bg-white min-h-screen text-slate-800 p-2 space-y-4">
            {/* 1. Module Header */}
            <div className="border border-slate-300 rounded shadow-sm overflow-hidden bg-white">
                <div className="erp-header-blue px-3 py-1.5 text-[14px] flex justify-between items-center font-bold">
                    <div className="flex items-center gap-2 uppercase tracking-tight">
                        <Users className="w-4 h-4" />
                        Identity Management & Access Control Matrix
                    </div>
                </div>
                <div className="erp-strip-green px-3 py-1.5 text-[11px] font-bold text-emerald-800 flex justify-between uppercase italic tracking-tighter">
                    <span>Authorized oversight for user provisioning, role-based access, and credential security.</span>
                    <span className="flex items-center gap-1.5"><ShieldCheck className="w-3.5 h-3.5" /> Identity Tier: Enterprise</span>
                </div>
            </div>

            {/* 2. Stats KPI Ribbon */}
            {stats && (
                <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
                    <UserKPICard label="Consolidated" value={stats.total} sub="Identities" color="text-slate-800" />
                    <UserKPICard label="Students" value={stats.students} sub="Enrolled" color="text-[#004b93]" />
                    <UserKPICard label="Faculty" value={stats.faculty} sub="Authorized" color="text-indigo-600" />
                    <UserKPICard label="Management" value={stats.staff} sub="Privileged" color="text-amber-700" />
                    <UserKPICard label="Active Node" value={stats.active} sub="Synced" color="text-emerald-700" />
                    <UserKPICard label="Suspended" value={stats.inactive} sub="Restricted" color="text-rose-600" isWarning={stats.inactive > 0} />
                </div>
            )}

            {/* 3. Operational Matrix */}
            <div className="border border-slate-300 rounded shadow-sm overflow-hidden bg-white">
                <div className="bg-slate-50 px-3 py-2 border-b border-slate-300 flex justify-between items-center flex-wrap gap-3">
                    <div className="flex items-center gap-4">
                        <select
                            value={filters.role}
                            onChange={e => setFilters(f => ({ ...f, role: e.target.value }))}
                            className="erp-input h-8 text-[11px] font-black text-blue-900 border-2"
                        >
                            <option value="">ALL AUTHORIZED ROLES</option>
                            {['STUDENT', 'FACULTY', 'HOD', 'ADMIN', 'STAFF', 'PRINCIPAL'].map(r => <option key={r} value={r}>{r}</option>)}
                        </select>
                        <div className="relative">
                            <input
                                type="text"
                                className="erp-input h-8 pl-8 text-[11px] w-64 font-bold"
                                placeholder="Search Identity (Email/Name)..."
                                value={filters.search}
                                onChange={e => setFilters(f => ({ ...f, search: e.target.value }))}
                                onKeyDown={e => e.key === 'Enter' && fetchUsers()}
                            />
                            <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-slate-400" />
                        </div>
                    </div>
                    <div className="flex gap-2">
                        <button onClick={() => setShowModal(true)} className="erp-btn-rect bg-[#004b93] hover:bg-[#003870] flex items-center gap-2 py-2 px-6 text-[11px] font-black uppercase tracking-widest shadow-md shadow-blue-500/10 transition-all">
                            <UserPlus className="w-4 h-4" /> Provision Account
                        </button>
                        <button className="p-2 bg-white border border-slate-300 rounded hover:bg-slate-50 text-slate-500 transition-colors"><Printer className="w-4 h-4" /></button>
                        <button className="p-2 bg-white border border-slate-300 rounded hover:bg-slate-50 text-slate-500 transition-colors"><FileDown className="w-4 h-4" /></button>
                    </div>
                </div>

                <div className="overflow-x-auto min-h-[450px]">
                    {loading ? (
                        <div className="p-20 text-center animate-pulse text-slate-400 font-bold uppercase tracking-widest text-xs italic">Synchronizing Global Identity Domain...</div>
                    ) : (
                        <table className="w-full erp-table-dense border-collapse">
                            <thead>
                                <tr className="bg-slate-100 text-slate-600 font-bold border-b border-slate-300 uppercase text-[10px]">
                                    <th className="px-5 py-2.5 text-center border-r border-slate-100 w-12">SN</th>
                                    <th className="px-5 py-2.5 text-left border-r border-slate-100">Identity Identifier (Email)</th>
                                    <th className="px-5 py-2.5 text-left border-r border-slate-100">Functional Name</th>
                                    <th className="px-5 py-2.5 text-center border-r border-slate-100 w-32">Role Access</th>
                                    <th className="px-5 py-2.5 text-center border-r border-slate-100 w-32">Active Status</th>
                                    <th className="px-5 py-2.5 text-center border-r border-slate-100 w-32">Registry Date</th>
                                    <th className="px-5 py-2.5 text-center w-32">Directives</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {users.length === 0 ? (
                                    <tr><td colSpan={7} className="p-16 text-center text-slate-400 font-black uppercase tracking-widest text-xs">Zero Identity Records Identified.</td></tr>
                                ) : users.map((u, idx) => (
                                    <tr key={u.id} className="hover:bg-blue-50/30 transition-colors group">
                                        <td className="px-5 py-3 text-center text-slate-400 font-mono text-[10px] border-r border-slate-100">{(pagination.page - 1) * 15 + idx + 1}</td>
                                        <td className="px-5 py-3 text-[11px] font-black text-[#004b93] font-mono border-r border-slate-100 tracking-tighter uppercase">{u.email}</td>
                                        <td className="px-5 py-3 text-[11px] font-bold text-slate-600 border-r border-slate-100 uppercase italic">{u.profile?.firstName} {u.profile?.lastName}</td>
                                        <td className="px-5 py-3 text-center border-r border-slate-100">
                                            <span className="px-2 py-0.5 bg-slate-100 border border-slate-200 rounded text-[9px] font-black uppercase tracking-tighter text-slate-500">{u.role}</span>
                                        </td>
                                        <td className="px-5 py-3 text-center border-r border-slate-100">
                                            {u.isActive ? (
                                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded border border-emerald-200 bg-emerald-100 text-emerald-800 text-[9px] font-black uppercase tracking-tighter">
                                                    <UserCheck className="w-3 h-3" /> VERIFIED
                                                </span>
                                            ) : (
                                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded border border-rose-200 bg-rose-100 text-rose-800 text-[9px] font-black uppercase tracking-tighter">
                                                    <UserX className="w-3 h-3" /> RESTRICTED
                                                </span>
                                            )}
                                        </td>
                                        <td className="px-5 py-3 text-center text-[10px] font-bold text-slate-400 font-mono border-r border-slate-100">{new Date(u.createdAt).toLocaleDateString()}</td>
                                        <td className="px-5 py-3 text-center">
                                            <div className="flex gap-2 justify-center opacity-40 group-hover:opacity-100 transition-opacity">
                                                <button onClick={() => toggleActive(u.id, u.isActive)} className={`p-1.5 rounded transition-all shadow-sm ${u.isActive ? 'bg-rose-50 border border-rose-200 text-rose-600 hover:bg-rose-100' : 'bg-emerald-50 border border-emerald-200 text-emerald-600 hover:bg-emerald-100'}`} title={u.isActive ? "Suspend Access" : "Restore Access"}>
                                                    {u.isActive ? <ToggleRight className="w-4 h-4" /> : <ToggleLeft className="w-4 h-4" />}
                                                </button>
                                                <button onClick={() => resetPassword(u.id)} className="p-1.5 bg-blue-50 border border-blue-200 text-blue-700 rounded hover:bg-blue-100 shadow-sm transition-all" title="Manage Credentials">
                                                    <Key className="w-4 h-4" />
                                                </button>
                                            </div>
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
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{pagination.total} IDENTITIES TARGETED</p>
                        <div className="flex items-center gap-4">
                            <button onClick={() => fetchUsers(pagination.page - 1)} disabled={pagination.page <= 1}
                                className="p-1 px-3 bg-white border border-slate-300 rounded text-slate-600 disabled:opacity-30 flex items-center gap-1 text-[10px] font-black uppercase hover:bg-slate-100 transition-colorsShadow-sm">
                                <ChevronLeft className="w-3 h-3" /> Prev
                            </button>
                            <span className="text-[11px] font-black text-slate-600 uppercase tracking-tighter">Section {pagination.page} / {pagination.totalPages}</span>
                            <button onClick={() => fetchUsers(pagination.page + 1)} disabled={pagination.page >= pagination.totalPages}
                                className="p-1 px-3 bg-white border border-slate-300 rounded text-slate-600 disabled:opacity-30 flex items-center gap-1 text-[10px] font-black uppercase hover:bg-slate-100 transition-colors shadow-sm">
                                Next <ChevronRight className="w-3 h-3" />
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* 4. Provisioning Modal Overlay */}
            {showModal && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white border-2 border-[#004b93] shadow-2xl rounded-lg overflow-hidden w-full max-w-lg animate-in fade-in zoom-in duration-200">
                        <div className="erp-header-blue px-4 py-3 flex justify-between items-center">
                            <div className="flex items-center gap-3">
                                <UserPlus className="w-5 h-5" />
                                <h3 className="text-sm font-black uppercase tracking-widest leading-none">Provision Institutional Account</h3>
                            </div>
                            <button onClick={() => setShowModal(false)} className="text-white hover:bg-white/10 rounded transition-colors">✕</button>
                        </div>
                        <form onSubmit={handleCreate} className="p-6 space-y-5">
                            {formError && <div className="p-2.5 bg-rose-50 border border-rose-200 text-rose-700 text-[10px] font-black uppercase tracking-widest rounded animate-shake flex items-center gap-2"><Activity className="w-4 h-4" /> {formError}</div>}
                            
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Nomenclature (First)</label>
                                    <input required className="erp-input w-full uppercase font-black" value={form.firstName} onChange={e => setForm(f => ({ ...f, firstName: e.target.value }))} />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Surname (Last)</label>
                                    <input required className="erp-input w-full uppercase font-black" value={form.lastName} onChange={e => setForm(f => ({ ...f, lastName: e.target.value }))} />
                                </div>
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-2 underline decoration-blue-200">Electronic Identifier (Login ID)</label>
                                <input required className="erp-input w-full font-black font-mono tracking-tighter" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} placeholder="e.g. admin.kits@inst.edu" />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-1.5"><Key className="w-3.5 h-3.5" /> Static Password</label>
                                    <input type="password" required className="erp-input w-full font-black tracking-widest" value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Privileged Role</label>
                                    <select className="erp-input w-full font-black text-blue-900 border-2" value={form.role} onChange={e => setForm(f => ({ ...f, role: e.target.value }))}>
                                        {['STUDENT', 'FACULTY', 'HOD', 'ADMIN', 'STAFF', 'PRINCIPAL'].map(r => <option key={r} value={r}>{r}</option>)}
                                    </select>
                                </div>
                            </div>
                            {form.role === 'STUDENT' && (
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-1.5 underline decoration-indigo-200"><ShieldCheck className="w-3.5 h-3.5 text-indigo-400" /> Enrollment Registry No.</label>
                                    <input className="erp-input w-full border-indigo-200 bg-indigo-50/20 font-black tracking-widest" value={form.enrollmentNo} onChange={e => setForm(f => ({ ...f, enrollmentNo: e.target.value }))} placeholder="e.g. 24KITS-CS-001" />
                                </div>
                            )}
                            <div className="flex gap-3 pt-4 border-t border-slate-100">
                                <button type="button" onClick={() => setShowModal(false)} className="flex-1 px-4 py-2.5 bg-slate-100 rounded text-[11px] font-black text-slate-500 uppercase hover:bg-slate-200 transition-colors tracking-[0.2em]">Abort</button>
                                <button type="submit" className="flex-1 px-4 py-2.5 bg-[#004b93] text-white rounded text-[11px] font-black uppercase tracking-[0.2em] hover:bg-[#003870] transition-colors shadow-lg shadow-blue-500/20">Authorize</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
            <div className="flex justify-between items-center text-[10px] text-slate-400 font-bold uppercase tracking-tighter italic">
                <span>* Identity Lifecycle Automation Node v8.3</span>
                <span className="text-blue-800 flex items-center gap-1"><ShieldCheck className="w-3.5 h-3.5" /> All mutations are cryptographically logged</span>
            </div>
        </div>
    );
};

const UserKPICard = ({ label, value, sub, color, isWarning }: any) => (
    <div className={`border border-slate-200 rounded p-2.5 bg-white shadow-sm border-b-2 ${isWarning ? 'border-b-rose-500' : 'hover:border-b-[#004b93]'} transition-all`}>
        <span className="text-[9px] font-black uppercase tracking-wider text-slate-400 block truncate">{label}</span>
        <p className={`text-xl font-black ${color} tracking-tight leading-none mt-1`}>{value || 0}</p>
        <p className="text-[9px] font-bold text-slate-400 italic mt-0.5">{sub}</p>
    </div>
);

export default UserManagement;
