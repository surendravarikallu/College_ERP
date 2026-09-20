import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Lock, Mail, ArrowRight, ShieldCheck, Cpu, Activity } from 'lucide-react';
import { apiClient } from '../../api/client';
import { useAuth } from '../../hooks/useAuth';
import { motion, AnimatePresence } from 'framer-motion';

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
                login(payload.accessToken, payload.refreshToken, payload.user);
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
            setError(err.response?.data?.error || 'Authentication sequence failed. Verify credentials.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-[#004b93] relative overflow-hidden p-6 font-sans">
            
            {/* 1. Dynamic Background Layers */}
            <div className="absolute inset-0 overflow-hidden">
                {/* Mesh Gradients */}
                <div className="absolute top-[-20%] right-[-10%] w-[800px] h-[800px] bg-blue-600/30 rounded-full blur-[120px] animate-pulse" />
                <div className="absolute bottom-[-10%] left-[-10%] w-[600px] h-[600px] bg-indigo-900/40 rounded-full blur-[100px]" />
                
                {/* Scanning line effect */}
                <div className="absolute inset-0 opacity-[0.03] pointer-events-none" 
                     style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)', backgroundSize: '40px 40px' }} />
            </div>

            {/* 2. Centered Authentication Node */}
            <div className="w-full max-w-[900px] flex flex-col md:flex-row bg-white/5 backdrop-blur-2xl border border-white/10 rounded-[40px] shadow-2xl overflow-hidden z-10 animate-in fade-in zoom-in duration-500">
                
                {/* Left: Institutional Identity */}
                <div className="md:w-1/2 p-12 bg-[#004b93] relative flex flex-col justify-between overflow-hidden border-r border-white/5">
                    <div className="absolute top-0 right-0 w-full h-full bg-white/5 skew-x-12 translate-x-1/2" />
                    
                    <div className="relative z-10 space-y-6">
                        <motion.div 
                            initial={{ scale: 0.8, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            transition={{ duration: 0.8 }}
                            className="w-16 h-16 bg-white rounded-2xl p-2 shadow-xl border border-white/20"
                        >
                            <img src="/college.webp" alt="Logo" className="w-full h-full object-contain" />
                        </motion.div>
                        <div className="space-y-2">
                            <h1 className="text-4xl font-black tracking-tighter text-white leading-none uppercase">Kits Akshar <br/> <span className="text-blue-200/60">ERP Core</span></h1>
                            <p className="text-sm font-bold text-blue-100/40 uppercase tracking-[0.3em]">SECURE ACCESS NODE</p>
                        </div>
                    </div>

                    <div className="relative z-10 space-y-8">
                        <div className="space-y-4">
                            <div className="flex items-center gap-4 group">
                                <div className="p-2.5 bg-white/10 rounded-xl group-hover:bg-white/20 transition-colors">
                                    <ShieldCheck className="w-5 h-5 text-blue-200" />
                                </div>
                                <p className="text-[11px] font-black tracking-widest text-blue-100 uppercase">RSA-256 Encrypted</p>
                            </div>
                            <div className="flex items-center gap-4 group">
                                <div className="p-2.5 bg-white/10 rounded-xl group-hover:bg-white/20 transition-colors">
                                    <Activity className="w-5 h-5 text-blue-200" />
                                </div>
                                <p className="text-[11px] font-black tracking-widest text-blue-100 uppercase">Real-time Sync Active</p>
                            </div>
                        </div>
                        <div className="p-4 bg-white/5 rounded-2xl border border-white/5">
                            <p className="text-[10px] font-bold text-blue-100/60 leading-relaxed italic">
                                "Authorized personnel only. All system interactions are monitored and cryptographically logged for security audits."
                            </p>
                        </div>
                    </div>
                </div>

                {/* Right: Interactive Admission Portal */}
                <div className="md:w-1/2 p-12 bg-white flex flex-col justify-center">
                    <div className="max-w-sm mx-auto w-full space-y-8">
                        <div className="space-y-1">
                            <h2 className="text-2xl font-black text-slate-800 tracking-tight uppercase">Workspace Entry</h2>
                            <p className="text-xs font-bold text-slate-400 tracking-widest uppercase">Institutional Deployment v4.2</p>
                        </div>

                        <form onSubmit={handleLogin} className="space-y-6">
                            <AnimatePresence>
                                {error && (
                                    <motion.div 
                                        initial={{ height: 0, opacity: 0 }}
                                        animate={{ height: 'auto', opacity: 1 }}
                                        exit={{ height: 0, opacity: 0 }}
                                        className="p-3.5 bg-rose-50 border border-rose-100 text-rose-600 text-[10px] font-black uppercase tracking-widest rounded-xl flex items-center gap-3 overflow-hidden"
                                    >
                                        <div className="w-5 h-5 rounded-full bg-rose-100 flex items-center justify-center shrink-0">!</div>
                                        {error}
                                    </motion.div>
                                )}
                            </AnimatePresence>

                            <div className="space-y-4">
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Electronic ID / Username</label>
                                    <div className="relative group">
                                        <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-300 group-focus-within:text-[#004b93] transition-colors" />
                                        <input
                                            type="text"
                                            placeholder="identity@kitsakshar.edu.in"
                                            required
                                            value={form.email}
                                            onChange={e => setForm({ ...form, email: e.target.value })}
                                            className="w-full pl-12 pr-4 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl focus:bg-white focus:border-[#004b93] focus:ring-4 focus:ring-blue-500/10 outline-none transition-all text-[13px] font-bold text-slate-700 placeholder-slate-300"
                                        />
                                    </div>
                                </div>

                                <div className="space-y-1.5">
                                    <div className="flex justify-between items-center px-1">
                                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Access Key</label>
                                        <button type="button" className="text-[9px] font-black uppercase text-[#004b93] hover:underline">Revoke Access?</button>
                                    </div>
                                    <div className="relative group">
                                        <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-300 group-focus-within:text-[#004b93] transition-colors" />
                                        <input
                                            type="password"
                                            placeholder="••••••••••••"
                                            required
                                            value={form.password}
                                            onChange={e => setForm({ ...form, password: e.target.value })}
                                            className="w-full pl-12 pr-4 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl focus:bg-white focus:border-[#004b93] focus:ring-4 focus:ring-blue-500/10 outline-none transition-all text-[13px] font-bold text-slate-700 placeholder-slate-300 tracking-widest"
                                        />
                                    </div>
                                </div>
                            </div>

                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full group relative overflow-hidden bg-[#004b93] hover:bg-blue-900 disabled:bg-slate-200 text-white py-4 rounded-2xl font-black uppercase tracking-[0.2em] text-[11px] transition-all shadow-xl shadow-blue-900/10 active:scale-[0.98]"
                            >
                                <div className="absolute inset-0 w-full h-full bg-gradient-to-r from-transparent via-white/5 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
                                {loading ? (
                                    <span className="flex items-center justify-center gap-3">
                                        <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                        Verifying Node...
                                    </span>
                                ) : (
                                    <span className="flex items-center justify-center gap-2">Authorize Entry <ArrowRight className="w-4 h-4" /></span>
                                )}
                            </button>
                        </form>

                        <div className="pt-6 text-center">
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Powered by KITS Infrastructure Node 0x7F</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* 3. Global Footer Overlay */}
            <div className="absolute bottom-6 w-full text-center px-6">
                <p className="text-[10px] font-black text-blue-200/30 uppercase tracking-[0.4em]">© 2026 KITS AKSHAR INSTITUTE OF TECHNOLOGY | ISO 27001 CERTIFIED</p>
            </div>
        </div>
    );
};

export default LoginPage;
