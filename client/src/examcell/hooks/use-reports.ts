import { useQuery } from "@tanstack/react-query";
import { authFetch } from "./use-auth";

export function useAnalytics() {
  return useQuery({
    queryKey: ["/api/v1/examcell/reports/analytics"],
    queryFn: () => authFetch("/api/v1/examcell/reports/analytics"),
  });
}

export function useBacklogReports(filters: { branch?: string; semester?: string; batch?: string; program?: string; section?: string } = {}) {
  return useQuery({
    queryKey: ["/api/v1/examcell/reports/backlogs", filters],
    queryFn: () => {
      const params = new URLSearchParams();
      if (filters.branch) params.append("branch", filters.branch);
      if (filters.semester) params.append("semester", filters.semester);
      if (filters.batch) params.append("batch", filters.batch);
      if (filters.program) params.append("program", filters.program);
      if (filters.section) params.append("section", filters.section);

      const queryString = params.toString();
      return authFetch(`/api/v1/examcell/reports/backlogs${queryString ? `?${queryString}` : ''}`);
    },
  });
}

export function useCumulativeResultsReport(filters: { branch?: string; batch?: string; year?: string; program?: string; section?: string } = {}) {
  return useQuery({
    queryKey: ["/api/v1/examcell/reports/cumulative-results", filters],
    queryFn: () => {
      const params = new URLSearchParams();
      if (filters.branch) params.append("branch", filters.branch);
      if (filters.batch) params.append("batch", filters.batch);
      if (filters.year) params.append("year", filters.year);
      if (filters.program) params.append("program", filters.program);
      if (filters.section) params.append("section", filters.section);

      const queryString = params.toString();
      return authFetch(`/api/v1/examcell/reports/cumulative-results${queryString ? `?${queryString}` : ''}`);
    },
  });
}

export function useToppersReport(filters: { branch?: string; batch?: string; type: string; semester?: string; year?: string; topN?: number; program?: string; section?: string }) {
  return useQuery({
    queryKey: ["/api/v1/examcell/reports/toppers", filters],
    queryFn: () => {
      const params = new URLSearchParams();
      if (filters.branch) params.append("branch", filters.branch);
      if (filters.batch) params.append("batch", filters.batch);
      params.append("type", filters.type);
      if (filters.semester) params.append("semester", filters.semester);
      if (filters.year) params.append("year", filters.year);
      if (filters.topN) params.append("topN", filters.topN.toString());
      if (filters.program) params.append("program", filters.program);
      if (filters.section) params.append("section", filters.section);

      const queryString = params.toString();
      return authFetch(`/api/v1/examcell/reports/toppers${queryString ? `?${queryString}` : ''}`);
    },
  });
}

export function useConsolidatedReport(filters: {
  branch?: string; semester?: string; academicYear?: string;
  regulation?: string; batch?: string; program?: string; section?: string;
} = {}) {
  return useQuery({
    queryKey: ["/api/v1/examcell/reports/consolidated", filters],
    queryFn: () => {
      const params = new URLSearchParams();
      if (filters.branch) params.append("branch", filters.branch);
      if (filters.semester) params.append("semester", filters.semester);
      if (filters.academicYear) params.append("academicYear", filters.academicYear);
      if (filters.regulation) params.append("regulation", filters.regulation);
      if (filters.batch) params.append("batch", filters.batch);
      if (filters.program) params.append("program", filters.program);
      if (filters.section) params.append("section", filters.section);

      const queryString = params.toString();
      return authFetch(`/api/v1/examcell/reports/consolidated${queryString ? `?${queryString}` : ''}`);
    },
    enabled: !!(filters.branch && filters.semester),
  });
}

export function useInternalMarksReport(filters: { branch?: string; semester?: string; subjectCode?: string; batch?: string; section?: string } = {}) {
  return useQuery({
    queryKey: ['/api/v1/examcell/internal-marks/report', filters],
    queryFn: () => {
      const params = new URLSearchParams();
      if (filters.branch) params.append("branch", filters.branch);
      if (filters.semester) params.append("semester", filters.semester);
      if (filters.subjectCode) params.append("subjectCode", filters.subjectCode);
      if (filters.batch) params.append("batch", filters.batch);
      if (filters.section) params.append("section", filters.section);

      const queryString = params.toString();
      return authFetch(`/api/v1/examcell/internal-marks/report${queryString ? `?${queryString}` : ''}`);
    },
    enabled: !!(filters.branch && filters.semester && filters.subjectCode && filters.batch),
  });
}

