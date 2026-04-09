import React, { useState, useEffect } from 'react';
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
  CheckCircle2, Clock, AlertTriangle, Layers
} from 'lucide-react';
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts';

// ——— Static fallback data for charts (used when API has no historical data yet) ———
const attendanceTrend = [
  { month: 'Jan', present: 92, absent: 8 },
  { month: 'Feb', present: 89, absent: 11 },
  { month: 'Mar', present: 94, absent: 6 },
  { month: 'Apr', present: 91, absent: 9 },
  { month: 'May', present: 96, absent: 4 },
  { month: 'Jun', present: 93, absent: 7 },
];

const financeTrend = [
  { month: 'Jan', collected: 380000, due: 52000 },
  { month: 'Feb', collected: 420000, due: 45000 },
  { month: 'Mar', collected: 510000, due: 38000 },
  { month: 'Apr', collected: 470000, due: 41000 },
  { month: 'May', collected: 560000, due: 34000 },
  { month: 'Jun', collected: 490000, due: 29000 },
];

const examPerformance = [
  { subject: 'CS101', avgMarks: 74, passRate: 92 },
  { subject: 'MATH201', avgMarks: 68, passRate: 85 },
  { subject: 'PHY101', avgMarks: 71, passRate: 89 },
  { subject: 'ENG102', avgMarks: 79, passRate: 96 },
  { subject: 'CHEM101', avgMarks: 65, passRate: 82 },
];

const departmentDistribution = [
  { name: 'Computer Science', value: 3400, color: '#6366f1' },
  { name: 'Mathematics', value: 2100, color: '#8b5cf6' },
  { name: 'Physics', value: 1800, color: '#a78bfa' },
  { name: 'English', value: 1500, color: '#c4b5fd' },
  { name: 'Chemistry', value: 1200, color: '#ddd6fe' },
  { name: 'Others', value: 2482, color: '#ede9fe' },
];

const CHART_COLORS = ['#6366f1', '#8b5cf6', '#a78bfa', '#c4b5fd', '#ddd6fe', '#ede9fe'];

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
    { user: 'Dr. Sarah Jenkins', dept: 'Computer Science', action: 'PUBLISHED MARKS', time: '2m ago', type: 'success' },
    { user: 'Prof. Alan Turing', dept: 'Mathematics', action: 'STARTED SESSION', time: '15m ago', type: 'info' },
    { user: 'SysAdmin Bot', dept: 'Infrastructure', action: 'DATABASE BACKUP', time: '1h ago', type: 'neutral' },
    { user: 'Dr. Emily Carter', dept: 'Physics', action: 'UPLOADED MARKS', time: '2h ago', type: 'success' },
    { user: 'Finance Module', dept: 'System', action: 'INVOICE BATCH GENERATED', time: '3h ago', type: 'info' },
  ]);

  const [notifications] = useState([
    { message: '3 subjects pending result approval', severity: 'warning' },
    { message: 'Attendance below 75% for 142 students', severity: 'critical' },
    { message: 'Fee collection target 94% achieved', severity: 'success' },
    { message: 'Exam schedule for Semester 6 finalized', severity: 'info' },
  ]);

  if (loading) return <DashboardSkeleton />;
  if (error) return <ErrorCard message={error} onRetry={refetch} />;

  const { stats, attendanceTrend, financeTrend } = data;

  return (
    <>
      <header className="flex justify-between items-center mb-10">
        <div>
          <h2 className="text-3xl font-bold dark:text-white">Admin Dashboard</h2>
          <p className="text-slate-500 dark:text-slate-400 mt-1">
            Operational Overview — All 7 Modules
          </p>
        </div>
        <div className="flex gap-3">
          <button className="glass px-4 py-2 rounded-lg font-medium shadow-sm hover:-translate-y-0.5 transition-transform dark:text-white flex items-center gap-2">
            <Bell className="w-4 h-4" /> Alerts
            <span className="bg-red-500 text-white text-xs rounded-full px-2 py-0.5 ml-1">{notifications.length}</span>
          </button>
          <button className="bg-brand-600 hover:bg-brand-500 text-white px-5 py-2 rounded-lg font-medium shadow-lg shadow-brand-500/30 transition-all flex items-center gap-2">
            <FileText className="w-4 h-4" /> Generate Report
          </button>
        </div>
      </header>

      {/* KPI Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
        <MetricCard
          icon={<Users className="w-6 h-6" />}
          title="Total Enrollment"
          value={stats.totalStudents.toLocaleString()}
          trend="+124"
          trendUp={true}
          color="text-brand-500"
          bgColor="bg-indigo-50 dark:bg-indigo-900/20"
        />
        <MetricCard
          icon={<DollarSign className="w-6 h-6" />}
          title="Revenue Mirror"
          value={`₹${(financeTrend[financeTrend.length - 1]?.totalCollected / 100000 || 0).toFixed(1)}L`}
          trend="+₹1.2L"
          trendUp={true}
          color="text-purple-500"
          bgColor="bg-purple-50 dark:bg-purple-900/20"
        />
        <MetricCard
          icon={<GraduationCap className="w-6 h-6" />}
          title="Active Programs"
          value={String(stats.courses)}
          trend="Stable"
          trendUp={null}
          color="text-amber-500"
          bgColor="bg-amber-50 dark:bg-amber-900/20"
        />
        <MetricCard
          icon={<Activity className="w-6 h-6" />}
          title="Departments"
          value={String(stats.departments)}
          trend="Global"
          trendUp={true}
          color="text-emerald-500"
          bgColor="bg-emerald-50 dark:bg-emerald-900/20"
        />
      </div>

      {/* Charts Row 1: Attendance + Finance Trends */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
        <ChartCard title="Attendance Trends" subtitle="Monthly present vs absent rates">
          <ResponsiveContainer width="100%" height={280}>
            <AreaChart data={attendanceTrend}>
              <defs>
                <linearGradient id="presentGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="date" tickFormatter={(d) => new Date(d).toLocaleDateString(undefined, {weekday: 'short'})} tick={{ fontSize: 12 }} stroke="#94a3b8" />
              <YAxis tick={{ fontSize: 12 }} stroke="#94a3b8" />
              <Tooltip
                contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }}
              />
              <Area type="monotone" dataKey="present" stroke="#6366f1" fill="url(#presentGrad)" strokeWidth={2.5} name="Present %" />
              <Area type="monotone" dataKey="absent" stroke="#f43f5e" fill="#fecdd3" fillOpacity={0.3} strokeWidth={2} name="Absent %" />
            </AreaChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Finance Analytics" subtitle="Revenue collection vs outstanding dues">
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={financeTrend}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="month" tick={{ fontSize: 12 }} stroke="#94a3b8" />
              <YAxis tick={{ fontSize: 12 }} stroke="#94a3b8" tickFormatter={(v) => `₹${(v/1000).toFixed(0)}k`} />
              <Tooltip
                contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0' }}
                formatter={(value: any) => [`₹${(Number(value)/1000).toFixed(0)}k`, '']}
              />
              <Legend />
              <Bar dataKey="totalCollected" fill="#6366f1" radius={[6, 6, 0, 0]} name="Collected" />
              <Bar dataKey="due" fill="#f43f5e" radius={[6, 6, 0, 0]} name="Outstanding" />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      {/* Charts Row 2: Exam Performance + Department Distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
        <ChartCard title="Exam Performance" subtitle="Subject-wise average marks" className="lg:col-span-2">
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={examPerformance} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis type="number" tick={{ fontSize: 12 }} stroke="#94a3b8" domain={[0, 100]} />
              <YAxis dataKey="subject" type="category" tick={{ fontSize: 12 }} stroke="#94a3b8" width={80} />
              <Tooltip contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0' }} />
              <Legend />
              <Bar dataKey="avgMarks" fill="#8b5cf6" radius={[0, 6, 6, 0]} name="Avg Marks" />
              <Bar dataKey="passRate" fill="#22c55e" radius={[0, 6, 6, 0]} name="Pass Rate %" />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Department Distribution" subtitle="Student enrollment breakdown">
          <ResponsiveContainer width="100%" height={280}>
            <PieChart>
              <Pie
                data={departmentDistribution}
                cx="50%" cy="50%"
                innerRadius={60} outerRadius={100}
                paddingAngle={3}
                dataKey="value"
              >
                {departmentDistribution.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0' }} />
            </PieChart>
          </ResponsiveContainer>
          <div className="flex flex-wrap gap-2 mt-2 px-2">
            {departmentDistribution.map((d) => (
              <div key={d.name} className="flex items-center gap-1.5 text-xs text-slate-500">
                <div className="w-2.5 h-2.5 rounded-full" style={{ background: d.color }} /> {d.name}
              </div>
            ))}
          </div>
        </ChartCard>
      </div>

      {/* Bottom Panel: Notifications + Activity Feed */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="glass rounded-2xl p-6 border border-slate-200 dark:border-slate-800">
          <div className="flex justify-between items-center mb-5">
            <h3 className="text-lg font-bold dark:text-white flex items-center gap-2">
              <Bell className="w-5 h-5 text-brand-500" /> Notifications
            </h3>
            <span className="bg-red-500 text-white text-xs rounded-full px-2.5 py-1 font-bold">{notifications.length}</span>
          </div>
          <div className="space-y-3">
            {notifications.map((n, i) => (
              <div key={i} className={`p-3 rounded-xl text-sm font-medium flex items-start gap-3 ${
                n.severity === 'critical' ? 'bg-red-50 dark:bg-red-900/10 text-red-700 dark:text-red-400' :
                n.severity === 'warning' ? 'bg-amber-50 dark:bg-amber-900/10 text-amber-700 dark:text-amber-400' :
                n.severity === 'success' ? 'bg-emerald-50 dark:bg-emerald-900/10 text-emerald-700 dark:text-emerald-400' :
                'bg-blue-50 dark:bg-blue-900/10 text-blue-700 dark:text-blue-400'
              }`}>
                {n.severity === 'critical' ? <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" /> :
                 n.severity === 'warning' ? <Clock className="w-4 h-4 mt-0.5 flex-shrink-0" /> :
                 n.severity === 'success' ? <CheckCircle2 className="w-4 h-4 mt-0.5 flex-shrink-0" /> :
                 <Bell className="w-4 h-4 mt-0.5 flex-shrink-0" />}
                {n.message}
              </div>
            ))}
          </div>
        </div>

        <div className="lg:col-span-2 glass rounded-2xl p-6 border border-slate-200 dark:border-slate-800">
          <div className="flex justify-between items-center mb-5">
            <h3 className="text-lg font-bold dark:text-white flex items-center gap-2">
              <Layers className="w-5 h-5 text-brand-500" /> Recent Activity
            </h3>
            <button className="text-sm font-medium text-brand-600 hover:text-brand-500">View All</button>
          </div>
          <div className="space-y-1">
            {recentActivities.map((a, i) => (
              <div key={i} className="flex justify-between items-center p-3 hover:bg-slate-50 dark:hover:bg-slate-800/50 rounded-xl transition-colors cursor-pointer">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm ${
                    a.type === 'success' ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600' :
                    a.type === 'info' ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-600' :
                    'bg-slate-200 dark:bg-slate-700 text-slate-500'
                  }`}>
                    {a.user.charAt(0)}
                  </div>
                  <div>
                    <p className="text-sm font-bold dark:text-white">{a.user}</p>
                    <p className="text-xs text-brand-500 font-medium">{a.dept}</p>
                  </div>
                </div>
                <div className="flex flex-col items-end">
                  <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                    a.type === 'success' ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600' :
                    a.type === 'info' ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-600' :
                    'bg-slate-100 dark:bg-slate-800 text-slate-500'
                  }`}>
                    {a.action}
                  </span>
                  <span className="text-xs text-slate-400 mt-1">{a.time}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  );
};

// ——— Reusable Metric Card Component ———
const MetricCard = ({ icon, title, value, trend, trendUp, color, bgColor }: {
  icon: React.ReactNode; title: string; value: string; trend: string;
  trendUp: boolean | null; color: string; bgColor: string;
}) => (
  <div className="glass p-6 rounded-2xl border border-slate-200 dark:border-slate-800 hover:shadow-xl hover:-translate-y-0.5 transition-all group">
    <div className={`p-3 rounded-xl w-fit mb-4 ${bgColor}`}>
      <div className={color}>{icon}</div>
    </div>
    <p className="text-sm font-medium text-slate-500 dark:text-slate-400 mb-1">{title}</p>
    <div className="flex items-end gap-3">
      <h4 className="text-3xl font-extrabold dark:text-white">{value}</h4>
      <span className={`text-sm font-semibold mb-1 flex items-center gap-0.5 ${
        trendUp === true ? 'text-emerald-500' : trendUp === false ? 'text-red-500' : 'text-slate-400'
      }`}>
        {trendUp === true && <ArrowUpRight className="w-3.5 h-3.5" />}
        {trendUp === false && <ArrowDownRight className="w-3.5 h-3.5" />}
        {trend}
      </span>
    </div>
  </div>
);

// ——— Chart Wrapper ———
const ChartCard = ({ title, subtitle, children, className = '' }: {
  title: string; subtitle: string; children: React.ReactNode; className?: string;
}) => (
  <div className={`glass rounded-2xl p-6 border border-slate-200 dark:border-slate-800 ${className}`}>
    <div className="mb-4">
      <h3 className="text-lg font-bold dark:text-white">{title}</h3>
      <p className="text-xs text-slate-400 mt-0.5">{subtitle}</p>
    </div>
    {children}
  </div>
);

// ——— Placeholder pages for sub-routes ———
const AcademicsPage = () => (
  <div className="space-y-6">
    <h2 className="text-2xl font-bold dark:text-white">Academics Management</h2>
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      <StatCard label="Departments" value="8" />
      <StatCard label="Courses" value="24" />
      <StatCard label="Active Batches" value="48" />
    </div>
    <div className="glass rounded-2xl p-6 border border-slate-200 dark:border-slate-800">
      <h3 className="font-bold dark:text-white mb-4">Department Overview</h3>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-200 dark:border-slate-700">
              <th className="text-left py-3 px-4 font-semibold text-slate-500">Department</th>
              <th className="text-left py-3 px-4 font-semibold text-slate-500">Faculty</th>
              <th className="text-left py-3 px-4 font-semibold text-slate-500">Students</th>
              <th className="text-left py-3 px-4 font-semibold text-slate-500">Courses</th>
            </tr>
          </thead>
          <tbody>
            {['Computer Science', 'Mathematics', 'Physics', 'Chemistry', 'English'].map(dept => (
              <tr key={dept} className="border-b border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50">
                <td className="py-3 px-4 font-medium dark:text-white">{dept}</td>
                <td className="py-3 px-4 text-slate-500">{Math.floor(Math.random() * 40) + 20}</td>
                <td className="py-3 px-4 text-slate-500">{Math.floor(Math.random() * 2000) + 500}</td>
                <td className="py-3 px-4 text-slate-500">{Math.floor(Math.random() * 8) + 3}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  </div>
);

const FinancePage = () => (
  <div className="space-y-6">
    <h2 className="text-2xl font-bold dark:text-white">Finance & Revenue</h2>
    <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
      <StatCard label="Total Collected" value="₹42.8L" color="text-emerald-500" />
      <StatCard label="Outstanding" value="₹3.2L" color="text-red-500" />
      <StatCard label="Invoices Issued" value="12,482" />
      <StatCard label="Payment Rate" value="93.2%" color="text-brand-500" />
    </div>
    <div className="glass rounded-2xl p-6 border border-slate-200 dark:border-slate-800">
      <h3 className="font-bold dark:text-white mb-4">Monthly Revenue Breakdown</h3>
      <ResponsiveContainer width="100%" height={320}>
        <BarChart data={financeTrend}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
          <XAxis dataKey="month" tick={{ fontSize: 12 }} stroke="#94a3b8" />
          <YAxis tick={{ fontSize: 12 }} stroke="#94a3b8" tickFormatter={v => `₹${(v/1000).toFixed(0)}k`} />
          <Tooltip contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0' }} />
          <Legend />
          <Bar dataKey="collected" fill="#6366f1" radius={[6, 6, 0, 0]} name="Collected" />
          <Bar dataKey="due" fill="#f43f5e" radius={[6, 6, 0, 0]} name="Outstanding" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  </div>
);

const OperationsPage = () => (
  <div className="space-y-6">
    <h2 className="text-2xl font-bold dark:text-white">Operations Management</h2>
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      <StatCard label="Hostel Rooms" value="320" />
      <StatCard label="Transport Routes" value="12" />
      <StatCard label="Library Books" value="45,200" />
    </div>
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <div className="glass rounded-2xl p-6 border border-slate-200 dark:border-slate-800">
        <h3 className="font-bold dark:text-white mb-4">Hostel Occupancy</h3>
        <div className="space-y-3">
          {[{ block: 'Block A', occupied: 85, total: 100 }, { block: 'Block B', occupied: 72, total: 80 }, { block: 'Block C', occupied: 90, total: 100 }, { block: 'Block D', occupied: 35, total: 40 }].map(b => (
            <div key={b.block}>
              <div className="flex justify-between text-sm mb-1">
                <span className="font-medium dark:text-white">{b.block}</span>
                <span className="text-slate-500">{b.occupied}/{b.total} beds</span>
              </div>
              <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2">
                <div className="bg-brand-500 h-2 rounded-full transition-all" style={{ width: `${(b.occupied/b.total)*100}%` }} />
              </div>
            </div>
          ))}
        </div>
      </div>
      <div className="glass rounded-2xl p-6 border border-slate-200 dark:border-slate-800">
        <h3 className="font-bold dark:text-white mb-4">Transport Fleet</h3>
        <div className="space-y-3">
          {[{ route: 'Route 1 - North', vehicles: 3, status: 'Active' }, { route: 'Route 2 - South', vehicles: 2, status: 'Active' }, { route: 'Route 3 - East', vehicles: 2, status: 'Maintenance' }, { route: 'Route 4 - West', vehicles: 3, status: 'Active' }].map(r => (
            <div key={r.route} className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl">
              <div>
                <p className="text-sm font-medium dark:text-white">{r.route}</p>
                <p className="text-xs text-slate-500">{r.vehicles} vehicles</p>
              </div>
              <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${r.status === 'Active' ? 'bg-emerald-100 text-emerald-600' : 'bg-amber-100 text-amber-600'}`}>
                {r.status}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  </div>
);

const DirectoryPage = () => (
  <div className="space-y-6">
    <h2 className="text-2xl font-bold dark:text-white">Staff & Student Directory</h2>
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      <StatCard label="Total Faculty" value="342" color="text-brand-500" />
      <StatCard label="Total Students" value="12,482" color="text-purple-500" />
      <StatCard label="Support Staff" value="89" />
    </div>
    <div className="glass rounded-2xl p-6 border border-slate-200 dark:border-slate-800">
      <h3 className="font-bold dark:text-white mb-4">Faculty Directory</h3>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-200 dark:border-slate-700">
              <th className="text-left py-3 px-4 font-semibold text-slate-500">Name</th>
              <th className="text-left py-3 px-4 font-semibold text-slate-500">Department</th>
              <th className="text-left py-3 px-4 font-semibold text-slate-500">Subjects</th>
              <th className="text-left py-3 px-4 font-semibold text-slate-500">Status</th>
            </tr>
          </thead>
          <tbody>
            {[
              { name: 'Dr. Sarah Jenkins', dept: 'Computer Science', subjects: 3, active: true },
              { name: 'Prof. Alan Turing', dept: 'Mathematics', subjects: 2, active: true },
              { name: 'Dr. Emily Carter', dept: 'Physics', subjects: 4, active: true },
              { name: 'Prof. James Watson', dept: 'Chemistry', subjects: 2, active: false },
            ].map(f => (
              <tr key={f.name} className="border-b border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50">
                <td className="py-3 px-4 font-medium dark:text-white">{f.name}</td>
                <td className="py-3 px-4 text-slate-500">{f.dept}</td>
                <td className="py-3 px-4 text-slate-500">{f.subjects}</td>
                <td className="py-3 px-4">
                  <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${f.active ? 'bg-emerald-100 text-emerald-600' : 'bg-red-100 text-red-600'}`}>
                    {f.active ? 'Active' : 'On Leave'}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  </div>
);

const ReportsPage = () => (
  <div className="space-y-6">
    <h2 className="text-2xl font-bold dark:text-white">Analytics & Reports</h2>
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <div className="glass rounded-2xl p-6 border border-slate-200 dark:border-slate-800">
        <h3 className="font-bold dark:text-white mb-4">Attendance Aggregation</h3>
        <ResponsiveContainer width="100%" height={280}>
          <AreaChart data={attendanceTrend}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
            <XAxis dataKey="month" tick={{ fontSize: 12 }} stroke="#94a3b8" />
            <YAxis tick={{ fontSize: 12 }} stroke="#94a3b8" />
            <Tooltip contentStyle={{ borderRadius: '12px' }} />
            <Area type="monotone" dataKey="present" stroke="#6366f1" fill="#6366f1" fillOpacity={0.15} strokeWidth={2.5} name="Present %" />
          </AreaChart>
        </ResponsiveContainer>
      </div>
      <div className="glass rounded-2xl p-6 border border-slate-200 dark:border-slate-800">
        <h3 className="font-bold dark:text-white mb-4">Exam Results Summary</h3>
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={examPerformance}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
            <XAxis dataKey="subject" tick={{ fontSize: 12 }} stroke="#94a3b8" />
            <YAxis tick={{ fontSize: 12 }} stroke="#94a3b8" />
            <Tooltip contentStyle={{ borderRadius: '12px' }} />
            <Bar dataKey="avgMarks" fill="#8b5cf6" radius={[6, 6, 0, 0]} name="Avg Marks" />
            <Bar dataKey="passRate" fill="#22c55e" radius={[6, 6, 0, 0]} name="Pass %" />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  </div>
);

const SettingsPage = () => (
  <div className="space-y-6">
    <h2 className="text-2xl font-bold dark:text-white">System Settings</h2>
    <div className="glass rounded-2xl p-6 border border-slate-200 dark:border-slate-800">
      <h3 className="font-bold dark:text-white mb-4">Institution Configuration</h3>
      <div className="space-y-4 max-w-lg">
        {[
          { label: 'Institution Name', value: 'Academic Architect University' },
          { label: 'Default Academic Year', value: '2025-2026' },
          { label: 'Attendance Threshold', value: '75%' },
          { label: 'Late Fine Per Day', value: '₹50' },
        ].map(s => (
          <div key={s.label} className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl">
            <span className="text-sm font-medium text-slate-600 dark:text-slate-400">{s.label}</span>
            <span className="text-sm font-bold dark:text-white">{s.value}</span>
          </div>
        ))}
      </div>
    </div>
  </div>
);

const ExamsOverviewPage = () => (
  <div className="space-y-6">
    <h2 className="text-2xl font-bold dark:text-white">Exam Cell Hub</h2>
    <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
      <StatCard label="Scheduled Exams" value="12" color="text-brand-500" />
      <StatCard label="Scripts Pending" value="245" color="text-amber-500" />
      <StatCard label="Results Published" value="8" color="text-emerald-500" />
      <StatCard label="Revaluation Requests" value="14" color="text-red-500" />
    </div>
    <div className="glass rounded-2xl p-6 border border-slate-200 dark:border-slate-800">
      <h3 className="font-bold dark:text-white mb-4">Evaluation Workflow Pipeline</h3>
      <div className="grid grid-cols-4 gap-4">
        {[
          { stage: 'Allocated', count: 120, color: 'bg-blue-500' },
          { stage: 'Evaluated', count: 85, color: 'bg-purple-500' },
          { stage: 'Reviewed', count: 30, color: 'bg-amber-500' },
          { stage: 'Finalized', count: 10, color: 'bg-emerald-500' },
        ].map(s => (
          <div key={s.stage} className="text-center">
            <div className={`${s.color} text-white text-2xl font-extrabold py-6 rounded-2xl mb-2`}>{s.count}</div>
            <p className="text-sm font-medium text-slate-500">{s.stage}</p>
          </div>
        ))}
      </div>
    </div>
    <div className="glass rounded-2xl p-6 border border-slate-200 dark:border-slate-800">
      <h3 className="font-bold dark:text-white mb-4">Result Release Status</h3>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-200 dark:border-slate-700">
              <th className="text-left py-3 px-4 font-semibold text-slate-500">Subject</th>
              <th className="text-left py-3 px-4 font-semibold text-slate-500">Status</th>
              <th className="text-left py-3 px-4 font-semibold text-slate-500">Scripts</th>
              <th className="text-left py-3 px-4 font-semibold text-slate-500">Pass Rate</th>
            </tr>
          </thead>
          <tbody>
            {[
              { subject: 'CS101 - Data Structures', status: 'RELEASED', scripts: 180, pass: '92%' },
              { subject: 'MATH201 - Linear Algebra', status: 'APPROVED', scripts: 165, pass: '85%' },
              { subject: 'PHY101 - Mechanics', status: 'VERIFIED', scripts: 190, pass: '—' },
              { subject: 'ENG102 - Technical Writing', status: 'DRAFT', scripts: 150, pass: '—' },
            ].map(r => (
              <tr key={r.subject} className="border-b border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50">
                <td className="py-3 px-4 font-medium dark:text-white">{r.subject}</td>
                <td className="py-3 px-4">
                  <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${
                    r.status === 'RELEASED' ? 'bg-emerald-100 text-emerald-600' :
                    r.status === 'APPROVED' ? 'bg-blue-100 text-blue-600' :
                    r.status === 'VERIFIED' ? 'bg-amber-100 text-amber-600' :
                    'bg-slate-100 text-slate-500'
                  }`}>{r.status}</span>
                </td>
                <td className="py-3 px-4 text-slate-500">{r.scripts}</td>
                <td className="py-3 px-4 text-slate-500">{r.pass}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  </div>
);

const StatCard = ({ label, value, color = 'text-slate-700 dark:text-white' }: { label: string; value: string; color?: string }) => (
  <div className="glass p-5 rounded-2xl border border-slate-200 dark:border-slate-800">
    <p className="text-sm font-medium text-slate-500 dark:text-slate-400 mb-1">{label}</p>
    <h4 className={`text-2xl font-extrabold ${color}`}>{value}</h4>
  </div>
);

// ——— Main Admin Dashboard with Nested Routes ———
const AdminDashboard = () => {
  return (
    <div className="flex-1 p-8 overflow-y-auto animate-fade-in">
      <Routes>
        <Route index element={<DashboardOverview />} />
        <Route path="academics" element={<AcademicsPage />} />
        <Route path="exams" element={<ExamsOverviewPage />} />
        <Route path="finance" element={<FinancePage />} />
        <Route path="operations" element={<OperationsPage />} />
        <Route path="directory" element={<DirectoryPage />} />
        <Route path="reports" element={<ReportsPage />} />
        <Route path="settings" element={<SettingsPage />} />
      </Routes>
    </div>
  );
};

export default AdminDashboard;
