import React, { useState, useEffect, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { ProgramSelector, BranchSelector, BatchSelector, SectionSelector } from "../components/academics/ReportFilters";
import { Loader2, Save, AlertCircle, Eye, Lock, Activity, CheckCircle2 } from "lucide-react";
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

    const [program, setProgram] = useState("B.TECH");
    const [branch, setBranch] = useState("");
    const [batch, setBatch] = useState("");
    const [semester, setSemester] = useState("");
    const [section, setSection] = useState("");
    const [subjectCode, setSubjectCode] = useState("");
    const [marksData, setMarksData] = useState<LocalMarkRow[]>([]);
    const [isBulkSaving, setIsBulkSaving] = useState(false);
    const [previewPdfUrl, setPreviewPdfUrl] = useState<string | null>(null);

    const isProjectMode = semester === "VIII" && program === "B.TECH";

    const { data: mappings } = useQuery<any[]>({
        queryKey: ['/api/v1/examcell/faculty-mappings'],
        queryFn: () => authFetch('/api/v1/examcell/faculty-mappings')
    });

    const uniqueSubjects = (mappings || [])
        .filter((m: any) => (!branch || m.branch === branch) && (!semester || m.semester === semester) && (!batch || m.batch === batch) && (!section || m.section === section))
        .filter((item: any) => {
            const name = (item.subjectName || "").toUpperCase();
            if (isProjectMode) return name.includes("PROJECT") || name.includes("SEMINAR");
            return ["LAB", "LABORATORY", "DESIGN THINKING"].some(kw => name.includes(kw));
        });

    const currentSubject = mappings?.find((m: any) => m.subjectCode === subjectCode) || null;
    const isDesignThinking = (currentSubject?.subjectName || "").toUpperCase().includes("DESIGN THINKING");

    const { data: queryData, isLoading, refetch } = useQuery({
        queryKey: ['/api/v1/examcell/mid-marks', { semester, branch, subjectCode, midType: 'LAB', batch, section }],
        queryFn: async () => {
            const qs = new URLSearchParams({ semester, branch, subjectCode, midType: 'LAB', batch, section }).toString();
            return authFetch(`/api/v1/examcell/mid-marks?${qs}`);
        },
        enabled: !!(branch && semester && subjectCode && batch),
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
        } else setMarksData([]);
    }, [queryData]);

    const isFrozen = (queryData?.exam?.isFrozen === true) && !(isAdmin || user?.username === 'examcell');

    const handleCellChange = (index: number, field: keyof LocalMarkRow, value: string) => {
        if (isFrozen || (marksData[index].isLocked && !isAdmin)) return;
        setMarksData(prev => {
            const newData = [...prev];
            const row = { ...newData[index] };
            const numValue = value === '' ? '' : parseFloat(value);
            (row as any)[field] = numValue;
            if (isDesignThinking) row.totalMarks = Number((Number(row.labDailyMarks) || 0).toFixed(2));
            else if (isProjectMode) row.totalMarks = Number(((Number(row.prcAssessmentMarks) || 0) + (Number(row.reportMarks) || 0) + (Number(row.seminarMarks) || 0)).toFixed(2));
            else row.totalMarks = Number(((Number(row.labDailyMarks) || 0) + (Number(row.labRecordMarks) || 0) + (Number(row.labInternalMarks) || 0) + (Number(row.labVivaMarks) || 0)).toFixed(2));
            row.isDirty = true;
            newData[index] = row;
            return newData;
        });
    };

    const handleBulkSave = async () => {
        setIsBulkSaving(true);
        try {
            await authFetch('/api/v1/examcell/internal-marks/lab/bulk', {
                method: 'POST',
                body: JSON.stringify({
                    semester, branch, subjectCode, batch,
                    updates: marksData.filter(m => m.isDirty).map(m => ({
                        studentId: m.studentId,
                        labDailyMarks: m.labDailyMarks || 0,
                        labRecordMarks: m.labRecordMarks || 0,
                        labInternalMarks: m.labInternalMarks || 0,
                        labVivaMarks: m.labVivaMarks || 0,
                        prcAssessmentMarks: m.prcAssessmentMarks || 0,
                        reportMarks: m.reportMarks || 0,
                        seminarMarks: m.seminarMarks || 0,
                        totalMarks: m.totalMarks
                    }))
                })
            });
            toast({ title: "Authorized Lab Registry Update Successful" });
            refetch();
        } catch (err: any) { toast({ title: "Error", description: err.message, variant: "destructive" }); }
        finally { setIsBulkSaving(false); }
    };

    const generatePDF = async (forPreview: boolean = false) => {
        if (marksData.length === 0) return null;
        const matchYear = batch.match(/^20\d{2}/);
        const startYearNum = matchYear ? parseInt(matchYear[0]) : 2024;
        let romanYear = semester === "III" || semester === "IV" ? "II" : semester === "V" || semester === "VI" ? "III" : semester === "VII" || semester === "VIII" ? "IV" : "I";
        let romanSem = ["II", "IV", "VI", "VIII"].includes(semester) ? "II" : "I";

        if (isProjectMode) {
            return generateProjectInternalPDF(marksData.map((row, idx) => ({
                sNo: idx + 1, rollNumber: row.rollNumber, name: row.name,
                prcAssessment: row.prcAssessmentMarks || 0, report: row.reportMarks || 0, seminar: row.seminarMarks || 0, total: row.totalMarks || 0,
            })), {
                projectName: currentSubject?.subjectName || "Project", projectCode: subjectCode, facultyName: currentSubject?.facultyName,
                dateOfExam: new Date().toLocaleDateString('en-GB'), academicYear: `${startYearNum}-${startYearNum + 1}`,
                yearSem: `${romanYear} - ${romanSem}`, branch, regulation: "R23", program, batch
            }, forPreview);
        } else {
            return generateLabInternalPDF(marksData.map((row, idx) => ({
                sNo: idx + 1, rollNumber: row.rollNumber, name: row.name || "",
                dayToDay: row.labDailyMarks || 0, record: row.labRecordMarks || 0, labTest: row.labInternalMarks || 0, viva: row.labVivaMarks || 0,
                total: row.totalMarks || 0, inWords: numberToWords(Math.round(row.totalMarks || 0))
            })), {
                labName: currentSubject?.subjectName || "Lab", labCode: subjectCode, facultyName: currentSubject?.facultyName,
                dateOfExam: new Date().toLocaleDateString('en-GB'), academicYear: `${startYearNum}-${startYearNum + 1}`,
                yearSem: `${romanYear} - ${romanSem}`, branch, regulation: "R23", program, batch,
                reportType: isDesignThinking ? "DESIGN THINKING EVALUATION" : "LAB INTERNAL EVALUATION"
            }, forPreview);
        }
    };

    return (
        <div className="bg-white min-h-screen text-slate-800 p-2 space-y-4">
            {/* 1. Module Header */}
            <div className="border border-slate-300 rounded shadow-sm overflow-hidden">
                <div className="erp-header-blue px-3 py-1.5 text-[14px] flex justify-between items-center">
                    <div className="flex items-center gap-2">
                        <Activity className="w-4 h-4" />
                        <span className="font-bold uppercase tracking-tight">Laboratory Assessment & Audit Matrix</span>
                    </div>
                </div>
                <div className="erp-strip-green px-3 py-1.5 text-[11px] font-bold text-emerald-800 flex justify-between">
                    <span>Authorized entry for lab internals, records, and viva-voce assessments.</span>
                </div>
            </div>

            {/* 2. Filter Matrix Section */}
            <div className="border border-slate-300 rounded shadow-sm overflow-hidden bg-slate-50">
                <div className="p-3 grid grid-cols-1 md:grid-cols-4 lg:grid-cols-6 gap-3 items-end">
                    <div className="w-full"><ProgramSelector value={program} onChange={setProgram} /></div>
                    <div className="w-full"><BranchSelector value={branch} onChange={setBranch} /></div>
                    <div className="w-full"><BatchSelector value={batch} onChange={setBatch} program={program} /></div>
                    <div className="space-y-1">
                        <label className="erp-label">Semester</label>
                        <select value={semester} onChange={(e) => setSemester(e.target.value)} className="erp-input w-full font-bold">
                            <option value="">Select...</option>
                            {["I", "II", "III", "IV", "V", "VI", "VII", "VIII"].map(s => <option key={s} value={s}>{formatSemester(s, program)}</option>)}
                        </select>
                    </div>
                    <div className="w-full"><SectionSelector value={section} onChange={setSection} batch={batch} branch={branch} /></div>
                    <div className="space-y-1">
                        <label className="erp-label">Subject Context</label>
                        <select value={subjectCode} onChange={(e) => setSubjectCode(e.target.value)} className="erp-input w-full font-bold">
                            <option value="">- Choose Lab -</option>
                            {uniqueSubjects.map((s: any) => (<option key={s.subjectCode} value={s.subjectCode}>{s.subjectCode} - {s.subjectName}</option>))}
                        </select>
                    </div>
                </div>
                <div className="p-2 bg-slate-100 border-t border-slate-200 flex justify-end gap-2">
                     <button onClick={async () => { const url = await generatePDF(true); if (url) setPreviewPdfUrl(url); }} disabled={!subjectCode} className="erp-btn-rect bg-slate-600 hover:bg-slate-700 font-bold uppercase text-[10px] flex items-center gap-2">
                        <Eye className="w-3 h-3" /> Preview Award List
                     </button>
                </div>
            </div>

            {/* 3. Data Entry Table */}
            <div className="border border-slate-300 rounded shadow-sm overflow-hidden">
                <div className="overflow-x-auto min-h-[400px]">
                    {isLoading ? (
                        <div className="p-16 text-center animate-pulse text-slate-400 font-bold uppercase tracking-widest text-xs">Accessing Lab Registry...</div>
                    ) : marksData.length > 0 ? (
                        <table className="w-full erp-table-dense border-collapse">
                            <thead className="bg-slate-100 text-slate-600 font-bold">
                                <tr>
                                    <th className="text-center w-12">SN</th>
                                    <th className="text-left w-32">Roll Number</th>
                                    <th className="text-left">Student Name</th>
                                    {isProjectMode ? (
                                        <>
                                            <th className="text-center w-24">Assmt (30)</th>
                                            <th className="text-center w-24">Rept (15)</th>
                                            <th className="text-center w-24">Semnr (15)</th>
                                        </>
                                    ) : isDesignThinking ? (
                                        <th className="text-center w-48 font-bold">Day to Day (Max 7.5)</th>
                                    ) : (
                                        <>
                                            <th className="text-center w-20">D2D (5)</th>
                                            <th className="text-center w-20">Rec (5)</th>
                                            <th className="text-center w-20">L.Test (15)</th>
                                            <th className="text-center w-20">Viva (5)</th>
                                        </>
                                    )}
                                    <th className="text-center w-24">Total</th>
                                    <th className="text-center w-20">Status</th>
                                </tr>
                            </thead>
                            <tbody>
                                {marksData.map((row, idx) => (
                                    <tr key={row.studentId} className="hover:bg-blue-50/30">
                                        <td className="text-center font-mono text-slate-400">{idx + 1}</td>
                                        <td className="font-bold text-[#004b93] font-mono">{row.rollNumber}</td>
                                        <td className="font-semibold text-slate-700 truncate max-w-[200px] uppercase text-[11px]">{row.name}</td>
                                        {isProjectMode ? (
                                            <>
                                                <td className="p-1"><input type="number" value={row.prcAssessmentMarks ?? ''} onChange={(e) => handleCellChange(idx, 'prcAssessmentMarks', e.target.value)} className="erp-input w-full h-8 text-center font-black" /></td>
                                                <td className="p-1"><input type="number" value={row.reportMarks ?? ''} onChange={(e) => handleCellChange(idx, 'reportMarks', e.target.value)} className="erp-input w-full h-8 text-center font-black" /></td>
                                                <td className="p-1"><input type="number" value={row.seminarMarks ?? ''} onChange={(e) => handleCellChange(idx, 'seminarMarks', e.target.value)} className="erp-input w-full h-8 text-center font-black" /></td>
                                            </>
                                        ) : isDesignThinking ? (
                                            <td className="p-1"><input type="number" step="0.1" value={row.labDailyMarks ?? ''} onChange={(e) => handleCellChange(idx, 'labDailyMarks', e.target.value)} className="erp-input w-full h-8 text-center font-black" /></td>
                                        ) : (
                                            <>
                                                <td className="p-1"><input type="number" value={row.labDailyMarks ?? ''} onChange={(e) => handleCellChange(idx, 'labDailyMarks', e.target.value)} className="erp-input w-full h-8 text-center font-black" /></td>
                                                <td className="p-1"><input type="number" value={row.labRecordMarks ?? ''} onChange={(e) => handleCellChange(idx, 'labRecordMarks', e.target.value)} className="erp-input w-full h-8 text-center font-black" /></td>
                                                <td className="p-1"><input type="number" value={row.labInternalMarks ?? ''} onChange={(e) => handleCellChange(idx, 'labInternalMarks', e.target.value)} className="erp-input w-full h-8 text-center font-black" /></td>
                                                <td className="p-1"><input type="number" value={row.labVivaMarks ?? ''} onChange={(e) => handleCellChange(idx, 'labVivaMarks', e.target.value)} className="erp-input w-full h-8 text-center font-black" /></td>
                                            </>
                                        )}
                                        <td className="text-center font-black text-[#004b93] text-sm">{row.totalMarks}</td>
                                        <td className="text-center px-2">
                                            {row.isLocked ? <Lock className="w-3 h-3 mx-auto text-slate-400" /> : row.isDirty ? <span className="text-amber-500 font-bold text-[9px] uppercase">Pending</span> : <CheckCircle2 className="w-3 h-3 mx-auto text-emerald-500" />}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    ) : (
                        <div className="p-16 text-center text-slate-400 font-bold uppercase tracking-widest text-xs">No entries available. Select parameters above.</div>
                    )}
                </div>
                {marksData.length > 0 && (
                    <div className="p-3 bg-slate-100 border-t border-slate-300 flex justify-end">
                        <button onClick={handleBulkSave} disabled={isBulkSaving || !marksData.some(m => m.isDirty)} className="erp-btn-rect bg-emerald-700 hover:bg-emerald-800 flex items-center gap-2 px-8 py-2">
                            {isBulkSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                            <span className="font-black uppercase tracking-widest">Commit Laboratory Entries</span>
                        </button>
                    </div>
                )}
            </div>

            <Dialog open={!!previewPdfUrl} onOpenChange={(open: boolean) => !open && setPreviewPdfUrl(null)}>
                <DialogContent className="max-w-6xl h-[90vh] flex flex-col p-0 border-2 border-[#004b93]">
                    <DialogHeader className="p-3 border-b bg-slate-100 flex justify-between items-center">
                        <DialogTitle className="text-[12px] font-black uppercase text-[#004b93]">Lab Marks Registry Preview</DialogTitle>
                    </DialogHeader>
                    {previewPdfUrl && <iframe src={previewPdfUrl} className="flex-1 w-full border-0" />}
                </DialogContent>
            </Dialog>
        </div>
    );
}
