import React, { useState, useMemo, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Loader2, ArrowRightCircle, ArrowLeftCircle, LogOut, MinusCircle, ArrowLeft } from "lucide-react";
import { useToast } from "../hooks/use-toast";
import { formatSemester } from "../lib/utils";
import { BatchSelector, SectionSelector } from "../components/academics/ReportFilters";

// Fetch eligible students
function useEligibleStudents(filters: any) {
    return useQuery({
        queryKey: ["eligible_students", filters.batch, filters.branch, filters.section],
        queryFn: async () => {
            if (!filters.batch || !filters.branch) return [];
            const res = await fetch("/api/v1/examcell/promotion/eligible", {
                method: "POST",
                headers: { 
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${(localStorage.getItem('ec_auth_token') || localStorage.getItem('erp_access_token'))}`
                },
                body: JSON.stringify({ batch: filters.batch, branch: filters.branch, section: filters.section }),
            });
            if (!res.ok) throw new Error("Failed to fetch students");
            const data = await res.json();
            return data.students;
        },
        enabled: !!filters.batch && !!filters.branch,
    });
}

function usePromotionAction(action: "promote" | "demote" | "detain" | "leave") {
    const { toast } = useToast();
    return useMutation({
        mutationFn: async (payload: any) => {
            const res = await fetch(`/api/promotion/${action}`, {
                method: "POST",
                headers: { 
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${(localStorage.getItem('ec_auth_token') || localStorage.getItem('erp_access_token'))}`
                },
                body: JSON.stringify(payload),
            });
            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.message || "Action failed");
            }
            return res.json();
        },
        onSuccess: (data) => {
            toast({ title: "Success", description: data.message });
        },
        onError: (error: any) => {
            toast({ title: "Error", description: error.message, variant: "destructive" });
        },
    });
}

export default function Promotions() {
    const [batch, setBatch] = useState("");
    const [branch, setBranch] = useState("");
    const [section, setSection] = useState("");

    // Left Panel (Promote From)
    const [sourceYear, setSourceYear] = useState("");
    const [sourceSem, setSourceSem] = useState("");
    const [sourceSelection, setSourceSelection] = useState<number[]>([]);

    // Right Panel (Promote To)
    const [targetYear, setTargetYear] = useState("");
    const [targetSem, setTargetSem] = useState("");
    const [targetSelection, setTargetSelection] = useState<number[]>([]);

    // Action strings
    const [disconReason, setDisconReason] = useState("");
    const [detainReason, setDetainReason] = useState("Shortage of Attendance");

    const [program, setProgram] = useState("");

    const availableSemesters = program === "MCA"
        ? ["I", "II", "III", "IV"]
        : ["I", "II", "III", "IV", "V", "VI", "VII", "VIII"];

    // Derive academic years from batch (e.g. "2023-2027" → ["2023-2024", "2024-2025", "2025-2026", "2026-2027"])
    const academicYears = useMemo(() => {
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

    // Reset academic years when batch changes
    useEffect(() => {
        setSourceYear("");
        setTargetYear("");
        setSourceSem("");
        setTargetSem("");
    }, [batch]);

    // Auto-link: source semester/year → target semester/year
    // Odd sems (I,III,V,VII) = 1st sem of year → target = next sem, same academic year
    // Even sems (II,IV,VI,VIII) = 2nd sem of year → target = next sem, academic year + 1
    useEffect(() => {
        if (!sourceSem) return;
        const semIndex = availableSemesters.indexOf(sourceSem);
        if (semIndex === -1 || semIndex >= availableSemesters.length - 1) return;

        // Set target semester to the next one
        setTargetSem(availableSemesters[semIndex + 1]);

        if (!sourceYear) return;
        const isEvenSem = (semIndex + 1) % 2 === 0; // I=idx0 (odd), II=idx1 (even), etc.

        if (isEvenSem) {
            // Even semester (II, IV, VI, VIII) → next academic year
            const parts = sourceYear.split('-');
            if (parts.length === 2) {
                const y1 = parseInt(parts[0]);
                const y2 = parseInt(parts[1]);
                if (!isNaN(y1) && !isNaN(y2)) {
                    const nextYear = `${y1 + 1}-${y2 + 1}`;
                    // Only set if it exists in the available academic years
                    if (academicYears.includes(nextYear)) {
                        setTargetYear(nextYear);
                    } else {
                        setTargetYear(sourceYear);
                    }
                }
            }
        } else {
            // Odd semester (I, III, V, VII) → same academic year
            setTargetYear(sourceYear);
        }
    }, [sourceSem, sourceYear, academicYears]);

    const { data: batches, isLoading: isLoadingBatches } = useQuery<string[]>({
        queryKey: ["batches"],
        queryFn: async () => {
            const res = await fetch('/api/v1/examcell/batches', { headers: { 'Authorization': `Bearer ${(localStorage.getItem('ec_auth_token') || localStorage.getItem('erp_access_token'))}` } });
            if (!res.ok) throw new Error("Failed to fetch batches");
            return res.json();
        }
    });

    const { data: students = [], isLoading, refetch } = useEligibleStudents({ batch, branch, section });

    const promoteMutation = usePromotionAction("promote");
    const demoteMutation = usePromotionAction("demote");
    const detainMutation = usePromotionAction("detain");
    const leaveMutation = usePromotionAction("leave");

    const isPending = promoteMutation.isPending || demoteMutation.isPending || detainMutation.isPending || leaveMutation.isPending;

    // Filter logic
    // We visually split the 'students' array based on their latest academic status destination
    const leftStudents = students.filter((s: any) => {
        // Exclude students who are exactly matching the Target panel's destination
        if (targetYear && targetSem && s.statusAcademicYear === targetYear && s.statusSemester === targetSem && (s.status === 'PROMOTED' || s.status === 'DETAINED')) {
            return false;
        }
        // Exclude students who have LEFT
        if (s.status === 'LEFT') return false;

        return true;
    });

    const rightStudents = students.filter((s: any) => {
        return targetYear && targetSem && s.statusAcademicYear === targetYear && s.statusSemester === targetSem && (s.status === 'PROMOTED' || s.status === 'DETAINED');
    });

    // Sub-select handlers
    const toggleSourceSelection = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.checked) setSourceSelection(leftStudents.map((s: any) => s.student.id));
        else setSourceSelection([]);
    };

    const toggleSourceOne = (id: number) => {
        setSourceSelection(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
    };

    const toggleTargetSelection = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.checked) setTargetSelection(rightStudents.map((s: any) => s.student.id));
        else setTargetSelection([]);
    };

    const toggleTargetOne = (id: number) => {
        setTargetSelection(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
    };

    // Actions
    const executeAction = async (action: "promote" | "demote" | "detain" | "leave") => {
        const isFromLeft = action === "promote" || action === "detain" || action === "leave";
        const selectedIds = isFromLeft ? sourceSelection : targetSelection;

        if (selectedIds.length === 0) return;

        let payload: any = { studentIds: selectedIds };

        if (action === "promote" || action === "detain") {
            if (!targetYear || !targetSem) {
                alert("Please select the Target Academic Year and Semester in the 'Promote To' panel.");
                return;
            }
            if (action === "promote") {
                // User explicitly requested to override automatic eligibility.
                // The institution decides manually who is promoted and detained.
                payload.reason = "";
            } else {
                payload.reason = detainReason;
            }
            payload.target = { academicYear: targetYear, semester: targetSem };
        } else if (action === "leave") {
            payload.reason = disconReason;
        }

        let mutation;
        switch (action) {
            case "promote": mutation = promoteMutation; break;
            case "demote": mutation = demoteMutation; break;
            case "detain": mutation = detainMutation; break;
            case "leave": mutation = leaveMutation; break;
        }

        await mutation.mutateAsync(payload);
        refetch();
        setSourceSelection([]);
        setTargetSelection([]);
    };



    return (
        <div className="max-w-7xl mx-auto space-y-8">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
                <div className="flex items-start gap-3">
                    <button onClick={() => window.history.back()} className="mt-1 p-2 bg-slate-50 hover:bg-slate-100 rounded-full transition-colors text-slate-500 hover:text-slate-900 border border-slate-200">
                        <ArrowLeft className="w-5 h-5" />
                    </button>
                    <div>
                        <h1 className="text-3xl font-display font-bold text-slate-900">Promotions</h1>
                        <p className="text-slate-500 mt-1">Manage academic promotions, detainments, and left statuses.</p>
                    </div>
                </div>
            </div>

            <div className="flex flex-col xl:flex-row gap-4 items-stretch xl:h-[800px] min-h-[800px]">
                {/* --- LEFT PANEL: SOURCE --- */}
                <div className="flex-1 flex flex-col bg-white border border-slate-100 rounded-3xl shadow-xl shadow-slate-200/40 relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-violet-500 to-fuchsia-500"></div>
                    <div className="px-6 py-4 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
                        <h2 className="text-lg font-bold font-display text-slate-800">Promote From</h2>
                    </div>

                    {/* Filters */}
                    <div className="p-3 bg-slate-50 border-b border-slate-200 grid grid-cols-2 md:grid-cols-6 gap-3 text-xs">
                        <div>
                            <label className="block text-slate-700 font-semibold mb-1">AcYear:*</label>
                            <select className="w-full border border-slate-300 rounded p-1" value={sourceYear} onChange={e => setSourceYear(e.target.value)}>
                                <option value="">-SELECT-</option>
                                {academicYears.map(y => <option key={y} value={y}>{y}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="block text-slate-700 font-semibold mb-1">Program:*</label>
                            <select className="w-full border border-slate-300 rounded p-1" value={program} onChange={e => {
                                setProgram(e.target.value);
                                setBatch(""); // Reset batch when program changes
                                setBranch(""); // Reset branch when program changes
                            }}>
                                <option value="">-SELECT-</option>
                                <option value="B.TECH">B.TECH</option>
                                <option value="MCA">MCA</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-slate-700 font-semibold mb-1">Batch:*</label>
                            <BatchSelector value={batch} onChange={setBatch} program={program} hideLabel className="w-full border border-slate-300 rounded p-1" />
                        </div>
                        <div>
                            <label className="block text-slate-700 font-semibold mb-1">Branch:*</label>
                            <select className="w-full border border-slate-300 rounded p-1" value={branch} onChange={e => setBranch(e.target.value)}>
                                <option value="">-SELECT-</option>
                                {program === "MCA" ? (
                                    <option value="MCA">MCA</option>
                                ) : (
                                    <>
                                        <option value="CSE">CSE</option>
                                        <option value="CSE (AI&ML)">CSE (AI&ML)</option>
                                        <option value="CSE (DS)">CSE (DS)</option>
                                        <option value="ECE">ECE</option>
                                        <option value="EEE">EEE</option>
                                        <option value="IT">IT</option>
                                        <option value="MECH">MECH</option>
                                        <option value="CIVIL">CIVIL</option>
                                    </>
                                )}
                            </select>
                        </div>
                        <div>
                            <label className="block text-slate-700 font-semibold mb-1">Sem:*</label>
                            <select className="w-full border border-slate-300 rounded p-1" value={sourceSem} onChange={e => setSourceSem(e.target.value)}>
                                <option value="">-SELECT-</option>
                                {availableSemesters.map(s => <option key={s} value={s}>{formatSemester(s, program)}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="block text-slate-700 font-semibold mb-1">Section:</label>
                            <SectionSelector value={section} onChange={setSection} hideLabel className="w-full border border-slate-300 rounded p-1" batch={batch} branch={branch} />
                        </div>
                    </div>

                    <div className="px-6 py-3 border-y border-slate-200 bg-slate-50 flex justify-between items-center mt-2">
                        <h2 className="text-xs font-semibold text-slate-800">Students in Branch & Sem</h2>
                    </div>
                    <div className="flex-1 overflow-auto bg-white border-t border-slate-200">
                        <table className="w-full text-xs text-left">
                            <thead className="bg-[#e9ecef] text-slate-800 sticky top-0 shadow-sm border-b-2 border-slate-300">
                                <tr>
                                    <th className="p-2 border border-slate-300 w-10 text-center">S.No</th>
                                    <th className="p-2 border border-slate-300 w-10 text-center">
                                        <input type="checkbox" checked={leftStudents.length > 0 && sourceSelection.length === leftStudents.length} onChange={toggleSourceSelection} />
                                    </th>
                                    <th className="p-2 border border-slate-300">Hall Ticket No</th>
                                    <th className="p-2 border border-slate-300">Student Name</th>
                                    <th className="p-2 border border-slate-300 text-center">Sec</th>
                                    <th className="p-2 border border-slate-300 text-center">Cr/Blg</th>
                                </tr>
                            </thead>
                            <tbody>
                                {isLoading ? (
                                    <tr><td colSpan={5} className="p-4 text-center"><Loader2 className="w-5 h-5 animate-spin mx-auto text-primary" /></td></tr>
                                ) : leftStudents.length === 0 ? (
                                    <tr><td colSpan={5} className="p-4 text-center text-slate-500">No students found. Select Batch & Branch.</td></tr>
                                ) : leftStudents.map((data: any, idx: number) => {
                                    const { student, backlogCount, totalCredits, status } = data;
                                    const isSelected = sourceSelection.includes(student.id);
                                    return (
                                        <tr key={student.id} className={`hover:bg-slate-50 cursor-pointer ${isSelected ? 'bg-primary/10' : ''}`} onClick={() => toggleSourceOne(student.id)}>
                                            <td className="p-2 border border-slate-300 text-center">{idx + 1}</td>
                                            <td className="p-2 border border-slate-300 text-center" onClick={e => e.stopPropagation()}>
                                                <input type="checkbox" checked={isSelected} onChange={() => toggleSourceOne(student.id)} />
                                            </td>
                                            <td className="p-2 border border-slate-300 font-semibold">{student.rollNumber}</td>
                                            <td className="p-2 border border-slate-300">
                                                {student.name}
                                                {status === 'DETAINED' && <span className="ml-2 text-red-600 font-bold">(Detained)</span>}
                                            </td>
                                            <td className="p-2 border border-slate-300 text-center font-semibold text-slate-600 font-mono">
                                                {student.section || '-'}
                                            </td>
                                            <td className="p-2 border border-slate-300 text-center text-[10px] font-mono whitespace-nowrap">
                                                <span className="text-blue-700">{totalCredits}</span> / <span className={backlogCount > 0 ? 'text-red-600' : 'text-green-600'}>{backlogCount}</span>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* --- MIDDLE PANEL: ACTIONS --- */}
                <div className="w-full xl:w-48 flex flex-col justify-center gap-4 px-2 py-4 shrink-0">
                    <div className="border border-slate-100 p-4 rounded-3xl bg-white shadow-lg shadow-slate-200/50 flex flex-col gap-3 relative overflow-hidden">
                        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-slate-400 to-slate-500"></div>
                        <label className="text-xs font-semibold text-slate-700 uppercase tracking-wider mt-1">DisCon Reason</label>
                        <textarea
                            className="w-full text-xs p-2.5 border border-slate-200 bg-slate-50 rounded-xl resize-none h-20 outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all font-medium text-slate-700"
                            onChange={e => setDisconReason(e.target.value)}
                            value={disconReason}
                            placeholder="Enter reason..."
                        />
                        <button
                            disabled={isPending || sourceSelection.length === 0}
                            onClick={() => executeAction("leave")}
                            className="w-full px-4 py-2.5 rounded-xl font-medium bg-gradient-to-br from-slate-700 to-slate-900 text-white shadow-md shadow-slate-500/30 hover:-translate-y-0.5 transition-all flex items-center justify-center gap-2 disabled:opacity-50 text-sm whitespace-nowrap mt-1"
                        >
                            <LogOut className="w-4 h-4" /> Apply Left
                        </button>
                    </div>

                    <div className="flex flex-col gap-3 my-2">
                        <button
                            disabled={isPending || sourceSelection.length === 0}
                            onClick={() => executeAction("promote")}
                            className="w-full px-4 py-3.5 rounded-2xl font-bold bg-gradient-to-br from-indigo-500 to-purple-600 text-white shadow-lg shadow-indigo-500/30 hover:-translate-y-0.5 transition-all flex items-center justify-center gap-2 disabled:opacity-50 text-sm whitespace-nowrap"
                        >
                            Promote <ArrowRightCircle className="w-5 h-5" />
                        </button>

                        <button
                            disabled={isPending || targetSelection.length === 0}
                            onClick={() => executeAction("demote")}
                            className="w-full px-4 py-3.5 rounded-2xl font-bold bg-gradient-to-br from-amber-400 to-orange-500 text-white shadow-lg shadow-orange-500/30 hover:-translate-y-0.5 transition-all flex items-center justify-center gap-2 disabled:opacity-50 text-sm whitespace-nowrap"
                        >
                            <ArrowLeftCircle className="w-5 h-5" /> DePromote
                        </button>
                    </div>

                    <div className="border border-slate-100 p-4 rounded-3xl bg-white shadow-lg shadow-slate-200/50 flex flex-col gap-3 relative overflow-hidden">
                        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-red-500 to-rose-600"></div>
                        <label className="text-xs font-semibold text-slate-700 uppercase tracking-wider mt-1">Detain Reason</label>
                        <select
                            className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:ring-2 focus:ring-red-500/20 transition-all font-medium text-slate-700"
                            value={detainReason}
                            onChange={e => setDetainReason(e.target.value)}
                        >
                            <option value="Shortage of Attendance">Attendance</option>
                            <option value="Shortage of Credits">Credits</option>
                            <option value="Disciplinary Action">Discipline</option>
                            <option value="Fee Due">Fee Due</option>
                        </select>
                        <button
                            disabled={isPending || sourceSelection.length === 0}
                            onClick={() => executeAction("detain")}
                            className="w-full px-4 py-2.5 rounded-xl font-medium bg-gradient-to-br from-red-500 to-rose-600 text-white shadow-md shadow-red-500/30 hover:-translate-y-0.5 transition-all flex items-center justify-center gap-2 disabled:opacity-50 text-sm whitespace-nowrap mt-1"
                        >
                            Detain <MinusCircle className="w-4 h-4" />
                        </button>
                    </div>
                </div>

                {/* --- RIGHT PANEL: TARGET --- */}
                <div className="flex-1 flex flex-col bg-white border border-slate-100 rounded-3xl shadow-xl shadow-slate-200/40 relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-sky-400 to-blue-500"></div>
                    <div className="px-6 py-4 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
                        <h2 className="text-lg font-bold font-display text-slate-800">Promote To</h2>
                    </div>

                    {/* Filters */}
                    <div className="p-3 bg-slate-50 border-b border-slate-200 grid grid-cols-2 md:grid-cols-6 gap-3 text-xs">
                        <div>
                            <label className="block text-slate-700 font-semibold mb-1">AcYear:*</label>
                            <select className="w-full border border-slate-300 rounded p-1" value={targetYear} onChange={e => setTargetYear(e.target.value)}>
                                <option value="">-SELECT-</option>
                                {academicYears.map(y => <option key={y} value={y}>{y}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="block text-slate-700 font-semibold mb-1">Program:*</label>
                            <select className="w-full border border-slate-300 rounded p-1 bg-slate-100" value={program} disabled>
                                <option value="">{program || "-SELECT-"}</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-slate-700 font-semibold mb-1">Batch:*</label>
                            <select className="w-full border border-slate-300 rounded p-1 bg-slate-100" value={batch} disabled>
                                <option value="">{batch || "-SELECT-"}</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-slate-700 font-semibold mb-1">Branch:*</label>
                            {/* Disabled: Usually target branch is same as source branch */}
                            <select className="w-full border border-slate-300 rounded p-1 bg-slate-100" value={branch} disabled>
                                <option value="">{branch || "-SELECT-"}</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-slate-700 font-semibold mb-1">Sem:*</label>
                            <select className="w-full border border-slate-300 rounded p-1" value={targetSem} onChange={e => setTargetSem(e.target.value)}>
                                <option value="">-SELECT-</option>
                                {availableSemesters.map(s => <option key={s} value={s}>{formatSemester(s, program)}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="block text-slate-700 font-semibold mb-1">Section:</label>
                            <select className="w-full border border-slate-300 rounded p-1 bg-slate-100" value={section} disabled>
                                <option value="">{section || "All"}</option>
                            </select>
                        </div>
                    </div>

                    <div className="px-6 py-3 border-y border-slate-200 bg-slate-50 flex justify-between items-center mt-2">
                        <h2 className="text-xs font-semibold text-slate-800">Students Recently Promoted / Detained Here</h2>
                    </div>
                    <div className="flex-1 overflow-auto bg-white border-t border-slate-200">
                        <table className="w-full text-xs text-left">
                            <thead className="bg-[#e9ecef] text-slate-800 sticky top-0 shadow-sm border-b-2 border-slate-300">
                                <tr>
                                    <th className="p-2 border border-slate-300 w-10 text-center">S.No</th>
                                    <th className="p-2 border border-slate-300 w-10 text-center">
                                        <input type="checkbox" checked={rightStudents.length > 0 && targetSelection.length === rightStudents.length} onChange={toggleTargetSelection} />
                                    </th>
                                    <th className="p-2 border border-slate-300">Hall Ticket No</th>
                                    <th className="p-2 border border-slate-300">Student Name</th>
                                    <th className="p-2 border border-slate-300 text-center">Sec</th>
                                    <th className="p-2 border border-slate-300 text-center">Status</th>
                                </tr>
                            </thead>
                            <tbody>
                                {isLoading ? (
                                    <tr><td colSpan={5} className="p-4 text-center"><Loader2 className="w-5 h-5 animate-spin mx-auto text-primary" /></td></tr>
                                ) : !targetYear || !targetSem ? (
                                    <tr><td colSpan={5} className="p-4 text-center text-slate-500">Select Target AcYear and Sem below to view.</td></tr>
                                ) : rightStudents.length === 0 ? (
                                    <tr><td colSpan={5} className="p-4 text-center text-slate-500">No students found promoted/detained here.</td></tr>
                                ) : rightStudents.map((data: any, idx: number) => {
                                    const { student, status } = data;
                                    const isSelected = targetSelection.includes(student.id);
                                    return (
                                        <tr key={student.id} className={`hover:bg-slate-50 cursor-pointer ${isSelected ? 'bg-primary/10' : ''}`} onClick={() => toggleTargetOne(student.id)}>
                                            <td className="p-2 border border-slate-300 text-center">{idx + 1}</td>
                                            <td className="p-2 border border-slate-300 text-center" onClick={e => e.stopPropagation()}>
                                                <input type="checkbox" checked={isSelected} onChange={() => toggleTargetOne(student.id)} />
                                            </td>
                                            <td className="p-2 border border-slate-300 font-semibold">{student.rollNumber}</td>
                                            <td className="p-2 border border-slate-300">{student.name}</td>
                                            <td className="p-2 border border-slate-300 text-center font-semibold text-slate-600 font-mono">{student.section || '-'}</td>
                                            <td className="p-2 border border-slate-300 text-center font-bold">
                                                {status === 'DETAINED' ? <span className="text-red-600">DETAINED</span> : <span className="text-green-600">PROMOTED</span>}
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    );
}

