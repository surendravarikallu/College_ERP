import React, { useState, useEffect, useCallback } from 'react';
import { apiClient } from '../../api/client';
import { BookOpen, Plus, Trash2, Building2, GraduationCap, Layers, Users, ChevronDown, ChevronRight, Edit2 } from 'lucide-react';

const AcademicSetup = () => {
  const [departments, setDepartments] = useState<any[]>([]);
  const [courses, setCourses] = useState<any[]>([]);
  const [batches, setBatches] = useState<any[]>([]);
  const [subjects, setSubjects] = useState<any[]>([]);
  const [tab, setTab] = useState<'departments' | 'courses' | 'batches' | 'subjects'>('departments');
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState<any>({});
  const [formError, setFormError] = useState('');

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const [d, c, b, s] = await Promise.all([
        apiClient.get('/academics/departments'), apiClient.get('/academics/courses'),
        apiClient.get('/academics/batches'), apiClient.get('/academics/subjects'),
      ]);
      setDepartments(d.data.data); setCourses(c.data.data);
      setBatches(b.data.data); setSubjects(s.data.data);
    } catch (e) { console.error(e); }
    setLoading(false);
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault(); setFormError('');
    try {
      await apiClient.post(`/academics/${tab}`, form);
      setShowModal(false); setForm({}); fetchAll();
    } catch (err: any) { setFormError(err.response?.data?.error || 'Failed'); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure?')) return;
    try {
      await apiClient.delete(`/academics/${tab}/${id}`);
      fetchAll();
    } catch (err: any) { alert(err.response?.data?.error || 'Failed'); }
  };

  const tabs = [
    { key: 'departments', label: 'Departments', icon: <Building2 className="w-4 h-4" />, count: departments.length },
    { key: 'courses', label: 'Courses', icon: <BookOpen className="w-4 h-4" />, count: courses.length },
    { key: 'batches', label: 'Batches', icon: <Layers className="w-4 h-4" />, count: batches.length },
    { key: 'subjects', label: 'Subjects', icon: <GraduationCap className="w-4 h-4" />, count: subjects.length },
  ] as const;

  const openCreateModal = () => {
    setForm(tab === 'departments' ? { name: '' } :
            tab === 'courses' ? { name: '', departmentId: '' } :
            tab === 'batches' ? { courseId: '', year: new Date().getFullYear() } :
            { name: '', code: '', courseId: '' });
    setShowModal(true);
    setFormError('');
  };

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {tabs.map(t => (
          <div key={t.key} className={`bg-slate-900 border border-slate-800 rounded-xl p-4 cursor-pointer transition-all ${tab === t.key ? 'ring-2 ring-indigo-500/50 border-indigo-500/30' : 'hover:border-slate-700'}`}
               onClick={() => setTab(t.key as any)}>
            <div className="flex items-center justify-between">
              <span className="text-slate-500">{t.icon}</span>
              <span className="text-2xl font-bold">{t.count}</span>
            </div>
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mt-2">{t.label}</p>
          </div>
        ))}
      </div>

      {/* Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
        <div className="flex items-center justify-between p-4 border-b border-slate-800">
          <h2 className="text-base font-semibold capitalize">{tab}</h2>
          <button onClick={openCreateModal} className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-sm font-semibold transition-all">
            <Plus className="w-4 h-4" /> Add {tab.slice(0, -1)}
          </button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16"><div className="w-8 h-8 border-2 border-slate-700 border-t-indigo-500 rounded-full animate-spin" /></div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-slate-800/50">
                  {tab === 'departments' && ['Name', 'Courses', 'Faculty', 'Actions'].map(h => <th key={h} className="text-left px-5 py-3 text-[11px] font-semibold uppercase tracking-wide text-slate-500">{h}</th>)}
                  {tab === 'courses' && ['Name', 'Department', 'Subjects', 'Actions'].map(h => <th key={h} className="text-left px-5 py-3 text-[11px] font-semibold uppercase tracking-wide text-slate-500">{h}</th>)}
                  {tab === 'batches' && ['Course', 'Year', 'Students', 'Actions'].map(h => <th key={h} className="text-left px-5 py-3 text-[11px] font-semibold uppercase tracking-wide text-slate-500">{h}</th>)}
                  {tab === 'subjects' && ['Name', 'Code', 'Course', 'Actions'].map(h => <th key={h} className="text-left px-5 py-3 text-[11px] font-semibold uppercase tracking-wide text-slate-500">{h}</th>)}
                </tr>
              </thead>
              <tbody>
                {tab === 'departments' && departments.map(d => (
                  <tr key={d.id} className="border-t border-slate-800 hover:bg-slate-800/30">
                    <td className="px-5 py-3.5 text-sm font-medium">{d.name}</td>
                    <td className="px-5 py-3.5 text-sm text-slate-400">{d.courses?.length || 0}</td>
                    <td className="px-5 py-3.5 text-sm text-slate-400">{d._count?.faculties || 0}</td>
                    <td className="px-5 py-3.5"><button onClick={() => handleDelete(d.id)} className="p-1.5 rounded-lg hover:bg-red-500/10 text-slate-500 hover:text-red-400"><Trash2 className="w-4 h-4" /></button></td>
                  </tr>
                ))}
                {tab === 'courses' && courses.map(c => (
                  <tr key={c.id} className="border-t border-slate-800 hover:bg-slate-800/30">
                    <td className="px-5 py-3.5 text-sm font-medium">{c.name}</td>
                    <td className="px-5 py-3.5 text-sm text-slate-400">{c.department?.name || '—'}</td>
                    <td className="px-5 py-3.5 text-sm text-slate-400">{c._count?.subjects || 0}</td>
                    <td className="px-5 py-3.5"><button onClick={() => handleDelete(c.id)} className="p-1.5 rounded-lg hover:bg-red-500/10 text-slate-500 hover:text-red-400"><Trash2 className="w-4 h-4" /></button></td>
                  </tr>
                ))}
                {tab === 'batches' && batches.map(b => (
                  <tr key={b.id} className="border-t border-slate-800 hover:bg-slate-800/30">
                    <td className="px-5 py-3.5 text-sm font-medium">{b.course?.name || '—'}</td>
                    <td className="px-5 py-3.5 text-sm text-slate-400">{b.year}</td>
                    <td className="px-5 py-3.5 text-sm text-slate-400">{b._count?.students || 0}</td>
                    <td className="px-5 py-3.5"><button onClick={() => handleDelete(b.id)} className="p-1.5 rounded-lg hover:bg-red-500/10 text-slate-500 hover:text-red-400"><Trash2 className="w-4 h-4" /></button></td>
                  </tr>
                ))}
                {tab === 'subjects' && subjects.map(s => (
                  <tr key={s.id} className="border-t border-slate-800 hover:bg-slate-800/30">
                    <td className="px-5 py-3.5 text-sm font-medium">{s.name}</td>
                    <td className="px-5 py-3.5"><span className="px-2.5 py-0.5 bg-indigo-500/15 text-indigo-400 rounded-full text-[11px] font-semibold">{s.code}</span></td>
                    <td className="px-5 py-3.5 text-sm text-slate-400">{s.course?.name || '—'}</td>
                    <td className="px-5 py-3.5"><button onClick={() => handleDelete(s.id)} className="p-1.5 rounded-lg hover:bg-red-500/10 text-slate-500 hover:text-red-400"><Trash2 className="w-4 h-4" /></button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Create Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 w-full max-w-md animate-slide-up">
            <h3 className="text-lg font-bold mb-5 capitalize">Add {tab.slice(0, -1)}</h3>
            {formError && <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 text-red-400 text-sm rounded-lg">{formError}</div>}
            <form onSubmit={handleCreate} className="space-y-4">
              {(tab === 'departments' || tab === 'courses' || tab === 'subjects') && (
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Name</label>
                  <input required value={form.name || ''} onChange={e => setForm((f: any) => ({ ...f, name: e.target.value }))}
                    className="w-full px-3 py-2.5 bg-slate-800 border border-slate-700 rounded-lg text-sm text-white outline-none focus:border-indigo-500" />
                </div>
              )}
              {(tab === 'courses' || tab === 'subjects') && (
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">{tab === 'courses' ? 'Department' : 'Course'}</label>
                  <select required value={tab === 'courses' ? form.departmentId : form.courseId}
                    onChange={e => setForm((f: any) => tab === 'courses' ? { ...f, departmentId: e.target.value } : { ...f, courseId: e.target.value })}
                    className="w-full px-3 py-2.5 bg-slate-800 border border-slate-700 rounded-lg text-sm text-white outline-none focus:border-indigo-500">
                    <option value="">Select...</option>
                    {(tab === 'courses' ? departments : courses).map((item: any) => <option key={item.id} value={item.id}>{item.name}</option>)}
                  </select>
                </div>
              )}
              {tab === 'subjects' && (
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Code</label>
                  <input required value={form.code || ''} onChange={e => setForm((f: any) => ({ ...f, code: e.target.value }))}
                    className="w-full px-3 py-2.5 bg-slate-800 border border-slate-700 rounded-lg text-sm text-white outline-none focus:border-indigo-500" />
                </div>
              )}
              {tab === 'batches' && (
                <>
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Course</label>
                    <select required value={form.courseId} onChange={e => setForm((f: any) => ({ ...f, courseId: e.target.value }))}
                      className="w-full px-3 py-2.5 bg-slate-800 border border-slate-700 rounded-lg text-sm text-white outline-none focus:border-indigo-500">
                      <option value="">Select...</option>
                      {courses.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Year</label>
                    <input type="number" required value={form.year} onChange={e => setForm((f: any) => ({ ...f, year: Number(e.target.value) }))}
                      className="w-full px-3 py-2.5 bg-slate-800 border border-slate-700 rounded-lg text-sm text-white outline-none focus:border-indigo-500" />
                  </div>
                </>
              )}
              <div className="flex justify-end gap-3 mt-6">
                <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-slate-300 hover:bg-slate-700">Cancel</button>
                <button type="submit" className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-sm font-semibold">Create</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AcademicSetup;
