import React, { useState, useEffect, useCallback } from 'react';
import { apiClient } from '../../api/client';
import { BookOpen, Plus, Trash2, Building2, GraduationCap, Layers, Filter, ShieldCheck, Activity, Search, Printer, FileDown, ArrowRightCircle } from 'lucide-react';
import { toast } from 'sonner';

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
            const [d, b, s] = await Promise.all([
                apiClient.get('/admin/departments'),
                apiClient.get('/admin/batches'),
                apiClient.get('/admin/subjects'),
            ]);
            setDepartments(d.data.data);
            setCourses(d.data.data); // Assuming flat structure for now or mapping same as departments
            setBatches(b.data.data);
            setSubjects(s.data.data);
        } catch (e) { console.error(e); }
        setLoading(false);
    }, []);

    useEffect(() => { fetchAll(); }, [fetchAll]);

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();
        setFormError('');
        try {
            await apiClient.post(`/admin/${tab}`, form);
            toast.success(`${tab.slice(0, -1).toUpperCase()} entry authorized`);
            setShowModal(false);
            setForm({});
            fetchAll();
        } catch (err: any) {
            setFormError(err.response?.data?.error || 'Failed to authorize entry');
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Authorized Personnel Only: Proceed with record DELETION?')) return;
        try {
            await apiClient.delete(`/admin/${tab}/${id}`);
            toast.success('Record purged from registry');
            fetchAll();
        } catch (err: any) {
            toast.error(err.response?.data?.error || 'Deletion failed due to existing dependencies');
        }
    };

    const tabsList = [
        { key: 'departments', label: 'Department Registry', icon: <Building2 className="w-4 h-4" />, count: departments.length },
        { key: 'courses', label: 'Course Catalog', icon: <BookOpen className="w-4 h-4" />, count: courses.length },
        { key: 'batches', label: 'Cohort Batches', icon: <Layers className="w-4 h-4" />, count: batches.length },
        { key: 'subjects', label: 'Subject Matrix', icon: <GraduationCap className="w-4 h-4" />, count: subjects.length },
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
        <div className="bg-white min-h-screen text-slate-800 p-2 space-y-4">
            {/* 1. Module Header */}
            <div className="border border-slate-300 rounded shadow-sm overflow-hidden bg-white">
                <div className="erp-header-blue px-3 py-1.5 text-[14px] flex justify-between items-center font-bold">
                    <div className="flex items-center gap-2 uppercase tracking-tight">
                        <Layers className="w-4 h-4" />
                        Institution Academic Architecture & Structural Matrix
                    </div>
                </div>
                <div className="erp-strip-green px-3 py-1.5 text-[11px] font-bold text-emerald-800 flex justify-between uppercase italic tracking-tighter">
                    <span>Authorized configuration of institutional units, academic tracks, and curriculum mapping.</span>
                    <span className="flex items-center gap-1.5"><ShieldCheck className="w-3.5 h-3.5" /> Registry Verified</span>
                </div>
            </div>

            {/* 2. Management KPI Ribbon (Tabs) */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {tabsList.map(t => (
                    <div key={t.key}
                        onClick={() => setTab(t.key as any)}
                        className={`border rounded p-3 cursor-pointer transition-all flex items-center justify-between shadow-sm overflow-hidden relative ${tab === t.key ? 'bg-blue-50 border-[#004b93] border-b-4' : 'bg-white border-slate-200 hover:border-slate-300'}`}>
                        <div className="space-y-1">
                            <span className={`text-[9px] font-black uppercase tracking-widest ${tab === t.key ? 'text-[#004b93]' : 'text-slate-400'}`}>{t.label}</span>
                            <div className="flex items-center gap-2">
                                <span className={tab === t.key ? 'text-[#004b93]' : 'text-slate-300'}>{t.icon}</span>
                                <span className={`text-xl font-black leading-none ${tab === t.key ? 'text-[#004b93]' : 'text-slate-700'}`}>{t.count}</span>
                            </div>
                        </div>
                        {tab === t.key && <div className="absolute -right-2 -bottom-2 opacity-5 text-[#004b93]">{t.icon}</div>}
                    </div>
                ))}
            </div>

            {/* 3. Operational Control Section */}
            <div className="border border-slate-300 rounded shadow-sm overflow-hidden bg-white">
                <div className="bg-slate-50 px-3 py-2 border-b border-slate-300 flex justify-between items-center flex-wrap gap-2">
                    <div className="flex items-center gap-2">
                        <Filter className="w-3.5 h-3.5 text-slate-400" />
                        <span className="text-[11px] font-black uppercase tracking-widest text-[#004b93]">Registry: {tab} Ledger</span>
                    </div>
                    <div className="flex gap-2">
                        <div className="relative">
                            <input className="erp-input h-7 pl-8 text-[10px] w-48 font-bold" placeholder={`Filter ${tab}...`} />
                            <Search className="w-3 h-3 absolute left-2.5 top-2 text-slate-400" />
                        </div>
                        <button onClick={openCreateModal} className="erp-btn-rect bg-[#004b93] hover:bg-[#003870] flex items-center gap-1 px-4 py-1 text-[10px] uppercase font-black tracking-widest transition-all">
                            <Plus className="w-3.5 h-3.5" /> Initialize {tab.slice(0, -1)}
                        </button>
                        <button className="p-1.5 bg-white border border-slate-300 rounded hover:bg-slate-50 text-slate-500"><Printer className="w-4 h-4" /></button>
                    </div>
                </div>

                <div className="overflow-x-auto min-h-[400px]">
                    {loading ? (
                        <div className="p-20 text-center animate-pulse text-slate-400 font-bold uppercase tracking-widest text-xs italic">Synchronizing Academic Metadata Domain...</div>
                    ) : (
                        <table className="w-full erp-table-dense border-collapse">
                            <thead>
                                <tr className="bg-slate-100 text-slate-600 font-bold uppercase text-[10px] border-b border-slate-200">
                                    <th className="px-5 py-2.5 text-center w-12 border-r border-slate-100">SN</th>
                                    {tab === 'departments' && <><th className="text-left border-r border-slate-100">Department Nomenclature</th><th className="text-center w-40 border-r border-slate-100">Course Count</th><th className="text-center w-40">Faculty Nodes</th></>}
                                    {tab === 'courses' && <><th className="text-left border-r border-slate-100">Course Identifier</th><th className="text-left border-r border-slate-100">Parent Unit</th><th className="text-center w-40">Mapped Assets</th></>}
                                    {tab === 'batches' && <><th className="text-left border-r border-slate-100">Functional Batch Track</th><th className="text-center w-40 border-r border-slate-100">Intake Span</th><th className="text-center w-40">Student Density</th></>}
                                    {tab === 'subjects' && <><th className="text-left border-r border-slate-100">Subject Nomenclature</th><th className="text-center w-40 border-r border-slate-100">System Code</th><th className="text-left">Instructional Context</th></>}
                                    <th className="text-center w-24">Directives</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {tab === 'departments' && departments.map((d, i) => (
                                    <tr key={d.id} className="hover:bg-blue-50/20 transition-colors group">
                                        <td className="px-5 py-3 text-center font-mono text-slate-300 text-[10px] border-r border-slate-100">{i + 1}</td>
                                        <td className="px-5 py-3 font-black text-[#004b93] uppercase tracking-tighter border-r border-slate-100">{d.name}</td>
                                        <td className="px-5 py-3 text-center border-r border-slate-100 font-bold text-slate-500">{d.courses?.length || 0}</td>
                                        <td className="px-5 py-3 text-center font-bold text-slate-500">{d._count?.faculties || 0}</td>
                                        <td className="px-5 py-3 text-center">
                                            <button onClick={() => handleDelete(d.id)} className="p-1.5 rounded bg-rose-50 text-rose-300 hover:text-rose-600 border border-slate-100 hover:border-rose-200 transition-all"><Trash2 className="w-3.5 h-3.5" /></button>
                                        </td>
                                    </tr>
                                ))}
                                {tab === 'courses' && courses.map((c, i) => (
                                    <tr key={c.id} className="hover:bg-blue-50/20 transition-colors group">
                                        <td className="px-5 py-3 text-center font-mono text-slate-300 text-[10px] border-r border-slate-100">{i + 1}</td>
                                        <td className="px-5 py-3 font-black text-[#004b93] uppercase tracking-tighter border-r border-slate-100">{c.name}</td>
                                        <td className="px-5 py-3 text-slate-500 font-bold uppercase border-r border-slate-100">{c.department?.name || '—'}</td>
                                        <td className="px-5 py-3 text-center font-bold text-slate-500">{c._count?.subjects || 0}</td>
                                        <td className="px-5 py-3 text-center">
                                            <button onClick={() => handleDelete(c.id)} className="p-1.5 rounded bg-rose-50 text-rose-300 hover:text-rose-600 border border-slate-100 hover:border-rose-200 transition-all"><Trash2 className="w-3.5 h-3.5" /></button>
                                        </td>
                                    </tr>
                                ))}
                                {tab === 'batches' && batches.map((b, i) => (
                                    <tr key={b.id} className="hover:bg-blue-50/20 transition-colors group">
                                        <td className="px-5 py-3 text-center font-mono text-slate-300 text-[10px] border-r border-slate-100">{i + 1}</td>
                                        <td className="px-5 py-3 font-black text-[#004b93] uppercase tracking-tighter border-r border-slate-100">{b.course?.name || '—'}</td>
                                        <td className="px-5 py-3 text-center font-black text-slate-400 border-r border-slate-100">{b.year}</td>
                                        <td className="px-5 py-3 text-center font-bold text-emerald-600 flex items-center justify-center gap-1.5 mt-2"><Activity className="w-3 h-3" /> {b._count?.students || 0} ACTIVE</td>
                                        <td className="px-5 py-3 text-center">
                                            <button onClick={() => handleDelete(b.id)} className="p-1.5 rounded bg-rose-50 text-rose-300 hover:text-rose-600 border border-slate-100 hover:border-rose-200 transition-all"><Trash2 className="w-3.5 h-3.5" /></button>
                                        </td>
                                    </tr>
                                ))}
                                {tab === 'subjects' && subjects.map((s, i) => (
                                    <tr key={s.id} className="hover:bg-blue-50/20 transition-colors group">
                                        <td className="px-5 py-3 text-center font-mono text-slate-300 text-[10px] border-r border-slate-100">{i + 1}</td>
                                        <td className="px-5 py-3 font-black text-[#004b93] uppercase tracking-tighter border-r border-slate-100">{s.name}</td>
                                        <td className="px-5 py-3 text-center border-r border-slate-100">
                                            <span className="px-2 py-0.5 bg-blue-100 text-blue-800 font-black font-mono text-[9px] border border-blue-200 rounded tracking-widest">{s.code}</span>
                                        </td>
                                        <td className="px-5 py-3 text-[11px] font-bold text-slate-500 uppercase italic">{s.course?.name || '—'}</td>
                                        <td className="px-5 py-3 text-center">
                                            <button onClick={() => handleDelete(s.id)} className="p-1.5 rounded bg-rose-50 text-rose-300 hover:text-rose-600 border border-slate-100 hover:border-rose-200 transition-all"><Trash2 className="w-3.5 h-3.5" /></button>
                                        </td>
                                    </tr>
                                ))}
                                {(!loading && (
                                    (tab === 'departments' && departments.length === 0) ||
                                    (tab === 'courses' && courses.length === 0) ||
                                    (tab === 'batches' && batches.length === 0) ||
                                    (tab === 'subjects' && subjects.length === 0)
                                )) && (
                                    <tr><td colSpan={6} className="p-16 text-center text-slate-300 font-black uppercase tracking-widest text-xs italic">Zero records identified in this specific domain.</td></tr>
                                )}
                            </tbody>
                        </table>
                    )}
                </div>
            </div>

            {/* 4. Structural Element Modal */}
            {showModal && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white border-2 border-[#004b93] shadow-2xl rounded-lg overflow-hidden w-full max-w-md animate-in fade-in zoom-in duration-200">
                        <div className="erp-header-blue px-4 py-3 flex justify-between items-center">
                            <div className="flex items-center gap-3">
                                <Plus className="w-5 h-5 flex-shrink-0" />
                                <h3 className="text-sm font-black uppercase tracking-widest leading-none">Initialize Architectural Unit ({tab.slice(0, -1)})</h3>
                            </div>
                            <button onClick={() => setShowModal(false)} className="text-white hover:bg-white/10 rounded transition-colors font-bold">✕</button>
                        </div>
                        <form onSubmit={handleCreate} className="p-6 space-y-5">
                            {formError && <div className="p-2.5 bg-rose-50 border border-rose-200 text-rose-700 text-[10px] font-black uppercase tracking-widest rounded flex items-center gap-2"><Activity className="w-4 h-4" /> {formError}</div>}
                            
                            {(tab === 'departments' || tab === 'courses' || tab === 'subjects') && (
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Structural Nomenclature (Name)</label>
                                    <input required className="erp-input w-full uppercase font-black" value={form.name || ''} onChange={e => setForm((f: any) => ({ ...f, name: e.target.value }))} placeholder="e.g. COMPUTER SCIENCE" />
                                </div>
                            )}
                            {(tab === 'courses' || tab === 'subjects') && (
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{tab === 'courses' ? 'Parent Organizational Unit' : 'Target Course Track'}</label>
                                    <select required className="erp-input w-full font-black text-blue-900 border-2" value={tab === 'courses' ? form.departmentId : form.courseId}
                                        onChange={e => setForm((f: any) => tab === 'courses' ? { ...f, departmentId: e.target.value } : { ...f, courseId: e.target.value })}>
                                        <option value="">- SELECT AUTHORIZED UNIT -</option>
                                        {(tab === 'courses' ? departments : courses).map((item: any) => <option key={item.id} value={item.id}>{item.name.toUpperCase()}</option>)}
                                    </select>
                                </div>
                            )}
                            {tab === 'subjects' && (
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-1.5 underline decoration-blue-200">Registry Code (Internal)</label>
                                    <input required className="erp-input w-full font-black font-mono uppercase tracking-widest" value={form.code || ''} onChange={e => setForm((f: any) => ({ ...f, code: e.target.value }))} placeholder="e.g. CS-101" />
                                </div>
                            )}
                            {tab === 'batches' && (
                                <>
                                    <div className="space-y-1.5">
                                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest underline decoration-blue-200">Academic Course Context</label>
                                        <select required className="erp-input w-full font-black text-blue-900 border-2" value={form.courseId} onChange={e => setForm((f: any) => ({ ...f, courseId: e.target.value }))}>
                                            <option value="">- SELECT COURSE TRACK -</option>
                                            {courses.map((c: any) => <option key={c.id} value={c.id}>{c.name.toUpperCase()}</option>)}
                                        </select>
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Commencement Year</label>
                                        <input type="number" required className="erp-input w-full font-black font-mono" value={form.year} onChange={e => setForm((f: any) => ({ ...f, year: Number(e.target.value) }))} />
                                    </div>
                                </>
                            )}
                            <div className="flex gap-3 pt-4 border-t border-slate-100">
                                <button type="button" onClick={() => setShowModal(false)} className="flex-1 px-4 py-2.5 bg-slate-100 rounded text-[11px] font-black text-slate-500 uppercase hover:bg-slate-200 transition-colors tracking-widest">Abort</button>
                                <button type="submit" className="flex-1 px-4 py-2.5 bg-[#004b93] text-white rounded text-[11px] font-black uppercase tracking-widest hover:bg-[#003870] transition-colors shadow-lg shadow-blue-500/20">Authorize</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
            <div className="flex justify-between items-center text-[10px] text-slate-400 font-bold uppercase tracking-tighter italic">
                <span>* Institutional Academic Framework Automation v2.4</span>
                <span className="text-blue-800 flex items-center gap-1"><Activity className="w-3.5 h-3.5" /> Registry Core: Active</span>
            </div>
        </div>
    );
};

export default AcademicSetup;
