import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Lock, Mail, Building } from 'lucide-react';
import { apiClient } from '../../api/client';

const LoginPage = () => {
  const navigate = useNavigate();
  const [form, setForm] = useState({ institutionId: '', email: '', password: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await apiClient.post('/identity/auth/login', form);
      const payload = response.data.data;
      
      // Native storage mirroring Phase 7 client.ts requirements 
      localStorage.setItem('erp_access_token', payload.accessToken);
      localStorage.setItem('erp_refresh_token', payload.refreshToken);
      
      // Explicit Routing based on Generic Backend payloads securely
      navigate(`/${payload.user.role.toLowerCase()}`); 
    } catch (err: any) {
      const rawMsg = err.message || 'Unknown Network Throw';
      setError(err.response?.data?.error || `Authentication Network Failed: ${rawMsg}`);
      console.error("[Login Debug Error]:", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-100 dark:bg-surface-dark relative overflow-hidden p-4">
      <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1541339907198-e08756dedf3f?auto=format&fit=crop&q=80')] bg-cover bg-center opacity-10 dark:opacity-5 mix-blend-luminosity" />
      
      <div className="glass w-full max-w-md p-8 rounded-3xl z-10 animate-slide-up shadow-2xl relative">
        <div className="mb-8 text-center">
          <h2 className="text-3xl font-extrabold tracking-tight mb-2 text-slate-900 dark:text-white">Sign In</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">Identity Secure Architecture V1.0</p>
        </div>

        {error && <div className="mb-4 p-3 bg-red-100 border border-red-300 text-red-700 text-sm rounded-lg animate-pulse">{error}</div>}

        <form onSubmit={handleLogin} className="flex flex-col gap-4">
          <div className="relative">
             <Building className="absolute left-3 top-3.5 h-5 w-5 text-slate-400" />
             <input type="text" placeholder="Institution UUID" required
                value={form.institutionId} onChange={e => setForm({...form, institutionId: e.target.value})}
                className="w-full pl-10 pr-4 py-3 bg-white/50 dark:bg-slate-800/50 border border-slate-300 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-brand-500 outline-none transition-all dark:text-white" />
          </div>

          <div className="relative">
             <Mail className="absolute left-3 top-3.5 h-5 w-5 text-slate-400" />
             <input type="text" placeholder="Username (or Email)" required
                value={form.email} onChange={e => setForm({...form, email: e.target.value})}
                className="w-full pl-10 pr-4 py-3 bg-white/50 dark:bg-slate-800/50 border border-slate-300 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-brand-500 outline-none transition-all dark:text-white" />
          </div>

          <div className="relative">
             <Lock className="absolute left-3 top-3.5 h-5 w-5 text-slate-400" />
             <input type="password" placeholder="Password" required
                value={form.password} onChange={e => setForm({...form, password: e.target.value})}
                className="w-full pl-10 pr-4 py-3 bg-white/50 dark:bg-slate-800/50 border border-slate-300 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-brand-500 outline-none transition-all dark:text-white" />
          </div>

          <button type="submit" disabled={loading} className="mt-4 w-full bg-brand-600 hover:bg-brand-500 text-white py-3 rounded-xl font-semibold shadow-lg transition-all disabled:opacity-50 flex items-center justify-center">
            {loading ? <span className="animate-pulse">Authenticating...</span> : "Secure Login"}
          </button>
        </form>
      </div>
    </div>
  );
};

export default LoginPage;
