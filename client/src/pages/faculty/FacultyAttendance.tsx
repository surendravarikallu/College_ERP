import React, { useState, useEffect } from 'react';
import { apiClient } from '../../api/client';
import { toast } from 'sonner';
import { ClipboardList, Check, X, UserCheck, Users, Save, RefreshCw } from 'lucide-react';

interface SubjectOption {
  id: string;
  name: string;
  code: string;
}

interface StudentRow {
  id: string;
  rollNumber: string;
  name: string;
  status: 'PRESENT' | 'ABSENT' | 'OD';
}

const FacultyAttendance = () => {
  const [subjects, setSubjects] = useState<SubjectOption[]>([]);
  const [selectedSubject, setSelectedSubject] = useState('');
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [students, setStudents] = useState<StudentRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Fetch mapped subjects for the logged-in faculty
  useEffect(() => {
    const fetchSubjects = async () => {
      try {
        const res = await apiClient.get('/admin/my-subjects');
        setSubjects(res.data.data || []);
      } catch {
        // Fallback: show empty
      }
    };
    fetchSubjects();
  }, []);

  // Fetch students when subject is selected
  const loadStudents = async () => {
    if (!selectedSubject) return;
    setLoading(true);
    try {
      const res = await apiClient.get(`/admin/students-by-subject/${selectedSubject}`);
      setStudents((res.data.data || []).map((s: any) => ({
        id: s.id,
        rollNumber: s.rollNumber,
        name: s.name,
        status: 'PRESENT' as const,
      })));
    } catch {
      toast.error('Failed to load students');
    }
    setLoading(false);
  };

  const toggleStatus = (studentId: string, status: 'PRESENT' | 'ABSENT' | 'OD') => {
    setStudents(prev => prev.map(s => s.id === studentId ? { ...s, status } : s));
  };

  const markAll = (status: 'PRESENT' | 'ABSENT') => {
    setStudents(prev => prev.map(s => ({ ...s, status })));
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      await apiClient.post('/attendance/mark', {
        subjectId: selectedSubject,
        date: selectedDate,
        records: students.map(s => ({ studentId: s.id, status: s.status })),
      });
      toast.success(`Attendance marked for ${students.length} students`);
    } catch (err: any) {
      toast.error(err?.response?.data?.error || 'Failed to save attendance');
    }
    setSubmitting(false);
  };

  const presentCount = students.filter(s => s.status === 'PRESENT' || s.status === 'OD').length;
  const totalCount = students.length;

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Header */}
      <div className="p-6 bg-slate-900 border border-slate-800 rounded-2xl">
        <h2 className="text-2xl font-bold bg-gradient-to-r from-white to-slate-400 bg-clip-text text-transparent flex items-center gap-3">
          <ClipboardList className="w-6 h-6 text-indigo-400" /> Mark Attendance
        </h2>
        <p className="text-slate-400 mt-1">Select a subject and date to begin marking attendance.</p>
      </div>

      {/* Controls */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Subject</label>
          <select
            value={selectedSubject}
            onChange={e => setSelectedSubject(e.target.value)}
            className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all"
          >
            <option value="">Select Subject</option>
            {subjects.map(s => (
              <option key={s.id} value={s.id}>{s.code} — {s.name}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Date</label>
          <input
            type="date"
            value={selectedDate}
            onChange={e => setSelectedDate(e.target.value)}
            className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all"
          />
        </div>

        <div className="flex items-end">
          <button
            onClick={loadStudents}
            disabled={!selectedSubject || loading}
            className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-700 disabled:text-slate-500 text-white rounded-xl font-semibold transition-all shadow-lg shadow-indigo-500/20"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /> Load Students
          </button>
        </div>
      </div>

      {/* Student List */}
      {students.length > 0 && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
          {/* Toolbar */}
          <div className="p-4 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-4">
              <span className="text-sm text-slate-400">
                <Users className="w-4 h-4 inline mr-1" />
                {totalCount} students
              </span>
              <span className="text-sm text-emerald-400 font-semibold">
                <UserCheck className="w-4 h-4 inline mr-1" />
                {presentCount}/{totalCount} present ({totalCount > 0 ? Math.round((presentCount / totalCount) * 100) : 0}%)
              </span>
            </div>
            <div className="flex gap-2">
              <button onClick={() => markAll('PRESENT')} className="px-3 py-1.5 bg-emerald-600/20 text-emerald-400 border border-emerald-600/30 rounded-lg text-xs font-semibold hover:bg-emerald-600/30 transition-all">
                All Present
              </button>
              <button onClick={() => markAll('ABSENT')} className="px-3 py-1.5 bg-rose-600/20 text-rose-400 border border-rose-600/30 rounded-lg text-xs font-semibold hover:bg-rose-600/30 transition-all">
                All Absent
              </button>
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-slate-950/50">
                  <th className="text-left px-6 py-3 text-xs font-semibold uppercase tracking-wider text-slate-400">#</th>
                  <th className="text-left px-6 py-3 text-xs font-semibold uppercase tracking-wider text-slate-400">Roll No</th>
                  <th className="text-left px-6 py-3 text-xs font-semibold uppercase tracking-wider text-slate-400">Name</th>
                  <th className="text-center px-6 py-3 text-xs font-semibold uppercase tracking-wider text-slate-400">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {students.map((student, i) => (
                  <tr key={student.id} className="hover:bg-slate-800/30 transition-colors">
                    <td className="px-6 py-3 text-sm text-slate-500">{i + 1}</td>
                    <td className="px-6 py-3 text-sm font-mono text-slate-300">{student.rollNumber}</td>
                    <td className="px-6 py-3 text-sm font-medium">{student.name}</td>
                    <td className="px-6 py-3">
                      <div className="flex items-center justify-center gap-2">
                        {(['PRESENT', 'ABSENT', 'OD'] as const).map(status => (
                          <button
                            key={status}
                            onClick={() => toggleStatus(student.id, status)}
                            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all border ${
                              student.status === status
                                ? status === 'PRESENT' ? 'bg-emerald-600 border-emerald-500 text-white shadow-lg shadow-emerald-500/30'
                                  : status === 'ABSENT' ? 'bg-rose-600 border-rose-500 text-white shadow-lg shadow-rose-500/30'
                                    : 'bg-blue-600 border-blue-500 text-white shadow-lg shadow-blue-500/30'
                                : 'bg-slate-800 border-slate-700 text-slate-400 hover:border-slate-600'
                            }`}
                          >
                            {status === 'PRESENT' ? <Check className="w-3 h-3 inline mr-1" /> :
                             status === 'ABSENT' ? <X className="w-3 h-3 inline mr-1" /> : null}
                            {status}
                          </button>
                        ))}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Submit */}
          <div className="p-4 border-t border-slate-800 flex justify-end">
            <button
              onClick={handleSubmit}
              disabled={submitting}
              className="flex items-center gap-2 px-6 py-3 bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-700 text-white rounded-xl font-semibold transition-all shadow-lg shadow-indigo-500/20 hover:shadow-indigo-500/40"
            >
              <Save className="w-4 h-4" /> {submitting ? 'Saving...' : 'Submit Attendance'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default FacultyAttendance;
