import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Loader2, Printer, Search, ArrowLeft, Edit } from "lucide-react";
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
        enabled: false, // Only fetch when "Show Students" is clicked
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
        setConfirmDialog({
            isOpen: true,
            studentId,
            newStatus,
            studentName
        });
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

        const match = batch.match(/^20(\d{2})/);
        if (match && semester && semester !== "ALUMNI") {
            const startYear = parseInt("20" + match[1]);
            const now = new Date();
            const currentYear = now.getFullYear();
            const currentMonth = now.getMonth(); // 0 corresponds to Jan, 4 corresponds to May

            let maxSemIndex = (currentYear - startYear) * 2;
            if (currentMonth < 4) { // Before May
                maxSemIndex -= 1;
            }

            const semestersConst = ["I", "II", "III", "IV", "V", "VI", "VII", "VIII"];
            const requestedSemIndex = semestersConst.indexOf(semester);

            // Limit logical warnings to ongoing batches
            if (maxSemIndex >= 0 && maxSemIndex <= 7 && requestedSemIndex > maxSemIndex) {
                alert(`Students are currently in ${semestersConst[maxSemIndex]} semester, not yet promoted to ${semester}.`);
                return;
            }
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

        // Load and embed the college header image
        let startY = 10;
        try {
            const img = new Image();
            img.crossOrigin = 'anonymous';
            await new Promise<void>((resolve, reject) => {
                img.onload = () => resolve();
                img.onerror = () => reject();
                img.src = '/college_header_compressed.jpg';
            });
            const canvas = document.createElement('canvas');
            canvas.width = img.width;
            canvas.height = img.height;
            const ctx = canvas.getContext('2d')!;
            ctx.drawImage(img, 0, 0);
            const imgData = canvas.toDataURL('image/jpeg');
            const imgWidth = pageWidth - 20;
            const imgHeight = (img.height / img.width) * imgWidth;
            doc.addImage(imgData, 'JPEG', 10, 5, imgWidth, imgHeight);
            startY = 5 + imgHeight + 3;
        } catch {
            // Fallback: text header if image fails
            doc.setFontSize(14);
            doc.setFont("helvetica", "bold");
            doc.text("SRI MITTAPALLI COLLEGE OF ENGINEERING", pageWidth / 2, 12, { align: "center" });
            doc.setFontSize(9);
            doc.setFont("helvetica", "normal");
            doc.text("Tummalapalem, Guntur Dt., A.P. — Affiliated to JNTUK, Approved by AICTE", pageWidth / 2, 18, { align: "center" });
            startY = 22;
        }

        // Report Title
        doc.setFontSize(13);
        doc.setFont("helvetica", "bold");
        doc.text("NOMINAL ROLLS", pageWidth / 2, startY, { align: "center" });
        startY += 6;

        // Subtitle with filters
        doc.setFontSize(10);
        doc.setFont("helvetica", "normal");
        let subtitle = `Program: ${program} | Batch: ${batch}`;
        if (branch) subtitle += ` | Branch: ${branch}`;
        if (section) subtitle += ` | Section: ${section}`;
        if (academicYear) subtitle += ` | Academic Year: ${academicYear}`;
        if (semester) subtitle += ` | Semester: ${formatSemester(semester, program)}`;
        doc.text(subtitle, pageWidth / 2, startY, { align: "center" });
        startY += 6;

        const tableColumn = ["S.No", "HTNo", "Name", "Branch", "Section", "Gender", "Phone", "Address", "Status"];
        const tableRows: any[] = [];

        filteredRolls.forEach((row: any, idx: number) => {
            const s = row.student;
            const currentStatus = row.currentStatus === 'PROMOTED' ? 'ACTIVE' : (row.currentStatus || 'ACTIVE').toUpperCase();
            tableRows.push([
                idx + 1,
                s.rollNumber,
                s.name?.toUpperCase(),
                s.branch,
                s.section || '-',
                s.gender || '-',
                s.phone || '-',
                s.address || '-',
                currentStatus
            ]);
        });

        autoTable(doc, {
            head: [tableColumn],
            body: tableRows,
            startY: startY,
            theme: 'grid',
            headStyles: { fillColor: [41, 128, 185], textColor: 255, fontStyle: 'bold', fontSize: 8 },
            styles: { fontSize: 8, cellPadding: 2 },
            columnStyles: {
                0: { cellWidth: 12 },
                7: { cellWidth: 50 },
            },
            alternateRowStyles: { fillColor: [245, 247, 250] },
        });

        await saveJsPdfAndShare(doc, `Nominal_Rolls_${batch}_${branch || 'All'}${section ? `_${section}` : ''}.pdf`);
    };

    const activeStudents = nominalRolls?.filter((r: any) => !['LEFT', 'DETAINED', 'DEATH'].includes(r.currentStatus)).length || 0;
    const detainedStudents = nominalRolls?.filter((r: any) => r.currentStatus === 'DETAINED').length || 0;
    const leftStudents = nominalRolls?.filter((r: any) => r.currentStatus === 'LEFT').length || 0;
    const deathStudents = nominalRolls?.filter((r: any) => r.currentStatus === 'DEATH').length || 0;
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

    // Check if selected batch is alumni (> 4 years old)
    const isAlumni = React.useMemo(() => {
        if (!batch) return false;
        const match = batch.match(/^20(\d{2})/);
        if (!match) return false;
        const startYear = parseInt("20" + match[1]);
        const currentYear = new Date().getFullYear();
        return (currentYear - startYear) >= 4;
    }, [batch]);

    const semesters = program === "MCA"
        ? ["I", "II", "III", "IV"]
        : ["I", "II", "III", "IV", "V", "VI", "VII", "VIII"];

    // Derive academic years from batch (e.g. "2023-2027" → ["2023-2024", "2024-2025", "2025-2026", "2026-2027"])
    const academicYears = React.useMemo(() => {
        if (!batch) return [];
        const parts = batch.split('-');
        if (parts.length !== 2) return [];
        const startYear = parseInt(parts[0]);
        const endYear = parseInt(parts[1]);
        if (isNaN(startYear) || isNaN(endYear)) return [];
        const years: string[] = [];
        for (let y = startYear; y < endYear; y++) {
            years.push(`${y}-${y + 1}`);
        }
        return years;
    }, [batch]);

    // Reset academic year when batch changes and default to the current ongoing Academic Year
    React.useEffect(() => {
        if (!batch || academicYears.length === 0) {
            setAcademicYear("");
            return;
        }

        const now = new Date();
        const currentYear = now.getFullYear();
        const currentMonth = now.getMonth(); // 0 is Jan, 4 is May

        // Determine the real-world current academic year string
        const activeAcYear = currentMonth < 4 ? `${currentYear - 1}-${currentYear}` : `${currentYear}-${currentYear + 1}`;

        if (academicYears.includes(activeAcYear)) {
            setAcademicYear(activeAcYear);
        } else {
            const parts = batch.split('-');
            const endYear = parseInt(parts[1]);
            if (currentYear >= endYear) {
                setAcademicYear(academicYears[academicYears.length - 1]);
            } else {
                setAcademicYear(academicYears[0]);
            }
        }
    }, [batch, academicYears]);

    const STATUS_OPTIONS = [
        { value: 'ACTIVE', label: 'Active', bg: 'bg-[#d4edda]', text: 'text-[#155724]', border: 'border-[#c3e6cb]' },
        { value: 'DETAINED', label: 'Detained', bg: 'bg-[#f8d7da]', text: 'text-[#721c24]', border: 'border-[#f5c6cb]' },
        { value: 'LEFT', label: 'Left', bg: 'bg-[#fff3cd]', text: 'text-[#856404]', border: 'border-[#ffeeba]' },
        { value: 'DEATH', label: 'Death', bg: 'bg-[#e2e3e5]', text: 'text-[#383d41]', border: 'border-[#d6d8db]' },
    ];

    const getStatusStyle = (status: string) => {
        // Also map PROMOTED to Active styling
        const normalized = status === 'PROMOTED' ? 'ACTIVE' : (status || 'ACTIVE').toUpperCase();
        return STATUS_OPTIONS.find(s => s.value === normalized) || STATUS_OPTIONS[0];
    };

    return (
        <div className="max-w-7xl mx-auto space-y-8">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
                <div className="flex items-start gap-3">
                    <button onClick={() => window.history.back()} className="mt-1 p-2 bg-slate-50 hover:bg-slate-100 rounded-full transition-colors text-slate-500 hover:text-slate-900 border border-slate-200">
                        <ArrowLeft className="w-5 h-5" />
                    </button>
                    <div>
                        <h1 className="text-3xl font-display font-bold text-slate-900">Nominal Rolls</h1>
                        <p className="text-slate-500 mt-1">View detailed promotion histories and academic statuses for students.</p>
                    </div>
                </div>
            </div>

            {/* Main Content Area */}
            <div className="w-full">
                <div className="bg-white border border-slate-100 p-6 rounded-3xl shadow-xl shadow-slate-200/40 relative overflow-visible grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 items-end mb-8">
                    <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 to-cyan-500"></div>
                    <div className="space-y-2 w-full">
                        <label className="text-xs font-medium text-slate-500 uppercase tracking-wider">Academic Year</label>
                        <select value={academicYear} onChange={(e) => setAcademicYear(e.target.value)} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-primary/20 transition-all font-medium text-slate-700">
                            <option value="">All Academic Years</option>
                            {academicYears.map(y => (
                                <option key={y} value={y}>{y}</option>
                            ))}
                        </select>
                    </div>

                    <div className="w-full">
                        <BatchSelector value={batch} onChange={setBatch} program={program} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-primary/20 transition-all font-medium text-slate-700" />
                    </div>

                    <div className="w-full">
                        <ProgramSelector value={program} onChange={setProgram} />
                    </div>

                    <div className="space-y-2 w-full">
                        <label className="text-xs font-medium text-slate-500 uppercase tracking-wider">Branch</label>
                        <select
                            value={branch}
                            onChange={(e) => setBranch(e.target.value)}
                            className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-primary/20 transition-all font-medium text-slate-700"
                        >
                            <option value="">All Branches</option>
                            <option value="CSE">CSE</option>
                            <option value="CSE (AI&ML)">CSE (AI&ML)</option>
                            <option value="CSE (DS)">CSE (DS)</option>
                            <option value="ECE">ECE</option>
                            <option value="EEE">EEE</option>
                            <option value="IT">IT</option>
                            <option value="MECH">MECH</option>
                            <option value="CIVIL">CIVIL</option>
                        </select>
                    </div>

                    <div className="space-y-2 w-full">
                        <label className="text-xs font-medium text-slate-500 uppercase tracking-wider">Semester</label>
                        <select
                            value={semester}
                            onChange={(e) => setSemester(e.target.value)}
                            className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-primary/20 transition-all font-medium text-slate-700"
                        >
                            <option value="">All Semesters</option>
                            {semesters.map((sem) => (
                                <option key={sem} value={sem}>{formatSemester(sem, program)}</option>
                            ))}
                            {isAlumni && (
                                <option value="ALUMNI" className="font-bold text-blue-600">ALUMNI</option>
                            )}
                        </select>
                    </div>

                    <div className="w-full">
                        <SectionSelector value={section} onChange={setSection} batch={batch} branch={branch} />
                    </div>

                    <div className="flex flex-col sm:flex-row gap-4 w-full sm:col-span-2 lg:col-span-3 xl:col-span-2 items-end justify-end">
                        <button
                            onClick={exportNominalRollsPdf}
                            disabled={!filteredRolls || filteredRolls.length === 0}
                            className="w-full sm:w-auto px-6 py-2.5 rounded-xl font-medium bg-red-500 hover:bg-red-600 text-white shadow-md shadow-red-500/20 hover:-translate-y-0.5 transition-all flex items-center justify-center gap-2 disabled:opacity-50 text-sm whitespace-nowrap"
                        >
                            <Printer className="w-4 h-4" /> Download PDF
                        </button>
                        <button
                            onClick={handleShowStudents}
                            disabled={isLoading}
                            className="w-full sm:w-auto px-6 py-2.5 rounded-xl font-medium bg-gradient-to-br from-indigo-500 to-purple-600 text-white shadow-md shadow-indigo-500/20 hover:-translate-y-0.5 transition-all flex items-center justify-center gap-2 disabled:opacity-50 text-sm whitespace-nowrap"
                        >
                            {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />} Show Students
                        </button>
                    </div>
                </div>

                {/* Student List Table */}
                <div className="bg-white border border-slate-100 rounded-3xl shadow-xl shadow-slate-200/40 relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-emerald-400 to-teal-500"></div>
                    <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50 flex flex-col sm:flex-row justify-between items-center gap-4">
                        <h2 className="text-sm font-semibold text-slate-800">Student List</h2>
                        <div className="flex items-center gap-4 text-xs font-semibold">
                            <span className="text-emerald-600 flex items-center gap-1.5 px-3 py-1 bg-white rounded-full border border-emerald-100 shadow-sm"><span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>{activeStudents} Active</span>
                            {detainedStudents > 0 && <span className="text-orange-600 flex items-center gap-1.5 px-3 py-1 bg-white rounded-full border border-orange-100 shadow-sm"><span className="w-1.5 h-1.5 rounded-full bg-orange-500"></span>{detainedStudents} Detained</span>}
                            {leftStudents > 0 && <span className="text-rose-600 flex items-center gap-1.5 px-3 py-1 bg-white rounded-full border border-rose-100 shadow-sm"><span className="w-1.5 h-1.5 rounded-full bg-rose-500"></span>{leftStudents} Left</span>}
                            {deathStudents > 0 && <span className="text-slate-600 flex items-center gap-1.5 px-3 py-1 bg-white rounded-full border border-slate-200 shadow-sm"><span className="w-1.5 h-1.5 rounded-full bg-slate-500"></span>{deathStudents} Dec.</span>}
                            <span className="text-indigo-600 flex items-center gap-1.5 pl-4 ml-1 border-l border-slate-200"><span className="w-1.5 h-1.5 rounded-full bg-indigo-500"></span>{totalStudents} Total</span>
                        </div>
                    </div>
                    <div className="px-6 py-3 border-b border-slate-100 bg-white flex justify-between items-center sm:hidden md:flex">
                        <div className="relative w-full max-w-sm">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                <Search className="h-4 w-4 text-slate-400" />
                            </div>
                            <input
                                type="text"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                placeholder="Search by Name or Roll No..."
                                className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-primary/20 transition-all font-medium text-slate-700"
                            />
                        </div>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left align-middle text-slate-800 border-collapse">
                            <thead className="sticky top-0 bg-[#e9ecef] text-xs font-bold border-b-2 border-slate-300 z-10 shadow-sm">
                                <tr>
                                    <th className="px-3 py-2 border-r border-slate-300">Sno</th>
                                    <th className="px-3 py-2 border-r border-slate-300">HTNo</th>
                                    <th className="px-3 py-2 border-r border-slate-300 min-w-[200px]">Name of the Student</th>
                                    <th className="px-3 py-2 border-r border-slate-300">Branch</th>
                                    <th className="px-3 py-2 border-r border-slate-300">Gender</th>
                                    <th className="px-3 py-2 border-r border-slate-300 min-w-[120px]">Phone</th>
                                    <th className="px-3 py-2 border-r border-slate-300 min-w-[200px]">Address</th>
                                    <th className="px-3 py-2 border-r border-slate-300 min-w-[130px]">Current Status</th>
                                    <th className="px-3 py-2 border-r border-slate-300 min-w-[300px]">Promotion History</th>
                                    <th className="px-3 py-2 text-center">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-200">
                                {!filteredRolls ? (
                                    <tr>
                                        <td colSpan={10} className="px-3 py-8 text-center text-slate-500 italic">
                                            Click "Show Students" to fetch data.
                                        </td>
                                    </tr>
                                ) : filteredRolls.length === 0 ? (
                                    <tr>
                                        <td colSpan={10} className="px-3 py-8 text-center text-slate-500 font-medium bg-slate-50/50">
                                            No records found for the selected criteria.
                                        </td>
                                    </tr>
                                ) : (
                                    filteredRolls.map((row: any, idx: number) => {
                                        const student = row.student;
                                        const currentStatus = row.currentStatus;
                                        const history = row.history || [];
                                        // Normalize PROMOTED to ACTIVE for dropdown value
                                        const dropdownValue = currentStatus === 'PROMOTED' ? 'ACTIVE' : (currentStatus || 'ACTIVE').toUpperCase();
                                        const style = getStatusStyle(currentStatus);

                                        return (
                                            <tr key={student.id} className="hover:bg-[#f8f9fa] transition-colors group">
                                                <td className="px-3 py-2 border-r border-slate-200 text-center font-medium">{idx + 1}</td>
                                                <td className="px-3 py-2 border-r border-slate-200 font-medium text-[#17a2b8]">{student.rollNumber}</td>
                                                <td className="px-3 py-2 border-r border-slate-200 font-medium text-slate-900 uppercase">{student.name}</td>
                                                <td className="px-3 py-2 border-r border-slate-200 text-center">{student.branch}</td>
                                                <td className="px-3 py-2 border-r border-slate-200 text-center">{student.gender || '—'}</td>
                                                <td className="px-3 py-2 border-r border-slate-200">{student.phone || '—'}</td>
                                                <td className="px-3 py-2 border-r border-slate-200 text-xs">{student.address || '—'}</td>
                                                <td className="px-3 py-2 border-r border-slate-200">
                                                    <select
                                                        value={dropdownValue}
                                                        onChange={(e) => handleStatusChange(student.id, e.target.value, student.name)}
                                                        disabled={statusMutation.isPending}
                                                        className={`w-full px-2 py-1 rounded-md text-[11px] font-bold uppercase border cursor-pointer outline-none transition-all ${style.bg} ${style.text} ${style.border} hover:opacity-80 disabled:opacity-50`}
                                                    >
                                                        {STATUS_OPTIONS.map(opt => (
                                                            <option key={opt.value} value={opt.value}>{opt.label}</option>
                                                        ))}
                                                    </select>
                                                </td>
                                                <td className="px-3 py-2">
                                                    <div className="flex flex-col gap-1 text-[11px]">
                                                        {history.length > 0 ? history.map((h: any, i: number) => (
                                                            <div key={i} className="flex flex-wrap items-base gap-1 p-1 bg-white border border-slate-200 rounded-sm">
                                                                <span className="font-bold text-slate-700">
                                                                    {h.academicYear} ({formatSemester(h.semester, program)}):
                                                                </span>
                                                                <span className={`font-bold ${h.status === 'PROMOTED' ? 'text-[#28a745]' :
                                                                    h.status === 'DETAINED' ? 'text-[#dc3545]' :
                                                                        h.status === 'DEATH' ? 'text-[#6c757d]' : 'text-[#ffc107]'
                                                                    }`}>
                                                                    {h.status}
                                                                </span>
                                                                {h.reason && <span className="text-slate-500 italic block w-full">- {h.reason}</span>}
                                                            </div>
                                                        )) : (
                                                            <span className="text-slate-400 italic">No promotion records</span>
                                                        )}
                                                    </div>
                                                </td>
                                                <td className="px-3 py-2 text-center">
                                                    <Link to={`/students/${student.id}`}
                                                        className="inline-flex items-center justify-center p-2 rounded-lg text-primary hover:bg-primary/10 transition-colors tooltip-trigger"
                                                        title="Edit Student Profile"
                                                    >
                                                        <Edit className="w-4 h-4" />
                                                    </Link>
                                                </td>
                                            </tr>
                                        )
                                    })
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            <AlertDialog open={confirmDialog.isOpen} onOpenChange={(isOpen: boolean) => !isOpen && setConfirmDialog(prev => ({ ...prev, isOpen: false }))}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Change Student Status</AlertDialogTitle>
                        <AlertDialogDescription>
                            Are you sure you want to change the status of <strong>{confirmDialog.studentName}</strong> to <strong>{confirmDialog.newStatus?.toUpperCase()}</strong>?
                            This action will be recorded in the student's promotion history for the academic year {academicYear} / {semester}.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={statusMutation.isPending}>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={confirmStatusChange}
                            disabled={statusMutation.isPending}
                            className="bg-primary hover:bg-primary/90 text-white"
                        >
                            {statusMutation.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                            Confirm Change
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}


