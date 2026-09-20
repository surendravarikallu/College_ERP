import React from "react";
import { useQuery } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";

export function BranchSelector({ value, onChange }: { value: string, onChange: (val: string) => void }) {
    const { data: branches, isLoading } = useQuery({
        queryKey: ['/api/v1/examcell/branches'],
        queryFn: async () => {
            const res = await fetch('/api/v1/examcell/branches', {
                headers: { 'Authorization': `Bearer ${(localStorage.getItem('ec_auth_token') || localStorage.getItem('erp_access_token'))}` }
            });
            if (!res.ok) throw new Error("Failed to fetch branches");
            return res.json() as Promise<string[]>;
        }
    });

    return (
        <div className="space-y-2 relative w-full">
            <label className="text-xs font-medium text-slate-500 uppercase tracking-wider">Branch</label>
            <select
                value={value}
                onChange={(e) => onChange(e.target.value)}
                disabled={isLoading}
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-primary/20 transition-all font-medium text-slate-700 disabled:opacity-50 appearance-none"
            >
                <option value="">All Branches</option>
                {branches?.map(b => <option key={b} value={b}>{b}</option>)}
            </select>
            {isLoading && <Loader2 className="w-4 h-4 animate-spin absolute right-3 top-9 text-slate-600 pointer-events-none" />}
        </div>
    );
}

export function ProgramSelector({ value, onChange }: { value: string, onChange: (val: string) => void }) {
    const { data: programs, isLoading } = useQuery({
        queryKey: ['/api/v1/examcell/programs'],
        queryFn: async () => {
            const res = await fetch('/api/v1/examcell/programs', {
                headers: { 'Authorization': `Bearer ${(localStorage.getItem('ec_auth_token') || localStorage.getItem('erp_access_token'))}` }
            });
            if (!res.ok) throw new Error("Failed to fetch programs");
            return res.json() as Promise<string[]>;
        }
    });

    return (
        <div className="space-y-2 relative w-full">
            <label className="text-xs font-medium text-slate-500 uppercase tracking-wider">Program</label>
            <select
                value={value}
                onChange={(e) => onChange(e.target.value)}
                disabled={isLoading}
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-primary/20 transition-all font-medium text-slate-700 appearance-none disabled:opacity-50"
            >
                <option value="">All Programs</option>
                {programs?.map(p => <option key={p} value={p}>{p}</option>)}
            </select>
            {isLoading && <Loader2 className="w-4 h-4 animate-spin absolute right-3 top-9 text-slate-600 pointer-events-none" />}
        </div>
    );
}

export function SectionSelector({
    value,
    onChange,
    className,
    hideLabel,
    batch,
    branch
}: {
    value: string,
    onChange: (val: string) => void,
    className?: string,
    hideLabel?: boolean,
    batch?: string,
    branch?: string
}) {
    const { data: sections, isLoading } = useQuery({
        queryKey: ['/api/v1/examcell/sections', batch, branch],
        queryFn: async () => {
            const params = new URLSearchParams();
            if (batch) params.append('batch', batch);
            if (branch) params.append('branch', branch);
            const res = await fetch(`/api/v1/examcell/sections?${params.toString()}`, {
                headers: { 'Authorization': `Bearer ${(localStorage.getItem('ec_auth_token') || localStorage.getItem('erp_access_token'))}` }
            });
            if (!res.ok) throw new Error("Failed to fetch sections");
            return res.json() as Promise<string[]>;
        }
    });

    return (
        <div className={hideLabel ? "relative w-full" : "space-y-2 relative w-full"}>
            {!hideLabel && <label className="text-xs font-medium text-slate-500 uppercase tracking-wider">Section</label>}
            <select
                value={value}
                onChange={(e) => onChange(e.target.value)}
                disabled={isLoading}
                className={className || "w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-primary/20 transition-all font-medium text-slate-700 disabled:opacity-50 appearance-none"}
            >
                <option value="">All Sections</option>
                {sections?.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
            {isLoading && <Loader2 className="w-4 h-4 animate-spin absolute right-3 top-9 text-slate-600 pointer-events-none" />}
        </div>
    );
}

export function BatchSelector({ value, onChange, hideLabel, className, program }: { value: string, onChange: (val: string) => void, hideLabel?: boolean, className?: string, program?: string }) {
    const { data: batches, isLoading } = useQuery({
        queryKey: ['/api/v1/examcell/batches', program],
        queryFn: async () => {
            const params = new URLSearchParams();
            if (program) params.append('program', program);
            const res = await fetch(`/api/v1/examcell/batches?${params.toString()}`, {
                headers: { 'Authorization': `Bearer ${(localStorage.getItem('ec_auth_token') || localStorage.getItem('erp_access_token'))}` }
            });
            if (!res.ok) throw new Error("Failed to fetch batches");
            return res.json() as Promise<string[]>;
        }
    });

    return (
        <div className={hideLabel ? "relative w-full" : "space-y-2 relative w-full"}>
            {!hideLabel && <label className="text-xs font-medium text-slate-500 uppercase tracking-wider">Batch</label>}
            <select
                value={value}
                onChange={(e) => onChange(e.target.value)}
                disabled={isLoading}
                className={className || "w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-primary/20 transition-all font-medium text-slate-700 disabled:opacity-50 appearance-none"}
            >
                <option value="">All Batches</option>
                {batches?.map((b) => (
                    <option key={b} value={b}>{b}</option>
                ))}
            </select>
            {isLoading && <Loader2 className="w-4 h-4 animate-spin absolute right-3 top-9 text-slate-600 pointer-events-none" />}
        </div>
    );
}

/**
 * Convert raw month-year strings (e.g. "November 2025") from the results table
 * into proper academic year ranges:
 *   June-December → "YYYY-(YYYY+1)" e.g. "November 2025" → "2025-2026"
 *   January-May   → "(YYYY-1)-YYYY" e.g. "January 2024"  → "2023-2024"
 */
function deriveAcademicYears(rawYears: string[]): string[] {
    const monthsSecondHalf = ['june', 'july', 'august', 'september', 'october', 'november', 'december'];
    const derived = new Set<string>();

    for (const raw of rawYears) {
        const parts = raw.trim().split(/\s+/);
        if (parts.length !== 2) {
            // Already in YYYY-YYYY format or unknown — keep as-is
            derived.add(raw);
            continue;
        }
        const month = parts[0].toLowerCase();
        const year = parseInt(parts[1], 10);
        if (isNaN(year)) {
            derived.add(raw);
            continue;
        }
        if (monthsSecondHalf.includes(month)) {
            derived.add(`${year}-${year + 1}`);
        } else {
            derived.add(`${year - 1}-${year}`);
        }
    }

    return Array.from(derived).sort((a, b) => b.localeCompare(a));
}

export function AcYearSelector({ value, onChange, hideLabel, className }: { value: string, onChange: (val: string) => void, hideLabel?: boolean, className?: string }) {
    const { data: years, isLoading } = useQuery({
        queryKey: ['/api/v1/examcell/academic-years'],
        queryFn: async () => {
            const res = await fetch('/api/v1/examcell/academic-years', {
                headers: { 'Authorization': `Bearer ${(localStorage.getItem('ec_auth_token') || localStorage.getItem('erp_access_token'))}` }
            });
            if (!res.ok) throw new Error("Failed to fetch academic years");
            return res.json() as Promise<string[]>;
        }
    });

    const academicYears = React.useMemo(() => {
        if (!years) return [];
        return deriveAcademicYears(years);
    }, [years]);

    return (
        <div className={hideLabel ? "relative w-full" : "space-y-2 relative w-full"}>
            {!hideLabel && <label className="text-xs font-medium text-slate-500 uppercase tracking-wider whitespace-nowrap">Ac. Year</label>}
            <select
                value={value}
                onChange={(e) => onChange(e.target.value)}
                disabled={isLoading}
                className={className || "w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-primary/20 transition-all font-medium text-slate-700 disabled:opacity-50 appearance-none"}
            >
                <option value="">All Academic Years</option>
                {academicYears.map(y => <option key={y} value={y}>{y}</option>)}
            </select>
            {isLoading && <Loader2 className="w-4 h-4 animate-spin absolute right-3 top-9 text-slate-600 pointer-events-none" />}
        </div>
    );
}

