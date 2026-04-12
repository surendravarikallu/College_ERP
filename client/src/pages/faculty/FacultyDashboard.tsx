import React, { useState } from 'react';
import { Routes, Route } from 'react-router-dom';
import Sidebar from '../../components/layout/Sidebar';
import { useAuth } from '../../hooks/useAuth';
import { useDashboardData } from '../../hooks/useDashboardData';
import { DashboardSkeleton } from '../../components/ui/DashboardSkeleton';
import ErrorCard from '../../components/ui/ErrorCard';
import {
  CalendarCheck, Users, FileDiff, Clock, CheckCircle2,
  AlertTriangle, BookOpen, Upload, Settings, BarChart3
} from 'lucide-react';
import {
  BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts';

const DashboardOverview = () => {
  const { user } = useAuth();
  const { data, loading, error, refetch } = useDashboardData<any>(
    '/analytics/dashboard/faculty',
    { todayClasses: 0, gradingBacklog: 0, assignedSubjects: [] }
  );

  if (loading) return <DashboardSkeleton />;
  if (error) return <ErrorCard message={error} onRetry={refetch} />;

  const { todayClasses, gradingBacklog, assignedSubjects } = data;

  const classPerformance = (data.subjectStats || []).length > 0
    ? (data.subjectStats as any[]).map((s: any) => ({
        subject: s.code || s.name,
        avgAttendance: s.attendancePct || 0,
        avgMarks: s.avgMarks || 0,
      }))
    : [
        { subject: 'CS301', avgAttendance: 88, avgMarks: 74 },
        { subject: 'CS302', avgAttendance: 82, avgMarks: 68 },
        { subject: 'CS101', avgAttendance: 91, avgMarks: 79 },
      ];

  const gradingDistribution = (data.gradeDistribution || []).length > 0
    ? data.gradeDistribution
    : [
        { grade: 'A+', count: 12, color: '#22c55e' },
        { grade: 'A', count: 28, color: '#6366f1' },
        { grade: 'B+', count: 35, color: '#8b5cf6' },
        { grade: 'B', count: 20, color: '#a78bfa' },
        { grade: 'C', count: 8, color: '#f59e0b' },
        { grade: 'F', count: 2, color: '#ef4444' },
      ];

  return (
    <>
      <header className="flex justify-between items-center mb-10">
        <div>
          <h2 className="text-3xl font-bold dark:text-white">Faculty Portal</h2>
          <p className="text-slate-500 dark:text-slate-400 mt-1">Classes, Attendance, and Exam Grading</p>
        </div>
        <div className="flex gap-3">
          <button className="bg-brand-600 hover:bg-brand-500 text-white px-5 py-2 rounded-lg font-medium shadow-lg shadow-brand-500/30 transition-all flex items-center gap-2">
            <CalendarCheck className="w-4 h-4" /> Mark Attendance
          </button>
          <button className="glass px-4 py-2 rounded-lg font-medium shadow-sm hover:-translate-y-0.5 transition-transform dark:text-white flex items-center gap-2">
            <Upload className="w-4 h-4" /> Upload Marks
          </button>
        </div>
      </header>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
        <MetricCard
          icon={<CalendarCheck className="w-6 h-6" />}
          title="Today's Classes"
          value={String(todayClasses)}
          subtitle="Sessions remaining"
          color="text-brand-500"
          bgColor="bg-indigo-50 dark:bg-indigo-900/20"
        />
        <MetricCard
          icon={<FileDiff className="w-6 h-6" />}
          title="Grading Backlog"
          value={String(gradingBacklog)}
          subtitle="Pending scripts"
          color="text-purple-500"
          bgColor="bg-purple-50 dark:bg-purple-900/20"
        />
        <MetricCard
          icon={<BookOpen className="w-6 h-6" />}
          title="Subjects"
          value={String(assignedSubjects.length)}
          subtitle="Current semester"
          color="text-emerald-500"
          bgColor="bg-emerald-50 dark:bg-emerald-900/20"
        />
        <MetricCard
          icon={<BarChart3 className="w-6 h-6" />}
          title="Avg Performance"
          value="73.7%"
          subtitle="Mock Aggregate"
          color="text-amber-500"
          bgColor="bg-amber-50 dark:bg-amber-900/20"
        />
      </div>

      {/* Today's Classes and Grading Backlog */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
        <div className="glass rounded-2xl p-6 border border-slate-200 dark:border-slate-800">
          <h3 className="text-lg font-bold dark:text-white mb-1 flex items-center gap-2">
            <Clock className="w-5 h-5 text-brand-500" /> Today's Schedule
          </h3>
          <p className="text-xs text-slate-400 mb-4">{new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}</p>
          <div className="space-y-3">
            {todayClasses.map((c: any, i: number) => (
              <div key={i} className={'p-4 rounded-xl border-l-4 border-brand-500 bg-slate-50 dark:bg-slate-800/50'}>
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-sm font-bold dark:text-white">{c.subject}</p>
                    <p className="text-xs text-slate-500 mt-1">{c.batch} • {c.room}</p>
                  </div>
                  <div className="text-right">
                    <span className="text-xs font-bold text-brand-500">{c.time}</span>
                    <button className="mt-1 block ml-auto bg-brand-600 hover:bg-brand-500 text-white text-xs px-3 py-1 rounded-lg font-medium transition-all">
                      Take Attendance
                    </button>
                  </div>
                </div>
              </div>
            ))}
            {todayClasses.length === 0 && (
              <p className="text-center py-4 text-slate-400 italic">No classes today.</p>
            )}
          </div>
        </div>

        <div className="glass rounded-2xl p-6 border border-slate-200 dark:border-slate-800">
          <h3 className="text-lg font-bold dark:text-white mb-1 flex items-center gap-2">
            <FileDiff className="w-5 h-5 text-purple-500" /> Grading Queue
          </h3>
          <p className="text-xs text-slate-400 mb-4">Pending evaluation assignments</p>
          <div className="space-y-3">
            {gradingBacklog.map((g: any, i: number) => (
              <div key={i} className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl flex items-center justify-between">
                <div>
                  <p className="text-sm font-bold dark:text-white">{g.exam}</p>
                  <p className="text-xs text-slate-500 mt-1">{g.scripts} scripts • Due: {g.deadline}</p>
                </div>
                <div className="flex items-center gap-2">
                  <button className="bg-purple-600 hover:bg-purple-500 text-white text-xs px-3 py-1.5 rounded-lg font-medium transition-all">
                    Start Grading
                  </button>
                </div>
              </div>
            ))}
            {gradingBacklog.length === 0 && (
              <p className="text-center py-4 text-slate-400 italic">No scripts pending.</p>
            )}
          </div>
        </div>
      </div>

      {/* Performance Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 glass rounded-2xl p-6 border border-slate-200 dark:border-slate-800">
          <h3 className="text-lg font-bold dark:text-white mb-1">Class Performance</h3>
          <p className="text-xs text-slate-400 mb-4">Attendance vs Marks comparison by subject</p>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={classPerformance}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="subject" tick={{ fontSize: 12 }} stroke="#94a3b8" />
              <YAxis tick={{ fontSize: 12 }} stroke="#94a3b8" domain={[0, 100]} />
              <Tooltip contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0' }} />
              <Legend />
              <Bar dataKey="avgAttendance" fill="#6366f1" radius={[6, 6, 0, 0]} name="Avg Attendance %" />
              <Bar dataKey="avgMarks" fill="#8b5cf6" radius={[6, 6, 0, 0]} name="Avg Marks" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="glass rounded-2xl p-6 border border-slate-200 dark:border-slate-800">
          <h3 className="text-lg font-bold dark:text-white mb-1">Grade Distribution</h3>
          <p className="text-xs text-slate-400 mb-4">CS301 Mid-Term results</p>
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie data={gradingDistribution} cx="50%" cy="50%" innerRadius={50} outerRadius={85} paddingAngle={3} dataKey="count">
                {gradingDistribution.map((entry: any, idx: number) => (
                  <Cell key={idx} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip contentStyle={{ borderRadius: '12px' }} />
            </PieChart>
          </ResponsiveContainer>
          <div className="flex flex-wrap gap-2 mt-2">
            {gradingDistribution.map((d: any) => (
              <div key={d.grade} className="flex items-center gap-1.5 text-xs text-slate-500">
                <div className="w-2.5 h-2.5 rounded-full" style={{ background: d.color }} /> {d.grade}: {d.count}
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  );
};

// ——— Sub-pages ———
const MyClassesPage = () => {
  const subjects = [
    { code: 'CS301', name: 'Design & Analysis of Algorithms', batch: 'CS-2023', students: 62, schedule: 'Mon/Wed/Fri 09:00-10:00' },
    { code: 'CS302', name: 'Database Management Systems', batch: 'CS-2023', students: 58, schedule: 'Tue/Thu 11:30-12:30, Thu 09:00-11:00 (Lab)' },
    { code: 'CS101', name: 'Introduction to Programming', batch: 'CS-2025', students: 45, schedule: 'Mon 14:00-16:00 (Lab)' },
  ];

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold dark:text-white">My Classes</h2>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <StatCard label="Subjects Assigned" value={String(subjects.length)} color="text-brand-500" />
        <StatCard label="Total Students" value={String(subjects.reduce((s, c) => s + c.students, 0))} />
        <StatCard label="Weekly Hours" value="14" />
      </div>
      {subjects.map(s => (
        <div key={s.code} className="glass rounded-2xl p-6 border border-slate-200 dark:border-slate-800">
          <div className="flex justify-between items-start">
            <div>
              <span className="text-xs font-bold text-brand-500 bg-brand-50 dark:bg-brand-900/20 px-2.5 py-1 rounded-full">{s.code}</span>
              <h3 className="font-bold dark:text-white mt-2 text-lg">{s.name}</h3>
              <p className="text-sm text-slate-500 mt-1">Batch: {s.batch} • {s.students} students</p>
              <p className="text-xs text-slate-400 mt-1">{s.schedule}</p>
            </div>
            <div className="flex gap-2">
              <button className="bg-brand-600 hover:bg-brand-500 text-white text-sm px-4 py-2 rounded-lg font-medium transition-all">
                Mark Attendance
              </button>
              <button className="glass text-sm px-4 py-2 rounded-lg font-medium dark:text-white">
                View Students
              </button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

const FacultyExamPage = () => (
  <div className="space-y-6">
    <h2 className="text-2xl font-bold dark:text-white">Exam Grading</h2>
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      <StatCard label="Scripts Pending" value="165" color="text-amber-500" />
      <StatCard label="Scripts Graded" value="342" color="text-emerald-500" />
      <StatCard label="Moderation Requests" value="3" color="text-purple-500" />
    </div>
    <div className="glass rounded-2xl p-6 border border-slate-200 dark:border-slate-800">
      <h3 className="font-bold dark:text-white mb-4">Anonymous Evaluation Queue</h3>
      <p className="text-xs text-slate-400 mb-4">Scripts are anonymized — student identities are masked during evaluation</p>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-200 dark:border-slate-700">
              <th className="text-left py-3 px-4 font-semibold text-slate-500">Script ID</th>
              <th className="text-left py-3 px-4 font-semibold text-slate-500">Exam</th>
              <th className="text-left py-3 px-4 font-semibold text-slate-500">Max Marks</th>
              <th className="text-left py-3 px-4 font-semibold text-slate-500">Status</th>
              <th className="text-left py-3 px-4 font-semibold text-slate-500">Action</th>
            </tr>
          </thead>
          <tbody>
            {[
              { scriptId: 'SCR-A7B3C1', exam: 'CS301 Mid-Term', max: 100, status: 'ALLOCATED' },
              { scriptId: 'SCR-D4E5F2', exam: 'CS301 Mid-Term', max: 100, status: 'ALLOCATED' },
              { scriptId: 'SCR-G8H9I3', exam: 'CS302 Quiz 3', max: 50, status: 'EVALUATED' },
            ].map(s => (
              <tr key={s.scriptId} className="border-b border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50">
                <td className="py-3 px-4 font-mono text-xs font-bold text-brand-500">{s.scriptId}</td>
                <td className="py-3 px-4 font-medium dark:text-white">{s.exam}</td>
                <td className="py-3 px-4 text-slate-500">{s.max}</td>
                <td className="py-3 px-4">
                  <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${
                    s.status === 'ALLOCATED' ? 'bg-blue-100 text-blue-600' :
                    s.status === 'EVALUATED' ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-100 text-slate-500'
                  }`}>{s.status}</span>
                </td>
                <td className="py-3 px-4">
                  <button className={`text-xs font-medium px-3 py-1.5 rounded-lg transition-all ${
                    s.status === 'ALLOCATED' ? 'bg-brand-600 hover:bg-brand-500 text-white' : 'bg-slate-200 text-slate-500 cursor-not-allowed'
                  }`} disabled={s.status !== 'ALLOCATED'}>
                    {s.status === 'ALLOCATED' ? 'Evaluate' : 'Completed'}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  </div>
);

const FacultySettingsPage = () => (
  <div className="space-y-6">
    <h2 className="text-2xl font-bold dark:text-white">Faculty Settings</h2>
    <div className="glass rounded-2xl p-6 border border-slate-200 dark:border-slate-800 max-w-lg">
      <h3 className="font-bold dark:text-white mb-4">Profile Details</h3>
      <div className="space-y-3">
        {[
          { label: 'Department', value: 'Computer Science' },
          { label: 'Designation', value: 'Associate Professor' },
          { label: 'Employee ID', value: 'FAC-CS-0042' },
          { label: 'Specialization', value: 'Algorithms & Data Science' },
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
    <p className="text-xs font-medium text-slate-400 mt-1">{subtitle}</p>
  </div>
);

const StatCard = ({ label, value, color = 'text-slate-700 dark:text-white' }: any) => (
  <div className="glass p-5 rounded-2xl border border-slate-200 dark:border-slate-800">
    <p className="text-sm font-medium text-slate-500 dark:text-slate-400 mb-1">{label}</p>
    <h4 className={`text-2xl font-extrabold ${color}`}>{value}</h4>
  </div>
);

const FacultyDashboard = () => {
  return (
    <div className="flex-1 p-8 overflow-y-auto animate-fade-in">
      <Routes>
        <Route index element={<DashboardOverview />} />
        <Route path="classes" element={<MyClassesPage />} />
        <Route path="exams" element={<FacultyExamPage />} />
        <Route path="settings" element={<FacultySettingsPage />} />
      </Routes>
    </div>
  );
};

export default FacultyDashboard;
