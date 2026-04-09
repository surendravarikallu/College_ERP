import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Building2, GraduationCap, CalendarClock, BookOpen, CreditCard, ShieldCheck, TrendingUp, Users } from 'lucide-react';

const LandingPage = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-mesh flex flex-col font-sans text-slate-900 dark:text-slate-100 overflow-hidden">
      
      {/* Premium Glass Topnav */}
      <nav className="w-full glass z-50 fixed top-0 px-6 py-4 flex justify-between items-center bg-white/70 dark:bg-transparent transition-colors">
        <div className="flex items-center gap-3">
          <div className="bg-brand-600 p-2 rounded-xl"><GraduationCap className="h-6 w-6 text-white" /></div>
          <span className="text-xl font-extrabold tracking-tight">Academic Architect</span>
        </div>
        <div className="flex gap-4 items-center">
          <button className="text-sm font-semibold hover:text-brand-500 transition-colors hidden md:block">For Institutions</button>
          <button className="text-sm font-semibold hover:text-brand-500 transition-colors hidden md:block">For Students</button>
          <button onClick={() => navigate('/login')} className="px-6 py-2.5 bg-slate-900 dark:bg-brand-600 hover:scale-105 transform text-white rounded-xl text-sm font-bold shadow-xl transition-all">
            Secure Portal Login
          </button>
        </div>
      </nav>

      {/* Massive Student/Institution Hero */}
      <main className="flex-1 flex flex-col pt-40 pb-20 px-4 relative z-10 animate-fade-in relative">
        <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-purple-500/10 rounded-full blur-[100px] -z-10 mix-blend-multiply" />
        <div className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-brand-500/10 rounded-full blur-[100px] -z-10 mix-blend-multiply" />
        
        <div className="max-w-6xl mx-auto flex flex-col lg:flex-row items-center gap-12">
            
            {/* Left Copy: Inspiring Value Props */}
            <div className="lg:w-1/2 text-center lg:text-left">
                <div className="inline-flex items-center gap-2 px-3 py-1 bg-brand-50 border border-brand-200 dark:bg-brand-900/30 dark:border-brand-500/30 rounded-full text-brand-600 dark:text-brand-400 font-bold text-xs mb-6 uppercase tracking-widest animate-slide-up">
                    <TrendingUp className="w-4 h-4" /> Powering 10,000+ Campus Lives
                </div>
                <h1 className="text-5xl lg:text-7xl font-extrabold tracking-tight mb-6 leading-tight animate-slide-up" style={{ animationDelay: '0.1s' }}>
                  The Ultimate <br/>
                  <span className="bg-clip-text text-transparent bg-gradient-to-r from-brand-600 to-indigo-400">Campus Flow.</span>
                </h1>
                <p className="text-lg text-slate-600 dark:text-slate-300 mb-8 animate-slide-up leading-relaxed" style={{ animationDelay: '0.2s' }}>
                  Whether you're a student checking real-time grades or an institution automating secure fee structures, Academic Architect perfectly binds Identity, Academics, and Operations into one stunning portal.
                </p>
                <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start animate-slide-up" style={{ animationDelay: '0.3s' }}>
                    <button onClick={() => navigate('/login')} className="px-8 py-4 bg-brand-600 text-white rounded-xl font-bold hover:shadow-[0_0_30px_rgba(67,56,202,0.5)] transition-all flex items-center justify-center gap-2">
                        Enter Workspace &rarr;
                    </button>
                    <button className="px-8 py-4 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-bold hover:bg-slate-50 transition-colors flex items-center justify-center gap-2">
                        <Building2 className="w-5 h-5" /> Book Institution Demo
                    </button>
                </div>
            </div>

            {/* Right Asset: Mock Dashboard UI Floating */}
            <div className="lg:w-1/2 relative h-[500px] w-full animate-fade-in hidden lg:block" style={{ animationDelay: '0.4s' }}>
                <div className="absolute top-10 right-0 glass w-[400px] p-6 rounded-3xl border border-white/40 shadow-2xl z-20">
                    <h3 className="font-bold mb-4 flex items-center gap-2"><CalendarClock className="text-brand-500 w-5 h-5"/> Live Attendance</h3>
                    <div className="flex items-center justify-between p-3 bg-emerald-50 dark:bg-emerald-500/10 rounded-xl">
                        <span className="font-semibold text-emerald-600 dark:text-emerald-400">Computer Networks</span>
                        <span className="text-xs font-bold bg-emerald-100 text-emerald-700 px-2 py-1 rounded">PRESENT</span>
                    </div>
                </div>

                <div className="absolute top-40 left-0 glass w-[350px] p-6 rounded-3xl border border-white/40 shadow-2xl z-10 transform -translate-x-10 hover:translate-x-0 transition-transform">
                    <h3 className="font-bold mb-4 flex items-center gap-2"><CreditCard className="text-indigo-500 w-5 h-5"/> Semester Fee Due</h3>
                    <h2 className="text-3xl font-extrabold mb-1">$4,200</h2>
                    <p className="text-xs text-slate-500 font-semibold mb-3">Due in 14 days • Razorpay Secure</p>
                    <div className="h-2 w-full bg-slate-200 rounded-full overflow-hidden"><div className="h-full bg-indigo-500 w-1/3"></div></div>
                </div>
            </div>

        </div>
      </main>

      {/* Feature Split Matrix */ }
      <section className="py-24 px-6 bg-white/50 dark:bg-slate-900/50 border-t border-slate-200 dark:border-slate-800">
        <div className="max-w-7xl mx-auto">
            <h2 className="text-3xl font-extrabold text-center mb-16">Built natively for the <span className="text-brand-500">Entire Ecosystem</span></h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                {/* Students Column */}
                <div className="bg-slate-50 dark:bg-slate-800 p-8 rounded-3xl border border-slate-200 dark:border-slate-700">
                    <div className="flex items-center gap-3 mb-8">
                        <div className="p-3 bg-brand-100 dark:bg-brand-900 rounded-2xl"><Users className="text-brand-600 dark:text-brand-400 w-8 h-8"/></div>
                        <h3 className="text-2xl font-bold">For Students</h3>
                    </div>
                    <ul className="space-y-6">
                        <FeatureRow icon={<BookOpen/>} title="Digital Library Access" desc="Check out books instantly, view fine status, and track historical returns." />
                        <FeatureRow icon={<GraduationCap/>} title="Live Academic Progress" desc="Get notified instantly when internal or external marks are published." />
                        <FeatureRow icon={<Building2/>} title="Hostel & Logistics" desc="Book dormitory beds natively and track RFID campus transport buses." />
                    </ul>
                </div>

                {/* Institutions Column */}
                <div className="bg-slate-900 text-white p-8 rounded-3xl border border-slate-800 relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/20 rounded-full blur-[60px]" />
                    <div className="flex items-center gap-3 mb-8 relative z-10">
                        <div className="p-3 bg-indigo-500/20 rounded-2xl"><ShieldCheck className="text-indigo-400 w-8 h-8"/></div>
                        <h3 className="text-2xl font-bold">For Institutions</h3>
                    </div>
                    <ul className="space-y-6 relative z-10">
                        <FeatureRow dark icon={<CreditCard/>} title="Automated Ledgers" desc="Cryptographic invoice generation mapped tightly preventing dual payments." />
                        <FeatureRow dark icon={<CalendarClock/>} title="Faculty Live Sessions" desc="Teachers mark attendance on mobile sockets writing natively to PostgreSQL." />
                        <FeatureRow dark icon={<TrendingUp/>} title="Hybrid Analytics" desc="Materialized performance dashboards aggregating thousands of row sets daily." />
                    </ul>
                </div>
            </div>
        </div>
      </section>
      
    </div>
  );
};

const FeatureRow = ({ icon, title, desc, dark = false }: any) => (
  <li className="flex gap-4 items-start">
      <div className={`p-2 rounded-lg 
        ${dark ? 'bg-slate-800 text-indigo-400 border border-slate-700' : 'bg-white text-brand-600 border border-slate-200 shadow-sm'}
      `}>
          {React.cloneElement(icon, { className: 'w-5 h-5' })}
      </div>
      <div>
          <h4 className={`font-bold ${dark ? 'text-white' : 'text-slate-900'}`}>{title}</h4>
          <p className={`text-sm mt-1 leading-relaxed ${dark ? 'text-slate-400' : 'text-slate-500'}`}>{desc}</p>
      </div>
  </li>
);

export default LandingPage;
