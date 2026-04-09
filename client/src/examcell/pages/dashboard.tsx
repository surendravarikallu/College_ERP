import React, { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { useAnalytics } from "../hooks/use-reports";
import { 
  Users, FileWarning, TrendingUp, Award, Loader2, ArrowLeft,
  FileText, PenTool, ListChecks, Upload, GraduationCap, Stamp, Bot, UserCog,
  LayoutDashboard, BookOpen, Search
} from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend
} from "recharts";
import { motion } from "framer-motion";

const navItems = [
  { label: 'Students', path: '/admin/examcell/students', icon: Users, color: 'text-blue-500', bg: 'bg-blue-500/10', border: 'border-blue-500/20', desc: 'Direct student profiles' },
  { label: 'Reports', path: '/admin/examcell/reports', icon: FileText, color: 'text-indigo-500', bg: 'bg-indigo-500/10', border: 'border-indigo-500/20', desc: 'Generate transcripts' },
  { label: 'Mid Marks', path: '/admin/examcell/mid-marks', icon: PenTool, color: 'text-emerald-500', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20', desc: 'Enter internal marks' },
  { label: 'Lab Marks', path: '/admin/examcell/lab-marks', icon: ListChecks, color: 'text-teal-500', bg: 'bg-teal-500/10', border: 'border-teal-500/20', desc: 'Practical evaluations' },
  { label: 'Upload', path: '/admin/examcell/upload', icon: Upload, color: 'text-cyan-500', bg: 'bg-cyan-500/10', border: 'border-cyan-500/20', desc: 'Import bulk data' },
  { label: 'Faculty', path: '/admin/examcell/faculty', icon: GraduationCap, color: 'text-violet-500', bg: 'bg-violet-500/10', border: 'border-violet-500/20', desc: 'Map subject faculty' },
  { label: 'Promotions', path: '/admin/examcell/promotions', icon: Stamp, color: 'text-purple-500', bg: 'bg-purple-500/10', border: 'border-purple-500/20', desc: 'Academic status' },
  { label: 'Autonomous', path: '/admin/examcell/autonomous', icon: Bot, color: 'text-fuchsia-500', bg: 'bg-fuchsia-500/10', border: 'border-fuchsia-500/20', desc: 'AI-assisted tools' },
  { label: 'Settings', path: '/admin/examcell/settings', icon: UserCog, color: 'text-rose-500', bg: 'bg-rose-500/10', border: 'border-rose-500/20', desc: 'System preferences' },
];

export default function Dashboard() {
  const { data: analytics, isLoading } = useAnalytics();

  const [selectedBranch, setSelectedBranch] = useState<string | null>(null);

  if (isLoading) {
    return (
      <div className="h-[60vh] flex flex-col items-center justify-center text-muted-foreground">
        <Loader2 className="w-10 h-10 animate-spin text-primary mb-4" />
        <p>Loading analytics data...</p>
      </div>
    );
  }

  // Mock data if backend isn't seeded yet
  const stats = analytics || {
    passPercentage: 78.5,
    branchWiseBacklogs: [
      { name: "CSE", value: 105, batches: [{ name: "2021-2025", value: 40 }, { name: "2022-2026", value: 65 }] },
      { name: "ECE", value: 47, batches: [{ name: "2023-2027", value: 47 }] }
    ],
    mostFailedSubjects: [
      { name: "Mathematics-II", count: 85 },
      { name: "Data Structures", count: 62 },
      { name: "Engineering Physics", count: 54 },
      { name: "Circuits & Systems", count: 41 },
    ]
  };

  const passFailData = [
    { name: "Passed", value: Number(stats.passPercentage) ?? 0 },
    { name: "Failed", value: 100 - (Number(stats.passPercentage) ?? 0) },
  ];

  const COLORS = ['#10b981', '#ef4444']; // Emerald Green, Crimson Red

  return (
    <div className="space-y-8">
      {/* Institutional Header Banner */}
      <div className="relative overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
        <img 
          src="/Screenshot 2025-07-25 113411_1753423944040.webp" 
          alt="College Header" 
          className="w-full h-auto object-contain max-h-32"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-background/20 to-transparent pointer-events-none" />
      </div>

      <div className="flex items-start gap-3">
        <button onClick={() => window.history.back()} className="mt-1 p-2 bg-muted hover:bg-accent rounded-full transition-colors text-muted-foreground hover:text-foreground border border-border">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-3xl font-display font-bold text-foreground">Dashboard Overview</h1>
          <p className="text-muted-foreground mt-1">Real-time statistics for current academic sessions.</p>
        </div>
      </div>

      {/* Navigation Hub */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
        {navItems.map((item, i) => (
          <Link key={i} to={item.path}>
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className="p-4 rounded-2xl border border-border bg-card hover:bg-accent/50 hover:shadow-lg hover:shadow-primary/5 transition-all group flex items-start gap-4 h-full"
            >
              <div className={`p-3 rounded-xl ${item.bg} ${item.color} group-hover:scale-110 transition-transform`}>
                <item.icon className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-bold text-foreground group-hover:text-primary transition-colors">{item.label}</h4>
                <p className="text-[11px] text-muted-foreground leading-relaxed mt-0.5">{item.desc}</p>
              </div>
            </motion.div>
          </Link>
        ))}
      </div>

      <div className="flex items-center justify-between mb-2">
        <h2 className="text-xl font-display font-bold text-foreground">Quick Statistics</h2>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {[
          { title: "Overall Pass Rate", value: `${Number(stats.passPercentage)?.toFixed(1) || '0'}%`, icon: Award, color: "text-white", bg: "bg-gradient-to-br from-emerald-400 to-emerald-600", shadow: "shadow-emerald-500/20" },
          { title: "Students with Backlogs", value: (stats.branchWiseBacklogs || stats.batchWiseBacklogs || []).reduce((acc: number, curr: any) => acc + (curr?.value || 0), 0).toString(), icon: FileWarning, color: "text-white", bg: "bg-gradient-to-br from-rose-400 to-rose-600", shadow: "shadow-rose-500/20" },
          { title: "Active Students", value: (stats.totalStudents ?? 0).toString(), icon: Users, color: "text-white", bg: "bg-gradient-to-br from-indigo-500 to-purple-600", shadow: "shadow-indigo-500/20" },
        ].map((stat, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className={`relative overflow-hidden p-6 rounded-2xl flex items-center gap-6 group hover:translate-y-[-2px] transition-all duration-300 shadow-lg ${stat.shadow} ${stat.bg}`}
          >
            {/* Background Decorative Element */}
            <div className="absolute -right-6 -top-6 w-32 h-32 bg-white/10 rounded-full blur-2xl group-hover:bg-white/20 transition-colors duration-500"></div>

            <div className={`w-14 h-14 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center ${stat.color} group-hover:scale-110 shadow-inner transition-transform duration-300 z-10`}>
              <stat.icon className="w-7 h-7 drop-shadow-sm" />
            </div>
            <div className="z-10 text-white">
              <p className="text-sm font-medium text-white/80 mb-1">{stat.title}</p>
              <h3 className="text-4xl font-display font-bold drop-shadow-sm">{stat.value}</h3>
            </div>

            {/* Batch-wise tooltip for Active Students */}
            {stat.title === "Active Students" && stats.activeStudentsByBatch && (
              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-64 bg-white text-slate-800 rounded-xl shadow-xl border border-slate-200 p-3 opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity duration-200 z-50">
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Batch-wise Active</p>
                <div className="space-y-1 max-h-48 overflow-y-auto">
                  {stats.activeStudentsByBatch.map((b: any) => (
                    <div key={b.name} className="flex justify-between items-center text-sm">
                      <span className="font-medium text-slate-700">{b.name}</span>
                      <span className="font-bold text-indigo-600">{b.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </motion.div>
        ))}
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Branch-wise Backlogs -> Batch-wise Backlogs */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.3 }}
          className="bg-card border border-border p-6 rounded-3xl shadow-xl shadow-primary/5 relative overflow-hidden"
        >
          {/* Subtle gradient accent */}
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-400 to-indigo-500"></div>

          <div className="flex justify-between items-center mb-6">
            <h3 className="text-lg font-display font-semibold text-slate-800 flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-indigo-500" />
              {selectedBranch ? `${selectedBranch} Batches` : "Branch-wise Backlogs"}
            </h3>
            {selectedBranch && (
              <button
                onClick={() => setSelectedBranch(null)}
                className="text-xs font-semibold px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-full transition-colors flex items-center gap-1"
              >
                <ArrowLeft className="w-3 h-3" /> Back
              </button>
            )}
          </div>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={selectedBranch
                  ? (stats.branchWiseBacklogs || []).find((b: { name: string }) => b.name === selectedBranch)?.batches || []
                  : (stats.branchWiseBacklogs || stats.batchWiseBacklogs || [])}
                margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.05)" vertical={false} />
                <XAxis dataKey="name" stroke="rgba(0,0,0,0.4)" tick={{ fill: 'rgba(0,0,0,0.6)', fontSize: 12, fontWeight: 500 }} axisLine={false} tickLine={false} />
                <YAxis stroke="rgba(0,0,0,0.4)" tick={{ fill: 'rgba(0,0,0,0.6)', fontSize: 12 }} axisLine={false} tickLine={false} />
                <Tooltip
                  cursor={{ fill: 'var(--accent)' }}
                  contentStyle={{ backgroundColor: 'var(--card)', borderColor: 'var(--border)', borderRadius: '12px', color: 'var(--foreground)', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)' }}
                  formatter={(value: any) => [value, 'Students']}
                />
                <Bar
                  dataKey="value"
                  fill="url(#colorUv)"
                  radius={[6, 6, 0, 0]}
                  barSize={40}
                  onClick={(data: any) => {
                    // Only drill down if we are currently looking at Branches
                    if (!selectedBranch && data && data.name) {
                      setSelectedBranch(data.name);
                    }
                  }}
                  className={!selectedBranch ? "cursor-pointer hover:opacity-80 transition-opacity" : ""}
                >
                  {/* Define a custom SVG gradient for the bars */}
                </Bar>
                <defs>
                  <linearGradient id="colorUv" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#6366f1" stopOpacity={1} />
                    <stop offset="100%" stopColor="#3b82f6" stopOpacity={0.8} />
                  </linearGradient>
                </defs>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </motion.div>

        {/* Pass vs Fail Ratio */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.4 }}
          className="bg-card border border-border p-6 rounded-3xl shadow-xl shadow-primary/5 relative overflow-hidden flex flex-col"
        >
          {/* Subtle gradient accent */}
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-emerald-400 to-teal-500"></div>

          <h3 className="text-lg font-display font-semibold text-slate-800 mb-2 flex items-center gap-2">
            <Award className="w-5 h-5 text-emerald-500" />
            Overall Results Distribution
          </h3>
          <div className="flex-1 min-h-[300px] w-full relative">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={passFailData}
                  cx="50%"
                  cy="50%"
                  innerRadius={80}
                  outerRadius={110}
                  paddingAngle={5}
                  dataKey="value"
                  stroke="none"
                >
                  {passFailData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{ backgroundColor: '#ffffff', borderColor: '#e2e8f0', borderRadius: '12px', color: '#0f172a', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)' }}
                  formatter={(value: any) => [`${Number(value || 0).toFixed(1)}%`, 'Percentage']}
                />
                <Legend verticalAlign="bottom" height={36} iconType="circle" wrapperStyle={{ color: '#475569', fontWeight: 500 }} />
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none mt-[-20px]">
              <div className="text-center">
                <span className="block text-3xl font-display font-bold text-foreground">{Number(stats.passPercentage ?? 0).toFixed(0)}%</span>
                <span className="block text-xs text-muted-foreground uppercase tracking-widest">Passed</span>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}

