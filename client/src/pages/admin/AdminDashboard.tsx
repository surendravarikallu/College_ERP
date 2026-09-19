import React, { useState } from 'react';
import { Routes, Route, NavLink } from 'react-router-dom';
import Sidebar from '../../components/layout/Sidebar';
import { useAuth } from '../../hooks/useAuth';
import { useDashboardData } from '../../hooks/useDashboardData';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import ErrorCard from '../../components/ui/ErrorCard';
import { DashboardSkeleton } from '../../components/ui/DashboardSkeleton';
import { apiClient } from '../../api/client';
import {
    Users, GraduationCap, DollarSign, Activity, FileText, TrendingUp,
    Bell, Calendar, BookOpen, BarChart3, ArrowUpRight, ArrowDownRight,
    CheckCircle2, Clock, AlertTriangle, Layers, Building2, ShieldCheck,
    Cpu, Globe, Settings, Briefcase, Truck, Home
} from 'lucide-react';
import {
    AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
    XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts';

// ——— Static fallback data ———
const attendanceTrend = [
    { month: 'Jan', present: 92, absent: 8 }, { month: 'Feb', present: 89, absent: 11 },
    { month: 'Mar', present: 94, absent: 6 }, { month: 'Apr', present: 91, absent: 9 },
    { month: 'May', present: 96, absent: 4 }, { month: 'Jun', present: 93, absent: 7 },
];

const financeTrend = [
    { month: 'Jan', collected: 380000, due: 52000 }, { month: 'Feb', collected: 420000, due: 45000 },
    { month: 'Mar', collected: 510000, due: 38000 }, { month: 'Apr', collected: 470000, due: 41000 },
    { month: 'May', collected: 560000, due: 34000 }, { month: 'Jun', collected: 490000, due: 29000 },
];

const departmentDistribution = [
    { name: 'CSE', value: 3400, color: '#004b93' }, { name: 'ECE', value: 2100, color: '#0369a1' },
    { name: 'MECH', value: 1800, color: '#0ea5e9' }, { name: 'CIVIL', value: 1500, color: '#38bdf8' },
    { name: 'EEE', value: 1200, color: '#7dd3fc' }, { name: 'Others', value: 2482, color: '#bae6fd' },
];

// ——— Dashboard overview page ———
const DashboardOverview = () => {
    const { data, loading, error, refetch } = useDashboardData<any>(
        '/analytics/dashboard/admin',
        {
            stats: { totalStudents: 0, totalFaculty: 0, departments: 0, courses: 0 },
            attendanceTrend: [],
            financeTrend: []
        }
    );

    const [recentActivities] = useState([
        { user: 'Dr. Sarah Jenkins', dept: 'CSE', action: 'MARKS PUBLISHED', time: '2m ago', status: 'success' },
        { user: 'Prof. Alan Turing', dept: 'MATH', action: 'SESSION STARTED', time: '15m ago', status: 'info' },
        { user: 'SysAdmin Bot', dept: 'INFRA', action: 'DB BACKUP COMPLETED', time: '1h ago', status: 'neutral' },
    ]);

    const [notifications] = useState([
        { message: '3 subjects pending result approval', severity: 'warning' },
        { message: 'Attendance below 75% for 142 students', severity: 'critical' },
        { message: 'Fee collection target 94% achieved', severity: 'success' },
    ]);

    if (loading) return <DashboardSkeleton />;
    if (error) return <ErrorCard message={error} onRetry={refetch} />;

    const { stats } = data;

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            {/* 1. Header Area */}
            <div className="border border-slate-300 rounded shadow-sm overflow-hidden bg-white">
                <div className="erp-header-blue px-4 py-2 flex justify-between items-center">
                    <div className="flex items-center gap-3">
                        <Building2 className="w-5 h-5" />
                        <h2 className="text-[15px] font-black uppercase tracking-tight">Institution Management Hub | Central Admin Console</h2>
                    </div>
                    <div className="flex gap-2">
                        <button className="erp-btn-rect bg-white/10 hover:bg-white/20 flex items-center gap-2 text-[10px] py-1">
                            <Bell className="w-3.5 h-3.5" /> {notifications.length} Alerts
                        </button>
                    </div>
                </div>
                <div className="erp-strip-green px-4 py-1.5 text-[11px] font-bold text-emerald-800 flex justify-between italic">
                    <span>Operational Overview — Real-time synchronization active across all 12 institutional modules.</span>
                    <span>Last Refresh: {new Date().toLocaleTimeString()}</span>
                </div>
            </div>

            {/* 2. KPI Matrix */}
            <div className="grid grid-cols-1 md:grid-cols-4 lg:grid-cols-6 gap-3">
                <KPICard icon={<Users className="w-4 h-4" />} label="Enrollment" value={stats.totalStudents.toLocaleString()} sub="Active" color="text-[#004b93]" />
                <KPICard icon={<Briefcase className="w-4 h-4" />} label="Staff" value={stats.totalFaculty.toLocaleString()} sub="Verified" color="text-indigo-600" />
                <KPICard icon={<DollarSign className="w-4 h-4" />} label="Revenue" value={`₹${(financeTrend[financeTrend.length - 1]?.collected / 100000 || 0).toFixed(1)}L`} sub="This Month" color="text-emerald-700" />
                <KPICard icon={<GraduationCap className="w-4 h-4" />} label="Programs" value={String(stats.courses)} sub="Registered" color="text-amber-600" />
                <KPICard icon={<Activity className="w-4 h-4" />} label="Attendance" value="94.2%" sub="Today" color="text-blue-500" />
                <KPICard icon={<ShieldCheck className="w-4 h-4" />} label="Audit Status" value="Healthy" sub="System" color="text-emerald-500" />
            </div>

            {/* 3. Module Directives (Command Cards) */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 grid grid-cols-2 md:grid-cols-3 gap-3">
                    <ModuleCard title="Academics" icon={<Layers className="w-6 h-6" />} link="/admin/academics" stats="48 Batches" />
                    <ModuleCard title="Finance" icon={<DollarSign className="w-6 h-6" />} link="/admin/finance" stats="₹1.2L Collected" />
                    <ModuleCard title="Operations" icon={<Truck className="w-6 h-6" />} link="/admin/operations" stats="12 Routes" />
                    <ModuleCard title="Library" icon={<BookOpen className="w-6 h-6" />} link="/admin/library" stats="45k Books" />
                    <ModuleCard title="Hostel" icon={<Home className="w-6 h-6" />} link="/admin/hostel" stats="320 Occupied" />
                    <ModuleCard title="Reports" icon={<BarChart3 className="w-6 h-6" />} link="/admin/reports" stats="Aggregation Ready" />
                </div>

                {/* Notifications Panel */}
                <div className="border border-slate-300 rounded shadow-sm bg-white overflow-hidden flex flex-col">
                    <div className="bg-slate-100 px-3 py-2 border-b border-slate-300 flex justify-between items-center">
                        <span className="text-[11px] font-black uppercase tracking-widest text-[#004b93]">Priority Alerts</span>
                        <Activity className="w-3.5 h-3.5 text-rose-500 animate-pulse" />
                    </div>
                    <div className="flex-1 p-2 space-y-2 overflow-y-auto">
                        {notifications.map((n, i) => (
                            <div key={i} className={`p-2 rounded border text-[11px] font-bold flex gap-2 ${
                                n.severity === 'critical' ? 'bg-red-50 border-red-200 text-red-700' :
                                n.severity === 'warning' ? 'bg-amber-50 border-amber-200 text-amber-700' :
                                'bg-blue-50 border-blue-200 text-blue-700'
                            }`}>
                                <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                                {n.message}
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* 4. Visual Analytics Matrix */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="border border-slate-300 rounded shadow-sm bg-white p-4">
                    <h3 className="text-[11px] font-black uppercase text-slate-500 mb-4 border-b pb-2">Institutional Attendance Trends (6 Months)</h3>
                    <ResponsiveContainer width="100%" height={240}>
                        <AreaChart data={attendanceTrend}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                            <XAxis dataKey="month" tick={{ fontSize: 10, fontWeight: 'bold' }} />
                            <YAxis tick={{ fontSize: 10, fontWeight: 'bold' }} />
                            <Tooltip contentStyle={{ fontSize: '10px', borderRadius: '4px' }} />
                            <Area type="monotone" dataKey="present" stroke="#004b93" fill="#004b93" fillOpacity={0.1} strokeWidth={2} />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>
                <div className="border border-slate-300 rounded shadow-sm bg-white p-4">
                    <h3 className="text-[11px] font-black uppercase text-slate-500 mb-4 border-b pb-2">Departmental Distribution Matrix</h3>
                    <div className="flex items-center">
                        <ResponsiveContainer width="60%" height={240}>
                            <PieChart>
                                <Pie data={departmentDistribution} innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value">
                                    {departmentDistribution.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.color} />)}
                                </Pie>
                                <Tooltip />
                            </PieChart>
                        </ResponsiveContainer>
                        <div className="flex-1 space-y-2 pl-4">
                            {departmentDistribution.map((d) => (
                                <div key={d.name} className="flex items-center gap-2 text-[10px] font-black uppercase text-slate-600">
                                    <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: d.color }} />
                                    <span>{d.name}</span>
                                    <span className="ml-auto text-slate-400">{d.value}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            {/* 5. Recent Activity Log */}
            <div className="border border-slate-300 rounded shadow-sm bg-white overflow-hidden">
                <div className="bg-slate-50 px-4 py-2 border-b border-slate-300 flex justify-between items-center">
                    <span className="text-[11px] font-black uppercase tracking-widest text-slate-600">Administrative Audit Trail</span>
                    <button className="text-[10px] font-bold text-blue-700 hover:underline">Download Log</button>
                </div>
                <div className="divide-y divide-slate-100">
                    {recentActivities.map((a, i) => (
                        <div key={i} className="px-4 py-2.5 flex items-center justify-between hover:bg-slate-50">
                            <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded bg-[#004b93]/10 flex items-center justify-center font-black text-[#004b93] text-xs font-mono">{a.user.charAt(a.user.startsWith('Dr.') ? 4 : 0)}</div>
                                <div>
                                    <p className="text-[11px] font-black text-slate-700">{a.user}</p>
                                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter">{a.dept} Core Module</p>
                                </div>
                            </div>
                            <div className="text-right">
                                <p className="text-[10px] font-black text-emerald-700 uppercase tracking-widest">{a.action}</p>
                                <p className="text-[9px] font-bold text-slate-400 italic">{a.time}</p>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

// ——— Support Components ———
const KPICard = ({ icon, label, value, sub, color }: any) => (
    <div className="border border-slate-200 rounded p-3 bg-white shadow-sm hover:shadow-md transition-all border-b-2 hover:border-b-[#004b93]">
        <div className="flex items-center gap-2 mb-1">
            <div className={`p-1.5 rounded-md ${color} bg-slate-50`}>{icon}</div>
            <span className="text-[9px] font-black uppercase tracking-wider text-slate-400">{label}</span>
        </div>
        <p className={`text-xl font-black ${color} tracking-tight`}>{value}</p>
        <p className="text-[9px] font-bold text-slate-400 italic">{sub} status verified</p>
    </div>
);

const ModuleCard = ({ title, icon, link, stats }: any) => (
    <NavLink to={link} className="border border-slate-200 rounded-lg p-4 bg-white hover:bg-[#004b93] group transition-all duration-300 shadow-sm flex flex-col items-center justify-center text-center gap-2">
        <div className="text-[#004b93] group-hover:text-white transition-colors">{icon}</div>
        <div>
            <p className="text-[12px] font-black uppercase tracking-widest text-slate-700 group-hover:text-white">{title}</p>
            <p className="text-[9px] font-bold text-slate-400 group-hover:text-blue-100 mt-1">{stats}</p>
        </div>
    </NavLink>
);

// ——— Main Admin Dashboard ———
const AdminDashboard = () => {
    return (
        <div className="flex-1 p-4 md:p-8 overflow-y-auto bg-[#f8fafc]">
            <Routes>
                <Route index element={<DashboardOverview />} />
                <Route path="*" element={<div className="p-20 text-center font-black uppercase text-slate-300">Target Module Initializing...</div>} />
            </Routes>
        </div>
    );
};

export default AdminDashboard;
