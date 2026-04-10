import React, { useState, useEffect } from 'react';
import { apiClient } from '../../api/client';
import { toast } from 'sonner';
import { PenTool, Save, RefreshCw, Users, CheckCircle2, AlertTriangle } from 'lucide-react';

interface StudentMark {
  studentId: string;
  rollNumber: string;
  name: string;
  mid1: number | '';
  mid2: number | '';
  internal: number | '';
}

const FacultyMarksEntry = () => {
  const [subjects, setSubjects] = useState<any[]>([]);
  const [sessions, setSessions] = useState<any[]>([]);
  const [selectedSubject, setSelectedSubject] = useState('');
  const [selectedSession, setSelectedSession] = useState('');
  const [students, setStudents] = useState<StudentMark[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const init = async () => {
      try {
        const [subRes, sesRes] = await Promise.all([
          apiClient.get('/attendance/faculty-subjects'),
          apiClient.get('/exams/sessions'),
        ]);
        setSubjects(subRes.data.data || []);
        setSessions(sesRes.data.data || []);
      } catch {
        // Noop
      }
    };
    init();
  }, []);

  const loadStudents = async () => {
    if (!selectedSubject || !selectedSession) return;
    setLoading(true);
    try {
      const res = await apiClient.get(`/attendance/students?subjectId=${selectedSubject}`);
      setStudents((res.data.data || []).map((s: any) => ({
        studentId: s.id,
        rollNumber: s.rollNumber,
        name: s.name,
        mid1: '',
        mid2: '',
        internal: '',
      })));
    } catch {
      toast.error('Failed to load students');
    }
    setLoading(false);
  };

  const updateMark = (studentId: string, field: 'mid1' | 'mid2' | 'internal', value: string) => {
    const num = value === '' ? '' : Math.min(Math.max(0, parseInt(value) || 0), field === 'internal' ? 40 : 100);
    setStudents(prev => prev.map(s => s.studentId === studentId ? { ...s, [field]: num } : s));
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      const marks = students
        .filter(s => s.mid1 !== '' || s.mid2 !== '' || s.internal !== '')
        .map(s => ({
          studentId: s.studentId,
          subjectId: selectedSubject,
          marksObtained: typeof s.internal === 'number' ? s.internal : 0,
          maxMarks: 40,
        }));

      await apiClient.post(`/exams/sessions/${selectedSession}/marks`, { marks });
      toast.success(`Marks saved for ${marks.length} students`);
    } catch (err: any) {
      toast.error(err?.response?.data?.error || 'Failed to save marks');
    }
    setSubmitting(false);
  };

  const filledCount = students.filter(s => s.internal !== '').length;

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Header */}
      <div className="p-6 bg-slate-900 border border-slate-800 rounded-2xl">
        <h2 className="text-2xl font-bold bg-gradient-to-r from-white to-slate-400 bg-clip-text text-transparent flex items-center gap-3">
          <PenTool className="w-6 h-6 text-violet-400" /> Marks Entry
        </h2>
        <p className="text-slate-400 mt-1">Enter internal marks for your assigned subjects.</p>
      </div>

      {/* Controls */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Exam Session</label>
          <select
            value={selectedSession}
            onChange={e => setSelectedSession(e.target.value)}
            className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-violet-500 focus:border-transparent outline-none transition-all"
          >
            <option value="">Select Session</option>
            {sessions.map((s: any) => (
              <option key={s.id} value={s.id}>{s.name} — Sem {s.semester}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Subject</label>
          <select
            value={selectedSubject}
            onChange={e => setSelectedSubject(e.target.value)}
            className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-violet-500 focus:border-transparent outline-none transition-all"
          >
            <option value="">Select Subject</option>
            {subjects.map((s: any) => (
              <option key={s.id} value={s.id}>{s.code} — {s.name}</option>
            ))}
          </select>
        </div>

        <div className="flex items-end">
          <button
            onClick={loadStudents}
            disabled={!selectedSubject || !selectedSession || loading}
            className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-violet-600 hover:bg-violet-500 disabled:bg-slate-700 disabled:text-slate-500 text-white rounded-xl font-semibold transition-all shadow-lg shadow-violet-500/20"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /> Load Students
          </button>
        </div>
      </div>

      {/* Marks Table */}
      {students.length > 0 && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
          <div className="p-4 border-b border-slate-800 flex items-center justify-between">
            <span className="text-sm text-slate-400 flex items-center gap-2">
              <Users className="w-4 h-4" /> {students.length} students
            </span>
            <span className={`text-sm font-semibold flex items-center gap-1 ${filledCount === students.length ? 'text-emerald-400' : 'text-amber-400'}`}>
              {filledCount === students.length ? <CheckCircle2 className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
              {filledCount}/{students.length} filled
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-slate-950/50">
                  <th className="text-left px-5 py-3 text-xs font-semibold uppercase tracking-wider text-slate-400">#</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold uppercase tracking-wider text-slate-400">Roll No</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold uppercase tracking-wider text-slate-400">Name</th>
                  <th className="text-center px-5 py-3 text-xs font-semibold uppercase tracking-wider text-slate-400">Mid 1 (100)</th>
                  <th className="text-center px-5 py-3 text-xs font-semibold uppercase tracking-wider text-slate-400">Mid 2 (100)</th>
                  <th className="text-center px-5 py-3 text-xs font-semibold uppercase tracking-wider text-slate-400">Internal (40)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {students.map((student, i) => (
                  <tr key={student.studentId} className="hover:bg-slate-800/30 transition-colors">
                    <td className="px-5 py-2 text-sm text-slate-500">{i + 1}</td>
                    <td className="px-5 py-2 text-sm font-mono text-slate-300">{student.rollNumber}</td>
                    <td className="px-5 py-2 text-sm font-medium">{student.name}</td>
                    {(['mid1', 'mid2', 'internal'] as const).map(field => (
                      <td key={field} className="px-5 py-2 text-center">
                        <input
                          type="number"
                          min={0}
                          max={field === 'internal' ? 40 : 100}
                          value={student[field]}
                          onChange={e => updateMark(student.studentId, field, e.target.value)}
                          className="w-20 bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-center focus:ring-2 focus:ring-violet-500 focus:border-transparent outline-none transition-all"
                          placeholder="—"
                        />
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="p-4 border-t border-slate-800 flex justify-end">
            <button
              onClick={handleSubmit}
              disabled={submitting || filledCount === 0}
              className="flex items-center gap-2 px-6 py-3 bg-violet-600 hover:bg-violet-500 disabled:bg-slate-700 text-white rounded-xl font-semibold transition-all shadow-lg shadow-violet-500/20 hover:shadow-violet-500/40"
            >
              <Save className="w-4 h-4" /> {submitting ? 'Saving...' : 'Save Marks'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default FacultyMarksEntry;
