import React, { useState, useEffect, useCallback } from 'react';
import { apiClient } from '../../api/client';
import { Users, UserPlus, Search, Shield, ToggleLeft, ToggleRight, Key, ChevronLeft, ChevronRight } from 'lucide-react';

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
      const res = await apiClient.get(`/identity/users?${params}`);
      setUsers(res.data.data.users);
      setPagination(res.data.data.pagination);
    } catch (e) { console.error(e); }
    setLoading(false);
  }, [filters]);

  const fetchStats = async () => {
    try {
      const res = await apiClient.get('/identity/users/stats');
      setStats(res.data.data);
    } catch (e) { console.error(e); }
  };

  useEffect(() => { fetchUsers(); fetchStats(); }, [fetchUsers]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    try {
      await apiClient.post('/identity/users', form);
      setShowModal(false);
      setForm({ email: '', password: '', role: 'STUDENT', firstName: '', lastName: '', enrollmentNo: '', batchId: '', departmentId: '' });
      fetchUsers();
      fetchStats();
    } catch (err: any) {
      setFormError(err.response?.data?.error || 'Failed to create user');
    }
  };

  const toggleActive = async (userId: string) => {
    try {
      await apiClient.put(`/identity/users/${userId}/toggle-active`);
      fetchUsers(pagination.page);
    } catch (e) { console.error(e); }
  };

  const resetPassword = async (userId: string) => {
    const newPass = prompt('Enter new password:');
    if (!newPass) return;
    try {
      await apiClient.put(`/identity/users/${userId}/reset-password`, { newPassword: newPass });
      alert('Password reset successfully.');
    } catch (e: any) {
      alert(e.response?.data?.error || 'Failed');
    }
  };

  const roleColors: Record<string, string> = {
    ADMIN: 'bg-purple-500/15 text-purple-400',
    SUPERADMIN: 'bg-red-500/15 text-red-400',
    STUDENT: 'bg-blue-500/15 text-blue-400',
    FACULTY: 'bg-emerald-500/15 text-emerald-400',
    HOD: 'bg-amber-500/15 text-amber-400',
    PRINCIPAL: 'bg-orange-500/15 text-orange-400',
    STAFF: 'bg-slate-500/15 text-slate-400',
  };

  return (
    <div className="space-y-6">
      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {[
            { label: 'Total Users', value: stats.total, color: 'border-l-indigo-500' },
            { label: 'Students', value: stats.students, color: 'border-l-blue-500' },
            { label: 'Faculty', value: stats.faculty, color: 'border-l-emerald-500' },
            { label: 'Staff', value: stats.staff, color: 'border-l-amber-500' },
            { label: 'Active', value: stats.active, color: 'border-l-green-500' },
            { label: 'Inactive', value: stats.inactive, color: 'border-l-red-500' },
          ].map(s => (
            <div key={s.label} className={`bg-slate-900 border border-slate-800 border-l-4 ${s.color} rounded-xl p-4`}>
              <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">{s.label}</p>
              <p className="text-2xl font-bold mt-1">{s.value}</p>
            </div>
          ))}
        </div>
      )}

      {/* Table Card */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-3 p-4 border-b border-slate-800">
          <h2 className="text-base font-semibold flex items-center gap-2"><Users className="w-4 h-4 text-indigo-400" /> All Users</h2>
          <div className="flex items-center gap-3">
            <div className="relative">
              <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-500" />
              <input
                type="text"
                placeholder="Search..."
                value={filters.search}
                onChange={e => setFilters(f => ({ ...f, search: e.target.value }))}
                onKeyDown={e => e.key === 'Enter' && fetchUsers()}
                className="pl-9 pr-4 py-2 bg-slate-800 border border-slate-700 rounded-full text-sm text-white outline-none focus:border-indigo-500 w-48 focus:w-64 transition-all"
              />
            </div>
            <select
              value={filters.role}
              onChange={e => { setFilters(f => ({ ...f, role: e.target.value })); }}
              className="bg-slate-800 border border-slate-700 rounded-lg text-sm px-3 py-2 text-white outline-none"
            >
              <option value="">All Roles</option>
              {['STUDENT', 'FACULTY', 'HOD', 'ADMIN', 'STAFF'].map(r => <option key={r} value={r}>{r}</option>)}
            </select>
            <button onClick={() => setShowModal(true)} className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-sm font-semibold transition-all">
              <UserPlus className="w-4 h-4" /> Add User
            </button>
          </div>
        </div>

        {/* Data */}
        {loading ? (
          <div className="flex items-center justify-center py-16"><div className="w-8 h-8 border-2 border-slate-700 border-t-indigo-500 rounded-full animate-spin" /></div>
        ) : users.length === 0 ? (
          <div className="text-center py-16 text-slate-500">No users found.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-slate-800/50">
                  {['Email', 'Name', 'Role', 'Status', 'Created', 'Actions'].map(h => (
                    <th key={h} className="text-left px-5 py-3 text-[11px] font-semibold uppercase tracking-wide text-slate-500">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {users.map(u => (
                  <tr key={u.id} className="border-t border-slate-800 hover:bg-slate-800/30 transition-colors">
                    <td className="px-5 py-3.5 text-sm text-slate-300">{u.email}</td>
                    <td className="px-5 py-3.5 text-sm">{u.profile?.firstName || '—'} {u.profile?.lastName || ''}</td>
                    <td className="px-5 py-3.5">
                      <span className={`inline-flex px-2.5 py-0.5 rounded-full text-[11px] font-semibold uppercase ${roleColors[u.role] || 'bg-slate-700 text-slate-300'}`}>{u.role}</span>
                    </td>
                    <td className="px-5 py-3.5">
                      <span className={`inline-flex px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${u.isActive ? 'bg-emerald-500/15 text-emerald-400' : 'bg-red-500/15 text-red-400'}`}>
                        {u.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-sm text-slate-500">{new Date(u.createdAt).toLocaleDateString()}</td>
                    <td className="px-5 py-3.5">
                      <div className="flex gap-2">
                        <button onClick={() => toggleActive(u.id)} title="Toggle Active" className="p-1.5 rounded-lg hover:bg-slate-700 text-slate-400 hover:text-white transition-colors">
                          {u.isActive ? <ToggleRight className="w-4 h-4 text-emerald-400" /> : <ToggleLeft className="w-4 h-4 text-red-400" />}
                        </button>
                        <button onClick={() => resetPassword(u.id)} title="Reset Password" className="p-1.5 rounded-lg hover:bg-slate-700 text-slate-400 hover:text-white transition-colors">
                          <Key className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {pagination.totalPages > 1 && (
          <div className="flex items-center justify-center gap-2 p-4 border-t border-slate-800">
            <button disabled={pagination.page <= 1} onClick={() => fetchUsers(pagination.page - 1)} className="p-2 rounded-lg bg-slate-800 text-slate-400 hover:text-white disabled:opacity-40 transition-colors">
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-sm text-slate-400">Page {pagination.page} of {pagination.totalPages}</span>
            <button disabled={pagination.page >= pagination.totalPages} onClick={() => fetchUsers(pagination.page + 1)} className="p-2 rounded-lg bg-slate-800 text-slate-400 hover:text-white disabled:opacity-40 transition-colors">
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>

      {/* Create User Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 w-full max-w-lg animate-slide-up">
            <h3 className="text-lg font-bold mb-5">Create New User</h3>
            {formError && <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 text-red-400 text-sm rounded-lg">{formError}</div>}
            <form onSubmit={handleCreate} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">First Name</label>
                  <input required value={form.firstName} onChange={e => setForm(f => ({ ...f, firstName: e.target.value }))}
                    className="w-full px-3 py-2.5 bg-slate-800 border border-slate-700 rounded-lg text-sm text-white outline-none focus:border-indigo-500" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Last Name</label>
                  <input required value={form.lastName} onChange={e => setForm(f => ({ ...f, lastName: e.target.value }))}
                    className="w-full px-3 py-2.5 bg-slate-800 border border-slate-700 rounded-lg text-sm text-white outline-none focus:border-indigo-500" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Email / Username</label>
                <input required value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                  className="w-full px-3 py-2.5 bg-slate-800 border border-slate-700 rounded-lg text-sm text-white outline-none focus:border-indigo-500" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Password</label>
                  <input type="password" required value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                    className="w-full px-3 py-2.5 bg-slate-800 border border-slate-700 rounded-lg text-sm text-white outline-none focus:border-indigo-500" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Role</label>
                  <select value={form.role} onChange={e => setForm(f => ({ ...f, role: e.target.value }))}
                    className="w-full px-3 py-2.5 bg-slate-800 border border-slate-700 rounded-lg text-sm text-white outline-none focus:border-indigo-500">
                    {['STUDENT', 'FACULTY', 'HOD', 'ADMIN', 'STAFF', 'PRINCIPAL'].map(r => <option key={r} value={r}>{r}</option>)}
                  </select>
                </div>
              </div>
              {form.role === 'STUDENT' && (
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Enrollment No</label>
                  <input value={form.enrollmentNo} onChange={e => setForm(f => ({ ...f, enrollmentNo: e.target.value }))}
                    className="w-full px-3 py-2.5 bg-slate-800 border border-slate-700 rounded-lg text-sm text-white outline-none focus:border-indigo-500" />
                </div>
              )}
              <div className="flex justify-end gap-3 mt-6">
                <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-slate-300 hover:bg-slate-700 transition-all">Cancel</button>
                <button type="submit" className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-sm font-semibold transition-all">Create User</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserManagement;
