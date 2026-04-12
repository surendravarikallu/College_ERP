import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Lock, Mail, GraduationCap, ArrowRight } from 'lucide-react';
import { apiClient } from '../../api/client';
import { useAuth } from '../../hooks/useAuth';

const LoginPage = () => {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [form, setForm] = useState({ email: '', password: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await apiClient.post('/auth/login', {
        email: form.email,
        password: form.password,
      });

      const payload = response.data;

      if (payload.success) {
        // Use useAuth hook to persist tokens + user in localStorage & state
        login(payload.accessToken, payload.refreshToken, payload.user);

        // Route based on role
        const routes: Record<string, string> = {
          ADMIN: '/admin', SUPER_ADMIN: '/admin', SUPERADMIN: '/admin',
          FACULTY: '/faculty', HOD: '/faculty', PRINCIPAL: '/faculty',
          STUDENT: '/student',
          EXAM_CELL: '/admin/examcell',
          ACCOUNTS: '/admin',
        };
        navigate(routes[payload.user.role] || '/');
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'Authentication failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950 relative overflow-hidden p-4">
      {/* Animated background gradient */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-indigo-600/20 rounded-full blur-3xl animate-pulse" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-violet-600/20 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-indigo-500/5 rounded-full blur-3xl" />
      </div>

      <div className="w-full max-w-md z-10">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-indigo-600/10 border border-indigo-500/20 rounded-2xl mb-4">
            <GraduationCap className="w-8 h-8 text-indigo-400" />
          </div>
          <h1 className="text-2xl font-bold text-white mb-1">Kits Akshar ERP</h1>
          <p className="text-sm text-slate-400">Sign in to your institutional account</p>
        </div>

        {/* Card */}
        <div className="bg-slate-900/80 backdrop-blur-xl border border-slate-800 rounded-2xl p-8 shadow-2xl shadow-black/40">
          {error && (
            <div className="mb-5 p-3.5 bg-rose-500/10 border border-rose-500/20 text-rose-400 text-sm rounded-xl font-medium">
              {error}
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-5">
            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Email / Username</label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-3.5 h-4 w-4 text-slate-500" />
                <input
                  type="text"
                  placeholder="admin@kitsakshar.edu.in"
                  required
                  value={form.email}
                  onChange={e => setForm({ ...form, email: e.target.value })}
                  className="w-full pl-11 pr-4 py-3 bg-slate-950 border border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all text-sm text-white placeholder-slate-600"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Password</label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-3.5 h-4 w-4 text-slate-500" />
                <input
                  type="password"
                  placeholder="••••••••"
                  required
                  value={form.password}
                  onChange={e => setForm({ ...form, password: e.target.value })}
                  className="w-full pl-11 pr-4 py-3 bg-slate-950 border border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all text-sm text-white placeholder-slate-600"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-700 disabled:text-slate-500 text-white py-3.5 rounded-xl font-semibold transition-all shadow-lg shadow-indigo-500/20 hover:shadow-indigo-500/40"
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Authenticating...
                </span>
              ) : (
                <span className="flex items-center gap-2">Sign In <ArrowRight className="w-4 h-4" /></span>
              )}
            </button>
          </form>

          <p className="text-center text-xs text-slate-600 mt-6">
            Kits Akshar Institute of Technology &bull; Secure Access
          </p>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
