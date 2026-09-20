import React, { useState, useEffect, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient } from "../lib/queryClient";
import { ProgramSelector, BranchSelector, BatchSelector, SectionSelector } from "../components/academics/ReportFilters";
import { Loader2, Save, AlertCircle, Calculator, Eye, Lock, Activity } from "lucide-react";
import { useToast } from "../hooks/use-toast";
import { formatSemester } from "../lib/utils";
import { authFetch, useAuth } from "../hooks/use-auth";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
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
}

const addPdfHeader = async (doc: jsPDF, title: string, branch: string, batch: string, program: string, extra?: string) => {
    const pageW = doc.internal.pageSize.width;
    doc.setFontSize(14); doc.setFont('helvetica', 'bold');
    doc.text("SRI MITTAPALLI COLLEGE OF ENGINEERING", pageW / 2, 20, { align: 'center' });
    doc.setFontSize(10); doc.text(title, pageW / 2, 35, { align: 'center' });
    doc.setFontSize(8); doc.text(`Branch: ${branch} | Batch: ${batch} | Deg: ${program}`, pageW / 2, 45, { align: 'center' });
    if (extra) doc.text(extra, pageW / 2, 55, { align: 'center' });
    return 65;
};

export default function MidMarks() {
    const { toast } = useToast();
    const { user } = useAuth();
    const isAdmin = user?.isAdmin || false;
    const [program, setProgram] = useState("B.TECH");
    const [branch, setBranch] = useState("");
    const [batch, setBatch] = useState("");
    const [semester, setSemester] = useState("");
    const [section, setSection] = useState("");
    const [subjectCode, setSubjectCode] = useState("");
    const [midType, setMidType] = useState("MID1");
    const [marksData, setMarksData] = useState<MidMarkRow[]>([]);
    const [isBulkSaving, setIsBulkSaving] = useState(false);
    const [previewPdfUrl, setPreviewPdfUrl] = useState<string | null>(null);
    const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);

    const { data: mappings } = useQuery<any[]>({
        queryKey: ['/api/v1/examcell/faculty-mappings'],
        queryFn: () => authFetch('/api/v1/examcell/faculty-mappings')
    });

    const uniqueSubjects = (mappings || [])
        .filter((m: any) => (!branch || m.branch === branch) && (!semester || m.semester === semester) && (!batch || m.batch === batch) && (!section || m.section === section))
        .filter((item: any) => {
            const name = (item.subjectName || "").toUpperCase();
            if (midType === 'PROJECT') return name.includes("PROJECT") || name.includes("SEMINAR");
            return !["LAB", "LABORATORY"].some(kw => name.includes(kw)) && !name.includes("PROJECT");
        });

    const { data: queryData, isLoading, refetch } = useQuery({
        queryKey: ['/api/v1/examcell/mid-marks', { semester, branch, subjectCode, midType, batch, section }],
        queryFn: async () => {
            const qs = new URLSearchParams({ semester, branch, subjectCode, midType, batch, section }).toString();
            const res = await fetch(`/api/v1/examcell/mid-marks?${qs}`, {
                headers: { 'Authorization': `Bearer ${(localStorage.getItem('ec_auth_token') || localStorage.getItem('erp_access_token'))}` }
            });
            return res.json();
        },
        enabled: !!(branch && semester && subjectCode && midType && batch),
    });

    useEffect(() => {
        if (queryData?.marks) setMarksData(queryData.marks.map((m: any) => ({ ...m, saveStatus: 'idle', isDirty: false })));
        else setMarksData([]);
    }, [queryData]);

    const isFrozen = queryData?.exam?.isFrozen === true;
    const canOverrideFreeze = isAdmin || user?.username === 'examcell';

    const handleCellChange = (index: number, field: keyof MidMarkRow, value: string) => {
        if (isFrozen && !canOverrideFreeze) return;
        setMarksData(prev => {
            const newData = [...prev];
            const row = { ...newData[index] };
            const numValue = value === '' ? '' : Math.min(parseFloat(value) || 0, field === 'midExamMarks' ? 15 : field === 'assignmentMarks' ? 5 : 10);
            (row as any)[field] = numValue;
            row.totalMarks = (Number(row.midExamMarks) || 0) + (Number(row.assignmentMarks) || 0) + (Number(row.quizMarks) || 0);
            row.isDirty = true;
            newData[index] = row;
            return newData;
        });
    };

    const handleBulkSave = async () => {
        setIsBulkSaving(true);
        try {
            await fetch('/api/v1/examcell/mid-marks/bulk-save', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${(localStorage.getItem('ec_auth_token') || localStorage.getItem('erp_access_token'))}` },
                body: JSON.stringify({ marks: marksData.filter(m => m.isDirty) })
            });
            toast({ title: "Authorized Batch Update Successful" });
            refetch();
        } catch (err: any) { toast({ title: "Error", description: err.message, variant: "destructive" }); }
        finally { setIsBulkSaving(false); }
    };

    const previewInternalPdf = async () => {
        setIsGeneratingPdf(true);
        const doc = new jsPDF('landscape', 'pt', 'a4');
        const examTitle = midType === 'PROJECT' ? 'PROJECT ASSESSMENT' : `${midType} AWARD LIST`;
        const currentY = await addPdfHeader(doc, examTitle, branch, batch, program, `Sub: ${subjectCode} | Sem: ${formatSemester(semester || 'I', program)}`);
        autoTable(doc, {
            startY: currentY + 10,
            head: [['S.No', 'Roll No', 'Name', 'MID (15)', 'Assgn (5)', 'Quiz (10)', 'Total (30)']],
            body: marksData.map((row, i) => [i + 1, row.rollNumber, row.name, row.midExamMarks || 0, row.assignmentMarks || 0, row.quizMarks || 0, row.totalMarks]),
            theme: 'grid',
            headStyles: { fillColor: [0, 75, 147] }
        });
        setPreviewPdfUrl(doc.output('bloburl').toString());
        setIsGeneratingPdf(false);
    };

    return (
        <div className="bg-white min-h-screen text-slate-800 p-2 space-y-4">
            {/* 1. Module Header */}
            <div className="border border-slate-300 rounded shadow-sm overflow-hidden">
                <div className="erp-header-blue px-3 py-1.5 text-[14px] flex justify-between items-center">
                    <div className="flex items-center gap-2">
                        <Activity className="w-4 h-4" />
                        <span className="font-bold uppercase tracking-tight">Academic Assessment & Marks Entry Matrix</span>
                    </div>
                    {isFrozen && canOverrideFreeze && (
                         <div className="px-2 py-0.5 bg-amber-400 text-black text-[10px] font-black rounded flex items-center gap-1 animate-pulse">
                            <Lock className="w-3 h-3" /> ADMIN OVERRIDE ACTIVE
                         </div>
                    )}
                </div>
                <div className="erp-strip-green px-3 py-1.5 text-[11px] font-bold text-emerald-800 flex justify-between">
                    <span>Authorized internal marks entry for mid-examinations and assignments.</span>
                    <span>Active Session: 2025-26</span>
                </div>
            </div>

            {/* 2. Filter Matrix Section */}
            <div className="border border-slate-300 rounded shadow-sm overflow-hidden bg-slate-50">
                <div className="p-3 grid grid-cols-1 md:grid-cols-4 lg:grid-cols-8 gap-3 items-end">
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
                    <div className="space-y-1 lg:col-span-2">
                        <label className="erp-label">Subject Context</label>
                        <select value={subjectCode} onChange={(e) => setSubjectCode(e.target.value)} className="erp-input w-full font-bold">
                            <option value="">- Choose Subject -</option>
                            {uniqueSubjects.map((s: any) => (<option key={s.subjectCode} value={s.subjectCode}>{s.subjectCode} - {s.subjectName}</option>))}
                        </select>
                    </div>
                    <div className="space-y-1">
                        <label className="erp-label">Type</label>
                        <select value={midType} onChange={(e) => setMidType(e.target.value)} className="erp-input w-full font-bold">
                            <option value="MID1">MID 1</option>
                            <option value="MID2">MID 2</option>
                            <option value="PROJECT">PROJECT</option>
                        </select>
                    </div>
                </div>
                <div className="p-2 bg-slate-100 border-t border-slate-200 flex justify-end gap-2">
                     <button onClick={previewInternalPdf} disabled={!subjectCode} className="erp-btn-rect bg-slate-600 hover:bg-slate-700 font-bold uppercase text-[10px] flex items-center gap-2">
                        {isGeneratingPdf ? <Loader2 className="w-3 h-3 animate-spin" /> : <Eye className="w-3 h-3" />} Preview Award List
                     </button>
                </div>
            </div>

            {/* 3. Data Entry Table */}
            <div className="border border-slate-300 rounded shadow-sm overflow-hidden">
                <div className="overflow-x-auto min-h-[400px]">
                    {isLoading ? (
                        <div className="p-16 text-center animate-pulse text-slate-400 font-bold uppercase tracking-widest text-xs">Accessing Student Assessment Repository...</div>
                    ) : marksData.length > 0 ? (
                        <table className="w-full erp-table-dense border-collapse">
                            <thead className="bg-slate-100 text-slate-600 font-bold">
                                <tr>
                                    <th className="text-center w-12">SN</th>
                                    <th className="text-left w-32">Roll Number</th>
                                    <th className="text-left whitespace-nowrap">Student Name</th>
                                    {midType === 'PROJECT' ? (
                                        <>
                                            <th className="text-center w-24">Assmt (30)</th>
                                            <th className="text-center w-24">Rept (15)</th>
                                            <th className="text-center w-24">Semnr (15)</th>
                                        </>
                                    ) : (
                                        <>
                                            <th className="text-center w-24">MID (15)</th>
                                            <th className="text-center w-24">Assgn (5)</th>
                                            <th className="text-center w-24">Quiz (10)</th>
                                        </>
                                    )}
                                    <th className="text-center w-24">Total</th>
                                    <th className="text-center w-20">Save</th>
                                </tr>
                            </thead>
                            <tbody>
                                {marksData.map((row, idx) => (
                                    <tr key={row.studentId} className="hover:bg-blue-50/30">
                                        <td className="text-center font-mono text-slate-400">{idx + 1}</td>
                                        <td className="font-bold text-[#004b93] font-mono">{row.rollNumber}</td>
                                        <td className="font-semibold text-slate-700 truncate max-w-[200px] uppercase text-[11px]">{row.name}</td>
                                        {midType === 'PROJECT' ? (
                                            <>
                                                <td className="p-1"><input type="number" value={row.prcAssessmentMarks ?? ''} onChange={(e) => handleCellChange(idx, 'prcAssessmentMarks', e.target.value)} className="erp-input w-full h-8 text-center font-black" /></td>
                                                <td className="p-1"><input type="number" value={row.reportMarks ?? ''} onChange={(e) => handleCellChange(idx, 'reportMarks', e.target.value)} className="erp-input w-full h-8 text-center font-black" /></td>
                                                <td className="p-1"><input type="number" value={row.seminarMarks ?? ''} onChange={(e) => handleCellChange(idx, 'seminarMarks', e.target.value)} className="erp-input w-full h-8 text-center font-black" /></td>
                                            </>
                                        ) : (
                                            <>
                                                <td className="p-1"><input type="number" value={row.midExamMarks ?? ''} onChange={(e) => handleCellChange(idx, 'midExamMarks', e.target.value)} className="erp-input w-full h-8 text-center font-black" /></td>
                                                <td className="p-1"><input type="number" value={row.assignmentMarks ?? ''} onChange={(e) => handleCellChange(idx, 'assignmentMarks', e.target.value)} className="erp-input w-full h-8 text-center font-black" /></td>
                                                <td className="p-1"><input type="number" value={row.quizMarks ?? ''} onChange={(e) => handleCellChange(idx, 'quizMarks', e.target.value)} className="erp-input w-full h-8 text-center font-black" /></td>
                                            </>
                                        )}
                                        <td className="text-center font-black text-[#004b93] text-sm">{row.totalMarks}</td>
                                        <td className="text-center">
                                            {row.isDirty ? <span className="text-amber-500 font-bold text-[9px] uppercase animate-pulse">Pending</span> : <span className="text-emerald-500 font-bold text-[9px] uppercase">Synced</span>}
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
                            <span className="font-black uppercase tracking-widest">Commit All Entries</span>
                        </button>
                    </div>
                )}
            </div>

            <Dialog open={!!previewPdfUrl} onOpenChange={(open: boolean) => !open && setPreviewPdfUrl(null)}>
                <DialogContent className="max-w-6xl h-[90vh] flex flex-col p-0 border-2 border-[#004b93]">
                    <DialogHeader className="p-3 border-b bg-slate-100 flex justify-between items-center">
                        <DialogTitle className="text-[12px] font-black uppercase text-[#004b93]">Award List Preliminary Preview</DialogTitle>
                    </DialogHeader>
                    {previewPdfUrl && <iframe src={previewPdfUrl} className="flex-1 w-full border-0" />}
                </DialogContent>
            </Dialog>
        </div>
    );
}
