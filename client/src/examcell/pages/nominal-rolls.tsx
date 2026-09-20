import React, { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Loader2, Printer, Search, ArrowLeft, Edit, Filter, ListChecks } from "lucide-react";
import { formatSemester } from "../lib/utils";
import { Link } from "react-router-dom";
import { authFetch } from "../hooks/use-auth";
import { BatchSelector, BranchSelector, SectionSelector, ProgramSelector } from "../components/academics/ReportFilters";
import { useToast } from "../hooks/use-toast";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "../../components/ui/alert-dialog";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { saveJsPdfAndShare } from "../lib/capacitorUtils";

export default function NominalRolls() {
    const [academicYear, setAcademicYear] = useState("");
    const [batch, setBatch] = useState("");
    const [branch, setBranch] = useState("");
    const [semester, setSemester] = useState("");
    const [section, setSection] = useState("");
    const [program, setProgram] = useState("B.TECH");
    const [searchQuery, setSearchQuery] = useState("");
    const [confirmDialog, setConfirmDialog] = useState<{ isOpen: boolean; studentId: number | null; newStatus: string | null; studentName: string }>({
        isOpen: false,
        studentId: null,
        newStatus: null,
        studentName: "",
    });
    const { toast } = useToast();

    const queryKey = ['/api/v1/examcell/nominal-rolls', { batch, branch, semester, academicYear, section }];

    const { data: nominalRolls, isLoading, refetch } = useQuery({
        queryKey,
        queryFn: async () => {
            const qs = new URLSearchParams();
            if (batch) qs.append("batch", batch);
            if (branch) qs.append("branch", branch);
            if (semester) qs.append("semester", semester);
            if (academicYear) qs.append("academicYear", academicYear);
            if (section) qs.append("section", section);
            const res = await authFetch(`/api/nominal-rolls?${qs.toString()}`);
            return res.nominalRolls || [];
        },
        enabled: false,
    });

    const statusMutation = useMutation({
        mutationFn: async ({ studentId, status }: { studentId: number; status: string }) => {
            const token = (localStorage.getItem('ec_auth_token') || localStorage.getItem('erp_access_token'));
            const res = await fetch(`/api/students/${studentId}/status`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`,
                },
                body: JSON.stringify({ status, academicYear, semester }),
            });
            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.message || 'Failed to update status');
            }
            return res.json();
        },
        onSuccess: () => {
            toast({ title: 'Status updated successfully' });
            refetch();
            setConfirmDialog({ isOpen: false, studentId: null, newStatus: null, studentName: "" });
        },
        onError: (err: Error) => {
            toast({ title: 'Error updating status', description: err.message, variant: 'destructive' });
        },
    });

    const handleStatusChange = (studentId: number, newStatus: string, studentName: string) => {
        setConfirmDialog({ isOpen: true, studentId, newStatus, studentName });
    };

    const confirmStatusChange = () => {
        if (confirmDialog.studentId && confirmDialog.newStatus) {
            statusMutation.mutate({ studentId: confirmDialog.studentId, status: confirmDialog.newStatus });
        }
    };

    const handleShowStudents = () => {
        if (!batch) {
            alert("Please select a Batch to view students.");
            return;
        }
        refetch();
    };

    const exportNominalRollsPdf = async () => {
        if (!filteredRolls || filteredRolls.length === 0) {
            toast({ title: "No data to export", variant: "destructive" });
            return;
        }
        const doc = new jsPDF({ orientation: 'landscape', format: 'a4' });
        const pageWidth = doc.internal.pageSize.getWidth();
        let startY = 10;
        
        doc.setFontSize(14);
        doc.setFont("helvetica", "bold");
        doc.text("SRI MITTAPALLI COLLEGE OF ENGINEERING", pageWidth / 2, 15, { align: "center" });
        doc.setFontSize(10);
        doc.text("NOMINAL ROLLS REGISTRY", pageWidth / 2, 22, { align: "center" });
        startY = 30;

        const tableColumn = ["S.No", "HTNo", "Name", "Branch", "Sec", "Gen", "Status"];
        const tableRows = (filteredRolls || []).map((row: any, idx: number) => [
            idx + 1,
            row.student.rollNumber,
            row.student.name?.toUpperCase(),
            row.student.branch,
            row.student.section || '-',
            row.student.gender || '-',
            (row.currentStatus || 'ACTIVE').toUpperCase()
        ]);

        autoTable(doc, {
            head: [tableColumn],
            body: tableRows,
            startY: startY,
            theme: 'grid',
            headStyles: { fillColor: [0, 75, 147], textColor: 255 },
            styles: { fontSize: 8 }
        });

        await saveJsPdfAndShare(doc, `Nominal_Rolls_${batch}.pdf`);
    };

    const activeStudents = nominalRolls?.filter((r: any) => !['LEFT', 'DETAINED', 'DEATH'].includes(r.currentStatus)).length || 0;
    const detainedStudents = nominalRolls?.filter((r: any) => r.currentStatus === 'DETAINED').length || 0;
    const totalStudents = nominalRolls?.length || 0;

    const filteredRolls = React.useMemo(() => {
        if (!nominalRolls) return null;
        if (!searchQuery.trim()) return nominalRolls;
        const q = searchQuery.toLowerCase();
        return nominalRolls.filter((row: any) =>
            row.student.name.toLowerCase().includes(q) ||
            row.student.rollNumber.toLowerCase().includes(q)
        );
    }, [nominalRolls, searchQuery]);

    const academicYears = React.useMemo(() => {
        if (!batch) return [];
        const parts = batch.split('-');
        if (parts.length !== 2) return [];
        const startYear = parseInt(parts[0]);
        const endYear = parseInt(parts[1]);
        const years: string[] = [];
        for (let y = startYear; y < endYear; y++) years.push(`${y}-${y + 1}`);
        return years;
    }, [batch]);

    const STATUS_OPTIONS = [
        { value: 'ACTIVE', label: 'Active', bg: 'bg-[#d4edda]', text: 'text-[#155724]', border: 'border-[#c3e6cb]' },
        { value: 'DETAINED', label: 'Detained', bg: 'bg-[#f8d7da]', text: 'text-[#721c24]', border: 'border-[#f5c6cb]' },
        { value: 'LEFT', label: 'Left', bg: 'bg-[#fff3cd]', text: 'text-[#856404]', border: 'border-[#ffeeba]' },
        { value: 'DEATH', label: 'Death', bg: 'bg-[#e2e3e5]', text: 'text-[#383d41]', border: 'border-[#d6d8db]' },
    ];

    return (
        <div className="bg-white min-h-screen text-slate-800 p-2 space-y-4">
            {/* 1. Module Header */}
            <div className="border border-slate-300 rounded shadow-sm overflow-hidden">
                <div className="erp-header-blue px-3 py-1.5 text-[14px] flex justify-between items-center">
                    <div className="flex items-center gap-2">
                        <ListChecks className="w-4 h-4" />
                        <span className="font-bold uppercase tracking-tight">Nominal Rolls & Student Status Matrix</span>
                    </div>
                    <button onClick={() => window.history.back()} className="erp-btn-rect bg-white/20 hover:bg-white/30 !text-white flex items-center gap-1 py-0.5 px-2 font-bold">
                        <ArrowLeft className="w-3 h-3" /> Back
                    </button>
                </div>
                <div className="erp-strip-green px-3 py-1.5 text-[11px] font-bold text-emerald-800 flex justify-between">
                    <span>Manage student promotion history, detentions, and official registry status.</span>
                    <div className="flex gap-4">
                        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-500"></span>{activeStudents} Active</span>
                        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-rose-500"></span>{detainedStudents} Detained</span>
                        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-[#004b93]"></span>{totalStudents} Total</span>
                    </div>
                </div>
            </div>

            {/* 2. Filter Matrix Section */}
            <div className="border border-slate-300 rounded shadow-sm overflow-hidden bg-slate-50">
                <div className="erp-header-blue bg-slate-700/10 !text-slate-700 px-3 py-1 text-[11px] font-bold border-b border-slate-200 flex items-center gap-2">
                    <Filter className="w-3 h-3" /> Search Parameters
                </div>
                <div className="p-3 grid grid-cols-1 md:grid-cols-4 lg:grid-cols-6 gap-3 items-end">
                    <div className="space-y-1">
                        <label className="erp-label">Academic Year</label>
                        <select value={academicYear} onChange={(e) => setAcademicYear(e.target.value)} className="erp-input w-full">
                            <option value="">All Years</option>
                            {academicYears.map(y => <option key={y} value={y}>{y}</option>)}
                        </select>
                    </div>
                    <div className="w-full">
                        <BatchSelector value={batch} onChange={setBatch} program={program} />
                    </div>
                    <div className="w-full">
                        <ProgramSelector value={program} onChange={setProgram} />
                    </div>
                    <div className="space-y-1">
                        <label className="erp-label">Branch Context</label>
                        <select value={branch} onChange={(e) => setBranch(e.target.value)} className="erp-input w-full">
                            <option value="">All Branches</option>
                            {['CSE', 'ECE', 'EEE', 'IT', 'MECH', 'CIVIL'].map(b => <option key={b} value={b}>{b}</option>)}
                        </select>
                    </div>
                    <div className="space-y-1">
                        <label className="erp-label">Semester</label>
                        <select value={semester} onChange={(e) => setSemester(e.target.value)} className="erp-input w-full">
                            <option value="">All Sem...</option>
                            {["I", "II", "III", "IV", "V", "VI", "VII", "VIII"].map(s => <option key={s} value={s}>{formatSemester(s, program)}</option>)}
                        </select>
                    </div>
                    <div className="w-full flex gap-2">
                         <button onClick={handleShowStudents} disabled={isLoading} className="erp-btn-rect flex-1 py-2 bg-slate-800 hover:bg-black">
                            {isLoading ? <Loader2 className="w-3 h-3 animate-spin mx-auto" /> : "Query Data"}
                         </button>
                         <button onClick={exportNominalRollsPdf} disabled={!filteredRolls} className="erp-btn-rect bg-rose-700 hover:bg-rose-800 p-2">
                            <Printer className="w-4 h-4" />
                         </button>
                    </div>
                </div>
            </div>

            {/* 3. Search Bar Integration */}
            <div className="px-1 flex justify-between items-center">
                 <div className="relative w-80">
                    <Search className="absolute left-2 top-2 w-4 h-4 text-slate-400" />
                    <input
                        type="search"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Search Identity..."
                        className="erp-input w-full pl-8 font-bold border-slate-300"
                    />
                </div>
                <div className="text-[10px] font-bold text-slate-400 italic">ERP DATA VERSION: {new Date().toLocaleDateString()}</div>
            </div>

            {/* 4. Data Registry Table */}
            <div className="border border-slate-300 rounded shadow-sm overflow-hidden">
                <div className="overflow-x-auto min-h-[400px]">
                    <table className="w-full erp-table-dense border-collapse">
                        <thead className="bg-slate-100 text-slate-600 font-bold">
                            <tr>
                                <th className="text-center w-12">SN</th>
                                <th className="text-left w-32">Roll Number</th>
                                <th className="text-left">Student Identity</th>
                                <th className="text-center">Branch</th>
                                <th className="text-center">Gen</th>
                                <th className="text-center w-40">Operational Status</th>
                                <th className="text-left">Promotion History Audit</th>
                                <th className="text-right w-12 px-3">Act</th>
                            </tr>
                        </thead>
                        <tbody>
                            {!filteredRolls ? (
                                <tr><td colSpan={8} className="p-16 text-center italic text-slate-400 animate-pulse">Waiting for selection query...</td></tr>
                            ) : filteredRolls.length === 0 ? (
                                <tr><td colSpan={8} className="p-16 text-center font-bold text-slate-400">No matching registry entries found.</td></tr>
                            ) : filteredRolls.map((row: any, idx: number) => {
                                const student = row.student;
                                const dropdownValue = row.currentStatus === 'PROMOTED' ? 'ACTIVE' : (row.currentStatus || 'ACTIVE').toUpperCase();
                                return (
                                    <tr key={student.id} className="hover:bg-blue-50/30">
                                        <td className="text-center font-mono text-slate-400">{idx + 1}</td>
                                        <td className="font-bold text-[#004b93] font-mono">{student.rollNumber}</td>
                                        <td className="font-semibold text-slate-700 uppercase truncate max-w-[200px]">{student.name}</td>
                                        <td className="text-center">{student.branch}</td>
                                        <td className="text-center text-xs">{student.gender || '—'}</td>
                                        <td className="px-2">
                                            <select
                                                value={dropdownValue}
                                                onChange={(e) => handleStatusChange(student.id, e.target.value, student.name)}
                                                className="erp-input w-full h-7 py-0 font-bold uppercase text-[10px] border-slate-200"
                                            >
                                                {STATUS_OPTIONS.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                                            </select>
                                        </td>
                                        <td className="py-1">
                                            <div className="flex flex-col gap-0.5">
                                                {(row.history || []).map((h: any, i: number) => (
                                                    <div key={i} className="text-[9px] flex gap-2 border-b border-slate-50 pb-0.5 last:border-0">
                                                        <span className="font-bold text-slate-400 w-24">{h.academicYear} ({h.semester}):</span>
                                                        <span className={`font-black ${h.status === 'PROMOTED' ? 'text-emerald-600' : 'text-rose-600'}`}>{h.status}</span>
                                                    </div>
                                                ))}
                                                {(!row.history || row.history.length === 0) && <span className="text-[10px] italic text-slate-400">No History</span>}
                                            </div>
                                        </td>
                                        <td className="text-right px-3">
                                            <Link to={`/students/${student.id}`} className="text-slate-400 hover:text-[#004b93]"><Edit className="w-4 h-4" /></Link>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>

            <AlertDialog open={confirmDialog.isOpen} onOpenChange={(open: boolean) => !open && setConfirmDialog(prev => ({ ...prev, isOpen: false }))}>
                <AlertDialogContent className="border-2 border-[#004b93]">
                    <AlertDialogHeader>
                        <AlertDialogTitle className="text-[#004b93] font-black uppercase">Institutional Status Overwrite</AlertDialogTitle>
                        <AlertDialogDescription className="text-slate-800 font-medium">
                            Proceed with changing <b>{confirmDialog.studentName}</b> status to <b className="text-rose-600 underline">{confirmDialog.newStatus}</b>? 
                            This audit log will be permanently stored for AY {academicYear} / {semester}.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter className="bg-slate-50 p-3 -mx-6 -mb-6 border-t border-slate-200 mt-4 rounded-b-lg">
                        <AlertDialogCancel className="erp-btn-rect bg-slate-200 hover:bg-slate-300 !text-slate-700 uppercase font-black text-[10px]">Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={confirmStatusChange} className="erp-btn-rect bg-[#004b93] hover:bg-black !text-white uppercase font-black text-[10px]">
                            Authorize Change
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
