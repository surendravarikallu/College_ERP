import { Loader2, Plus, Trash2, UserPlus, BookOpen, X, Edit2, Check, Search, ChevronDown, Upload, FileUp, Download, CheckCircle } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { authFetch } from "../hooks/use-auth";
import { useFaculty, useCreateFaculty, useUpdateFaculty, useDeleteFaculty, useFacultyMappings, useCreateFacultyMapping, useDeleteFacultyMapping } from "../hooks/use-faculty";
import { BranchSelector, BatchSelector, SectionSelector, AcYearSelector } from "../components/academics/ReportFilters";
import { formatSemester } from "../lib/utils";
import { useState, useRef } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "../hooks/use-toast";

interface Faculty {
    id: number;
    facultyName: string;
    department?: string;
    designation?: string;
}

interface Subject {
    subjectCode: string;
    subjectName: string;
    // Add other subject properties if needed
}

export default function FacultyManagement() {
    // Faculty form state
    const [facultyName, setFacultyName] = useState("");
    const [department, setDepartment] = useState("");
    const [designation, setDesignation] = useState("");
    const [editingId, setEditingId] = useState<number | null>(null);
    const [editName, setEditName] = useState("");
    const [editDepartment, setEditDepartment] = useState("");
    const [editDesignation, setEditDesignation] = useState("");

    // Mapping form state
    const [mappingFacultyId, setMappingFacultyId] = useState("");
    const [mappingSubjectCode, setMappingSubjectCode] = useState("");
    const [mappingSemester, setMappingSemester] = useState("");
    const [mappingBranch, setMappingBranch] = useState("");
    const [mappingAcYear, setMappingAcYear] = useState("");
    const [mappingBatch, setMappingBatch] = useState("");
    const [mappingSection, setMappingSection] = useState("");

    // Bulk import state
    const [bulkFacultyFile, setBulkFacultyFile] = useState<File | null>(null);
    const [bulkMappingFile, setBulkMappingFile] = useState<File | null>(null);
    const bulkFacultyRef = useRef<HTMLInputElement>(null);
    const bulkMappingRef = useRef<HTMLInputElement>(null);
    const queryClient = useQueryClient();
    const { toast } = useToast();

    // Queries
    const { data: facultyList, isLoading: loadingFaculty } = useFaculty();
    const { data: mappings, isLoading: loadingMappings } = useFacultyMappings();

    const { data: subjects, isLoading: loadingSubjects } = useQuery<Subject[]>({
        queryKey: ["/api/v1/examcell/subjects", mappingBranch, mappingSemester, mappingBatch],
        queryFn: () => authFetch(`/api/subjects?branch=${encodeURIComponent(mappingBranch)}&semester=${encodeURIComponent(mappingSemester)}&batch=${encodeURIComponent(mappingBatch)}`),
        enabled: !!mappingBranch && !!mappingSemester && !!mappingBatch,
    });

    // Keep track of which search dropdown is open
    const [openDropdownSubject, setOpenDropdownSubject] = useState<string | null>(null);
    const [dropdownSearch, setDropdownSearch] = useState("");

    // Mutations
    const createFaculty = useCreateFaculty();
    const updateFaculty = useUpdateFaculty();
    const deleteFaculty = useDeleteFaculty();
    const createMapping = useCreateFacultyMapping();
    const deleteMapping = useDeleteFacultyMapping();

    // Bulk faculty import mutation
    const bulkFacultyMutation = useMutation({
        mutationFn: async (file: File) => {
            const formData = new FormData();
            formData.append('file', file);
            const token = (localStorage.getItem('ec_auth_token') || localStorage.getItem('erp_access_token'));
            const res = await fetch('/api/v1/examcell/faculty/bulk', {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` },
                body: formData,
            });
            if (!res.ok) { const err = await res.json(); throw new Error(err.message); }
            return res.json();
        },
        onSuccess: (data) => {
            toast({ title: `Imported ${data.created} faculty, ${data.skipped || 0} skipped` });
            queryClient.invalidateQueries({ queryKey: ["/api/v1/examcell/faculty"] });
            setBulkFacultyFile(null);
        },
        onError: (err: Error) => toast({ title: "Bulk import failed", description: err.message, variant: "destructive" }),
    });

    // Bulk mapping import mutation
    const bulkMappingMutation = useMutation({
        mutationFn: async (file: File) => {
            const formData = new FormData();
            formData.append('file', file);
            const token = (localStorage.getItem('ec_auth_token') || localStorage.getItem('erp_access_token'));
            const res = await fetch('/api/v1/examcell/faculty-mapping/bulk', {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` },
                body: formData,
            });
            if (!res.ok) { const err = await res.json(); throw new Error(err.message); }
            return res.json();
        },
        onSuccess: (data) => {
            toast({ title: `Created ${data.created} mappings` + (data.errors?.length ? `, ${data.errors.length} errors` : '') });
            queryClient.invalidateQueries({ queryKey: ["/api/v1/examcell/faculty-mapping"] });
            queryClient.invalidateQueries({ queryKey: ["/api/v1/examcell/faculty"] });
            setBulkMappingFile(null);
        },
        onError: (err: Error) => toast({ title: "Bulk mapping failed", description: err.message, variant: "destructive" }),
    });

    const flushFacultyMutation = useMutation({
        mutationFn: async () => {
            const token = (localStorage.getItem('ec_auth_token') || localStorage.getItem('erp_access_token'));
            const res = await fetch('/api/v1/examcell/faculty/flush', { method: 'DELETE', headers: { 'Authorization': `Bearer ${token}` } });
            if (!res.ok) throw new Error((await res.json()).message || "Failed to flush faculty");
            return res.json();
        },
        onSuccess: () => {
            toast({ title: "Success", description: "All faculty data flushed successfully" });
            queryClient.invalidateQueries({ queryKey: ["/api/v1/examcell/faculty"] });
            queryClient.invalidateQueries({ queryKey: ["/api/v1/examcell/faculty-mapping"] });
        },
        onError: (err: any) => toast({ title: "Error", description: err.message, variant: "destructive" })
    });

    const flushMappingMutation = useMutation({
        mutationFn: async () => {
            const token = (localStorage.getItem('ec_auth_token') || localStorage.getItem('erp_access_token'));
            const res = await fetch('/api/v1/examcell/faculty-mapping/flush', { method: 'DELETE', headers: { 'Authorization': `Bearer ${token}` } });
            if (!res.ok) throw new Error((await res.json()).message || "Failed to flush faculty mappings");
            return res.json();
        },
        onSuccess: () => {
            toast({ title: "Success", description: "All mappings flushed successfully" });
            queryClient.invalidateQueries({ queryKey: ["/api/v1/examcell/faculty-mapping"] });
        },
        onError: (err: any) => toast({ title: "Error", description: err.message, variant: "destructive" })
    });

    const handleAddFaculty = () => {
        if (!facultyName.trim()) return;
        if (!window.confirm(`Are you sure you want to add ${facultyName.trim()}?`)) return;
        createFaculty.mutate(
            { facultyName: facultyName.trim(), department: department.trim() || undefined, designation: designation.trim() || undefined },
            { onSuccess: () => { setFacultyName(""); setDepartment(""); setDesignation(""); } }
        );
    };

    const handleStartEdit = (f: any) => {
        setEditingId(f.id);
        setEditName(f.facultyName);
        setEditDepartment(f.department || "");
        setEditDesignation(f.designation || "");
    };

    const handleSaveEdit = () => {
        if (!editingId || !editName.trim()) return;
        if (!window.confirm(`Save changes for ${editName.trim()}?`)) return;
        updateFaculty.mutate(
            { id: editingId, facultyName: editName.trim(), department: editDepartment.trim() || undefined, designation: editDesignation.trim() || undefined },
            { onSuccess: () => setEditingId(null) }
        );
    };

    const handleAssignFaculty = (subjectCode: string, facultyIdStr: string) => {
        if (!facultyIdStr || !mappingBranch || !mappingSemester || !mappingAcYear) return;
        if (!window.confirm("Are you sure you want to map this faculty to the subject?")) return;

        // Check if an exact mapping already exists, if so delete it first
        const existing = currentBranchMappings.find(m => m.subjectCode === subjectCode);
        if (existing) {
            // Since mutate isn't async trivially, we'll just fire the create right after
            deleteMapping.mutate(existing.id);
        }

        createMapping.mutate(
            {
                facultyId: parseInt(facultyIdStr),
                subjectCode: subjectCode.trim().toUpperCase(),
                semester: mappingSemester,
                branch: mappingBranch,
                batch: mappingBatch,
                academicYear: mappingAcYear,
                section: mappingSection || undefined,
            }
        );
    };

    const handleRemoveMapping = (mappingId: number) => {
        if (!window.confirm("Are you sure you want to remove this mapping?")) return;
        deleteMapping.mutate(mappingId);
    };

    interface FacultyMapping {
        id: number;
        facultyName: string;
        department?: string;
        subjectCode: string;
        branch: string;
        batch: string;
        semester: string;
        academicYear: string;
        section?: string;
    }

    // Pre-filter mappings to currently selected context
    const currentBranchMappings: FacultyMapping[] = (mappings || []).filter((m: FacultyMapping) => {
        const branchMatches = m.branch === mappingBranch ||
            m.branch === 'ALL' ||
            m.branch.split(',').map(b => b.trim().toUpperCase()).includes(mappingBranch.toUpperCase());

        return branchMatches &&
            m.batch === mappingBatch &&
            m.semester === mappingSemester &&
            m.academicYear === mappingAcYear &&
            (mappingSection ? m.section === mappingSection : true);
    });

    // Custom Searchable Select Block for Faculty
    const FacultyCombobox = ({ sub }: { sub: Subject }) => {
        const isOpen = openDropdownSubject === sub.subjectCode;
        if (!isOpen) {
            return (
                <button
                    onClick={() => { setOpenDropdownSubject(sub.subjectCode); setDropdownSearch(""); }}
                    className="w-full relative flex items-center justify-between px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm text-slate-500 hover:bg-slate-50 hover:border-slate-300 transition-colors"
                    disabled={!mappingAcYear || createMapping.isPending}
                >
                    <span>Select faculty...</span>
                    <ChevronDown className="w-4 h-4 text-slate-600" />
                </button>
            );
        }

        const filtered = facultyList?.filter((f: Faculty) =>
            f.facultyName.toLowerCase().includes(dropdownSearch.toLowerCase()) ||
            (f.department && f.department.toLowerCase().includes(dropdownSearch.toLowerCase()))
        ) || [];

        return (
            <div className="absolute top-0 left-0 w-full shadow-lg rounded-lg border border-slate-200 bg-white z-50">
                <div className="relative border-b border-slate-100">
                    <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-600" />
                    <input
                        type="text"
                        autoFocus
                        placeholder="Search by name or branch..."
                        value={dropdownSearch}
                        onChange={(e) => setDropdownSearch(e.target.value)}
                        className="w-full pl-9 pr-8 py-2.5 text-sm outline-none bg-transparent"
                    />
                    <button onClick={() => setOpenDropdownSubject(null)} className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-slate-600 hover:text-slate-600">
                        <X className="w-4 h-4" />
                    </button>
                </div>
                <div className="max-h-48 overflow-y-auto py-1">
                    {filtered.length === 0 ? (
                        <div className="px-4 py-3 text-sm text-slate-600 text-center">No faculty found</div>
                    ) : (
                        filtered.map((f: Faculty) => (
                            <div
                                key={f.id}
                                onClick={() => {
                                    handleAssignFaculty(sub.subjectCode, f.id.toString());
                                    setOpenDropdownSubject(null);
                                }}
                                className="px-3 py-2 cursor-pointer hover:bg-primary/5 flexitems-center flex justify-between group"
                            >
                                <span className="font-medium text-slate-700 group-hover:text-primary transition-colors text-sm">{f.facultyName}</span>
                                {f.department && (
                                    <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-slate-100 text-slate-500 group-hover:bg-primary/10 group-hover:text-primary">
                                        {f.department} Faculty
                                    </span>
                                )}
                            </div>
                        ))
                    )}
                </div>
            </div>
        );
    };

    return (
        <div className="space-y-8 max-w-6xl mx-auto">
            <div>
                <h1 className="text-3xl font-display font-bold text-slate-900">Faculty Management</h1>
                <p className="text-slate-500 mt-1">Add faculty members and map them to subjects for the consolidated report.</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* --- LEFT: Faculty List --- */}
                <div className="space-y-4">
                    <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
                        <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2 mb-4">
                            <UserPlus className="w-5 h-5 text-primary" /> Add Faculty
                        </h2>
                        <div className="space-y-3">
                            <input type="text" placeholder="Faculty Name *" value={facultyName} onChange={(e) => setFacultyName(e.target.value)}
                                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-primary/20" />
                            <div className="flex flex-col sm:flex-row gap-3">
                                <input type="text" placeholder="Department" value={department} onChange={(e) => setDepartment(e.target.value)}
                                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-primary/20" />
                                <input type="text" placeholder="Designation" value={designation} onChange={(e) => setDesignation(e.target.value)}
                                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-primary/20" />
                            </div>
                            <button onClick={handleAddFaculty} disabled={!facultyName.trim() || createFaculty.isPending}
                                className="w-full px-4 py-2.5 rounded-xl font-medium bg-primary text-slate-800 shadow-sm hover:opacity-90 flex items-center justify-center gap-2 disabled:opacity-50 text-sm">
                                {createFaculty.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />} Add Faculty
                            </button>
                        </div>
                    </div>

                    {/* Bulk Faculty Import */}
                    <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
                        <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2 mb-4">
                            <Upload className="w-5 h-5 text-blue-600" /> Bulk Faculty Import
                        </h2>
                        <p className="text-xs text-slate-500 mb-3">Upload a CSV/Excel file with columns: <b>FacultyName</b>, Department, Designation</p>
                        <a href="/faculty_template.csv" download className="inline-flex items-center gap-1.5 text-xs font-medium text-primary hover:underline mb-3">
                            <Download className="w-3.5 h-3.5" /> Download CSV Template
                        </a>
                        <div
                            onClick={() => bulkFacultyRef.current?.click()}
                            className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all ${bulkFacultyFile ? 'border-emerald-400 bg-emerald-50/50' : 'border-slate-200 hover:border-primary/40 hover:bg-slate-50'}`}
                        >
                            <input type="file" ref={bulkFacultyRef} className="hidden" accept=".csv,.xlsx,.xls"
                                onChange={(e) => e.target.files && setBulkFacultyFile(e.target.files[0])} />
                            {bulkFacultyFile ? (
                                <div className="flex items-center justify-center gap-2">
                                    <CheckCircle className="w-5 h-5 text-emerald-500" />
                                    <span className="font-medium text-sm text-slate-700">{bulkFacultyFile.name}</span>
                                    <button onClick={(e) => { e.stopPropagation(); setBulkFacultyFile(null); }} className="p-1 hover:bg-slate-200 rounded"><X className="w-3.5 h-3.5" /></button>
                                </div>
                            ) : (
                                <div className="flex flex-col items-center gap-1">
                                    <FileUp className="w-6 h-6 text-slate-600" />
                                    <span className="text-sm text-slate-500">Click to select file</span>
                                </div>
                            )}
                        </div>
                        {bulkFacultyFile && (
                            <button onClick={() => bulkFacultyMutation.mutate(bulkFacultyFile)} disabled={bulkFacultyMutation.isPending}
                                className="w-full mt-3 px-4 py-2.5 rounded-xl font-medium bg-primary text-slate-800 shadow-sm hover:opacity-90 flex items-center justify-center gap-2 disabled:opacity-50 text-sm">
                                {bulkFacultyMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                                {bulkFacultyMutation.isPending ? 'Importing...' : 'Import Faculty'}
                            </button>
                        )}
                    </div>

                    <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-lg font-bold text-slate-900">Faculty List ({facultyList?.length || 0})</h2>
                            <button onClick={() => { if (window.confirm("WARNING: Are you sure you want to delete ALL faculty and mappings? This action cannot be undone.")) flushFacultyMutation.mutate(); }}
                                disabled={flushFacultyMutation.isPending || !facultyList?.length}
                                className="px-3 py-1.5 bg-red-50 text-red-600 border border-red-200 hover:bg-red-100 rounded-lg text-sm font-medium flex items-center gap-1.5 transition-colors disabled:opacity-50">
                                {flushFacultyMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />} Flush Faculty
                            </button>
                        </div>
                        {loadingFaculty ? (
                            <div className="flex justify-center p-8"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
                        ) : !facultyList?.length ? (
                            <div className="text-center p-8 text-slate-600">No faculty added yet.</div>
                        ) : (
                            <div className="divide-y divide-slate-100 max-h-[500px] overflow-y-auto">
                                {facultyList.map((f: any) => (
                                    <div key={f.id} className="py-3 flex items-center gap-3 group">
                                        {editingId === f.id ? (
                                            <div className="flex-1 space-y-2">
                                                <input type="text" value={editName} onChange={(e) => setEditName(e.target.value)}
                                                    className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-sm" />
                                                <div className="flex gap-2">
                                                    <input type="text" value={editDepartment} onChange={(e) => setEditDepartment(e.target.value)} placeholder="Dept"
                                                        className="flex-1 px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-sm" />
                                                    <input type="text" value={editDesignation} onChange={(e) => setEditDesignation(e.target.value)} placeholder="Designation"
                                                        className="flex-1 px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-sm" />
                                                </div>
                                                <div className="flex gap-2">
                                                    <button onClick={handleSaveEdit} className="px-3 py-1 rounded-lg bg-green-500 text-white text-xs flex items-center gap-1">
                                                        <Check className="w-3 h-3" /> Save
                                                    </button>
                                                    <button onClick={() => setEditingId(null)} className="px-3 py-1 rounded-lg bg-slate-200 text-slate-700 text-xs flex items-center gap-1">
                                                        <X className="w-3 h-3" /> Cancel
                                                    </button>
                                                </div>
                                            </div>
                                        ) : (
                                            <>
                                                <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-sm shrink-0">
                                                    {f.facultyName?.charAt(0)?.toUpperCase()}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <div className="font-medium text-slate-900 truncate">{f.facultyName}</div>
                                                    <div className="text-xs text-slate-600 truncate">
                                                        {[f.department, f.designation].filter(Boolean).join(" · ") || "—"}
                                                    </div>
                                                </div>
                                                <button onClick={() => handleStartEdit(f)} className="p-1.5 rounded-lg text-slate-600 hover:text-blue-600 hover:bg-blue-50 opacity-0 group-hover:opacity-100 transition-all">
                                                    <Edit2 className="w-4 h-4" />
                                                </button>
                                                <button onClick={() => { if (confirm(`Delete ${f.facultyName}?`)) deleteFaculty.mutate(f.id); }}
                                                    className="p-1.5 rounded-lg text-slate-600 hover:text-red-500 hover:bg-red-50 opacity-0 group-hover:opacity-100 transition-all">
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                {/* --- RIGHT: Subject Mapping Tabular View --- */}
                <div className="space-y-4 lg:col-span-1">
                    <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                                <BookOpen className="w-5 h-5 text-blue-600" /> Map Faculty to Subject
                            </h2>
                            <button onClick={() => { if (window.confirm("WARNING: Are you sure you want to delete ALL faculty mappings? This action cannot be undone.")) flushMappingMutation.mutate(); }}
                                disabled={flushMappingMutation.isPending || !mappings?.length}
                                className="px-3 py-1.5 bg-red-50 text-red-600 border border-red-200 hover:bg-red-100 rounded-lg text-sm font-medium flex items-center gap-1.5 transition-colors disabled:opacity-50">
                                {flushMappingMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />} Flush Mappings
                            </button>
                        </div>

                        {/* Derive Mapping Program for Semester format */}
                        {(() => {
                            const mappingProgram = mappingBranch === "MCA" ? "MCA" : "B.TECH";
                            const mappingAvailableSemesters = mappingProgram === "MCA" ? ["I", "II", "III", "IV"] : ["I", "II", "III", "IV", "V", "VI", "VII", "VIII"];

                            return <>
                                {/* Filters Row */}
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
                                    <div className="w-full"><BranchSelector value={mappingBranch} onChange={setMappingBranch} /></div>
                                    <div className="w-full"><BatchSelector value={mappingBatch} onChange={setMappingBatch} program={mappingProgram} /></div>
                                    <div className="space-y-2 w-full">
                                        <label className="text-xs font-medium text-slate-500 uppercase tracking-wider">Semester *</label>
                                        <select value={mappingSemester} onChange={(e) => setMappingSemester(e.target.value)}
                                            className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-primary/20 font-medium text-slate-700">
                                            <option value="">Select Semester</option>
                                            {mappingAvailableSemesters.map(sem => (
                                                <option key={sem} value={sem}>{formatSemester(sem, mappingProgram)}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div className="w-full"><AcYearSelector value={mappingAcYear} onChange={setMappingAcYear} /></div>
                                    <div className="w-full"><SectionSelector value={mappingSection} onChange={setMappingSection} batch={mappingBatch} branch={mappingBranch} /></div>
                                </div>

                                {/* Bulk Mapping Import */}
                                <div className="bg-slate-50 border border-dashed border-slate-300 rounded-xl p-4 mb-6">
                                    <h3 className="font-semibold text-sm text-slate-700 flex items-center gap-2 mb-2">
                                        <Upload className="w-4 h-4 text-blue-600" /> Bulk Mapping Import
                                    </h3>
                                    <p className="text-xs text-slate-500 mb-2">
                                        Upload CSV/Excel with: <b>FacultyName, SubjectCode, SubjectName, Semester, Branch, Batch, AcademicYear, Section</b>.
                                        Faculty and subjects are auto-created if they don't exist.
                                    </p>
                                    <a href="/faculty_mapping_template.csv" download className="inline-flex items-center gap-1.5 text-xs font-medium text-primary hover:underline mb-2">
                                        <Download className="w-3.5 h-3.5" /> Download CSV Template
                                    </a>
                                    <div className="flex gap-2">
                                        <div
                                            onClick={() => bulkMappingRef.current?.click()}
                                            className={`flex-1 border-2 border-dashed rounded-lg p-3 text-center cursor-pointer transition-all ${bulkMappingFile ? 'border-emerald-400 bg-emerald-50/50' : 'border-slate-200 hover:border-primary/40'}`}
                                        >
                                            <input type="file" ref={bulkMappingRef} className="hidden" accept=".csv,.xlsx,.xls"
                                                onChange={(e) => e.target.files && setBulkMappingFile(e.target.files[0])} />
                                            {bulkMappingFile ? (
                                                <div className="flex items-center justify-center gap-2">
                                                    <CheckCircle className="w-4 h-4 text-emerald-500" />
                                                    <span className="font-medium text-xs text-slate-700 truncate">{bulkMappingFile.name}</span>
                                                    <button onClick={(e) => { e.stopPropagation(); setBulkMappingFile(null); }} className="p-0.5 hover:bg-slate-200 rounded"><X className="w-3 h-3" /></button>
                                                </div>
                                            ) : (
                                                <span className="text-xs text-slate-500">Click to select file</span>
                                            )}
                                        </div>
                                        {bulkMappingFile && (
                                            <button onClick={() => bulkMappingMutation.mutate(bulkMappingFile)} disabled={bulkMappingMutation.isPending}
                                                className="px-4 py-2 rounded-lg font-medium bg-blue-600 text-white shadow-sm hover:opacity-90 flex items-center gap-2 disabled:opacity-50 text-xs whitespace-nowrap">
                                                {bulkMappingMutation.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
                                                {bulkMappingMutation.isPending ? 'Importing...' : 'Import Mappings'}
                                            </button>
                                        )}
                                    </div>
                                </div>

                                {/* Subject Table */}
                                {!mappingBranch || !mappingSemester ? (
                                    <div className="text-center p-8 text-slate-600 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                                        Select a <b>Branch</b> and <b>Semester</b> to load subjects.
                                    </div>
                                ) : loadingSubjects || loadingFaculty ? (
                                    <div className="flex justify-center p-8"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
                                ) : !subjects?.length ? (
                                    <div className="text-center p-8 text-slate-600 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                                        No subjects found for {mappingBranch} {formatSemester(mappingSemester, mappingProgram)}.
                                    </div>
                                ) : (
                                    <>
                                        <div className="mb-2 text-sm text-slate-500 flex justify-between items-center px-1">
                                            <span><b>{subjects?.length || 0}</b> subjects found</span>
                                            {!mappingAcYear && <span className="text-amber-600 font-medium flex items-center gap-1">⚠ Please select Academic Year to map</span>}
                                        </div>
                                        <div className="overflow-x-auto border border-slate-200 rounded-xl bg-white">
                                            <table className="w-full text-sm text-left">
                                                <thead className="bg-[#e9ecef] text-slate-800 border-b-2 border-slate-300 sticky top-0 z-10 shadow-sm">
                                                    <tr>
                                                        <th className="p-3 font-bold">Code</th>
                                                        <th className="p-3 font-bold">Subject Name</th>
                                                        <th className="p-3 font-bold w-1/2 min-w-[250px]">Assigned Faculty</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-slate-100">
                                                    {subjects?.map((sub: any) => {
                                                        const existingMap = currentBranchMappings.find((m: any) => m.subjectCode === sub.subjectCode);
                                                        return (
                                                            <tr key={sub.subjectCode} className="hover:bg-slate-50 transition-colors">
                                                                <td className="p-3 font-medium text-slate-600 whitespace-nowrap">{sub.subjectCode}</td>
                                                                <td className="p-3 text-slate-800">{sub.subjectName}</td>
                                                                <td className="p-3 relative group w-64 min-w-[250px]">
                                                                    {existingMap ? (
                                                                        <div className="flex items-center justify-between bg-emerald-50 text-emerald-700 border border-emerald-200 px-3 py-2 rounded-lg group">
                                                                            <div className="flex flex-col min-w-0">
                                                                                <span className="font-semibold truncate text-sm">{existingMap.facultyName}</span>
                                                                                {existingMap.department && (
                                                                                    <span className="text-[10px] font-bold uppercase tracking-wider mt-0.5 opacity-80">
                                                                                        {existingMap.department} Faculty
                                                                                    </span>
                                                                                )}
                                                                            </div>
                                                                            <button onClick={() => handleRemoveMapping(existingMap.id)} className="p-1 hover:bg-emerald-100 rounded-md transition-colors opacity-0 group-hover:opacity-100" title="Remove mapping">
                                                                                <X className="w-4 h-4" />
                                                                            </button>
                                                                        </div>
                                                                    ) : (
                                                                        <FacultyCombobox sub={sub} />
                                                                    )}
                                                                </td>
                                                            </tr>
                                                        );
                                                    })}
                                                </tbody>
                                            </table>
                                        </div>
                                    </>
                                )}
                            </>;
                        })()}
                    </div>
                </div>
            </div>
        </div >
    );
}

