import React from 'react';
import { GraduationCap, Award, TrendingUp } from 'lucide-react';

const StudentResults = () => {
  // Results will be populated from the exam cell endpoints
  const semesters = [
    { name: 'Semester 1', sgpa: 8.2, credits: 22, status: 'Published' },
    { name: 'Semester 2', sgpa: 7.8, credits: 24, status: 'Published' },
    { name: 'Semester 3', sgpa: 8.5, credits: 23, status: 'Published' },
    { name: 'Semester 4', sgpa: 0, credits: 0, status: 'Pending' },
  ];

  const cgpa = semesters.filter(s => s.sgpa > 0).reduce((a, b) => a + b.sgpa, 0) / semesters.filter(s => s.sgpa > 0).length || 0;

  return (
    <div className="space-y-6">
      {/* CGPA Card */}
      <div className="bg-gradient-to-r from-indigo-600/20 to-purple-600/20 border border-indigo-500/20 rounded-xl p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-indigo-300 uppercase tracking-wide">Cumulative CGPA</p>
            <p className="text-5xl font-bold mt-2">{cgpa.toFixed(2)}</p>
            <p className="text-sm text-slate-400 mt-1">Out of 10.00</p>
          </div>
          <div className="p-4 bg-indigo-500/20 rounded-2xl">
            <Award className="w-10 h-10 text-indigo-400" />
          </div>
        </div>
      </div>

      {/* Semester Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {semesters.map((sem, i) => (
          <div key={i} className="bg-slate-900 border border-slate-800 rounded-xl p-5 hover:border-slate-700 transition-colors">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold flex items-center gap-2">
                <GraduationCap className="w-4 h-4 text-indigo-400" /> {sem.name}
              </h3>
              <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${sem.status === 'Published' ? 'bg-emerald-500/15 text-emerald-400' : 'bg-amber-500/15 text-amber-400'}`}>
                {sem.status}
              </span>
            </div>
            {sem.sgpa > 0 ? (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-slate-500 uppercase tracking-wide">SGPA</p>
                  <p className="text-2xl font-bold mt-1">{sem.sgpa.toFixed(1)}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500 uppercase tracking-wide">Credits</p>
                  <p className="text-2xl font-bold mt-1">{sem.credits}</p>
                </div>
              </div>
            ) : (
              <p className="text-sm text-slate-500">Results not yet published.</p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default StudentResults;
