import React, { useState, useEffect } from 'react';
import { apiClient } from '../../api/client';
import { useToast } from '../../hooks/use-toast';
import { Save, Settings, ShieldCheck, Activity, Building2, Bell, Mail, Smartphone, Lock, Globe, Layers, AlertCircle } from 'lucide-react';

export const SettingsPage = () => {
    const { toast } = useToast();
    const [config, setConfig] = useState({
        institutionName: 'Kits Akshar Institute of Technology',
        academicYear: '2024-2025',
        currentSemester: 'ODD',
        emailNotifications: true,
        smsAlerts: false,
        autoLockMarks: true,
        attendanceThreshold: '75',
    });
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        apiClient.get('/admin/settings')
            .then(res => { if (res.data.data) setConfig(c => ({ ...c, ...res.data.data })); })
            .catch(() => { })
            .finally(() => setLoading(false));
    }, []);

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        try {
            await apiClient.put('/admin/settings', config);
            toast({ title: 'Authorized Success', description: 'System configuration updated and propagated across all nodes.' });
        } catch {
            toast({ title: 'Save Failed', description: 'Unauthorized or invalid configuration parameters.', variant: 'destructive' });
        }
        setSaving(false);
    };

    const chk = (k: string) => (e: React.ChangeEvent<HTMLInputElement>) =>
        setConfig(c => ({ ...c, [k]: e.target.checked }));

    const val = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
        setConfig(c => ({ ...c, [k]: e.target.value }));

    if (loading) return (
        <div className="flex justify-center py-20 animate-pulse text-slate-400 font-bold uppercase tracking-widest text-xs italic">
            Synchronizing Global Parameters...
        </div>
    );

    return (
        <div className="bg-white min-h-screen text-slate-800 p-2 space-y-4">
            {/* 1. Module Header */}
            <div className="border border-slate-300 rounded shadow-sm overflow-hidden bg-white max-w-4xl mx-auto">
                <div className="erp-header-blue px-3 py-1.5 text-[14px] flex justify-between items-center font-bold">
                    <div className="flex items-center gap-2 uppercase tracking-tight">
                        <Settings className="w-4 h-4" />
                        Global Institution Architecture & Core Parameters
                    </div>
                </div>
                <div className="erp-strip-green px-3 py-1.5 text-[11px] font-bold text-emerald-800 flex justify-between uppercase italic tracking-tighter">
                    <span>Authorized modification of institutional identity, calendar, and operational thresholds.</span>
                    <span className="flex items-center gap-1.5"><ShieldCheck className="w-3.5 h-3.5" /> Security Context: Root</span>
                </div>
            </div>

            <form onSubmit={handleSave} className="max-w-4xl mx-auto space-y-4 pb-20">
                {/* 2. Primary Identity Configuration */}
                <div className="border border-slate-300 rounded shadow-sm overflow-hidden bg-white">
                    <div className="bg-slate-50 px-3 py-2 border-b border-slate-300 flex items-center gap-2">
                        <Building2 className="w-4 h-4 text-[#004b93]" />
                        <span className="text-[11px] font-black uppercase tracking-widest text-[#004b93]">Institutional Identity Matrix</span>
                    </div>
                    <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4">
                        <div className="space-y-1">
                            <label className="erp-label uppercase tracking-widest text-[9px]">Official Institution Name</label>
                            <input value={config.institutionName} onChange={val('institutionName')}
                                className="erp-input w-full font-black uppercase" />
                        </div>
                        <div className="space-y-1">
                            <label className="erp-label uppercase tracking-widest text-[9px]">Active Academic Span</label>
                            <input value={config.academicYear} onChange={val('academicYear')}
                                className="erp-input w-full font-black font-mono tracking-tighter" placeholder="2024-2025" />
                        </div>
                        <div className="space-y-1">
                            <label className="erp-label uppercase tracking-widest text-[9px]">Operational Period (Semester)</label>
                            <select value={config.currentSemester} onChange={val('currentSemester')}
                                className="erp-input w-full font-black text-blue-900">
                                <option value="ODD">ODD SEMESTER CYCLE</option>
                                <option value="EVEN">EVEN SEMESTER CYCLE</option>
                            </select>
                        </div>
                        <div className="space-y-1">
                            <label className="erp-label uppercase tracking-widest text-[9px]">Attendance Compliance Threshold (%)</label>
                            <div className="relative">
                                <input type="number" value={config.attendanceThreshold} onChange={val('attendanceThreshold')}
                                    className="erp-input w-full font-black text-rose-700 pr-12" />
                                <span className="absolute right-3 top-2.5 text-[10px] font-black text-slate-400">%</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* 3. System Directives & Automation */}
                <div className="border border-slate-300 rounded shadow-sm overflow-hidden bg-white">
                    <div className="bg-slate-50 px-3 py-2 border-b border-slate-300 flex items-center gap-2">
                        <Activity className="w-4 h-4 text-[#004b93]" />
                        <span className="text-[11px] font-black uppercase tracking-widest text-[#004b93]">Operational Automation Directives</span>
                    </div>
                    <div className="divide-y divide-slate-100">
                        {/* Email Node */}
                        <div className="p-4 flex items-center justify-between hover:bg-slate-50 transition-colors">
                            <div className="flex items-center gap-4">
                                <div className="p-2.5 rounded bg-blue-50 text-[#004b93] border border-blue-100"><Mail className="w-5 h-5" /></div>
                                <div>
                                    <p className="text-[12px] font-black text-slate-700 uppercase tracking-tight">Electronic SMTP Notifications</p>
                                    <p className="text-[10px] font-bold text-slate-400 italic">Dispatch automated alerts for attendance shortage, fee dues, and results.</p>
                                </div>
                            </div>
                            <input type="checkbox" checked={config.emailNotifications} onChange={chk('emailNotifications')}
                                className="w-5 h-5 accent-[#004b93] cursor-pointer" />
                        </div>
                        {/* SMS Node */}
                        <div className="p-4 flex items-center justify-between hover:bg-slate-50 transition-colors">
                            <div className="flex items-center gap-4">
                                <div className="p-2.5 rounded bg-indigo-50 text-indigo-700 border border-indigo-100"><Smartphone className="w-5 h-5" /></div>
                                <div>
                                    <p className="text-[12px] font-black text-slate-700 uppercase tracking-tight">GSM/SMS Gateway Integration</p>
                                    <p className="text-[10px] font-bold text-slate-400 italic">Transmit critical administrative alerts via authorized SMS gateways.</p>
                                </div>
                            </div>
                            <input type="checkbox" checked={config.smsAlerts} onChange={chk('smsAlerts')}
                                className="w-5 h-5 accent-[#004b93] cursor-pointer" />
                        </div>
                        {/* Lock Marks Node */}
                        <div className="p-4 flex items-center justify-between hover:bg-slate-50 transition-colors">
                            <div className="flex items-center gap-4">
                                <div className="p-2.5 rounded bg-rose-50 text-rose-700 border border-rose-100"><Lock className="w-5 h-5" /></div>
                                <div>
                                    <p className="text-[12px] font-black text-slate-700 uppercase tracking-tight">Automated Ledger Locking</p>
                                    <p className="text-[10px] font-bold text-slate-400 italic">Graceful termination of marks entry access upon session deadlines.</p>
                                </div>
                            </div>
                            <input type="checkbox" checked={config.autoLockMarks} onChange={chk('autoLockMarks')}
                                className="w-5 h-5 accent-rose-600 cursor-pointer" />
                        </div>
                    </div>
                </div>

                {/* 4. Persistence Controller */}
                <div className="flex flex-col gap-3 pt-6 border-t-2 border-slate-100">
                    <button type="submit" disabled={saving}
                        className="erp-btn-rect bg-[#004b93] hover:bg-[#003870] flex items-center justify-center gap-3 py-3 text-[14px] uppercase font-black tracking-[0.2em] shadow-xl shadow-blue-500/20 active:scale-[0.98] transition-all">
                        <Save className="w-5 h-5" />
                        {saving ? 'Synchronizing Node Cluster...' : 'Authorize System-Wide Changes'}
                    </button>
                    <div className="flex justify-between items-center text-[9px] font-black text-slate-400 uppercase italic px-1">
                        <span>* Cryptographically signed by Root Admin</span>
                        <span className="flex items-center gap-1 text-rose-500"><AlertCircle className="w-3 h-3" /> All parameter mutations are logged into the permanent forensic trail.</span>
                    </div>
                </div>
            </form>
        </div>
    );
};
