import React, { useState, useEffect, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { ProgramSelector, BranchSelector, BatchSelector, SectionSelector } from "../components/academics/ReportFilters";
import { Loader2, Save, AlertCircle, Calculator, Eye, FileText, Lock, Unlock, ShieldAlert, CheckCircle2 } from "lucide-react";
import { useToast } from "../hooks/use-toast";
import { formatSemester } from "../lib/utils";
import { authFetch, useAuth } from "../hooks/use-auth";
import { generateLabInternalPDF, LabInternalMarkRow, LabInternalContext } from "../lib/pdfLabGenerator";
import { generateProjectInternalPDF, ProjectInternalMarkRow, ProjectInternalContext } from "../lib/pdfProjectGenerator";
import { numberToWords } from "../lib/numberToWords";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../../components/ui/dialog";

interface LocalMarkRow {
    studentId: number;
    rollNumber: string;
    name: string;
    labDailyMarks: number;
    labRecordMarks: number;
    labInternalMarks: number;
    labVivaMarks: number;
    prcAssessmentMarks?: number;
    reportMarks?: number;
    seminarMarks?: number;
    totalMarks: number;
    isDirty?: boolean;
    isLocked?: boolean;
    saveStatus?: 'idle' | 'saving' | 'saved' | 'error';
}

export default function LabInternalMarks() {
    const { toast } = useToast();

    const { user } = useAuth();
    const isAdmin = user?.isAdmin || false;

    // Filters State
    const [program, setProgram] = useState("B.TECH");
    const [branch, setBranch] = useState("");
    const [batch, setBatch] = useState("");
    const [semester, setSemester] = useState("");
    const [section, setSection] = useState("");
    const [subjectCode, setSubjectCode] = useState("");

    const [marksData, setMarksData] = useState<LocalMarkRow[]>([]);
    const [isBulkSaving, setIsBulkSaving] = useState(false);
    const [previewPdfUrl, setPreviewPdfUrl] = useState<string | null>(null);
    const saveTimeoutsRef = useRef<{ [key: number]: NodeJS.Timeout }>({});

    const isProjectMode = semester === "VIII" && program === "B.TECH";

    // Fetch mapped subjects
    const { data: mappings } = useQuery<any[]>({
        queryKey: ['/api/v1/examcell/faculty-mappings'],
        queryFn: () => authFetch('/api/v1/examcell/faculty-mappings')
    });

    const availableSubjects = mappings?.filter((m: any) =>
        (!branch || m.branch === branch) &&
        (!semester || m.semester === semester) &&
        (!batch || m.batch === batch) &&
        (!section || m.section === section)
    ) || [];

    const uniqueSubjects = Array.from(new Map(availableSubjects.map((item: any) => [item.subjectCode, item])).values())
        .filter((item: any) => {
            const name = (item.subjectName || "").toUpperCase();
            if (isProjectMode) {
                return name.includes("PROJECT") || name.includes("SEMINAR") || name.includes("MINI PROJECT");
            }
            return ["LAB", "LABORATORY", "FULL STACK", "PYTHON", "SOFT SKILL", "DESIGN THINKING", "INNOVATION"].some(kw => name.includes(kw));
        });
    const currentSubject = availableSubjects.find((m: any) => m.subjectCode === subjectCode) || null;
    const assignedFacultyName = currentSubject?.facultyName || "Unknown Faculty";
    const subjectName = currentSubject?.subjectName || (isProjectMode ? "Project Work" : "Lab Subject");
    const isDesignThinking = subjectName.toUpperCase().includes("DESIGN THINKING") || subjectName.toUpperCase().includes("INNOVATION");

    const canFetch = !!(branch && semester && subjectCode && batch);

    // Fetch existing mid marks for LAB
    const { data: queryData, isLoading, isFetching, refetch } = useQuery({
        queryKey: ['/api/v1/examcell/mid-marks', { semester, branch, subjectCode, midType: 'LAB', batch, section }],
        queryFn: async () => {
            const qs = new URLSearchParams({
                semester, branch, subjectCode, midType: 'LAB', batch, section
            }).toString();
            const res = await authFetch(`/api/v1/examcell/mid-marks?${qs}`);
            return res;
        },
        enabled: canFetch,
    });

    useEffect(() => {
        if (queryData?.marks) {
            setMarksData(queryData.marks.map((m: any) => ({
                ...m,
                labDailyMarks: m.labDailyMarks || 0,
                labRecordMarks: m.labRecordMarks || 0,
                labInternalMarks: m.labInternalMarks || 0,
                labVivaMarks: m.labVivaMarks || 0,
                prcAssessmentMarks: m.prcAssessmentMarks || 0,
                reportMarks: m.reportMarks || 0,
                seminarMarks: m.seminarMarks || 0,
                totalMarks: m.totalMarks || 0,
                isLocked: m.isLocked || false,
                saveStatus: 'idle',
                isDirty: false
            })));
        } else {
            setMarksData([]);
        }
    }, [queryData]);

    const allRowsLocked = marksData.length > 0 && marksData.every(m => m.isLocked);
    const isDepartmentFrozen = queryData?.exam?.isFrozen === true || queryData?.exam?.isFinalLocked === true || allRowsLocked;
    const canOverrideFreeze = isAdmin || user?.username === 'examcell';
    const isFrozen = isDepartmentFrozen && !canOverrideFreeze;
    const showOverrideBanner = isDepartmentFrozen && canOverrideFreeze;

    const validateRow = (row: LocalMarkRow) => {
        if (isProjectMode) {
            return (
                (row.prcAssessmentMarks || 0) >= 0 && (row.prcAssessmentMarks || 0) <= 30 &&
                (row.reportMarks || 0) >= 0 && (row.reportMarks || 0) <= 15 &&
                (row.seminarMarks || 0) >= 0 && (row.seminarMarks || 0) <= 15 &&
                row.totalMarks <= 60
            );
        }
        if (isDesignThinking) {
            return (row.labDailyMarks || 0) >= 0 && (row.labDailyMarks || 0) <= 7.5;
        }
        return (
            (row.labDailyMarks || 0) >= 0 && (row.labDailyMarks || 0) <= 5 &&
            (row.labRecordMarks || 0) >= 0 && (row.labRecordMarks || 0) <= 5 &&
            (row.labInternalMarks || 0) >= 0 && (row.labInternalMarks || 0) <= 15 &&
            (row.labVivaMarks || 0) >= 0 && (row.labVivaMarks || 0) <= 5 &&
            row.totalMarks <= 30
        );
    };

    const handleCellChange = (index: number, field: keyof LocalMarkRow, value: string) => {
        if (isFrozen || (marksData[index].isLocked && !canOverrideFreeze)) return; // Block edits when frozen or locally locked
        if (value.includes('-')) return; // Ignore any negative sign inputs

        let numValue: any = value === '' ? '' : parseFloat(value);
        if (numValue !== '' && isNaN(numValue)) numValue = 0;

        setMarksData(prev => {
            const newData = [...prev];
            const row = { ...newData[index] };
            (row as any)[field] = numValue;

            if (isDesignThinking) {
                row.totalMarks = Number((Number(row.labDailyMarks) || 0).toFixed(2));
            } else if (isProjectMode) {
                row.totalMarks = Number((
                    (Number(row.prcAssessmentMarks) || 0) +
                    (Number(row.reportMarks) || 0) +
                    (Number(row.seminarMarks) || 0)
                ).toFixed(2));
            } else {
                row.totalMarks = Number((
                    (Number(row.labDailyMarks) || 0) +
                    (Number(row.labRecordMarks) || 0) +
                    (Number(row.labInternalMarks) || 0) +
                    (Number(row.labVivaMarks) || 0)
                ).toFixed(2));
            }

            row.isDirty = true;
            row.saveStatus = 'idle';
            newData[index] = row;
            return newData;
        });
    };

    const handleBulkSave = async () => {
        if (isFrozen) { toast({ title: "Frozen", description: "Marks are frozen and cannot be modified.", variant: "destructive" }); return; }
        if (marksData.length === 0) return;

        // If admin/examcell, allow saving all marks. Otherwise, only unlocked marks.
        const editableMarks = marksData.filter(m => canOverrideFreeze ? true : !m.isLocked);
        if (editableMarks.length === 0) {
             toast({ title: "Info", description: "All marks are already locked. No changes to save." });
             return;
        }

        if (!window.confirm(`Are you sure you want to save and lock marks for ${editableMarks.length} students? Any empty marks will be saved as 0.`)) return;

        // Auto validation check before sending
        const invalidRows = editableMarks.filter(m => !validateRow(m));
        if (invalidRows.length > 0) {
            toast({ title: "Validation Error", description: "Some edited marks exceed their limits. Please fix them before saving.", variant: "destructive" });
            return;
        }

        setIsBulkSaving(true);
        try {
            const updates = editableMarks.map(m => ({
                studentId: m.studentId,
                labDailyMarks: (m.labDailyMarks as any) === '' ? 0 : m.labDailyMarks,
                labRecordMarks: (m.labRecordMarks as any) === '' ? 0 : m.labRecordMarks,
                labInternalMarks: (m.labInternalMarks as any) === '' ? 0 : m.labInternalMarks,
                labVivaMarks: (m.labVivaMarks as any) === '' ? 0 : m.labVivaMarks,
                prcAssessmentMarks: (m.prcAssessmentMarks as any) === '' ? 0 : m.prcAssessmentMarks,
                reportMarks: (m.reportMarks as any) === '' ? 0 : m.reportMarks,
                seminarMarks: (m.seminarMarks as any) === '' ? 0 : m.seminarMarks,
                totalMarks: m.totalMarks
            }));

            await authFetch('/api/v1/examcell/internal-marks/lab/bulk', {
                method: 'POST',
                body: JSON.stringify({ semester, branch, subjectCode, batch, updates })
            });

            toast({ title: "Success", description: "Marks saved successfully!" });
            setMarksData(prev => prev.map(m => 
                editableMarks.some((d: any) => d.studentId === m.studentId) 
                    ? { ...m, saveStatus: 'saved', isDirty: false } 
                    : m
            ));
            // Refetch to get updated exam state (isFinalLocked) so frozen banner appears
            refetch();
        } catch (err: any) {
            toast({ title: "Error", description: err.message, variant: "destructive" });
        } finally {
            setIsBulkSaving(false);
        }
    };

    const handleKeyNav = (e: React.KeyboardEvent<HTMLInputElement>, rowIndex: number, fieldName: string) => {
        if (e.key === 'Enter' || e.key === 'ArrowDown') {
            e.preventDefault();
            const nextInput = document.querySelector(`input[data-row="${rowIndex + 1}"][data-field="${fieldName}"]`) as HTMLInputElement;
            if (nextInput) { nextInput.focus(); nextInput.select(); }
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            const prevInput = document.querySelector(`input[data-row="${rowIndex - 1}"][data-field="${fieldName}"]`) as HTMLInputElement;
            if (prevInput) { prevInput.focus(); prevInput.select(); }
        }
    };

    const generatePDF = async (forPreview: boolean = false) => {
        if (marksData.length === 0) return null;

        const invalidRows = marksData.filter(m => !validateRow(m));
        if (invalidRows.length > 0) {
            toast({ title: "Validation Error", description: "Fix invalid marks before generating PDF.", variant: "destructive" });
            return null;
        }

        const matchYear = batch.match(/^20\d{2}/);
        const startYearNum = matchYear ? parseInt(matchYear[0]) : 2024;

        let romanYear = "I";
        if (semester === "III" || semester === "IV") romanYear = "II";
        else if (semester === "V" || semester === "VI") romanYear = "III";
        else if (semester === "VII" || semester === "VIII") romanYear = "IV";

        let romanSem = semester === "II" || semester === "IV" || semester === "VI" || semester === "VIII" ? "II" : "I";

        if (isProjectMode) {
            const pdfData: ProjectInternalMarkRow[] = marksData.map((row, idx) => ({
                sNo: idx + 1,
                rollNumber: row.rollNumber,
                name: row.name,
                prcAssessment: row.prcAssessmentMarks || 0,
                report: row.reportMarks || 0,
                seminar: row.seminarMarks || 0,
                total: row.totalMarks || 0,
            }));

            const context: ProjectInternalContext = {
                projectName: subjectName,
                projectCode: subjectCode,
                facultyName: assignedFacultyName,
                dateOfExam: new Date().toLocaleDateString('en-GB'),
                academicYear: `${startYearNum}-${startYearNum + 1}`,
                yearSem: `${romanYear} Year ${romanSem} Sem`,
                branch: branch,
                regulation: "R23",
                program: program,
                batch: batch
            };

            return generateProjectInternalPDF(pdfData, context, forPreview);
        } else {
            const pdfData: LabInternalMarkRow[] = marksData.map((row, idx) => ({
                sNo: idx + 1,
                rollNumber: row.rollNumber,
                name: row.name || "",
                dayToDay: row.labDailyMarks || 0,
                record: row.labRecordMarks || 0,
                labTest: row.labInternalMarks || 0,
                viva: row.labVivaMarks || 0,
                total: row.totalMarks || 0,
                inWords: numberToWords(Math.round(row.totalMarks || 0))
            }));

            const context: LabInternalContext = {
                labName: subjectName,
                labCode: subjectCode,
                facultyName: assignedFacultyName,
                dateOfExam: new Date().toLocaleDateString('en-GB'),
                academicYear: `${startYearNum}-${startYearNum + 1}`,
                yearSem: `${romanYear} Year ${romanSem} Sem`,
                branch: branch,
                regulation: "R23",
                program: program,
                batch: batch,
                reportType: isDesignThinking ? "DESIGN THINKING EVALUATION" : "LAB INTERNAL EVALUATION"
            };

            return generateLabInternalPDF(pdfData, context, forPreview);
        }
    };

    const previewPDF = async () => {
        const url = await generatePDF(true);
        if (url) setPreviewPdfUrl(url);
    };

    return (
        <div className="max-w-7xl mx-auto space-y-6">
            <h1 className="text-3xl font-display font-bold text-slate-900">
                {isProjectMode ? "Project Internal Marks" : "Lab Internal Marks"}
            </h1>
            <p className="text-slate-500 mt-1">Enter marks and generate formatted PDFs for {isProjectMode ? "Projects" : "Lab Internals"}.</p>

            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 items-end">
                <div className="w-full"><ProgramSelector value={program} onChange={setProgram} /></div>
                <div className="w-full"><BranchSelector value={branch} onChange={setBranch} /></div>
                <div className="w-full"><BatchSelector value={batch} onChange={setBatch} program={program} /></div>
                <div className="space-y-2 w-full">
                    <label className="text-xs font-medium text-slate-500 uppercase tracking-wider">Semester</label>
                    <select value={semester} onChange={(e) => setSemester(e.target.value)} className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-primary/20 transition-all">
                        <option value="">Select</option>
                        {["I", "II", "III", "IV", "V", "VI", "VII", "VIII"].map(s => <option key={s} value={s}>{formatSemester(s, program)}</option>)}
                    </select>
                </div>
                <div className="w-full"><SectionSelector value={section} onChange={setSection} batch={batch} branch={branch} /></div>
                <div className="space-y-2 w-full">
                    <label className="text-xs font-medium text-slate-500 uppercase tracking-wider">Subject</label>
                    <select value={subjectCode} onChange={(e) => setSubjectCode(e.target.value)} className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-primary/20 transition-all">
                        <option value="">Select Subject</option>
                        {uniqueSubjects.map((s: any) => (
                            <option key={s.subjectCode} value={s.subjectCode}>{s.subjectCode} - {s.subjectName || "Subject"}</option>
                        ))}
                    </select>
                </div>
            </div>

            {isLoading || isFetching ? (
                <div className="bg-white rounded-3xl p-16 flex justify-center shadow-sm">
                    <Loader2 className="w-10 h-10 animate-spin text-primary" />
                </div>
            ) : marksData.length > 0 ? (
                <div className="bg-white border border-slate-100 rounded-3xl shadow-sm overflow-hidden">
                    {isFrozen && (
                        <div className="bg-red-50 border-b border-red-200 px-6 py-3 flex items-center gap-3">
                            <Lock className="w-5 h-5 text-red-500" />
                            <span className="text-sm font-semibold text-red-700">Marks are finalized and frozen. Editing is disabled. Contact Admin to unfreeze.</span>
                        </div>
                    )}
                    {showOverrideBanner && (
                        <div className="bg-orange-50 border-b border-orange-200 px-6 py-3 flex items-center gap-3">
                            <Unlock className="w-5 h-5 text-orange-500" />
                            <span className="text-sm font-semibold text-orange-700">Marks are finalized by the department. As Admin/Examcell, you can override and edit these marks.</span>
                        </div>
                    )}
                    <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-slate-50">
                        <span className="text-sm font-medium text-slate-600 flex items-center gap-2">
                            <Calculator className="w-4 h-4 text-blue-500" /> Max Total {isProjectMode ? "(60M)" : "(30M)"}
                        </span>
                        <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
                            <button onClick={handleBulkSave} disabled={isBulkSaving} className="px-6 py-2 w-full sm:w-auto justify-center rounded-xl text-sm font-medium bg-emerald-600 text-white hover:bg-emerald-700 flex flex-row items-center gap-2">
                                {isBulkSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} Save
                            </button>
                            <button onClick={previewPDF} className="px-6 py-2 w-full sm:w-auto justify-center rounded-xl text-sm font-medium bg-blue-600 text-white hover:bg-blue-700 flex flex-row items-center gap-2">
                                <Eye className="w-4 h-4" /> Preview PDF
                            </button>
                        </div>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead className="sticky top-0 bg-slate-100 z-10 shadow-sm border-b border-slate-200">
                                <tr className="text-sm font-semibold text-slate-600">
                                    <th className="p-3 w-16 text-center">S.No</th>
                                    <th className="p-3 w-32">Roll No</th>
                                    <th className="p-3 min-w-[150px]">Student Name</th>
                                    {isProjectMode ? (
                                        <>
                                            <th className="p-3 w-32 text-center text-xs">PRC Assessment<br />(Max 30)</th>
                                            <th className="p-3 w-32 text-center text-xs">Report<br />(Max 15)</th>
                                            <th className="p-3 w-32 text-center text-xs">Seminar<br />(Max 15)</th>
                                        </>
                                    ) : isDesignThinking ? (
                                        <>
                                            <th className="p-3 w-48 text-center text-xs text-primary font-bold">Day to Day<br />(Max 7.5)</th>
                                        </>
                                    ) : (
                                        <>
                                            <th className="p-3 w-28 text-center text-xs">Day to Day<br />(Max 5)</th>
                                            <th className="p-3 w-28 text-center text-xs">Record<br />(Max 5)</th>
                                            <th className="p-3 w-28 text-center text-xs">Lab Test<br />(Max 15)</th>
                                            <th className="p-3 w-28 text-center text-xs">Viva<br />(Max 5)</th>
                                        </>
                                    )}
                                    <th className="p-3 w-28 text-center text-xs text-primary">Total<br />(Max {isProjectMode ? "60" : "30"})</th>
                                    <th className="p-3 w-16 text-center text-xs">Status</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100/60">
                                {marksData.map((row, idx) => (
                                    <tr key={row.studentId} className="hover:bg-slate-50/50">
                                        <td className="p-3 text-center text-xs text-slate-400">{idx + 1}</td>
                                        <td className="p-3 font-medium text-xs text-slate-700">{row.rollNumber}</td>
                                        <td className="p-3 text-xs text-slate-600 truncate">{row.name}</td>
                                        
                                        {isProjectMode ? (
                                            <>
                                                <td className="p-2">
                                                    <input type="number" min="0" max="30" step="1" data-row={idx} data-field="prcAssessmentMarks"
                                                        value={row.prcAssessmentMarks ?? ''} onChange={(e) => handleCellChange(idx, 'prcAssessmentMarks', e.target.value)}
                                                        onKeyDown={(e) => handleKeyNav(e, idx, 'prcAssessmentMarks')}
                                                        className={`w-full text-center p-2 rounded border font-medium outline-none text-sm transition-all ${(row.prcAssessmentMarks || 0) > 30 ? 'border-red-400 bg-red-50 text-red-600' : 'border-slate-200 bg-white'}`}
                                                    />
                                                </td>
                                                <td className="p-2">
                                                    <input type="number" min="0" max="15" step="1" data-row={idx} data-field="reportMarks"
                                                        value={row.reportMarks ?? ''} onChange={(e) => handleCellChange(idx, 'reportMarks', e.target.value)}
                                                        onKeyDown={(e) => handleKeyNav(e, idx, 'reportMarks')}
                                                        className={`w-full text-center p-2 rounded border font-medium outline-none text-sm transition-all ${(row.reportMarks || 0) > 15 ? 'border-red-400 bg-red-50 text-red-600' : 'border-slate-200 bg-white'}`}
                                                    />
                                                </td>
                                                <td className="p-2">
                                                    <input type="number" min="0" max="15" step="1" data-row={idx} data-field="seminarMarks"
                                                        value={row.seminarMarks ?? ''} onChange={(e) => handleCellChange(idx, 'seminarMarks', e.target.value)}
                                                        onKeyDown={(e) => handleKeyNav(e, idx, 'seminarMarks')}
                                                        className={`w-full text-center p-2 rounded border font-medium outline-none text-sm transition-all ${(row.seminarMarks || 0) > 15 ? 'border-red-400 bg-red-50 text-red-600' : 'border-slate-200 bg-white'}`}
                                                    />
                                                </td>
                                            </>
                                        ) : isDesignThinking ? (
                                            <>
                                                <td className="p-2" colSpan={4}>
                                                    <input type="number" min="0" max="7.5" step="0.1" data-row={idx} data-field="labDailyMarks"
                                                        value={row.labDailyMarks ?? ''} onChange={(e) => handleCellChange(idx, 'labDailyMarks', e.target.value)}
                                                        onKeyDown={(e) => handleKeyNav(e, idx, 'labDailyMarks')}
                                                        className={`w-full text-center p-2 rounded border font-bold outline-none text-sm transition-all ${(row.labDailyMarks || 0) > 7.5 ? 'border-red-400 bg-red-50 text-red-600' : 'border-slate-200 bg-primary/5'}`}
                                                    />
                                                </td>
                                            </>
                                        ) : (
                                            <>
                                                <td className="p-2">
                                                    <input type="number" min="0" max="5" step="1" data-row={idx} data-field="labDailyMarks"
                                                        value={row.labDailyMarks ?? ''} onChange={(e) => handleCellChange(idx, 'labDailyMarks', e.target.value)}
                                                        onKeyDown={(e) => handleKeyNav(e, idx, 'labDailyMarks')}
                                                        className={`w-full text-center p-2 rounded border font-medium outline-none text-sm transition-all ${(row.labDailyMarks || 0) > 5 ? 'border-red-400 bg-red-50 text-red-600' : 'border-slate-200 bg-white'}`}
                                                    />
                                                </td>
                                                <td className="p-2">
                                                    <input type="number" min="0" max="5" step="1" data-row={idx} data-field="labRecordMarks"
                                                        value={row.labRecordMarks ?? ''} onChange={(e) => handleCellChange(idx, 'labRecordMarks', e.target.value)}
                                                        onKeyDown={(e) => handleKeyNav(e, idx, 'labRecordMarks')}
                                                        className={`w-full text-center p-2 rounded border font-medium outline-none text-sm transition-all ${(row.labRecordMarks || 0) > 5 ? 'border-red-400 bg-red-50 text-red-600' : 'border-slate-200 bg-white'}`}
                                                    />
                                                </td>
                                                <td className="p-2">
                                                    <input type="number" min="0" max="15" step="1" data-row={idx} data-field="labInternalMarks"
                                                        value={row.labInternalMarks ?? ''} onChange={(e) => handleCellChange(idx, 'labInternalMarks', e.target.value)}
                                                        onKeyDown={(e) => handleKeyNav(e, idx, 'labInternalMarks')}
                                                        className={`w-full text-center p-2 rounded border font-medium outline-none text-sm transition-all ${(row.labInternalMarks || 0) > 15 ? 'border-red-400 bg-red-50 text-red-600' : 'border-slate-200 bg-white'}`}
                                                    />
                                                </td>
                                                <td className="p-2">
                                                    <input type="number" min="0" max="5" step="1" data-row={idx} data-field="labVivaMarks"
                                                        value={row.labVivaMarks ?? ''} onChange={(e) => handleCellChange(idx, 'labVivaMarks', e.target.value)}
                                                        onKeyDown={(e) => handleKeyNav(e, idx, 'labVivaMarks')}
                                                        className={`w-full text-center p-2 rounded border font-medium outline-none text-sm transition-all ${(row.labVivaMarks || 0) > 5 ? 'border-red-400 bg-red-50 text-red-600' : 'border-slate-200 bg-white'}`}
                                                    />
                                                </td>
                                            </>
                                        )}
                                        <td className={`p-3 text-center font-bold rounded-md ${row.totalMarks > (isProjectMode ? 60 : isDesignThinking ? 7.5 : 30) ? 'text-red-500 bg-red-50' : 'text-primary bg-primary/5'}`}>
                                            {row.totalMarks}
                                        </td>
                                        <td className="p-4 text-center">
                                            <div className="flex justify-center items-center gap-2 h-full">
                                                {row.isLocked && <span title="Locked"><Lock className="w-4 h-4 text-slate-400" /></span>}
                                                {!row.isLocked && row.saveStatus === 'saving' && <Loader2 className="w-4 h-4 text-slate-400 animate-spin" />}
                                                {!row.isLocked && row.saveStatus === 'saved' && <CheckCircle2 className="w-4 h-4 text-emerald-500" />}
                                                {!row.isLocked && row.saveStatus === 'error' && <AlertCircle className="w-4 h-4 text-red-500" />}
                                                {!row.isLocked && (row.saveStatus === 'idle' && row.isDirty) && <div className="w-2 h-2 rounded-full bg-amber-400"></div>}
                                                {!row.isLocked && (row.saveStatus === 'idle' && !row.isDirty && row.totalMarks === 0) && <div className="w-1.5 h-1.5 rounded-full bg-slate-300"></div>}
                                                {!row.isLocked && (row.saveStatus === 'idle' && !row.isDirty && row.totalMarks > 0) && <CheckCircle2 className="w-4 h-4 text-slate-300" />}
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            ) : canFetch ? (
                <div className="bg-white border rounded-3xl p-16 flex flex-col items-center">
                    <p>No students found.</p>
                </div>
            ) : null}



            <Dialog open={!!previewPdfUrl} onOpenChange={(open: boolean) => !open && setPreviewPdfUrl(null)}>
                <DialogContent className="max-w-6xl h-[90vh] flex flex-col p-0 overflow-hidden">
                    <DialogHeader className="p-4 border-b bg-slate-50 shrink-0">
                        <DialogTitle className="text-xl font-bold font-display text-slate-800">Lab Marks Preview</DialogTitle>
                    </DialogHeader>
                    <div className="flex-1 bg-slate-200">
                        {previewPdfUrl && (
                            <iframe src={`${previewPdfUrl}#toolbar=0`} className="w-full h-full border-0" />
                        )}
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}

