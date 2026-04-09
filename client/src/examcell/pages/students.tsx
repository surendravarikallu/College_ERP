import React, { useState } from "react";
import { useStudentsSearch } from "../hooks/use-students";
import { Search, Loader2, User, ChevronRight, ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { useDebounce } from "../hooks/use-debounce";

import { BatchSelector, BranchSelector, ProgramSelector, SectionSelector } from "../components/academics/ReportFilters";

// Simple debounce hook for local use
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

  // Require at least a batch or program, or a manual text search, to fetch.
  const hasFilterParams = Boolean(program || batch || branch || debouncedSearch.trim() !== "");

  // Reset page when searching or filtering
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
    <div className="space-y-8 max-w-7xl mx-auto">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="flex items-start gap-3">
          <button onClick={() => window.history.back()} className="mt-1 p-2 bg-slate-50 hover:bg-slate-100 rounded-full transition-colors text-slate-500 hover:text-slate-900 border border-slate-200">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-3xl font-display font-bold text-slate-900">Student Directory</h1>
            <p className="text-slate-500 mt-1">Search and view detailed student academic profiles.</p>
          </div>
        </div>

        <div className="relative w-full md:w-96">
          <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
            <Search className="h-5 w-5 text-muted-foreground" />
          </div>
          <input
            type="text"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            className="w-full pl-11 pr-4 py-3 bg-white border border-slate-200 rounded-xl text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all shadow-sm"
            placeholder="Search by Roll No or Name..."
          />
        </div>
      </div>

      <div className="bg-white border border-slate-100 p-6 rounded-3xl shadow-xl shadow-slate-200/40 relative overflow-visible grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 items-end z-10">
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-sky-400 to-indigo-500"></div>
        <div className="w-full">
          <ProgramSelector value={program} onChange={setProgram} />
        </div>
        <div className="w-full">
          <BatchSelector value={batch} onChange={setBatch} program={program} />
        </div>
        <div className="w-full">
          <BranchSelector value={branch} onChange={setBranch} />
        </div>
        <div className="w-full">
          <SectionSelector value={section} onChange={setSection} batch={batch} branch={branch} />
        </div>
      </div>

      <div className="glass-panel rounded-2xl overflow-hidden relative z-0">
        {isLoading ? (
          <div className="p-12 flex flex-col items-center justify-center text-muted-foreground">
            <Loader2 className="w-10 h-10 animate-spin text-primary mb-4" />
            <p>Searching students...</p>
          </div>
        ) : !students || students.length === 0 ? (
          <div className="p-16 flex flex-col items-center justify-center text-center">
            <div className="w-20 h-20 rounded-full bg-slate-100 flex items-center justify-center mb-6">
              <User className="w-10 h-10 text-slate-400" />
            </div>
            <h3 className="text-xl font-display font-semibold text-slate-900 mb-2">No students found</h3>
            <p className="text-slate-500">Try adjusting your search criteria.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead className="sticky top-0 bg-slate-50 z-10 shadow-sm">
                <tr className="border-b border-slate-200 text-sm font-medium text-slate-500">
                  <th className="p-4 pl-6">Roll Number</th>
                  <th className="p-4">Name</th>
                  <th className="p-4">Branch & Batch</th>
                  <th className="p-4">Regulation</th>
                  <th className="p-4">Status</th>
                  <th className="p-4 text-right pr-6">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {students.map((student: any, i: number) => (
                  <motion.tr
                    key={student.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.05 }}
                    className="hover:bg-slate-50 transition-colors group"
                  >
                    <td className="p-4 pl-6 font-medium text-slate-900">{student.rollNumber}</td>
                    <td className="p-4">
                      <Link to={`/admin/examcell/students/${student.id}`} className="flex items-center gap-3 group/name">
                        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-xs group-hover/name:bg-primary/20 transition-colors">
                          {student.name.charAt(0)}
                        </div>
                        <span className="text-slate-900 font-medium group-hover/name:text-primary transition-colors">{student.name}</span>
                      </Link>
                    </td>
                    <td className="p-4">
                      <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium bg-blue-500/10 text-blue-400 border border-blue-500/20 mr-2">
                        {student.branch}
                      </span>
                      <span className="text-sm text-slate-500">{student.batch}</span>
                    </td>
                    <td className="p-4 text-slate-500 text-sm">{student.regulation}</td>
                    <td className="p-4">
                      <span className={`px-2 py-1 text-xs font-semibold rounded-full uppercase ${student.status === "DETAINED" ? "bg-red-100 text-red-700" : "bg-emerald-100 text-emerald-700"}`}>
                        {student.status || "ACTIVE"}
                      </span>
                    </td>
                    <td className="p-4 pr-6 text-right">
                      <Link to={`/admin/examcell/students/${student.id}`}
                        className="inline-flex items-center justify-center p-2 rounded-lg text-primary hover:bg-primary/10 transition-colors"
                      >
                        <ChevronRight className="w-5 h-5" />
                      </Link>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Controls */}
        {!isLoading && students.length > 0 && totalPages > 1 && (
          <div className="flex items-center justify-between px-6 py-4 bg-white border-t border-slate-200">
            <span className="text-sm text-slate-500">
              Showing page {page} of {totalPages}
            </span>
            <div className="flex gap-2">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-4 py-2 border border-slate-200 rounded-lg text-sm font-medium hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Previous
              </button>
              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="px-4 py-2 border border-slate-200 rounded-lg text-sm font-medium hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
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


