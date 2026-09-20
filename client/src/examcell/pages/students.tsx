import React, { useState } from "react";
import { useStudentsSearch } from "../hooks/use-students";
import { Search, Loader2, User, ChevronRight, ArrowLeft, Filter } from "lucide-react";
import { Link } from "react-router-dom";
import { BatchSelector, BranchSelector, ProgramSelector, SectionSelector } from "../components/academics/ReportFilters";

function useLocalDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = React.useState<T>(value);
  React.useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);
    return () => clearTimeout(handler);
  }, [value, delay]);
  return debouncedValue;
}

export default function Students() {
  const [searchInput, setSearchInput] = useState("");
  const debouncedSearch = useLocalDebounce(searchInput, 500);
  const [page, setPage] = useState(1);
  const [program, setProgram] = useState("");
  const [branch, setBranch] = useState("");
  const [batch, setBatch] = useState("");
  const [section, setSection] = useState("");

  const hasFilterParams = Boolean(program || batch || branch || debouncedSearch.trim() !== "");

  React.useEffect(() => {
    setPage(1);
  }, [debouncedSearch, program, branch, batch, section]);

  const { data: studentsResponse, isLoading } = useStudentsSearch(debouncedSearch, page, {
    branch,
    batch,
    program,
    section,
    fetchEnabled: hasFilterParams
  });
  const students = studentsResponse?.data || [];
  const totalPages = studentsResponse?.totalPages || 1;

  return (
    <div className="bg-white min-h-screen text-slate-800 p-2 space-y-4">
      {/* 1. Module Header */}
      <div className="border border-slate-300 rounded shadow-sm overflow-hidden">
        <div className="erp-header-blue px-3 py-1.5 text-[14px] flex justify-between items-center">
          <div className="flex items-center gap-2">
            <User className="w-4 h-4" />
            <span className="font-bold uppercase tracking-tight">Institutional Student Directory Audit</span>
          </div>
          <button onClick={() => window.history.back()} className="erp-btn-rect bg-white/20 hover:bg-white/30 !text-white flex items-center gap-1 py-0.5 px-2 font-bold">
            <ArrowLeft className="w-3 h-3" /> Back
          </button>
        </div>
        <div className="erp-strip-green px-3 py-1.5 text-[11px] font-bold text-emerald-800 flex justify-between">
          <span>Official student records, academic registration status, and profile lookup.</span>
          <span>Access Level: Examination Cell Admin</span>
        </div>
      </div>

      {/* 2. Search & Filter Matrix */}
      <div className="border border-slate-300 rounded shadow-sm overflow-hidden bg-slate-50">
        <div className="erp-header-blue bg-slate-700/10 !text-slate-700 px-3 py-1 text-[11px] font-bold border-b border-slate-200 flex items-center gap-2">
          <Filter className="w-3 h-3" /> Search Filters
        </div>
        <div className="p-3 grid grid-cols-1 md:grid-cols-5 gap-3 items-end">
          <div className="space-y-1 md:col-span-2">
            <label className="erp-label">Search Identity (Roll No / Name)</label>
            <div className="relative">
              <Search className="absolute left-2 top-2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                className="erp-input w-full pl-8 font-bold text-blue-900"
                placeholder="Ex: 23JK1A05I7..."
              />
            </div>
          </div>
          <div className="space-y-1">
             <ProgramSelector value={program} onChange={setProgram} />
          </div>
          <div className="space-y-1">
             <BatchSelector value={batch} onChange={setBatch} program={program} />
          </div>
          <div className="space-y-1">
             <BranchSelector value={branch} onChange={setBranch} />
          </div>
        </div>
      </div>

      {/* 3. Data Registry */}
      <div className="border border-slate-300 rounded shadow-sm overflow-hidden">
        <div className="erp-header-blue px-3 py-1 text-[11px] font-bold border-b border-white/20 flex justify-between">
           <span>Student Record List</span>
           <span>Total Records: {studentsResponse?.total || 0}</span>
        </div>
        <div className="overflow-x-auto min-h-[400px]">
          {isLoading ? (
            <div className="p-12 flex flex-col items-center justify-center text-slate-400">
              <Loader2 className="w-8 h-8 animate-spin text-[#004b93] mb-4" />
              <p className="font-bold text-xs uppercase tracking-widest">Querying Student Database...</p>
            </div>
          ) : students.length === 0 ? (
            <div className="p-16 text-center">
              <User className="w-12 h-12 text-slate-200 mx-auto mb-4" />
              <p className="text-slate-400 font-bold uppercase tracking-widest text-xs">No matching records found in directory.</p>
            </div>
          ) : (
            <table className="w-full erp-table-dense border-collapse">
              <thead className="bg-slate-100 text-slate-600">
                <tr>
                   <th className="text-center w-12">SN</th>
                   <th className="text-left w-32">Roll Number</th>
                   <th className="text-left">Full Name</th>
                   <th className="text-center">Branch</th>
                   <th className="text-center">Batch</th>
                   <th className="text-center">Reg.</th>
                   <th className="text-center">Status</th>
                   <th className="text-right w-24">Actions</th>
                </tr>
              </thead>
              <tbody>
                {students.map((student: any, i: number) => (
                  <tr key={student.id} className="hover:bg-blue-50/50 transition-colors">
                    <td className="text-center font-mono text-slate-400">{(page - 1) * 20 + i + 1}</td>
                    <td className="font-bold text-[#004b93] font-mono">{student.rollNumber}</td>
                    <td className="font-semibold text-slate-700 capitalize">{student.name.toLowerCase()}</td>
                    <td className="text-center">
                      <span className="px-2 py-0.5 bg-blue-100 text-blue-700 font-bold text-[10px] border border-blue-200 rounded">{student.branch}</span>
                    </td>
                    <td className="text-center font-mono text-xs">{student.batch}</td>
                    <td className="text-center font-mono text-xs text-slate-500">{student.regulation}</td>
                    <td className="text-center uppercase whitespace-nowrap">
                       <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${student.status === "DETAINED" ? "bg-rose-100 text-rose-700 border-rose-200" : "bg-emerald-100 text-emerald-700 border-emerald-200"}`}>
                        {student.status || "ACTIVE"}
                      </span>
                    </td>
                    <td className="text-right">
                       <Link to={`/admin/examcell/students/${student.id}`} className="erp-btn-rect py-1">View Profile</Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Global Pagination */}
        {!isLoading && students.length > 0 && totalPages > 1 && (
          <div className="bg-slate-50 p-2 border-t border-slate-300 flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500">Page <b>{page}</b> of <b>{totalPages}</b></span>
            <div className="flex gap-1">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="p-1 border border-slate-300 rounded bg-white hover:bg-slate-100 disabled:opacity-30"
              >
                Prev
              </button>
              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="p-1 border border-slate-300 rounded bg-white hover:bg-slate-100 disabled:opacity-30"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
