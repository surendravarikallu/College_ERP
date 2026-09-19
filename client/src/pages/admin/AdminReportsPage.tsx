import React from 'react';
import { Download, FileText, BarChart2, Users, DollarSign, GraduationCap, ShieldCheck, Activity, Printer, FileDown, Search, ArrowRight, Layers } from 'lucide-react';
import { apiClient } from '../../api/client';
import { useToast } from '../../hooks/use-toast';

export const AdminReportsPage = () => {
    const { toast } = useToast();

    const handleExport = async (type: string, label: string) => {
        try {
            toast({ title: `Synchronizing Data...`, description: `Generating ${label} payload.` });
            const response = await apiClient.get(`/analytics/export/${type}`, {
                responseType: 'blob'
            });
            const url = URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            link.download = `${type}-${new Date().toISOString().split('T')[0]}.csv`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);
            toast({ title: `Operational Success`, description: `${label} exported to local storage.` });
        } catch {
            toast({
                title: 'Export Failed',
                description: 'Critical error during report aggregation.',
                variant: 'destructive'
            });
        }
    };

    const reports = [
        {
            type: 'students', label: 'Student Nominal Registry', icon: <Users className="w-5 h-5" />,
            desc: 'Consolidated registry of all active students with verified academic profiles.',
            category: 'ACADEMIC'
        },
        {
            type: 'performance', label: 'Academic Performance Matrix', icon: <BarChart2 className="w-5 h-5" />,
            desc: 'Cross-functional subject grade analysis and SGPA/CGPA distribution.',
            category: 'EXAMINATIONS'
        },
        {
            type: 'finance', label: 'Financial Liability Ledger', icon: <DollarSign className="w-5 h-5" />,
            desc: 'Real-time account of pending invoices, fee dues, and collection status.',
            category: 'FINANCE'
        },
        {
            type: 'faculty-payroll', label: 'Faculty Remuneration Log', icon: <GraduationCap className="w-5 h-5" />,
            desc: 'Certified monthly payslip summaries and institutional payroll data.',
            category: 'HUMAN RESOURCES'
        },
        {
            type: 'marks-sheet', label: 'Marks Aggregation Sheet', icon: <FileText className="w-5 h-5" />,
            desc: 'Detailed internal and external marks breakdown for all student batches.',
            category: 'EXAMINATIONS'
        },
    ];

    return (
        <div className="bg-white min-h-screen text-slate-800 p-2 space-y-4">
            {/* 1. Module Header */}
            <div className="border border-slate-300 rounded shadow-sm overflow-hidden bg-white">
                <div className="erp-header-blue px-3 py-1.5 text-[14px] flex justify-between items-center font-bold">
                    <div className="flex items-center gap-2 uppercase tracking-tight">
                        <Layers className="w-4 h-4" />
                        Institutional Analytics & Reporting Hub
                    </div>
                </div>
                <div className="erp-strip-green px-3 py-1.5 text-[11px] font-bold text-emerald-800 flex justify-between uppercase italic tracking-tighter">
                    <span>Authorized data aggregation for administrative audits and executive decision support.</span>
                    <span className="flex items-center gap-1.5"><ShieldCheck className="w-3.5 h-3.5" /> Data Integrity: Verified</span>
                </div>
            </div>

            {/* 2. Operations Area */}
            <div className="border border-slate-300 rounded shadow-sm bg-slate-50 p-3">
                <div className="flex flex-col md:flex-row justify-between items-center gap-4">
                    <div className="flex items-center gap-3">
                        <div className="px-3 py-1 bg-white border border-slate-200 rounded text-[10px] font-black text-slate-500 uppercase tracking-widest">Aggregate Records</div>
                        <div className="px-3 py-1 bg-[#004b93] text-white rounded text-[10px] font-black uppercase tracking-widest cursor-pointer shadow-sm">Real-time Stream</div>
                    </div>
                    <div className="flex gap-2">
                        <div className="relative">
                            <input className="erp-input h-8 pl-8 text-[11px] w-64 font-bold" placeholder="Search Report Category..." />
                            <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-slate-400" />
                        </div>
                        <button className="p-2 bg-white border border-slate-300 rounded hover:bg-slate-50 text-slate-500 transition-colors"><Printer className="w-4 h-4" /></button>
                    </div>
                </div>
            </div>

            {/* 3. Reports Grid Matrix */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {reports.map(r => (
                    <div key={r.type} className="border border-slate-200 rounded bg-white shadow-sm hover:border-[#004b93] transition-all flex flex-col group overflow-hidden">
                        <div className="p-3 border-b border-slate-100 bg-slate-50/50 flex justify-between items-start">
                            <div className="flex items-center gap-3">
                                <div className="p-2.5 rounded bg-[#004b93]/5 text-[#004b93] border border-[#004b93]/10">
                                    {r.icon}
                                </div>
                                <div className="space-y-0.5">
                                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{r.category}</p>
                                    <h3 className="text-[12px] font-black text-slate-700 uppercase leading-none">{r.label}</h3>
                                </div>
                            </div>
                        </div>
                        <div className="p-4 flex-1 space-y-4">
                            <p className="text-[11px] font-bold text-slate-500 leading-relaxed italic">{r.desc}</p>
                            <button
                                onClick={() => handleExport(r.type, r.label)}
                                className="w-full erp-btn-rect bg-[#004b93] hover:bg-[#003870] flex items-center justify-center gap-2 py-2 text-[10px] uppercase font-black tracking-widest shadow-md shadow-blue-500/10 group-active:scale-95 transition-transform"
                            >
                                <Download className="w-3.5 h-3.5" /> Aggregate & Download
                            </button>
                        </div>
                        <div className="px-3 py-1.5 bg-slate-50 text-[9px] font-bold text-slate-400 flex items-center justify-between border-t border-slate-100">
                            <span className="flex items-center gap-1"><Activity className="w-3 h-3" /> System Export Node: 02</span>
                            <span className="flex items-center gap-0.5 text-[#004b93]">Audit Protocol <ArrowRight className="w-2.5 h-2.5" /></span>
                        </div>
                    </div>
                ))}
            </div>
            <div className="flex justify-between items-center text-[10px] text-slate-400 font-bold uppercase tracking-tighter italic">
                <span>* Institutional Data Aggregation Engine v3.1</span>
                <span className="text-rose-600 flex items-center gap-1"><ShieldCheck className="w-3 h-3" /> All exports are logged into the Security Audit Trail</span>
            </div>
        </div>
    );
};
