import React from 'react';
import { useNavigate } from 'react-router-dom';
import { 
    BookOpen, CreditCard, ShieldCheck, TrendingUp, 
    ArrowRight, CheckCircle2, Globe, Cpu, Zap
} from 'lucide-react';
import { motion } from 'framer-motion';

const LandingPage = () => {
    const navigate = useNavigate();

    return (
        <div className="min-h-screen bg-white text-slate-900 font-sans selection:bg-[#004b93]/10 selection:text-[#004b93]">
            
            {/* 1. Global Navigation Hub */}
            <nav className="fixed top-0 w-full z-50 glass border-b border-slate-200/50 px-6 py-3 flex justify-between items-center transition-all duration-300">
                <div className="flex items-center gap-3">
                    <div className="relative h-10 w-10 overflow-hidden rounded-lg shadow-sm border border-slate-100">
                        <img src="/college.webp" alt="KITS Logo" className="h-full w-full object-cover" />
                    </div>
                    <div>
                        <span className="text-xl font-black tracking-tighter text-[#004b93] block leading-none">KITS AKSHAR</span>
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Enterprise ERP</span>
                    </div>
                </div>
                
                <div className="hidden lg:flex items-center gap-8">
                    {['Academics', 'Governance', 'Innovation', 'Security'].map((item) => (
                        <a key={item} href={`#${item.toLowerCase()}`} className="text-xs font-black uppercase tracking-widest text-slate-500 hover:text-[#004b93] transition-colors">
                            {item}
                        </a>
                    ))}
                </div>

                <div className="flex items-center gap-4">
                    <button 
                        onClick={() => navigate('/login')}
                        className="erp-btn-capsule bg-[#004b93] hover:bg-blue-900 group flex items-center gap-2 px-8 py-2.5 transition-all shadow-xl shadow-blue-900/10"
                    >
                        Access Workspace 
                        <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                    </button>
                </div>
            </nav>

            {/* 2. Hero Orchestration Section */}
            <section className="relative pt-48 pb-32 px-6 overflow-hidden">
                <div className="absolute top-0 right-0 w-[50%] h-full bg-[#004b93]/5 -skew-x-12 translate-x-1/2 -z-10 blur-[120px]" />
                <div className="absolute top-20 left-10 w-64 h-64 bg-blue-400/10 rounded-full blur-[100px] -z-10" />
                
                <div className="max-w-7xl mx-auto flex flex-col lg:flex-row items-center gap-16">
                    <motion.div 
                        initial={{ opacity: 0, x: -30 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.8 }}
                        className="lg:w-3/5 text-center lg:text-left space-y-8"
                    >
                        <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-blue-50 border border-blue-100 rounded-full text-[#004b93] font-black text-[10px] uppercase tracking-[0.2em]">
                            <Zap className="w-3 h-3" /> Institutional Automation v4.0
                        </div>
                        <h1 className="text-6xl lg:text-8xl font-black tracking-tighter leading-[0.9] text-slate-800">
                            Unified <br/>
                            <span className="text-gradient">Campus Flow.</span>
                        </h1>
                        <p className="max-w-xl text-lg text-slate-500 font-medium leading-relaxed italic">
                            The definitive Enterprise Resource Planning suite for modern institutions. 
                            Synchronizing Academics, Finance, and Governance into one visually stunning command center.
                        </p>
                        
                        <div className="flex flex-col sm:flex-row gap-4 pt-4">
                            <button onClick={() => navigate('/login')} className="px-10 py-4 bg-[#004b93] text-white rounded-xl font-black uppercase tracking-widest text-[12px] hover:shadow-[0_20px_40px_rgba(0,75,147,0.3)] hover:-translate-y-0.5 transition-all">
                                Initialize Workspace
                            </button>
                            <button className="px-10 py-4 border-2 border-slate-200 text-slate-600 rounded-xl font-black uppercase tracking-widest text-[12px] hover:bg-slate-50 transition-all flex items-center justify-center gap-2">
                                <Globe className="w-4 h-4" /> Global Demo
                            </button>
                        </div>

                        <div className="flex items-center gap-8 pt-8 border-t border-slate-100">
                            <div className="space-y-1">
                                <p className="text-2xl font-black text-slate-800">100%</p>
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Uptime SLA</p>
                            </div>
                            <div className="w-px h-8 bg-slate-200" />
                            <div className="space-y-1">
                                <p className="text-2xl font-black text-slate-800">256-bit</p>
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">RSA Security</p>
                            </div>
                            <div className="w-px h-8 bg-slate-200" />
                            <div className="space-y-1">
                                <p className="text-2xl font-black text-slate-800">Real-time</p>
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Module Sync</p>
                            </div>
                        </div>
                    </motion.div>

                    <motion.div 
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ duration: 1, delay: 0.2 }}
                        className="lg:w-2/5 relative"
                    >
                        <div className="bg-white border-2 border-slate-100 shadow-2xl rounded-3xl p-6 relative z-10 overflow-hidden">
                            <div className="erp-header-blue -mx-6 -mt-6 p-4 flex justify-between items-center mb-6">
                                <span className="text-[10px] font-black uppercase tracking-[0.2em]">Institutional Console</span>
                                <Cpu className="w-4 h-4 opacity-50" />
                            </div>
                            <div className="space-y-4">
                                <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-100 shadow-sm flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-xl bg-emerald-500 flex items-center justify-center text-white font-black text-xs">94%</div>
                                        <div>
                                            <p className="text-[11px] font-black text-emerald-800 uppercase leading-none">Attendance Health</p>
                                            <p className="text-[9px] font-bold text-emerald-600/60 uppercase mt-1">Institutional High</p>
                                        </div>
                                    </div>
                                    <TrendingUp className="text-emerald-500 w-5 h-5" />
                                </div>
                                <div className="p-4 bg-blue-50 rounded-2xl border border-blue-100 shadow-sm space-y-3">
                                    <div className="flex justify-between items-center">
                                        <p className="text-[11px] font-black text-blue-900 uppercase">Revenue Ledger</p>
                                        <CreditCard className="w-4 h-4 text-blue-400" />
                                    </div>
                                    <div className="h-2 w-full bg-blue-200/50 rounded-full overflow-hidden">
                                        <motion.div 
                                            initial={{ width: 0 }}
                                            animate={{ width: '85%' }}
                                            transition={{ duration: 2, delay: 0.5 }}
                                            className="h-full bg-[#004b93]" 
                                        />
                                    </div>
                                    <p className="text-[10px] font-bold text-blue-800/60">₹1.2M Collected vs Target</p>
                                </div>
                                <div className="grid grid-cols-2 gap-3">
                                    <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100 text-center">
                                        <p className="text-lg font-black text-slate-700">1,240</p>
                                        <p className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter">Active Students</p>
                                    </div>
                                    <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100 text-center">
                                        <p className="text-lg font-black text-slate-700">84</p>
                                        <p className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter">Faculty Nodes</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                        {/* Decorative background blocks */}
                        <div className="absolute -bottom-6 -right-6 w-full h-full bg-slate-100 rounded-3xl -z-10" />
                        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[120%] h-[120%] bg-blue-500/5 rounded-full blur-[80px] -z-20" />
                    </motion.div>
                </div>
            </section>

            {/* 3. Thematic Pillar Sections */}
            <section className="py-32 bg-slate-50/50 border-y border-slate-100 px-6">
                <div className="max-w-7xl mx-auto space-y-24">
                    <div className="text-center max-w-2xl mx-auto space-y-4">
                        <h2 className="text-4xl font-black tracking-tight text-slate-800">Precision Governance Across the <span className="text-[#004b93]">Entire Ecosystem.</span></h2>
                        <p className="text-slate-500 font-medium">Modular architecture built to scale institutional excellence, from student enrollment to faculty payroll.</p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                        <PillarCard 
                            icon={<BookOpen />} 
                            title="Academic Excellence" 
                            desc="Comprehensive result publishing, automatic grading curves, and real-time attendance forensics."
                            features={['Automated Hall Tickets', 'Internal/External Matrix', 'Curriculum Mapping']}
                        />
                        <PillarCard 
                            icon={<CreditCard />} 
                            title="Financial Integrity" 
                            desc="Crystal clear ledger tracking with cryptographic invoice validation and multi-mode payment sync."
                            features={['Fee Reconciliation', 'Payroll Automation', 'Audit-ready Records']}
                        />
                        <PillarCard 
                            icon={<ShieldCheck />} 
                            title="Institutional Ops" 
                            desc="Logistics monitoring, hostel occupancy grids, and library metadata tracking with RFID readiness."
                            features={['Inventory Shield', 'Fleet Lifecycle', 'Residential Matrix']}
                        />
                    </div>
                </div>
            </section>

            {/* 4. Trust Matrix / Stats */}
            <section className="py-20 px-6">
                <div className="max-w-7xl mx-auto">
                    <div className="bg-[#004b93] rounded-[40px] p-12 text-white relative overflow-hidden shadow-2xl">
                        <div className="absolute top-0 right-0 w-[400px] h-full bg-white/5 skew-x-12 translate-x-20" />
                        <div className="relative z-10 flex flex-col lg:flex-row items-center justify-between gap-12">
                            <div className="space-y-4 lg:w-1/2">
                                <h3 className="text-3xl font-black tracking-tight leading-none uppercase">Ready to elevate your institution's digital footprint?</h3>
                                <p className="text-blue-100/60 font-medium">Join 50+ premium colleges utilizing KITS for secure, reliable campus management.</p>
                            </div>
                            <div className="lg:w-1/2 flex justify-center lg:justify-end gap-4 w-full">
                                <button onClick={() => navigate('/login')} className="px-12 py-5 bg-white text-[#004b93] rounded-2xl font-black uppercase tracking-widest text-[12px] hover:scale-105 transition-all shadow-xl shadow-black/20">
                                    Secure Login
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* 5. Minimal Infrastructure Footer */}
            <footer className="py-12 border-t border-slate-100 px-6">
                <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-8">
                    <div className="flex items-center gap-3">
                        <img src="/college.webp" alt="KITS" className="h-8 w-8 object-cover grayscale opacity-50" />
                        <span className="text-[12px] font-black uppercase tracking-widest text-slate-400">© 2026 Kits Akshar Institute of Technology</span>
                    </div>
                    <div className="flex gap-8">
                        <FooterLink>Privacy Protocol</FooterLink>
                        <FooterLink>Security Audit</FooterLink>
                        <FooterLink>System Status</FooterLink>
                    </div>
                </div>
            </footer>
        </div>
    );
};

const PillarCard = ({ icon, title, desc, features }: any) => (
    <div className="bg-white border border-slate-200 rounded-[32px] p-8 shadow-sm hover:shadow-xl hover:border-[#004b93]/20 transition-all group">
        <div className="w-14 h-14 bg-slate-50 rounded-2xl flex items-center justify-center text-[#004b93] mb-8 group-hover:bg-[#004b93] group-hover:text-white transition-colors duration-500">
            {React.cloneElement(icon as React.ReactElement, { className: 'w-7 h-7' })}
        </div>
        <h3 className="text-[18px] font-black text-slate-800 mb-3 uppercase tracking-tight">{title}</h3>
        <p className="text-sm font-medium text-slate-500 leading-relaxed mb-6">{desc}</p>
        <div className="space-y-3">
            {features.map((f: string) => (
                <div key={f} className="flex items-center gap-2 text-[11px] font-black text-slate-400 group-hover:text-slate-600 uppercase tracking-widest transition-colors">
                    <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                    {f}
                </div>
            ))}
        </div>
    </div>
);

const FooterLink = ({ children }: any) => (
    <a href="#" className="text-[11px] font-black uppercase tracking-widest text-slate-400 hover:text-[#004b93] transition-colors">{children}</a>
);

export default LandingPage;
