import React, { useState } from 'react';
import { Routes, Route } from 'react-router-dom';
import Sidebar from '../../components/layout/Sidebar';
import { useAuth } from '../../hooks/useAuth';
import { useDashboardData } from '../../hooks/useDashboardData';
import { DashboardSkeleton } from '../../components/ui/DashboardSkeleton';
import ErrorCard from '../../components/ui/ErrorCard';
import { apiClient } from '../../api/client';
import {
  Activity, BookOpen, DollarSign, Calendar, Clock, AlertTriangle,
  FileText, CheckCircle2, XCircle, TrendingUp, CreditCard, RefreshCw
} from 'lucide-react';
import {
  AreaChart, Area, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts';

const attendanceHistory = [
  { week: 'W1', present: 5, total: 6 },
  { week: 'W2', present: 6, total: 6 },
  { week: 'W3', present: 4, total: 6 },
  { week: 'W4', present: 5, total: 6 },
  { week: 'W5', present: 6, total: 6 },
  { week: 'W6', present: 3, total: 6 },
  { week: 'W7', present: 5, total: 6 },
  { week: 'W8', present: 6, total: 6 },
];

const examResults = [
  { subject: 'CS101', name: 'Data Structures', marks: 82, max: 100, grade: 'A', status: 'PUBLISHED' },
  { subject: 'MATH201', name: 'Linear Algebra', marks: 71, max: 100, grade: 'B+', status: 'PUBLISHED' },
  { subject: 'PHY101', name: 'Mechanics', marks: 65, max: 100, grade: 'B', status: 'PUBLISHED' },
  { subject: 'ENG102', name: 'Technical Writing', marks: 0, max: 100, grade: '—', status: 'PENDING' },
];

const DashboardOverview = () => {
  const { user } = useAuth();
  const { data, loading, error, refetch } = useDashboardData<any>(
    '/analytics/dashboard/student',
    { attendance: 0, finance: { totalFees: 0, totalPaid: 0, pending: 0 }, todaySchedule: [], invoices: [] }
  );

  const [payingId, setPayingId] = useState<string | null>(null);

  const handlePay = async (invoiceId: string) => {
    setPayingId(invoiceId);
    try {
      const response = await apiClient.post(`/finance/invoices/${invoiceId}/pay`);
      const order = response.data.data;

      const options = {
        key: order.keyId,
        amount: order.amount,
        currency: order.currency,
        name: 'Academic Architect ERP',
        description: `Fee Payment - Invoice #${invoiceId.slice(-6)}`,
        order_id: order.orderId,
        handler: async (response: any) => {
          console.log('Payment Success:', response);
          refetch(); // Reload dashboard to show payment reflection
        },
        onRetry: refetch,
        prefill: { name: 'Student', email: 'student@erp.local' },
        theme: { color: '#6366f1' }
      };

      const rzp = new (window as any).Razorpay(options);
      rzp.open();
    } catch (err) {
      alert('Failed to initiate payment. Please try again.');
    } finally {
      setPayingId(null);
    }
  };

  if (loading) return <DashboardSkeleton />;
  if (error) return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] p-8 text-center glass rounded-3xl border border-red-200 dark:border-red-900/30">
      <div className="w-16 h-16 bg-red-100 dark:bg-red-900/20 rounded-full flex items-center justify-center mb-6">
        <AlertTriangle className="w-8 h-8 text-red-600" />
      </div>
      <h2 className="text-2xl font-bold text-slate-800 dark:text-white mb-2">Academic Server Unreachable</h2>
      <p className="text-slate-600 dark:text-slate-400 mb-6 max-w-md mx-auto">
        We couldn't connect to the dashboard services. If you are on a LAN, please ensure the host machine's firewall allows traffic on port 8091.
      </p>
      <button 
        onClick={refetch}
        className="flex items-center gap-2 px-8 py-3 bg-brand-600 text-white rounded-xl font-bold hover:bg-brand-700 transition-all shadow-lg shadow-brand-500/20"
      >
        <RefreshCw className="w-4 h-4" /> Retry Connection
      </button>
    </div>
  );

  const { attendance, finance, todaySchedule, invoices } = data;
  const isLowAttendance = attendance < 75;

  return (
    <>
      <header className="mb-10 flex justify-between items-end">
        <div>
          <h2 className="text-3xl font-bold dark:text-white">Welcome Back</h2>
          <p className="text-slate-500 dark:text-slate-400 mt-1">Here's your academic overview for today.</p>
        </div>
        <button onClick={refetch} className="glass p-2 rounded-lg text-slate-500 hover:text-brand-500 transition-colors">
          <RefreshCw className="w-5 h-5" />
        </button>
      </header>

      {/* Alert Banners */}
      {isLowAttendance && (
        <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-800 rounded-2xl flex items-center gap-3">
          <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0" />
          <div>
            <p className="text-sm font-bold text-red-700 dark:text-red-400">Attendance Warning</p>
            <p className="text-xs text-red-600 dark:text-red-400/80">Your attendance is {attendance}%, which is below the 75% threshold.</p>
          </div>
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
        <MetricCard
          icon={<Activity className="w-6 h-6" />}
          title="Attendance"
          value={`${attendance}%`}
          subtitle={isLowAttendance ? 'Below 75%' : 'On Track'}
          color={isLowAttendance ? 'text-red-500' : 'text-emerald-500'}
          bgColor={isLowAttendance ? 'bg-red-50 dark:bg-red-900/20' : 'bg-emerald-50 dark:bg-emerald-900/20'}
        />
        <MetricCard
          icon={<BookOpen className="w-6 h-6" />}
          title="Today's Classes"
          value={String(todaySchedule.length)}
          subtitle="Remaining today"
          color="text-brand-500"
          bgColor="bg-indigo-50 dark:bg-indigo-900/20"
        />
        <MetricCard
          icon={<DollarSign className="w-6 h-6" />}
          title="Fee Pending"
          value={`₹${finance.pending.toLocaleString()}`}
          subtitle={finance.pending > 0 ? "Outstanding" : "Fully Paid"}
          color="text-amber-500"
          bgColor="bg-amber-50 dark:bg-amber-900/20"
        />
        <MetricCard
          icon={<FileText className="w-6 h-6" />}
          title="GPA Mirror"
          value="8.42"
          subtitle="Mock Aggregate"
          color="text-purple-500"
          bgColor="bg-purple-50 dark:bg-purple-900/20"
        />
      </div>

      {/* Quick Actions Row */}
      <div className="mb-8 flex gap-4">
        <button 
          onClick={() => window.open(`/api/v1/exams/memo/${user?.id}`, '_blank')}
          className="premium-glass px-6 py-3 rounded-2xl flex items-center gap-3 text-sm font-bold text-slate-700 dark:text-slate-200"
        >
          <FileText className="w-5 h-5 text-brand-500" /> Download Marks Statement
        </button>
      </div>

      {/* Schedule Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
        <div className="lg:col-span-2 glass rounded-2xl p-6 border border-slate-200 dark:border-slate-800">
          <h3 className="text-lg font-bold dark:text-white mb-1">Fee Invoices</h3>
          <p className="text-xs text-slate-400 mb-4">Pending and processed dues</p>
          <div className="space-y-4">
            {invoices.map((inv: any) => (
              <div key={inv.id} className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-4">
                  <div className={`p-2 rounded-lg ${inv.status === 'PAID' ? 'bg-emerald-100 text-emerald-600' : 'bg-amber-100 text-amber-600'}`}>
                    <CreditCard className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-sm font-bold dark:text-white">{inv.title || 'Course Fee'}</p>
                    <p className="text-xs text-slate-500">Due: {new Date(inv.dueDate).toLocaleDateString()}</p>
                  </div>
                </div>
                <div className="flex items-center gap-6">
                  <div className="text-right">
                    <p className="text-sm font-bold dark:text-white">₹{inv.totalAmount.toLocaleString()}</p>
                    <p className={`text-[10px] uppercase font-bold ${inv.status === 'PAID' ? 'text-emerald-500' : 'text-amber-500'}`}>{inv.status}</p>
                  </div>
                  {inv.status !== 'PAID' && (
                    <button 
                      onClick={() => handlePay(inv.id)}
                      disabled={payingId === inv.id}
                      className="bg-brand-600 hover:bg-brand-500 text-white px-4 py-2 rounded-lg text-xs font-bold transition-all disabled:opacity-50"
                    >
                      {payingId === inv.id ? 'Loading...' : 'Pay Now'}
                    </button>
                  )}
                </div>
              </div>
            ))}
            {invoices.length === 0 && (
              <div className="text-center py-8">
                <p className="text-slate-400">No invoices generated yet.</p>
              </div>
            )}
          </div>
        </div>

        <div className="glass rounded-2xl p-6 border border-slate-200 dark:border-slate-800">
          <h3 className="text-lg font-bold dark:text-white mb-1 flex items-center gap-2">
            <Clock className="w-5 h-5 text-brand-500" /> Today's Schedule
          </h3>
          <p className="text-xs text-slate-400 mb-4">{new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}</p>
          <div className="space-y-3">
            {todaySchedule.map((c: any, i: number) => (
              <div key={i} className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl border-l-4 border-brand-500">
                <p className="text-sm font-bold dark:text-white">{c.subject}</p>
                <div className="flex items-center gap-3 mt-1">
                  <span className="text-xs text-slate-500">{c.time}</span>
                </div>
                <p className="text-xs text-brand-500 font-medium mt-1">{c.faculty}</p>
              </div>
            ))}
            {todaySchedule.length === 0 && (
              <p className="text-center py-4 text-slate-400 italic">No classes today.</p>
            )}
          </div>
        </div>
      </div>

      {/* Exam Results */}
      <div className="glass rounded-2xl p-6 border border-slate-200 dark:border-slate-800">
        <div className="flex justify-between items-center mb-4">
          <div>
            <h3 className="text-lg font-bold dark:text-white">Exam Results</h3>
            <p className="text-xs text-slate-400">Current semester results</p>
          </div>
          <button className="text-sm text-brand-600 font-medium hover:text-brand-500">Download Marksheet</button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-700">
                <th className="text-left py-3 px-4 font-semibold text-slate-500">Code</th>
                <th className="text-left py-3 px-4 font-semibold text-slate-500">Subject</th>
                <th className="text-left py-3 px-4 font-semibold text-slate-500">Marks</th>
                <th className="text-left py-3 px-4 font-semibold text-slate-500">Grade</th>
                <th className="text-left py-3 px-4 font-semibold text-slate-500">Status</th>
              </tr>
            </thead>
            <tbody>
              {examResults.map(r => (
                <tr key={r.subject} className="border-b border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50">
                  <td className="py-3 px-4 font-mono text-xs font-bold text-brand-500">{r.subject}</td>
                  <td className="py-3 px-4 font-medium dark:text-white">{r.name}</td>
                  <td className="py-3 px-4 dark:text-white">
                    {r.status === 'PUBLISHED' ? (
                      <span className={`font-bold ${r.marks >= 40 ? 'text-emerald-600' : 'text-red-500'}`}>
                        {r.marks}/{r.max}
                      </span>
                    ) : '—'}
                  </td>
                  <td className="py-3 px-4">
                    <span className={`font-bold text-lg ${r.grade === 'A' ? 'text-emerald-500' : r.grade === 'B+' ? 'text-blue-500' : r.grade === 'B' ? 'text-amber-500' : 'text-slate-400'}`}>
                      {r.grade}
                    </span>
                  </td>
                  <td className="py-3 px-4">
                    <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${r.status === 'PUBLISHED' ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-100 text-slate-500'}`}>
                      {r.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
};

// ——— Sub-Pages ———
const SchedulePage = () => {
  const schedule = [
    { day: 'Monday', classes: [
      { subject: 'CS301 - Algorithms', time: '09:00-10:00', room: 'LH-201', faculty: 'Dr. Jenkins' },
      { subject: 'MATH202 - Probability', time: '10:15-11:15', room: 'LH-105', faculty: 'Prof. Turing' },
      { subject: 'PHY102 - Optics (Lab)', time: '14:00-16:00', room: 'Lab-3', faculty: 'Dr. Carter' },
    ]},
    { day: 'Tuesday', classes: [
      { subject: 'ENG102 - Technical Writing', time: '09:00-10:00', room: 'LH-301', faculty: 'Prof. Austen' },
      { subject: 'CS301 - Algorithms (Tutorial)', time: '11:30-12:30', room: 'LH-201', faculty: 'Dr. Jenkins' },
    ]},
    { day: 'Wednesday', classes: [
      { subject: 'MATH202 - Probability', time: '09:00-10:00', room: 'LH-105', faculty: 'Prof. Turing' },
      { subject: 'CS302 - Database Systems', time: '10:15-11:15', room: 'LH-202', faculty: 'Dr. Codd' },
      { subject: 'PHY102 - Optics', time: '14:00-15:00', room: 'LH-108', faculty: 'Dr. Carter' },
    ]},
    { day: 'Thursday', classes: [
      { subject: 'CS302 - Database Systems (Lab)', time: '09:00-11:00', room: 'Lab-1', faculty: 'Dr. Codd' },
      { subject: 'ENG102 - Technical Writing', time: '11:30-12:30', room: 'LH-301', faculty: 'Prof. Austen' },
    ]},
    { day: 'Friday', classes: [
      { subject: 'CS301 - Algorithms', time: '09:00-10:00', room: 'LH-201', faculty: 'Dr. Jenkins' },
      { subject: 'MATH202 - Probability', time: '10:15-11:15', room: 'LH-105', faculty: 'Prof. Turing' },
    ]},
  ];

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold dark:text-white">Weekly Schedule</h2>
      {schedule.map(day => (
        <div key={day.day} className="glass rounded-2xl p-6 border border-slate-200 dark:border-slate-800">
          <h3 className="font-bold dark:text-white mb-4 text-lg">{day.day}</h3>
          <div className="space-y-3">
            {day.classes.map((c, i) => (
              <div key={i} className="flex items-center gap-4 p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl">
                <div className="w-20 text-center">
                  <p className="text-xs font-bold text-brand-500">{c.time}</p>
                </div>
                <div className="flex-1">
                  <p className="text-sm font-bold dark:text-white">{c.subject}</p>
                  <p className="text-xs text-slate-500">{c.faculty} • {c.room}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
};

const StudentExamsPage = () => (
  <div className="space-y-6">
    <h2 className="text-2xl font-bold dark:text-white">Exams & Results</h2>
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      <StatCard label="SGPA" value="8.42" color="text-brand-500" />
      <StatCard label="CGPA" value="8.15" color="text-purple-500" />
      <StatCard label="Backlogs" value="0" color="text-emerald-500" />
    </div>
    <div className="glass rounded-2xl p-6 border border-slate-200 dark:border-slate-800">
      <h3 className="font-bold dark:text-white mb-4">Subject-wise Performance</h3>
      <ResponsiveContainer width="100%" height={280}>
        <BarChart data={examResults.filter(r => r.status === 'PUBLISHED')}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
          <XAxis dataKey="subject" tick={{ fontSize: 12 }} stroke="#94a3b8" />
          <YAxis tick={{ fontSize: 12 }} stroke="#94a3b8" domain={[0, 100]} />
          <Tooltip contentStyle={{ borderRadius: '12px' }} />
          <Bar dataKey="marks" fill="#6366f1" radius={[6, 6, 0, 0]} name="Marks" />
        </BarChart>
      </ResponsiveContainer>
    </div>
    <div className="glass rounded-2xl p-6 border border-slate-200 dark:border-slate-800">
      <h3 className="font-bold dark:text-white mb-4">Revaluation Requests</h3>
      <p className="text-sm text-slate-500">No active revaluation requests. You can apply for revaluation within 15 days of result publication.</p>
      <button className="mt-4 bg-brand-600 hover:bg-brand-500 text-white px-5 py-2.5 rounded-lg font-medium text-sm transition-all">
        Apply for Revaluation
      </button>
    </div>
  </div>
);

const StudentFinancePage = () => (
  <div className="space-y-6">
    <h2 className="text-2xl font-bold dark:text-white">Fee & Payments</h2>
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      <StatCard label="Total Fees" value="₹1,25,000" />
      <StatCard label="Paid" value="₹1,02,500" color="text-emerald-500" />
      <StatCard label="Pending" value="₹22,500" color="text-red-500" />
    </div>
    <div className="glass rounded-2xl p-6 border border-slate-200 dark:border-slate-800">
      <h3 className="font-bold dark:text-white mb-4">Pending Invoices</h3>
      <div className="space-y-3">
        <div className="flex items-center justify-between p-4 bg-amber-50 dark:bg-amber-900/10 rounded-xl border border-amber-200 dark:border-amber-800">
          <div>
            <p className="text-sm font-bold text-amber-800 dark:text-amber-300">Semester 6 - Tuition Fee</p>
            <p className="text-xs text-amber-600 dark:text-amber-400">Due: April 15, 2026</p>
          </div>
          <div className="text-right">
            <p className="text-lg font-extrabold text-amber-700 dark:text-amber-300">₹22,500</p>
            <button className="mt-1 bg-amber-500 hover:bg-amber-600 text-white px-4 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1">
              <CreditCard className="w-3.5 h-3.5" /> Pay Now
            </button>
          </div>
        </div>
      </div>
    </div>
    <div className="glass rounded-2xl p-6 border border-slate-200 dark:border-slate-800">
      <h3 className="font-bold dark:text-white mb-4">Payment History</h3>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-200 dark:border-slate-700">
              <th className="text-left py-3 px-4 font-semibold text-slate-500">Date</th>
              <th className="text-left py-3 px-4 font-semibold text-slate-500">Description</th>
              <th className="text-left py-3 px-4 font-semibold text-slate-500">Amount</th>
              <th className="text-left py-3 px-4 font-semibold text-slate-500">Status</th>
            </tr>
          </thead>
          <tbody>
            {[
              { date: 'Jan 15, 2026', desc: 'Semester 6 - Hostel Fee', amount: '₹45,000', status: 'PAID' },
              { date: 'Jan 10, 2026', desc: 'Semester 6 - Lab Fee', amount: '₹7,500', status: 'PAID' },
              { date: 'Aug 20, 2025', desc: 'Semester 5 - Tuition Fee', amount: '₹50,000', status: 'PAID' },
            ].map((p, i) => (
              <tr key={i} className="border-b border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50">
                <td className="py-3 px-4 text-slate-500">{p.date}</td>
                <td className="py-3 px-4 font-medium dark:text-white">{p.desc}</td>
                <td className="py-3 px-4 font-bold dark:text-white">{p.amount}</td>
                <td className="py-3 px-4">
                  <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-600">{p.status}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  </div>
);

const StudentSettingsPage = () => (
  <div className="space-y-6">
    <h2 className="text-2xl font-bold dark:text-white">Profile & Settings</h2>
    <div className="glass rounded-2xl p-6 border border-slate-200 dark:border-slate-800 max-w-lg">
      <h3 className="font-bold dark:text-white mb-4">Personal Information</h3>
      <div className="space-y-3">
        {[
          { label: 'Enrollment No', value: 'KITSG/CS/2023/0142' },
          { label: 'Program', value: 'B.Tech Computer Science' },
          { label: 'Batch', value: '2023-2027' },
          { label: 'Semester', value: '6th' },
          { label: 'Hostel', value: 'Block A - Room 204' },
        ].map(f => (
          <div key={f.label} className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl">
            <span className="text-sm font-medium text-slate-500">{f.label}</span>
            <span className="text-sm font-bold dark:text-white">{f.value}</span>
          </div>
        ))}
      </div>
    </div>
  </div>
);

const MetricCard = ({ icon, title, value, subtitle, color, bgColor }: any) => (
  <div className="glass p-6 rounded-2xl border border-slate-200 dark:border-slate-800 hover:shadow-xl hover:-translate-y-0.5 transition-all">
    <div className={`p-3 rounded-xl w-fit mb-4 ${bgColor}`}>
      <div className={color}>{icon}</div>
    </div>
    <p className="text-sm font-medium text-slate-500 dark:text-slate-400 mb-1">{title}</p>
    <h4 className="text-3xl font-extrabold dark:text-white">{value}</h4>
    <p className={`text-xs font-medium mt-1 ${color}`}>{subtitle}</p>
  </div>
);

const StatCard = ({ label, value, color = 'text-slate-700 dark:text-white' }: any) => (
  <div className="glass p-5 rounded-2xl border border-slate-200 dark:border-slate-800">
    <p className="text-sm font-medium text-slate-500 dark:text-slate-400 mb-1">{label}</p>
    <h4 className={`text-2xl font-extrabold ${color}`}>{value}</h4>
  </div>
);

const StudentDashboard = () => {
  return (
    <div className="flex-1 p-8 overflow-y-auto animate-fade-in">
      <Routes>
        <Route index element={<DashboardOverview />} />
        <Route path="schedule" element={<SchedulePage />} />
        <Route path="exams" element={<StudentExamsPage />} />
        <Route path="finance" element={<StudentFinancePage />} />
        <Route path="settings" element={<StudentSettingsPage />} />
      </Routes>
    </div>
  );
};

export default StudentDashboard;
