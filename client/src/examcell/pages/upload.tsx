import React, { useState, useRef, useEffect } from "react";
import { useUploadResults, useUploadStudents, useUploadPreview } from "../hooks/use-upload";
import { UploadCloud, FileType, CheckCircle, XCircle, Loader2, AlertTriangle, Upload as UploadIcon, FileUp, CheckCircle2, AlertCircle, ArrowLeft } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useToast } from "../hooks/use-toast";
import { formatSemester } from "../lib/utils";
import { BulkPhotoUpload } from "../components/admin/BulkPhotoUpload";
import { motion, AnimatePresence } from "framer-motion";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../../components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "../../components/ui/dialog";
import { Button } from "../../components/ui/button";
import { ProgramSelector, BranchSelector, BatchSelector, SectionSelector } from "../components/academics/ReportFilters";
import { authFetch } from "../hooks/use-auth";
export default function UploadResults() {
  const [file, setFile] = useState<File | null>(null);
  const [examType, setExamType] = useState("REGULAR");
  const [examMonth, setExamMonth] = useState("November");
  const [examYear, setExamYear] = useState<string>(new Date().getFullYear().toString());
  const [semester, setSemester] = useState<string>("I");
  const [branch, setBranch] = useState<string>("ALL");
  const [batch, setBatch] = useState<string>("");
  const [program, setProgram] = useState<string>("B.Tech");
  const [regulation, setRegulation] = useState<string>("Unknown");

  const { data: batches, isLoading: isLoadingBatches } = useQuery<string[]>({
    queryKey: ["batches"],
    queryFn: async () => {
      const res = await fetch('/api/v1/examcell/batches', { headers: { 'Authorization': `Bearer ${(localStorage.getItem('ec_auth_token') || localStorage.getItem('erp_access_token'))}` } });
      if (!res.ok) throw new Error("Failed to fetch batches");
      return res.json();
    }
  });
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { mutateAsync: uploadPreview, isPending: isPreviewing } = useUploadPreview();
  const { mutateAsync: uploadResults, isPending: isResultsPending } = useUploadResults();
  const { mutateAsync: uploadStudents, isPending: isStudentsPending } = useUploadStudents();

  // Preview Modal State
  const [showPreviewDialog, setShowPreviewDialog] = useState(false);
  const [previewData, setPreviewData] = useState<any>(null);

  const [timer, setTimer] = useState(0);

  // Student Data specific state
  const [studentFile, setStudentFile] = useState<File | null>(null);
  const [isDraggingStudent, setIsDraggingStudent] = useState(false);
  const studentFileInputRef = useRef<HTMLInputElement>(null);

  // Mid Marks Data specific state
  const [midMarksFile, setMidMarksFile] = useState<File | null>(null);
  const [isDraggingMidMarks, setIsDraggingMidMarks] = useState(false);
  const [isImportingMidMarks, setIsImportingMidMarks] = useState(false);
  const [midMarksResult, setMidMarksResult] = useState<any>(null);
  const midMarksFileRef = useRef<HTMLInputElement>(null);
  const [midSection, setMidSection] = useState<string>("");
  const [midSubjectCode, setMidSubjectCode] = useState<string>("");
  const [midType, setMidType] = useState<string>("MID1");

  // Fetch mapped subjects to populate subject dropdown
  const { data: mappings } = useQuery<any[]>({
    queryKey: ['/api/v1/examcell/faculty-mappings'],
    queryFn: () => authFetch('/api/v1/examcell/faculty-mappings')
  });

  const availableSubjects = mappings?.filter((m: any) => {
    const isBranchMatch = !branch || m.branch === 'ALL' || (m.branch && m.branch.split(',').map((b: string) => b.trim()).includes(branch));
    return (
      isBranchMatch &&
      (!semester || m.semester === semester) &&
      (!batch || m.batch === batch) &&
      (!midSection || m.section === midSection)
    );
  }) || [];

  // Deduplicate subjects uniquely by subjectCode
  const uniqueSubjects = Array.from(new Map(availableSubjects.map((item: any) => [item.subjectCode, item])).values());

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isResultsPending || isStudentsPending || isPreviewing) {
      setTimer(0);
      interval = setInterval(() => {
        setTimer(t => t + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isResultsPending, isStudentsPending, isPreviewing]);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragOverStudent = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingStudent(true);
  };
  const handleDragOverMidMarks = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingMidMarks(true);
  };

  const handleDragLeave = () => setIsDragging(false);
  const handleDragLeaveStudent = () => setIsDraggingStudent(false);
  const handleDragLeaveMidMarks = () => setIsDraggingMidMarks(false);

  const handleFileSelection = (selectedFile: File) => {
    setFile(selectedFile);

    // Auto-detect Month and Year from filename
    // e.g. "Result of I B.Tech I Semester (R19R20R23) Regular  Supplementary Examinations, Jan-2024"
    const name = selectedFile.name;
    const dateMatch = name.match(/(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*[- ]*(20\d{2})/i);
    if (dateMatch) {
      const monthPrefix = dateMatch[1].toLowerCase();
      const year = dateMatch[2];

      const monthMap: Record<string, string> = {
        jan: "January", feb: "February", mar: "March", apr: "April", may: "May", jun: "June",
        jul: "July", aug: "August", sep: "September", oct: "October", nov: "November", dec: "December"
      };

      if (monthMap[monthPrefix]) {
        setExamMonth(monthMap[monthPrefix]);
      }
      setExamYear(year);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFileSelection(e.dataTransfer.files[0]);
    }
  };

  const handleDropStudent = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingStudent(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      setStudentFile(e.dataTransfer.files[0]);
    }
  };

  const handleDropMidMarks = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingMidMarks(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      setMidMarksFile(e.dataTransfer.files[0]);
      setMidMarksResult(null);
    }
  };

  const handleStudentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!studentFile) return;

    const formData = new FormData();
    formData.append("file", studentFile);

    try {
      await uploadStudents(formData);
      setStudentFile(null);
    } catch (err) { }
  };

  const handleMidMarksSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!midMarksFile || !branch || !batch || !semester || !midSubjectCode) return;
    if (!window.confirm(`Import mid marks from "${midMarksFile.name}" for ${branch} ${semester}? This will overwrite existing marks for the same students/subject.`)) return;

    setIsImportingMidMarks(true);
    setMidMarksResult(null);
    try {
      const formData = new FormData();
      formData.append('file', midMarksFile);
      formData.append('branch', branch);
      formData.append('batch', batch);
      formData.append('semester', semester);
      formData.append('section', midSection);
      formData.append('subjectCode', midSubjectCode);
      formData.append('academicYear', examYear);

      const token = (localStorage.getItem('ec_auth_token') || localStorage.getItem('erp_access_token'));
      const res = await fetch('/api/v1/examcell/mid-marks/bulk-import', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body: formData
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Import failed');
      setMidMarksResult(data);
    } catch (err: any) {
      setMidMarksResult({ error: err.message });
    } finally {
      setIsImportingMidMarks(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) return;

    const monthYear = `${examMonth} ${examYear}`;
    const formData = new FormData();
    formData.append("file", file);
    formData.append("batch", batch);
    formData.append("program", program);
    formData.append("regulation", regulation);

    try {
      // 1. Fetch preview data first
      const data = await uploadPreview(formData);
      setPreviewData(data);
      setShowPreviewDialog(true);
    } catch (err) {
      // Error handled by hook's toast
    }
  };

  const handleConfirmUpload = async () => {
    if (!file) return;

    const monthYear = `${examMonth} ${examYear}`;
    const formData = new FormData();
    formData.append("file", file);
    formData.append("examType", examType);
    formData.append("academicYear", monthYear);
    formData.append("semester", semester);
    formData.append("branch", branch);
    formData.append("batch", batch);
    formData.append("program", program);
    formData.append("regulation", regulation);

    try {
      await uploadResults(formData);
      setFile(null); // Reset on success
      setShowPreviewDialog(false);
    } catch (err) {
      // Error handled by hook's toast
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div className="flex items-start gap-3">
        <button onClick={() => window.history.back()} className="mt-1 p-2 bg-slate-50 hover:bg-slate-100 rounded-full transition-colors text-slate-500 hover:text-slate-900 border border-slate-200">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-3xl font-display font-bold text-slate-900">Data Upload</h1>
          <p className="text-slate-500 mt-1">Centralized hub for importing academic results and student master directories.</p>
        </div>
      </div>

      <Tabs defaultValue="results" className="w-full">
        <TabsList className="grid w-full grid-cols-2 lg:grid-cols-4 gap-2 mb-8 bg-slate-100/50 p-1 rounded-xl h-auto">
          <TabsTrigger value="results" className="text-sm md:text-base py-2.5 md:py-3 rounded-lg font-medium transition-all data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:text-primary break-words whitespace-normal text-center h-full">Upload Results</TabsTrigger>
          <TabsTrigger value="students" className="text-sm md:text-base py-2.5 md:py-3 rounded-lg font-medium transition-all data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:text-primary break-words whitespace-normal text-center h-full">Student Directory</TabsTrigger>
          <TabsTrigger value="mid-marks" className="text-sm md:text-base py-2.5 md:py-3 rounded-lg font-medium transition-all data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:text-primary break-words whitespace-normal text-center h-full">Mid Marks</TabsTrigger>
          <TabsTrigger value="photos" className="text-sm md:text-base py-2.5 md:py-3 rounded-lg font-medium transition-all data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:text-primary break-words whitespace-normal text-center h-full">Photo Uploads</TabsTrigger>
        </TabsList>

        <TabsContent value="results" className="mt-0 outline-none">
          <motion.form
            onSubmit={handleSubmit}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white border border-slate-100 shadow-xl shadow-slate-200/40 p-8 rounded-3xl space-y-8 relative overflow-hidden"
          >
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 to-indigo-600"></div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 relative z-10">
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">Exam Type</label>
                <select
                  value={examType}
                  onChange={(e) => setExamType(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-primary/50 appearance-none font-medium"
                >
                  <option value="REGULAR">REGULAR</option>
                  <option value="REGULAR_REVALUATION">REGULAR_REVALUATION</option>
                  <option value="SUPPLY">SUPPLY</option>
                  <option value="SUPPLY_REVALUATION">SUPPLY_REVALUATION</option>
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">Results Month</label>
                <select
                  value={examMonth}
                  onChange={(e) => setExamMonth(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-primary/50 appearance-none font-medium"
                >
                  {["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"].map(m => (
                    <option key={m} value={m}>{m}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">Results Year</label>
                <select
                  value={examYear}
                  onChange={(e) => setExamYear(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-primary/50 appearance-none font-medium"
                >
                  {Array.from({ length: 10 }, (_, i) => (2020 + i).toString()).map(y => (
                    <option key={y} value={y}>{y}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">Semester</label>
                <select
                  value={semester}
                  onChange={(e) => setSemester(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-primary/50 appearance-none font-medium"
                >
                  {(program === "MCA" ? ["I", "II", "III", "IV"] : ["I", "II", "III", "IV", "V", "VI", "VII", "VIII"]).map(sem => (
                    <option key={sem} value={sem}>{formatSemester(sem, program)}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">Program</label>
                <select
                  value={program}
                  onChange={(e) => {
                    const newProgram = e.target.value;
                    setProgram(newProgram);
                    if (newProgram === "MCA") {
                      setBranch("MCA");
                    }
                  }}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-primary/50 appearance-none font-medium"
                >
                  <option value="B.Tech">B.Tech</option>
                  <option value="MCA">MCA</option>
                  <option value="M.Tech">M.Tech</option>
                  <option value="MBA">MBA</option>
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">Branch</label>
                <select
                  value={branch}
                  onChange={(e) => setBranch(e.target.value)}
                  disabled={program === "MCA"}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-primary/50 appearance-none font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <option value="ALL">All Branches</option>
                  <option value="CSE">CSE</option>
                  <option value="ECE">ECE</option>
                  <option value="EEE">EEE</option>
                  <option value="IT">IT</option>
                  <option value="MECH">Mechanical</option>
                  <option value="CIVIL">Civil</option>
                  <option value="CSE(AIML)">CSE(AIML)</option>
                  <option value="CSE(DS)">CSE(DS)</option>
                  <option value="MCA">MCA</option>
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">Batch</label>
                <select
                  value={batch}
                  onChange={(e) => setBatch(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-primary/50 appearance-none font-medium"
                  disabled={isLoadingBatches}
                >
                  <option value="">Select Batch</option>
                  {batches?.map(b => <option key={b} value={b}>{b}</option>)}
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">Regulation</label>
                <select
                  value={regulation}
                  onChange={(e) => setRegulation(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-primary/50 appearance-none font-medium"
                >
                  <option value="Unknown">Auto-Detect (PDF Only)</option>
                  <option value="R23">R23</option>
                  <option value="R20">R20</option>
                  <option value="R19">R19</option>
                  <option value="R16">R16</option>
                </select>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700">Upload Data File</label>
              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`
                  relative border-2 border-dashed rounded-3xl p-12 text-center cursor-pointer transition-all duration-300 bg-slate-50
                  ${isDragging ? 'border-indigo-500 bg-indigo-50/50 scale-[0.99] shadow-inner' : 'border-slate-300 hover:border-indigo-400 hover:bg-slate-100/50'}
                  ${file ? 'bg-indigo-50/30 border-indigo-500' : ''}
                `}
              >
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={(e) => e.target.files && handleFileSelection(e.target.files[0])}
                  className="hidden"
                  accept=".pdf, application/pdf, .csv, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel"
                />

                <AnimatePresence mode="wait">
                  {file ? (
                    <motion.div
                      key="file-selected"
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.9 }}
                      className="flex flex-col items-center"
                    >
                      <div className="w-16 h-16 rounded-full bg-emerald-50 flex items-center justify-center mb-4">
                        <CheckCircle className="w-8 h-8 text-emerald-500" />
                      </div>
                      <h3 className="text-lg font-medium text-slate-900">{file.name}</h3>
                      <p className="text-sm text-slate-500 mt-1">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); setFile(null); }}
                        className="mt-4 px-4 py-2 rounded-xl bg-rose-50 text-rose-600 hover:bg-rose-500 hover:text-white transition-colors text-sm font-medium shadow-sm"
                      >
                        Remove File
                      </button>
                    </motion.div>
                  ) : (
                    <motion.div
                      key="upload-prompt"
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.9 }}
                      className="flex flex-col items-center"
                    >
                      <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform shadow-sm">
                        <UploadCloud className="w-8 h-8 text-primary/70" />
                      </div>
                      <h3 className="text-lg font-medium text-slate-900">Click or drag file to this area to upload</h3>
                      <p className="text-sm text-slate-500 mt-1">Support for PDF, CSV or Excel files</p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>

            <div className="pt-4 flex justify-end">
              <button
                type="submit"
                disabled={!file || isPreviewing}
                className={`px-8 py-3.5 rounded-xl font-bold text-lg bg-gradient-to-br from-indigo-500 to-purple-600 text-slate-800 shadow-lg shadow-indigo-500/30 hover:shadow-indigo-500/40 hover:-translate-y-0.5 active:translate-y-0 transition-all duration-200 flex items-center justify-center gap-2 ${isPreviewing ? 'opacity-80 cursor-wait transform-none' : 'disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none'}`}
              >
                {isPreviewing ? (
                  <div className="flex flex-col items-center">
                    <div className="flex items-center gap-2">
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Generating Preview...
                    </div>
                  </div>
                ) : (
                  <>
                    Preview & Upload
                  </>
                )}
              </button>
            </div>
          </motion.form>
        </TabsContent>

        <TabsContent value="students" className="mt-0 outline-none">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <form
              onSubmit={handleStudentSubmit}
              className="bg-white border border-slate-100 shadow-xl shadow-slate-200/40 p-8 rounded-3xl space-y-8 relative overflow-hidden"
            >
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-600 to-teal-500"></div>
              <div className="space-y-4 relative z-10">
                <div>
                  <h2 className="text-xl font-display font-bold text-slate-900 mb-1">Upload Master Student Directory</h2>
                  <p className="text-slate-500 text-sm">Upload an Excel/CSV file containing all student details (Roll Number, Name, Branch, etc.) to link results to actual names instead of 'TBA'.</p>
                </div>

                <div
                  onDragOver={handleDragOverStudent}
                  onDragLeave={handleDragLeaveStudent}
                  onDrop={handleDropStudent}
                  onClick={() => studentFileInputRef.current?.click()}
                  className={`
                    relative border-2 border-dashed rounded-3xl p-12 text-center cursor-pointer transition-all duration-300 bg-slate-50
                    ${isDraggingStudent ? 'border-emerald-500 bg-emerald-50/50 scale-[0.99] shadow-inner' : 'border-slate-300 hover:border-emerald-400 hover:bg-slate-100/50'}
                    ${studentFile ? 'bg-emerald-50/30 border-emerald-500' : ''}
                  `}
                >
                  <input
                    type="file"
                    ref={studentFileInputRef}
                    onChange={(e) => e.target.files && setStudentFile(e.target.files[0])}
                    className="hidden"
                    accept=".csv, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel"
                  />

                  <AnimatePresence mode="wait">
                    {studentFile ? (
                      <motion.div
                        key="student-file-selected"
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.9 }}
                        className="flex flex-col items-center"
                      >
                        <div className="w-16 h-16 rounded-full bg-emerald-50 flex items-center justify-center mb-4">
                          <CheckCircle className="w-8 h-8 text-emerald-500" />
                        </div>
                        <h3 className="text-lg font-medium text-slate-900">{studentFile.name}</h3>
                        <p className="text-sm text-slate-500 mt-1">{(studentFile.size / 1024 / 1024).toFixed(2)} MB</p>
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); setStudentFile(null); }}
                          className="mt-4 px-4 py-2 rounded-xl bg-rose-50 text-rose-600 hover:bg-rose-500 hover:text-white transition-colors text-sm font-medium shadow-sm"
                        >
                          Remove File
                        </button>
                      </motion.div>
                    ) : (
                      <motion.div
                        key="student-upload-prompt"
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.9 }}
                        className="flex flex-col items-center"
                      >
                        <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform shadow-sm">
                          <FileType className="w-8 h-8 text-primary/70" />
                        </div>
                        <h3 className="text-lg font-medium text-slate-900">Click or drag data file to upload</h3>
                        <p className="text-sm text-slate-500 mt-1">Required Columns: Roll Number, Name, Branch, Batch, Regulation, Program, Section</p>
                        <a
                          href="/student_template.csv"
                          download
                          onClick={(e) => e.stopPropagation()}
                          className="mt-6 px-5 py-2.5 rounded-xl bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 hover:text-primary hover:border-primary/30 transition-all text-sm font-medium flex items-center gap-2 shadow-sm"
                        >
                          <FileType className="w-4 h-4" />
                          Download CSV Template
                        </a>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>

              <div className="pt-4 flex justify-end">
                <button
                  type="submit"
                  disabled={!studentFile || isStudentsPending}
                  className={`px-8 py-3.5 rounded-xl font-bold text-lg bg-white text-slate-800 shadow-lg shadow-slate-900/20 hover:shadow-xl hover:shadow-slate-900/30 hover:-translate-y-0.5 active:translate-y-0 transition-all duration-200 flex items-center justify-center gap-2 ${isStudentsPending ? 'opacity-80 cursor-wait transform-none' : 'disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none'}`}
                >
                  {isStudentsPending ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Syncing Master Data...
                    </>
                  ) : (
                    <>
                      Sync Master Directory
                    </>
                  )}
                </button>
              </div>
            </form>
          </motion.div>
        </TabsContent>

        {/* ─── MID MARKS UPLOAD TAB ─── */}
        <TabsContent value="mid-marks" className="mt-0 outline-none">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <form onSubmit={handleMidMarksSubmit} className="bg-white border border-slate-100 shadow-xl shadow-slate-200/40 p-8 rounded-3xl space-y-8 relative overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-400 to-indigo-500"></div>

              <div className="flex justify-between items-start z-10 relative">
                <div>
                  <h2 className="text-xl font-display font-bold text-slate-900 mb-1">Upload Internal Mid Marks (Excel)</h2>
                  <p className="text-slate-500 text-sm">Select the exact class details below, then upload the Excel file containing the marks.</p>
                </div>
                {/* Template Download Button */}
                <a
                  href="/api/v1/examcell/mid-marks/template"
                  download
                  className="px-4 py-2 bg-blue-50 text-blue-700 hover:bg-blue-100 rounded-lg text-sm font-semibold transition-colors flex items-center gap-2 border border-blue-200"
                >
                  <FileUp className="w-4 h-4" /> Download Template
                </a>
              </div>

              {/* Required Filters before upload */}
              <div className="bg-slate-50/50 border border-slate-200 rounded-2xl p-6 relative z-10">
                <h3 className="text-sm font-semibold text-slate-700 mb-4 pb-2 border-b border-slate-200 flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-500" /> Required Class Details</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 items-end">
                  <div className="w-full"><ProgramSelector value={program} onChange={setProgram} /></div>
                  <div className="w-full"><BranchSelector value={branch} onChange={setBranch} /></div>
                  <div className="w-full"><BatchSelector value={batch} onChange={setBatch} program={program} /></div>
                  <div className="space-y-2 w-full">
                    <label className="text-xs font-medium text-slate-500 uppercase tracking-wider">Mid Exam Type</label>
                    <select
                      value={midType}
                      onChange={(e) => setMidType(e.target.value)}
                      className="w-full px-4 py-2 bg-white border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-primary/20 transition-all shadow-sm"
                    >
                      <option value="MID1">MID 1</option>
                      <option value="MID2">MID 2</option>
                      <option value="LAB">LAB</option>
                    </select>
                  </div>
                  <div className="space-y-2 w-full">
                    <label className="text-xs font-medium text-slate-500 uppercase tracking-wider">Semester</label>
                    <select value={semester} onChange={(e) => setSemester(e.target.value)} className="w-full px-4 py-2 bg-white border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-primary/20 transition-all shadow-sm">
                      <option value="">Select</option>
                      {program === "MCA"
                        ? ["I", "II", "III", "IV"].map(s => <option key={s} value={s}>{formatSemester(s, program)}</option>)
                        : ["I", "II", "III", "IV", "V", "VI", "VII", "VIII"].map(s => <option key={s} value={s}>{formatSemester(s, program)}</option>)
                      }
                    </select>
                  </div>
                  <div className="w-full"><SectionSelector value={midSection} onChange={setMidSection} batch={batch} branch={branch} /></div>
                  <div className="space-y-2 w-full sm:col-span-2 lg:col-span-1">
                    <label className="text-xs font-medium text-slate-500 uppercase tracking-wider">Subject mapped</label>
                    <select value={midSubjectCode} onChange={(e) => setMidSubjectCode(e.target.value)} className="w-full px-4 py-2 bg-white border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-primary/20 transition-all shadow-sm">
                      <option value="">Select Subject</option>
                      {uniqueSubjects.map((s: any) => (
                        <option key={s.subjectCode} value={s.subjectCode}>
                          {s.subjectCode} - {s.subjectName}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              <div className="space-y-4 relative z-10">
                <div
                  onDragOver={handleDragOverMidMarks}
                  onDragLeave={handleDragLeaveMidMarks}
                  onDrop={handleDropMidMarks}
                  onClick={() => midMarksFileRef.current?.click()}
                  className={`
                    relative border-2 border-dashed rounded-3xl p-12 text-center cursor-pointer transition-all duration-300 bg-slate-50
                    ${isDraggingMidMarks ? 'border-blue-500 bg-blue-50/50 scale-[0.99] shadow-inner' : 'border-slate-300 hover:border-blue-400 hover:bg-slate-100/50'}
                    ${midMarksFile ? 'bg-blue-50/30 border-blue-500' : ''}
                  `}
                >
                  <input
                    type="file"
                    ref={midMarksFileRef}
                    onChange={(e) => { e.target.files && setMidMarksFile(e.target.files[0]); setMidMarksResult(null); }}
                    className="hidden"
                    accept=".xls,.xlsx"
                  />
                  <AnimatePresence mode="wait">
                    {midMarksFile ? (
                      <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }} className="flex flex-col items-center">
                        <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center mb-4 shadow-inner">
                          <FileType className="w-10 h-10 text-blue-600" />
                        </div>
                        <h3 className="text-xl font-bold text-slate-800">{midMarksFile.name}</h3>
                        <p className="text-sm font-medium text-slate-500 mt-2 bg-white px-3 py-1 rounded-full border border-slate-200">
                          {(midMarksFile.size / 1024 / 1024).toFixed(2)} MB • Excel Spreadsheet
                        </p>
                        <button type="button" onClick={(e) => { e.stopPropagation(); setMidMarksFile(null); setMidMarksResult(null); }} className="mt-6 text-sm font-semibold text-red-500 hover:text-red-600 hover:underline">
                          Remove file
                        </button>
                      </motion.div>
                    ) : (
                      <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }} className="flex flex-col items-center">
                        <div className="w-20 h-20 bg-white border border-slate-200 rounded-full flex items-center justify-center mb-4 shadow-sm group-hover:shadow-md transition-all">
                          <UploadCloud className="w-8 h-8 text-blue-500/70" />
                        </div>
                        <h3 className="text-lg font-medium text-slate-900">Click or drag Excel file here</h3>
                        <p className="text-sm text-slate-500 mt-1">Accepts standard .xls and .xlsx templates</p>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {/* Format Hint */}
                <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 text-sm text-blue-700 space-y-1">
                  <p className="font-semibold flex items-center gap-2"><AlertCircle className="w-4 h-4" /> Required Template Data Format:</p>
                  <ul className="list-disc list-inside space-y-0.5 ml-1 text-blue-600">
                    <li>The system identifies students purely by the Roll Number provided. Header attributes are ignored.</li>
                    <li>Row 8+ Data: S.No | Roll No | MID-1 Exam | Quiz-1 | Assignment-1 | Total | (skip) | MID-2 Exam | Quiz-2 | Assignment-2 | Total</li>
                  </ul>
                </div>

                {/* Import Result Summary */}
                {midMarksResult && !midMarksResult.error && (
                  <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="bg-white border border-emerald-200 rounded-2xl p-6 shadow-sm space-y-4">
                    <div className="flex items-center gap-2 text-emerald-600 font-bold text-lg">
                      <CheckCircle2 className="w-6 h-6" /> Import Complete
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      {[
                        { label: 'Subject Code', value: midMarksResult.subjectCode },
                        { label: 'Branch', value: midMarksResult.branch || '—' },
                        { label: 'Semester', value: midMarksResult.semester || '—' },
                        { label: 'Batch', value: midMarksResult.batch || '—' },
                      ].map(item => (
                        <div key={item.label} className="bg-slate-50 rounded-xl p-3 border border-slate-100">
                          <p className="text-xs text-slate-500 uppercase tracking-wider font-semibold">{item.label}</p>
                          <p className="font-bold text-slate-800 mt-0.5">{item.value}</p>
                        </div>
                      ))}
                    </div>
                    <div className="flex gap-4">
                      <div className="flex-1 bg-emerald-50 border border-emerald-100 rounded-2xl p-5 text-center">
                        <p className="text-3xl font-black text-emerald-600">{midMarksResult.imported}</p>
                        <p className="text-sm font-semibold text-emerald-700 mt-1">Students Imported</p>
                      </div>
                      <div className="flex-1 bg-amber-50 border border-amber-100 rounded-2xl p-5 text-center">
                        <p className="text-3xl font-black text-amber-600">{midMarksResult.skipped}</p>
                        <p className="text-sm font-semibold text-amber-700 mt-1">Roll Nos Skipped/Not Found</p>
                      </div>
                    </div>
                    {midMarksResult.errors?.length > 0 && (
                      <div className="bg-red-50 border border-red-100 rounded-xl p-4">
                        <p className="text-sm font-bold text-red-700 mb-2 flex items-center gap-1.5"><XCircle className="w-4 h-4" /> Skipped Details ({midMarksResult.errors.length}):</p>
                        <ul className="text-xs font-medium text-red-600 space-y-1 max-h-32 overflow-y-auto pl-2">
                          {midMarksResult.errors.map((e: string, i: number) => <li key={i}>• {e}</li>)}
                        </ul>
                      </div>
                    )}
                  </motion.div>
                )}

                {midMarksResult && midMarksResult.error && (
                  <div className="bg-red-50 text-red-600 p-4 rounded-xl border border-red-200 flex items-start gap-3">
                    <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-bold">Import Failed</p>
                      <p className="text-sm mt-1">{midMarksResult.error}</p>
                    </div>
                  </div>
                )}
              </div>

              <div className="pt-4 flex justify-end">
                <button
                  type="submit"
                  disabled={!midMarksFile || isImportingMidMarks || !branch || !batch || !semester || !midSubjectCode}
                  className={`px-8 py-3.5 rounded-xl font-bold text-lg bg-gradient-to-br from-blue-500 to-indigo-600 text-slate-800 shadow-lg shadow-blue-500/30 hover:shadow-blue-500/40 hover:-translate-y-0.5 transition-all duration-200 flex items-center justify-center gap-2 ${isImportingMidMarks ? 'opacity-80 cursor-wait transform-none' : 'disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none'}`}
                >
                  {isImportingMidMarks ? (
                    <><Loader2 className="w-5 h-5 animate-spin" /> Importing...</>
                  ) : (
                    <><UploadIcon className="w-5 h-5" /> Import Mid Marks</>
                  )}
                </button>
              </div>
            </form>
          </motion.div>
        </TabsContent>

        <TabsContent value="photos" className="mt-0 outline-none">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <BulkPhotoUpload />
          </motion.div>
        </TabsContent>
      </Tabs>

      {/* Smart Preview Confirmation Modal */}
      <Dialog open={showPreviewDialog} onOpenChange={setShowPreviewDialog}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="text-2xl font-display text-slate-900">Upload Preview</DialogTitle>
            <DialogDescription>
              Review the processed results before committing them to the database.
            </DialogDescription>
          </DialogHeader>

          {previewData && (
            <div className="mt-4 flex-1 overflow-auto space-y-6 px-1">
              {/* Summary Stats Widget */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl text-center">
                  <p className="text-sm font-medium text-slate-500 mb-1">Total Parsed</p>
                  <p className="text-3xl font-display font-bold text-slate-800">{previewData.totalParsed}</p>
                </div>
                <div className="bg-primary/10 border border-primary/20 p-4 rounded-xl text-center">
                  <p className="text-sm font-medium text-primary mb-1">Row Matches (To Save)</p>
                  <p className="text-3xl font-display font-bold text-primary">{previewData.matchedCount}</p>
                </div>
                <div className="bg-destructive/10 border border-destructive/20 p-4 rounded-xl text-center">
                  <p className="text-sm font-medium text-destructive mb-1">Rows Skipped</p>
                  <p className="text-3xl font-display font-bold text-destructive">{previewData.skippedCount}</p>
                </div>
              </div>

              {previewData.skippedCount > previewData.matchedCount && (
                <div className="bg-amber-50 border border-amber-200 p-4 rounded-2xl shadow-sm flex items-start gap-3">
                  <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    <h4 className="font-semibold text-amber-800">High Skipped Row Count</h4>
                    <p className="text-sm text-amber-700 mt-1 leading-relaxed">
                      The parser skipped more rows than it matched. The uploaded file likely contains data across multiple batches.
                      For Batch <span className="font-bold">{batch}</span>, only roll numbers prefixed with <span className="font-bold">'{batch.substring(2, 4)}'</span> (regular) or <span className="font-bold">'{String(parseInt(batch.substring(0, 4)) + 1).substring(2)}'</span> (lateral entry) will be saved.
                    </p>
                  </div>
                </div>
              )}

              {/* Data Preview Table */}
              <div className="border border-slate-200 rounded-xl overflow-hidden bg-white">
                <div className="bg-slate-50 px-4 py-3 border-b border-slate-200 flex items-center justify-between">
                  <h3 className="font-semibold text-slate-800">First 10 Matched Rows Data</h3>
                  <span className="text-xs font-medium px-2.5 py-1 bg-white border border-slate-200 rounded-md text-slate-600 shadow-sm">
                    {examType} • {semester}
                  </span>
                </div>
                {previewData.previewRows && previewData.previewRows.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                      <thead className="bg-slate-100/50 text-slate-500 uppercase text-xs tracking-wider">
                        <tr>
                          <th className="px-4 py-3 font-medium">Roll No</th>
                          <th className="px-4 py-3 font-medium">Sub Code</th>
                          <th className="px-4 py-3 font-medium">Sub Name</th>
                          <th className="px-4 py-3 font-medium text-center">Cr</th>
                          <th className="px-4 py-3 font-medium text-center">Gr</th>
                          <th className="px-4 py-3 font-medium text-center">Pts</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {previewData.previewRows.map((row: any, i: number) => (
                          <tr key={i} className="hover:bg-slate-50">
                            <td className="px-4 py-3 font-medium text-slate-900">{row.RollNumber}</td>
                            <td className="px-4 py-3 font-mono text-slate-600 text-xs">{row.SubjectCode}</td>
                            <td className="px-4 py-3 text-slate-700 truncate max-w-xs">{row.SubjectName}</td>
                            <td className="px-4 py-3 text-center text-slate-600">{row.Credits}</td>
                            <td className="px-4 py-3 text-center font-bold text-slate-800">{row.Grade}</td>
                            <td className="px-4 py-3 text-center text-slate-600">{row.GradePoints}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="p-8 text-center text-slate-500">
                    No data matched the selected Batch criteria.
                  </div>
                )}
              </div>
            </div>
          )}

          <DialogFooter className="mt-6 border-t border-slate-100 pt-6">
            <Button
              variant="outline"
              onClick={() => setShowPreviewDialog(false)}
              disabled={isResultsPending}
              className="mr-2 rounded-xl border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-slate-900"
            >
              Cancel
            </Button>
            <Button
              onClick={handleConfirmUpload}
              disabled={isResultsPending || (previewData && previewData.matchedCount === 0)}
              className={`rounded-xl px-6 bg-gradient-to-r from-emerald-500 to-teal-500 text-slate-800 shadow-md shadow-emerald-500/20 hover:-translate-y-0.5 transition-all outline-none border-none hover:opacity-90 ${isResultsPending ? 'opacity-80' : ''}`}
            >
              {isResultsPending ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  Saving ({timer}s)...
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4 mr-2" /> Confirm & Save Results
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

