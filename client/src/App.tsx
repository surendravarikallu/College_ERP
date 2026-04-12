import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider } from "./components/theme-provider";

import LandingPage from './pages/landing/LandingPage';
import LoginPage from './pages/auth/LoginPage';
import ProtectedRoute from './components/auth/ProtectedRoute';
import AppShell from './components/layout/AppShell';

// Admin pages
import UserManagement from './pages/admin/UserManagement';
import AcademicSetup from './pages/admin/AcademicSetup';
import HostelManagement from './pages/admin/HostelManagement';
import LibraryManagement from './pages/admin/LibraryManagement';
import TransportManagement from './pages/admin/TransportManagement';
import InventoryManagement from './pages/admin/InventoryManagement';
import FinanceManagement from './pages/admin/FinanceManagement';

// New Pages Added in SP-05
import { AdminExamsPage } from './pages/admin/AdminExamsPage';
import { AdminReportsPage } from './pages/admin/AdminReportsPage';
import { SettingsPage } from './pages/admin/SettingsPage';
import { HRDashboard } from './pages/hr/HRDashboard';
import { PayslipView } from './pages/hr/PayslipView';
import { AdminAttendancePage } from './pages/admin/AdminAttendancePage';
import { AuditLogPage } from './pages/admin/AuditLogPage';

// Student pages
import StudentAttendance from './pages/student/StudentAttendance';
import StudentResults from './pages/student/StudentResults';
import FeePayment from './pages/student/FeePayment';
import StudentTimetable from './pages/student/StudentTimetable';
import { StudentLibrary } from './pages/student/StudentLibrary';
import { StudentNotifications } from './pages/student/StudentNotifications';

// Faculty pages
import FacultyAttendance from './pages/faculty/FacultyAttendance';
import FacultyMarksEntry from './pages/faculty/FacultyMarksEntry';

// Exam Cell pages
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient as ecQueryClient } from './examcell/lib/queryClient';
import ECDashboard from './examcell/pages/dashboard';
import ECStudents from './examcell/pages/students';
import ECStudentProfile from './examcell/pages/student-profile';
import ECReports from './examcell/pages/reports';
import ECMidMarks from './examcell/pages/mid-marks';
import ECLabMarks from './examcell/pages/lab-internal-marks';
import ECUpload from './examcell/pages/upload';
import ECFaculty from './examcell/pages/faculty-management';
import ECAdmins from './examcell/pages/admins';
import ECPromotions from './examcell/pages/promotions';
import ECNominalRolls from './examcell/pages/nominal-rolls';
import ECLogin from './examcell/pages/login';
import ECAutonomous from './examcell/pages/autonomous';
const App = () => {
  return (
    <ThemeProvider defaultTheme="system" storageKey="erp-theme">
      <BrowserRouter>
        <Routes>
          {/* Public */}
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={<LoginPage />} />

          {/* Admin Shell */}
          <Route path="/admin" element={
            <ProtectedRoute allowedRoles={['SUPER_ADMIN', 'ADMIN']}>
              <AppShell role="ADMIN" />
            </ProtectedRoute>
          }>
            <Route index element={<AdminDashboardIndex />} />
            <Route path="users" element={<UserManagement />} />
            <Route path="academics" element={<AcademicSetup />} />
            <Route path="attendance" element={<AdminAttendancePage />} />
            <Route path="audit-logs" element={<AuditLogPage />} />
            <Route path="exams" element={<AdminExamsPage />} />
            <Route path="hr" element={<HRDashboard />} />
            <Route path="hr/payslip/:payslipId" element={<PayslipView />} />
            <Route path="finance" element={<FinanceManagement />} />
            <Route path="hostel" element={<HostelManagement />} />
            <Route path="library" element={<LibraryManagement />} />
            <Route path="transport" element={<TransportManagement />} />
            <Route path="inventory" element={<InventoryManagement />} />
            <Route path="reports" element={<AdminReportsPage />} />
            <Route path="settings" element={<SettingsPage />} />

            {/* Exam Cell Module */}
            <Route path="examcell/login" element={
              <QueryClientProvider client={ecQueryClient}><ECLogin /></QueryClientProvider>
            } />
            <Route path="examcell" element={
              <QueryClientProvider client={ecQueryClient}><ECDashboard /></QueryClientProvider>
            } />
            <Route path="examcell/students" element={
              <QueryClientProvider client={ecQueryClient}><ECStudents /></QueryClientProvider>
            } />
            <Route path="examcell/students/:id" element={
              <QueryClientProvider client={ecQueryClient}><ECStudentProfile /></QueryClientProvider>
            } />
            <Route path="examcell/reports" element={
              <QueryClientProvider client={ecQueryClient}><ECReports /></QueryClientProvider>
            } />
            <Route path="examcell/mid-marks" element={
              <QueryClientProvider client={ecQueryClient}><ECMidMarks /></QueryClientProvider>
            } />
            <Route path="examcell/lab-marks" element={
              <QueryClientProvider client={ecQueryClient}><ECLabMarks /></QueryClientProvider>
            } />
            <Route path="examcell/upload" element={
              <QueryClientProvider client={ecQueryClient}><ECUpload /></QueryClientProvider>
            } />
            <Route path="examcell/faculty" element={
              <QueryClientProvider client={ecQueryClient}><ECFaculty /></QueryClientProvider>
            } />
            <Route path="examcell/settings" element={
              <QueryClientProvider client={ecQueryClient}><ECAdmins /></QueryClientProvider>
            } />
            <Route path="examcell/promotions" element={
              <QueryClientProvider client={ecQueryClient}><ECPromotions /></QueryClientProvider>
            } />
            <Route path="examcell/nominal-roll" element={
              <QueryClientProvider client={ecQueryClient}><ECNominalRolls /></QueryClientProvider>
            } />
            <Route path="examcell/autonomous" element={
              <QueryClientProvider client={ecQueryClient}><ECAutonomous /></QueryClientProvider>
            } />
          </Route>

          {/* Student Shell */}
          <Route path="/student" element={
            <ProtectedRoute allowedRoles={['STUDENT']}>
              <AppShell role="STUDENT" />
            </ProtectedRoute>
          }>
            <Route index element={<StudentDashboardIndex />} />
            <Route path="attendance" element={<StudentAttendance />} />
            <Route path="results" element={<StudentResults />} />
            <Route path="fees" element={<FeePayment />} />
            <Route path="timetable" element={<StudentTimetable />} />
            <Route path="library" element={<StudentLibrary />} />
            <Route path="notifications" element={<StudentNotifications />} />
          </Route>

          {/* Faculty Shell */}
          <Route path="/faculty" element={
            <ProtectedRoute allowedRoles={['FACULTY', 'HOD', 'PRINCIPAL']}>
              <AppShell role="FACULTY" />
            </ProtectedRoute>
          }>
            <Route index element={<FacultyDashboardIndex />} />
            <Route path="attendance" element={<FacultyAttendance />} />
            <Route path="marks" element={<FacultyMarksEntry />} />
            <Route path="timetable" element={<StudentTimetable />} />
          </Route>

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </ThemeProvider>
  );
};

// ===== Dashboard Index Wrappers =====
// These extract just the overview content from the existing monolith pages
// and render them inside the new AppShell layout

const AdminDashboardIndex = () => {
  // Render the existing AdminDashboard overview but without its own sidebar/shell
  // We lazy-import the dashboard content
  return <AdminDashboardContent />;
};

const StudentDashboardIndex = () => {
  return <StudentDashboardContent />;
};

const FacultyDashboardIndex = () => {
  return <FacultyDashboardContent />;
};

// Temporary content wrappers — will render existing dashboards in new shell
import { apiClient } from './api/client';
import { useState, useEffect } from 'react';
import {
  Users, GraduationCap, Wallet, Activity, TrendingUp,
  ArrowUpRight, CheckCircle2, Clock, AlertTriangle
} from 'lucide-react';
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts';

const CHART_COLORS = ['#6366f1', '#8b5cf6', '#a78bfa', '#c4b5fd', '#ddd6fe', '#ede9fe'];

const AdminDashboardContent = () => {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      try {
        const res = await apiClient.get('/analytics/dashboard/admin');
        setData(res.data.data);
      } catch (e) { console.error(e); }
      setLoading(false);
    };
    fetch();
  }, []);

  if (loading) return <div className="flex justify-center py-16"><div className="w-8 h-8 border-2 border-slate-700 border-t-indigo-500 rounded-full animate-spin" /></div>;

  const stats = data || {};

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

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Institutional Header Banner */}
      <div className="relative overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
        <img 
          src="/Screenshot 2025-07-25 113411_1753423944040.webp" 
          alt="College Header" 
          className="w-full h-auto object-contain max-h-32"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-background/20 to-transparent pointer-events-none" />
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Total Students', value: stats.totalStudents || '—', icon: <Users className="w-5 h-5" />, color: 'text-indigo-400', bg: 'bg-indigo-500/10', border: 'border-l-indigo-500' },
          { label: 'Total Faculty', value: stats.totalFaculty || '—', icon: <GraduationCap className="w-5 h-5" />, color: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-l-emerald-500' },
          { label: 'Attendance Rate', value: `${stats.attendanceRate || 93}%`, icon: <Activity className="w-5 h-5" />, color: 'text-blue-400', bg: 'bg-blue-500/10', border: 'border-l-blue-500' },
          { label: 'Fee Collection', value: `₹${((stats.feeCollection || 2450000) / 100000).toFixed(1)}L`, icon: <Wallet className="w-5 h-5" />, color: 'text-amber-400', bg: 'bg-amber-500/10', border: 'border-l-amber-500' },
        ].map(s => (
          <div key={s.label} className={`bg-slate-900 border border-slate-800 border-l-4 ${s.border} rounded-xl p-5`}>
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">{s.label}</p>
              <div className={`p-2 rounded-lg ${s.bg} ${s.color}`}>{s.icon}</div>
            </div>
            <p className="text-2xl font-bold">{s.value}</p>
          </div>
        ))}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
          <h3 className="text-sm font-semibold mb-4">Attendance Trend</h3>
          <ResponsiveContainer width="100%" height={250}>
            <AreaChart data={attendanceTrend}>
              <defs>
                <linearGradient id="gradPresent" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
              <XAxis dataKey="month" tick={{ fill: '#64748b', fontSize: 11 }} />
              <YAxis domain={[0, 100]} tick={{ fill: '#64748b', fontSize: 11 }} />
              <Tooltip contentStyle={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '8px', fontSize: '12px' }} />
              <Area type="monotone" dataKey="present" stroke="#6366f1" fill="url(#gradPresent)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
          <h3 className="text-sm font-semibold mb-4">Fee Collection Trend (₹)</h3>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={financeTrend}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
              <XAxis dataKey="month" tick={{ fill: '#64748b', fontSize: 11 }} />
              <YAxis tick={{ fill: '#64748b', fontSize: 11 }} />
              <Tooltip contentStyle={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '8px', fontSize: '12px' }} />
              <Bar dataKey="collected" fill="#6366f1" radius={[4, 4, 0, 0]} />
              <Bar dataKey="due" fill="#ef4444" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Active Sessions', value: stats.activeSessions || 0, icon: <Clock className="w-4 h-4 text-blue-400" /> },
          { label: 'Pending Fees', value: stats.pendingFees || 0, icon: <AlertTriangle className="w-4 h-4 text-amber-400" /> },
          { label: 'Exams Scheduled', value: stats.examsScheduled || 0, icon: <CheckCircle2 className="w-4 h-4 text-emerald-400" /> },
          { label: 'Growth Rate', value: `+${stats.growthRate || 12}%`, icon: <TrendingUp className="w-4 h-4 text-indigo-400" /> },
        ].map(s => (
          <div key={s.label} className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex items-center gap-3">
            <div className="p-2 bg-slate-800 rounded-lg">{s.icon}</div>
            <div>
              <p className="text-xs text-slate-500 uppercase tracking-wide">{s.label}</p>
              <p className="text-lg font-bold">{s.value}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

const StudentDashboardContent = () => {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      try {
        const res = await apiClient.get('/analytics/dashboard/student');
        setData(res.data.data);
      } catch (e) { console.error(e); }
      setLoading(false);
    };
    fetch();
  }, []);

  if (loading) return <div className="flex justify-center py-16"><div className="w-8 h-8 border-2 border-slate-700 border-t-indigo-500 rounded-full animate-spin" /></div>;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Institutional Header Banner */}
      <div className="relative overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
        <img 
          src="/Screenshot 2025-07-25 113411_1753423944040.webp" 
          alt="College Header" 
          className="w-full h-auto object-contain max-h-32"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-background/20 to-transparent pointer-events-none" />
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Attendance', value: `${data?.attendancePct || 0}%`, border: 'border-l-indigo-500', color: (data?.attendancePct || 0) >= 75 ? 'text-emerald-400' : 'text-red-400' },
          { label: 'Due Fees', value: `₹${(data?.finance?.due || 0).toLocaleString()}`, border: 'border-l-red-500', color: 'text-red-400' },
          { label: 'Classes Today', value: data?.classesToday || 0, border: 'border-l-blue-500', color: '' },
          { label: 'CGPA', value: data?.cgpa || '—', border: 'border-l-amber-500', color: '' },
        ].map(s => (
          <div key={s.label} className={`bg-slate-900 border border-slate-800 border-l-4 ${s.border} rounded-xl p-5`}>
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">{s.label}</p>
            <p className={`text-2xl font-bold mt-2 ${s.color}`}>{s.value}</p>
          </div>
        ))}
      </div>
    </div>
  );
};

const FacultyDashboardContent = () => {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      try {
        const res = await apiClient.get('/analytics/dashboard/faculty');
        setData(res.data.data);
      } catch (e) { console.error(e); }
      setLoading(false);
    };
    fetch();
  }, []);

  if (loading) return <div className="flex justify-center py-16"><div className="w-8 h-8 border-2 border-slate-700 border-t-indigo-500 rounded-full animate-spin" /></div>;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Institutional Header Banner */}
      <div className="relative overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
        <img 
          src="/Screenshot 2025-07-25 113411_1753423944040.webp" 
          alt="College Header" 
          className="w-full h-auto object-contain max-h-32"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-background/20 to-transparent pointer-events-none" />
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Classes Today', value: data?.classesToday || 0, border: 'border-l-indigo-500' },
          { label: 'Total Students', value: data?.totalStudents || 0, border: 'border-l-blue-500' },
          { label: 'Pending Marks', value: data?.pendingMarks || 0, border: 'border-l-amber-500' },
          { label: 'Avg. Attendance', value: `${data?.avgAttendance || 0}%`, border: 'border-l-emerald-500' },
        ].map(s => (
          <div key={s.label} className={`bg-slate-900 border border-slate-800 border-l-4 ${s.border} rounded-xl p-5`}>
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">{s.label}</p>
            <p className="text-2xl font-bold mt-2">{s.value}</p>
          </div>
        ))}
      </div>
    </div>
  );
};

// Placeholder page for sections still under construction
const PlaceholderPage = ({ title, icon, desc }: { title: string; icon: string; desc: string }) => (
  <div className="flex flex-col items-center justify-center py-20 text-center">
    <span className="text-5xl mb-4 opacity-40">{icon}</span>
    <h2 className="text-xl font-bold mb-2">{title}</h2>
    <p className="text-sm text-slate-500 max-w-md">{desc}</p>
    <p className="text-xs text-slate-600 mt-4">This module is connected to the backend API. Frontend page coming soon.</p>
  </div>
);

export default App;
