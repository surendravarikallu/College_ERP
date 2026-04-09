import React, { useState, useEffect, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient } from "../lib/queryClient";
import { ProgramSelector, BranchSelector, BatchSelector, SectionSelector } from "../components/academics/ReportFilters";
import { Loader2, Save, CheckCircle2, AlertCircle, Calculator, Eye, Lock, CheckCircle } from "lucide-react";
import { useToast } from "../hooks/use-toast";
import { formatSemester } from "../lib/utils";
import { authFetch, useAuth } from "../hooks/use-auth";
import { useInternalMarksReport } from "../hooks/use-reports";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { saveJsPdfAndShare, addGlobalFooterToJsPdf } from "../lib/capacitorUtils";
import { generateProjectInternalPDF, ProjectInternalMarkRow, ProjectInternalContext } from "../lib/pdfProjectGenerator";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../../components/ui/dialog";

interface MidMarkRow {
    studentId: number;
    rollNumber: string;
    name: string;
    midExamId: number;
    midExamMarks: number | '';
    assignmentMarks: number | '';
    quizMarks: number | '';
    labDailyMarks: number | '';
    labRecordMarks: number | '';
    labInternalMarks: number | '';
    prcAssessmentMarks: number | '';
    reportMarks: number | '';
    seminarMarks: number | '';
    totalMarks: number;
    saveStatus?: 'idle' | 'saving' | 'saved' | 'error';
    isDirty?: boolean;
    isLocked?: boolean;
}

const addPdfHeader = async (doc: jsPDF, title: string, branch: string, batch: string, program: string, extra?: string) => {
    const pageW = doc.internal.pageSize.width;
    const LEFT_PAD = 30;
    const { url: headerDataUrl, ratio } = await new Promise<{ url: string, ratio: number }>((resolve) => {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => {
            const canvas = document.createElement('canvas');
            canvas.width = img.naturalWidth;
            canvas.height = img.naturalHeight;
            canvas.getContext('2d')!.drawImage(img, 0, 0);
            resolve({ url: canvas.toDataURL('image/png'), ratio: img.naturalWidth / img.naturalHeight });
        };
        img.onerror = () => resolve({ url: '', ratio: 1 });
        img.src = '/Screenshot 2025-07-25 113411_1753423944040.webp';
    });
    let HEADER_IMG_H = headerDataUrl ? 72 : 0;
    let HEADER_IMG_W = headerDataUrl ? HEADER_IMG_H * ratio : 0;
    if (HEADER_IMG_W > pageW - 40) { HEADER_IMG_W = pageW - 40; HEADER_IMG_H = HEADER_IMG_W / ratio; }
    if (headerDataUrl) doc.addImage(headerDataUrl, 'PNG', (pageW - HEADER_IMG_W) / 2, 5, HEADER_IMG_W, HEADER_IMG_H);
    const HEADER_BOTTOM = (headerDataUrl ? HEADER_IMG_H + 5 : 0) + 6;
    doc.setDrawColor('#aaa'); doc.setLineWidth(0.5); doc.line(LEFT_PAD, HEADER_BOTTOM, pageW - LEFT_PAD, HEADER_BOTTOM);
    const TITLE_Y = HEADER_BOTTOM + 14;
    doc.setFontSize(13); doc.setFont('helvetica', 'bold'); doc.setTextColor('#000'); doc.text(title, pageW / 2, TITLE_Y, { align: 'center' });
    const META_Y = TITLE_Y + 16;
    doc.setFontSize(9); doc.setFont('helvetica', 'bold'); doc.text(`Course: ${program || 'B.TECH'}`, LEFT_PAD, META_Y);
    doc.text(`Branch: ${branch || 'ALL'}`, pageW / 2, META_Y, { align: 'center' });
    doc.text(`Batch: ${batch || 'ALL'}`, pageW - LEFT_PAD, META_Y, { align: 'right' });
    if (extra) {
        const lines = extra.split('\n');
        lines.forEach((line, i) => doc.text(line, pageW / 2, META_Y + 12 + (i * 12), { align: 'center' }));
        return META_Y + 12 + ((lines.length - 1) * 12);
    }
    return META_Y;
};

export default function MidMarks() {
    const { toast } = useToast();
    const { user } = useAuth();
    const isAdmin = user?.isAdmin || false;
    const [academicYear, setAcademicYear] = useState("");
    const [program, setProgram] = useState("B.TECH");
    const [branch, setBranch] = useState("");
    const [batch, setBatch] = useState("");
    const [semester, setSemester] = useState("");
    const [section, setSection] = useState("");
    const [subjectCode, setSubjectCode] = useState("");
    const [midType, setMidType] = useState("MID1");
    const [marksData, setMarksData] = useState<MidMarkRow[]>([]);
    const [isBulkSaving, setIsBulkSaving] = useState(false);
    const currentlyEditingRowIndex = useRef<number | null>(null);
    const [previewPdfUrl, setPreviewPdfUrl] = useState<string | null>(null);
    const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);

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
            const code = (item.subjectCode || "").toUpperCase();
            if (midType === 'PROJECT') return code.endsWith('P') || name.includes("PROJECT") || name.includes("SEMINAR");
            if (name.includes("DESIGN THINKING") || name.includes("INNOVATION")) return true;
            const isLab = ["LAB", "LABORATORY", "FULL STACK", "PYTHON", "SOFT SKILL"].some(kw => name.includes(kw));
            return !isLab && !(code.endsWith('P') || name.includes("PROJECT"));
        });

    const currentSubjectObj = availableSubjects.find((s: any) => s.subjectCode === subjectCode);
    const assignedFacultyName = currentSubjectObj?.facultyName || null;
    const isDesignThinking = (currentSubjectObj?.subjectName || "").toUpperCase().includes("DESIGN THINKING");
    const canFetch = !!(branch && semester && subjectCode && midType && batch);

    const { data: queryData, isLoading, refetch, isFetching } = useQuery({
        queryKey: ['/api/v1/examcell/mid-marks', { semester, branch, subjectCode, midType, batch, section }],
        queryFn: async () => {
            const qs = new URLSearchParams({ semester, branch, subjectCode, midType, batch, section }).toString();
            const res = await fetch(`/api/v1/examcell/mid-marks?${qs}`, {
                headers: { 'Authorization': `Bearer ${(localStorage.getItem('ec_auth_token') || localStorage.getItem('erp_access_token'))}` }
            });
            if (!res.ok) throw new Error(await res.text());
            return res.json();
        },
        enabled: canFetch,
    });

    useEffect(() => {
        if (queryData?.marks) setMarksData(queryData.marks.map((m: any) => ({ ...m, saveStatus: 'idle', isDirty: false })));
        else setMarksData([]);
    }, [queryData]);

    const isFrozen = queryData?.exam?.isFrozen === true || queryData?.exam?.isFinalLocked === true;
    const canOverrideFreeze = isAdmin || user?.username === 'examcell';
    const showOverrideBanner = isFrozen && canOverrideFreeze;

    const { data: internalMarksData } = useInternalMarksReport({ branch, semester, subjectCode, batch, section: section || "" });

    const filteredInternalMarks = React.useMemo(() => {
        if (!internalMarksData) return [];
        return internalMarksData.map((row: any) => {
            if (midType === 'PROJECT') {
                return { ...row, calc: { finalInternal: row.project?.total ?? null } };
            }
            let m1 = row.mid1?.total ?? null;
            let m2 = row.mid2?.total ?? null;
            if (program === "MCA") return { ...row, calc: { finalInternal: m1 !== null && m2 !== null ? Math.ceil((m1 + m2) / 2) : (m1 ?? m2) } };
            if (m1 !== null && m2 !== null) {
                const best = Math.max(m1, m2);
                const least = Math.min(m1, m2);
                const eighty = best * 0.8;
                const twenty = least * 0.2;
                let final = row.isDesignThinking || isDesignThinking ? Math.ceil((eighty + twenty) * 0.75 + (row.labDayToDay || 0)) : Math.round(eighty + twenty);
                return { ...row, calc: { best, least, eightyPercent: eighty, twentyPercent: twenty, finalInternal: final } };
            }
            return { ...row, calc: {} };
        });
    }, [internalMarksData, program, isDesignThinking, midType]);

    const validateMarks = (row: MidMarkRow) => {
        if (midType === 'PROJECT') return (row.prcAssessmentMarks || 0) <= 30 && (row.reportMarks || 0) <= 15 && (row.seminarMarks || 0) <= 15;
        if (midType === 'LAB') return (row.labDailyMarks || 0) <= 15 && (row.labRecordMarks || 0) <= 5 && (row.labInternalMarks || 0) <= 10;
        if (program === 'MCA') return (row.midExamMarks || 0) <= 40;
        return (row.midExamMarks || 0) <= 15 && (row.assignmentMarks || 0) <= 5 && (row.quizMarks || 0) <= 10;
    };

    const saveMarkMutation = useMutation({
        mutationFn: async (row: MidMarkRow) => {
            const res = await fetch('/api/v1/examcell/mid-marks/save', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${(localStorage.getItem('ec_auth_token') || localStorage.getItem('erp_access_token'))}` },
                body: JSON.stringify(row)
            });
            if (!res.ok) throw new Error(await res.text());
            return res.json();
        },
        onSuccess: (data, variables) => {
            setMarksData(prev => prev.map(m => m.studentId === variables.studentId ? { ...m, saveStatus: 'saved', isDirty: false } : m));
            queryClient.invalidateQueries({ queryKey: ['/api/v1/examcell/internal-marks/report'] });
        },
        onError: (err, variables) => {
            setMarksData(prev => prev.map(m => m.studentId === variables.studentId ? { ...m, saveStatus: 'error' } : m));
            toast({ title: "Failed to save marks", description: err.message, variant: "destructive" });
        }
    });

    const handleCellChange = (index: number, field: keyof MidMarkRow, value: string) => {
        if (isFrozen && !canOverrideFreeze) return;
        let numValue: any = value === '' ? '' : parseFloat(value);
        setMarksData(prev => {
            const newData = [...prev];
            const row = { ...newData[index] };
            (row as any)[field] = numValue;
            if (midType === 'PROJECT') row.totalMarks = (Number(row.prcAssessmentMarks) || 0) + (Number(row.reportMarks) || 0) + (Number(row.seminarMarks) || 0);
            else if (midType === 'LAB') row.totalMarks = (Number(row.labDailyMarks) || 0) + (Number(row.labRecordMarks) || 0) + (Number(row.labInternalMarks) || 0);
            else if (program === 'MCA') row.totalMarks = Number(row.midExamMarks) || 0;
            else row.totalMarks = (Number(row.midExamMarks) || 0) + (Number(row.assignmentMarks) || 0) + (Number(row.quizMarks) || 0);
            row.isDirty = true;
            row.saveStatus = 'idle';
            newData[index] = row;
            return newData;
        });
    };

    const handleManualRowSave = (index: number) => {
        const row = marksData[index];
        if (!row || !row.isDirty) return;
        if (validateMarks(row)) {
            setMarksData(prev => prev.map((m, i) => i === index ? { ...m, saveStatus: 'saving' } : m));
            saveMarkMutation.mutate(row);
        }
    };

    const handleBulkSave = async () => {
        if (isFrozen && !canOverrideFreeze) return;
        setIsBulkSaving(true);
        try {
            const res = await fetch('/api/v1/examcell/mid-marks/bulk-save', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${(localStorage.getItem('ec_auth_token') || localStorage.getItem('erp_access_token'))}` },
                body: JSON.stringify({ marks: marksData.filter(m => m.isDirty) })
            });
            if (!res.ok) throw new Error(await res.text());
            toast({ title: "Success", description: "Marks saved successfully!" });
            refetch();
        } catch (err: any) { toast({ title: "Error", description: err.message, variant: "destructive" }); }
        finally { setIsBulkSaving(false); }
    };

    const previewInternalPdf = async () => {
        setIsGeneratingPdf(true);
        try {
            const doc = new jsPDF('landscape', 'pt', 'a4');
            const pageW = doc.internal.pageSize.width;
            const currentSubj = uniqueSubjects.find((s: any) => s.subjectCode === subjectCode);

            const examTitle = midType === 'PROJECT' ? 'PROJECT INTERNAL ASSESSMENT' : `AWARD LIST FOR ${midType} EXAMINATION`;
            let currentY = await addPdfHeader(doc, examTitle, branch, batch, program, `Subject: ${subjectCode} - ${currentSubj?.subjectName}\nSemester: ${formatSemester(semester || 'I', program)}`);

            let head: string[][] = [];
            let body: any[][] = [];

            if (midType === 'PROJECT') {
                head = [['S.No', 'Roll No', 'Name', 'Assmt (30)', 'Rept (15)', 'Semnr (15)', 'Total (60)']];
                body = marksData.map((row, i) => [
                    i + 1, row.rollNumber, row.name,
                    row.prcAssessmentMarks || 0, row.reportMarks || 0, row.seminarMarks || 0,
                    row.totalMarks
                ]);
            } else {
                head = [['S.No', 'Roll No', 'Name', 'MID (15)', 'Assgn (5)', 'Quiz (10)', 'Total (30)']];
                body = marksData.map((row, i) => [
                    i + 1, row.rollNumber, row.name,
                    row.midExamMarks || 0, row.assignmentMarks || 0, row.quizMarks || 0,
                    row.totalMarks
                ]);
            }

            autoTable(doc, {
                startY: currentY + 20,
                head,
                body,
                theme: 'grid',
                styles: { fontSize: 9, halign: 'center', cellPadding: 5 },
                headStyles: { fillColor: [71, 85, 105], textColor: 255, fontStyle: 'bold' },
                alternateRowStyles: { fillColor: [248, 250, 252] },
                margin: { left: 40, right: 40 }
            });

            setPreviewPdfUrl(doc.output('bloburl').toString());
        } finally { setIsGeneratingPdf(false); }
    };

    return (
        <div className="max-w-7xl mx-auto space-y-6 pb-20">
            <div className="flex justify-between items-end">
                <div>
                    <h1 className="text-3xl font-display font-bold text-slate-900">MID Marks Entry</h1>
                    <p className="text-slate-500">Enter internal evaluation marks.</p>
                </div>
                {showOverrideBanner && (
                    <div className="px-4 py-2 bg-amber-50 border border-amber-200 rounded-xl flex items-center gap-2 text-amber-700 text-sm font-medium">
                        <Lock className="w-4 h-4" /> Editing as Administrator (Overriding Freeze)
                    </div>
                )}
            </div>

            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                <ProgramSelector value={program} onChange={setProgram} />
                <BranchSelector value={branch} onChange={setBranch} />
                <BatchSelector value={batch} onChange={setBatch} program={program} />
                <div className="space-y-2">
                    <label className="text-xs font-medium text-slate-500 uppercase">Semester</label>
                    <select value={semester} onChange={(e) => setSemester(e.target.value)} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none">
                        <option value="">Select Semester</option>
                        {["I", "II", "III", "IV", "V", "VI", "VII", "VIII"].map(s => <option key={s} value={s}>{formatSemester(s, program)}</option>)}
                    </select>
                </div>
                <SectionSelector value={section} onChange={setSection} batch={batch} branch={branch} />
                <div className="space-y-2">
                    <label className="text-xs font-medium text-slate-500 uppercase">Subject</label>
                    <select value={subjectCode} onChange={(e) => setSubjectCode(e.target.value)} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none">
                        <option value="">Select Subject</option>
                        {uniqueSubjects.map((s: any) => (<option key={s.subjectCode} value={s.subjectCode}>{s.subjectCode} - {s.subjectName}</option>))}
                    </select>
                </div>
                <div className="space-y-2">
                    <label className="text-xs font-medium text-slate-500 uppercase">MID Type</label>
                    <select value={midType} onChange={(e) => setMidType(e.target.value)} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none">
                        <option value="MID1">MID 1</option>
                        <option value="MID2">MID 2</option>
                        <option value="PROJECT">PROJECT</option>
                    </select>
                </div>
                <button onClick={previewInternalPdf} disabled={!canFetch} className="px-4 py-2.5 rounded-xl font-medium bg-white border border-slate-200 hover:bg-slate-50 flex items-center gap-2 disabled:opacity-50 shadow-sm">
                    {isGeneratingPdf ? <Loader2 className="w-4 h-4 animate-spin" /> : <Eye className="w-4 h-4" />} Preview Report
                </button>
            </div>

            {isLoading ? (
                <div className="bg-white border border-slate-100 rounded-3xl p-16 flex justify-center"><Loader2 className="w-10 h-10 animate-spin text-primary" /></div>
            ) : marksData.length > 0 ? (
                <div className="bg-white border border-slate-100 rounded-3xl shadow-sm overflow-hidden">
                    <table className="w-full text-left">
                        <thead className="bg-slate-100 border-b border-slate-200 text-sm font-semibold text-slate-600">
                            <tr>
                                <th className="p-4 w-16 text-center">S.No</th>
                                <th className="p-4 w-32">Roll No</th>
                                <th className="p-4">Name</th>
                                {midType === 'PROJECT' ? (
                                    <>
                                        <th className="p-4 w-24 text-center">Assmt (30)</th>
                                        <th className="p-4 w-24 text-center">Rept (15)</th>
                                        <th className="p-4 w-24 text-center">Semnr (15)</th>
                                    </>
                                ) : (
                                    <>
                                        <th className="p-4 w-24 text-center">MID (15)</th>
                                        <th className="p-4 w-24 text-center">Assgn (5)</th>
                                        <th className="p-4 w-24 text-center">Quiz (10)</th>
                                    </>
                                )}
                                <th className="p-4 w-24 text-center text-primary">Total</th>
                                <th className="p-4 w-16 text-center">Status</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {marksData.map((row, idx) => (
                                <tr key={row.studentId} className="hover:bg-slate-50/50">
                                    <td className="p-4 text-center text-slate-400 text-sm">{idx + 1}</td>
                                    <td className="p-4 font-medium">{row.rollNumber}</td>
                                    <td className="p-4 text-slate-600">{row.name}</td>
                                    {midType === 'PROJECT' ? (
                                        <>
                                            <td className="p-2"><input type="number" value={row.prcAssessmentMarks ?? ''} onChange={(e) => handleCellChange(idx, 'prcAssessmentMarks', e.target.value)} onBlur={() => handleManualRowSave(idx)} className="w-full text-center p-2 rounded-lg border outline-none focus:ring-2 focus:ring-primary/20" /></td>
                                            <td className="p-2"><input type="number" value={row.reportMarks ?? ''} onChange={(e) => handleCellChange(idx, 'reportMarks', e.target.value)} onBlur={() => handleManualRowSave(idx)} className="w-full text-center p-2 rounded-lg border outline-none focus:ring-2 focus:ring-primary/20" /></td>
                                            <td className="p-2"><input type="number" value={row.seminarMarks ?? ''} onChange={(e) => handleCellChange(idx, 'seminarMarks', e.target.value)} onBlur={() => handleManualRowSave(idx)} className="w-full text-center p-2 rounded-lg border outline-none focus:ring-2 focus:ring-primary/20" /></td>
                                        </>
                                    ) : (
                                        <>
                                            <td className="p-2"><input type="number" value={row.midExamMarks ?? ''} onChange={(e) => handleCellChange(idx, 'midExamMarks', e.target.value)} onBlur={() => handleManualRowSave(idx)} className="w-full text-center p-2 rounded-lg border outline-none focus:ring-2 focus:ring-primary/20" /></td>
                                            <td className="p-2"><input type="number" value={row.assignmentMarks ?? ''} onChange={(e) => handleCellChange(idx, 'assignmentMarks', e.target.value)} onBlur={() => handleManualRowSave(idx)} className="w-full text-center p-2 rounded-lg border outline-none focus:ring-2 focus:ring-primary/20" /></td>
                                            <td className="p-2"><input type="number" value={row.quizMarks ?? ''} onChange={(e) => handleCellChange(idx, 'quizMarks', e.target.value)} onBlur={() => handleManualRowSave(idx)} className="w-full text-center p-2 rounded-lg border outline-none focus:ring-2 focus:ring-primary/20" /></td>
                                        </>
                                    )}
                                    <td className="p-4 text-center font-bold text-primary">{row.totalMarks}</td>
                                    <td className="p-4 text-center">
                                        {row.saveStatus === 'saving' ? <Loader2 className="w-4 h-4 animate-spin" /> : row.saveStatus === 'saved' ? <CheckCircle2 className="w-4 h-4 text-emerald-500" /> : row.saveStatus === 'error' ? <AlertCircle className="w-4 h-4 text-red-500" /> : null}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    <div className="p-4 bg-slate-50 flex justify-end"><button onClick={handleBulkSave} disabled={isBulkSaving} className="px-8 py-2.5 bg-primary text-white rounded-xl font-medium flex items-center gap-2">{isBulkSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} Save All</button></div>
                </div>
            ) : canFetch ? (
                <div className="bg-white border rounded-3xl p-16 flex flex-col items-center text-slate-500"><AlertCircle className="w-8 h-8 mb-3 opacity-20" /><p>No students found for this criteria.</p></div>
            ) : (
                <div className="py-20 flex flex-col items-center text-slate-400 bg-slate-50 rounded-3xl border-dashed border-2"><Calculator className="w-12 h-12 mb-4 opacity-20" /><h3 className="text-lg font-medium">Select filters to load marks sheet</h3></div>
            )}

            <Dialog open={!!previewPdfUrl} onOpenChange={(open: boolean) => !open && setPreviewPdfUrl(null)}>
                <DialogContent className="max-w-5xl h-[80vh] flex flex-col p-0 overflow-hidden">
                    <DialogHeader className="p-4 border-b bg-slate-50"><DialogTitle>Report Preview</DialogTitle></DialogHeader>
                    {previewPdfUrl && <iframe src={previewPdfUrl} className="flex-1 w-full border-0" />}
                </DialogContent>
            </Dialog>
        </div>
    );
}
