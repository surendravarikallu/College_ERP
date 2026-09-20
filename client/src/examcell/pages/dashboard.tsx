import React, { useState } from "react";
import { Link } from "react-router-dom";
import { useAnalytics } from "../hooks/use-reports";
import { 
  Users, FileWarning, TrendingUp, Award, Loader2, ArrowLeft,
  FileText, PenTool, ListChecks, Upload, GraduationCap, Stamp, Bot, UserCog,
  BarChart3, PieChart as PieIcon, Activity
} from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend
} from "recharts";

const navItems = [
  { label: 'Students', path: '/admin/examcell/students', icon: Users, desc: 'Student database' },
  { label: 'Reports', path: '/admin/examcell/reports', icon: FileText, desc: 'Transcripts & Results' },
  { label: 'Mid Marks', path: '/admin/examcell/mid-marks', icon: PenTool, desc: 'Internal assessments' },
  { label: 'Lab Marks', path: '/admin/examcell/lab-marks', icon: ListChecks, desc: 'Practical marks' },
  { label: 'Upload', path: '/admin/examcell/upload', icon: Upload, desc: 'Bulk data import' },
  { label: 'Faculty', path: '/admin/examcell/faculty', icon: GraduationCap, desc: 'Faculty mapping' },
  { label: 'Promotions', path: '/admin/examcell/promotions', icon: Stamp, desc: 'Academic status' },
  { label: 'Autonomous', path: '/admin/examcell/autonomous', icon: Bot, desc: 'AI Tools' },
  { label: 'Settings', path: '/admin/examcell/settings', icon: UserCog, desc: 'EC config' },
];

export default function Dashboard() {
  const { data: analytics, isLoading } = useAnalytics();
  const [selectedBranch, setSelectedBranch] = useState<string | null>(null);

  if (isLoading) {
    return (
      <div className="h-[60vh] flex flex-col items-center justify-center text-slate-400">
        <Loader2 className="w-8 h-8 animate-spin text-[#004b93] mb-4" />
        <p className="font-bold text-xs uppercase tracking-widest">Synchronizing Exam Metrics...</p>
      </div>
    );
  }

  const stats = analytics || {
    passPercentage: 78.5,
    totalStudents: 1240,
    branchWiseBacklogs: [
      { name: "CSE", value: 105, batches: [{ name: "2021-25", value: 40 }, { name: "2022-26", value: 65 }] },
      { name: "ECE", value: 47, batches: [{ name: "2023-27", value: 47 }] }
    ]
  };

  const passFailData = [
    { name: "Passed", value: Number(stats.passPercentage) ?? 0 },
    { name: "Failed", value: 100 - (Number(stats.passPercentage) ?? 0) },
  ];

  const COLORS = ['#059669', '#dc2626']; // Emerald-600, Rose-600

  return (
    <div className="bg-white min-h-screen text-slate-800 p-2 space-y-4">
      {/* 1. Module Title & Context */}
      <div className="border border-slate-300 rounded shadow-sm overflow-hidden">
        <div className="erp-header-blue px-3 py-1.5 text-[14px] flex justify-between items-center">
          <div className="flex items-center gap-2">
             <Activity className="w-4 h-4" />
             <span className="font-bold uppercase tracking-tight">Examination Cell Performance Dashboard</span>
          </div>
          <button onClick={() => window.history.back()} className="erp-btn-rect bg-white/20 hover:bg-white/30 !text-white flex items-center gap-1 py-0.5 px-2 font-bold">
            <ArrowLeft className="w-3 h-3" /> Back
          </button>
        </div>
        <div className="erp-strip-green px-3 py-1.5 text-[11px] font-bold text-emerald-800 flex justify-between">
          <span>Comprehensive audit of pass percentages, backlog distribution, and academic progress.</span>
          <span>Last Synchronized: {new Date().toLocaleTimeString()}</span>
        </div>
      </div>

      {/* 2. Key Performance Indicators (Dense Strip) */}
      <div className="grid grid-cols-3 gap-0 border border-slate-200 rounded divide-x divide-slate-200 shadow-sm overflow-hidden bg-slate-50/30">
        <div className="p-3 flex flex-col items-center">
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Overall Pass Rate</span>
          <div className="flex items-center gap-2 mt-1">
            <Award className="w-4 h-4 text-[#004b93]" />
            <span className="text-2xl font-black text-[#004b93]">{Number(stats.passPercentage)?.toFixed(1)}%</span>
          </div>
        </div>
        <div className="p-3 flex flex-col items-center">
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Students with Backlogs</span>
          <div className="flex items-center gap-2 mt-1">
            <FileWarning className="w-4 h-4 text-rose-600" />
            <span className="text-2xl font-black text-rose-600">
              {(stats.branchWiseBacklogs || []).reduce((acc: number, curr: any) => acc + (curr?.value || 0), 0)}
            </span>
          </div>
        </div>
        <div className="p-3 flex flex-col items-center">
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Active Roll Numbers</span>
          <div className="flex items-center gap-2 mt-1">
            <Users className="w-4 h-4 text-emerald-600" />
            <span className="text-2xl font-black text-emerald-600">{stats.totalStudents ?? 0}</span>
          </div>
        </div>
      </div>

      {/* 3. Navigation Matrix */}
      <div className="grid grid-cols-3 sm:grid-cols-5 lg:grid-cols-9 gap-1">
        {navItems.map((item, i) => (
          <Link key={i} to={item.path} className="flex flex-col items-center justify-center p-2 border border-slate-200 bg-slate-50 hover:bg-blue-50 hover:border-blue-300 transition-all rounded shadow-sm group">
            <item.icon className="w-5 h-5 text-slate-400 group-hover:text-[#004b93] transition-colors" />
            <span className="text-[10px] font-bold text-slate-600 group-hover:text-[#004b93] mt-1 text-center">{item.label}</span>
          </Link>
        ))}
      </div>

      {/* 4. Analytics Data Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Backlog Distribution */}
        <div className="border border-slate-300 rounded shadow-sm overflow-hidden flex flex-col">
          <div className="erp-header-blue px-3 py-1 text-[12px] flex justify-between items-center">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4" />
              <span>{selectedBranch ? `Branch Audit: ${selectedBranch}` : 'Branch-wise Backlog Trends'}</span>
            </div>
            {selectedBranch && (
              <button onClick={() => setSelectedBranch(null)} className="text-[10px] underline hover:no-underline">Reset View</button>
            )}
          </div>
          <div className="p-4 bg-white h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={selectedBranch
                  ? (stats.branchWiseBacklogs || []).find((b: { name: string }) => b.name === selectedBranch)?.batches || []
                  : (stats.branchWiseBacklogs || [])}
                margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                <XAxis dataKey="name" tick={{ fill: '#64748b', fontSize: 10, fontWeight: 'bold' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: '#64748b', fontSize: 10 }} axisLine={false} tickLine={false} />
                <Tooltip cursor={{ fill: '#f8fafc' }} />
                <Bar
                  dataKey="value"
                  fill="#004b93"
                  radius={[2, 2, 0, 0]}
                  barSize={selectedBranch ? 60 : 40}
                  onClick={(data: any) => !selectedBranch && data?.name && setSelectedBranch(data.name)}
                  className={!selectedBranch ? "cursor-pointer" : ""}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Results Pie Chart */}
        <div className="border border-slate-300 rounded shadow-sm overflow-hidden flex flex-col">
          <div className="erp-header-blue px-3 py-1 text-[12px] flex items-center gap-2">
            <PieIcon className="w-4 h-4" />
            <span>Consolidated Result Distribution</span>
          </div>
          <div className="p-4 bg-white h-[300px] flex flex-col items-center justify-center relative">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={passFailData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={90}
                  paddingAngle={5}
                  dataKey="value"
                  stroke="none"
                >
                  {passFailData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend verticalAlign="bottom" height={36} iconType="circle" wrapperStyle={{ fontSize: '11px', fontWeight: 'bold' }} />
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none mt-[-20px]">
              <div className="text-center">
                <span className="block text-2xl font-black text-slate-800">{Number(stats.passPercentage ?? 0).toFixed(0)}%</span>
                <span className="block text-[10px] font-bold text-emerald-600 uppercase tracking-tighter">Passed</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
