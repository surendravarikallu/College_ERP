import { useQuery } from "@tanstack/react-query";
import { authFetch } from "./use-auth";

export function useStudentsSearch(
  query: string = "",
  page: number = 1,
  filters?: { branch?: string; program?: string; batch?: string; section?: string; fetchEnabled?: boolean }
) {
  return useQuery({
    queryKey: ["/api/v1/examcell/students", query, page, filters?.branch, filters?.program, filters?.batch, filters?.section],
    queryFn: () => {
      const q = new URLSearchParams({ page: page.toString() });
      if (query) q.append("query", query);
      if (filters?.branch) q.append("branch", filters.branch);
      if (filters?.program) q.append("program", filters.program);
      if (filters?.batch) q.append("batch", filters.batch);
      if (filters?.section) q.append("section", filters.section);
      return authFetch(`/api/v1/examcell/students?${q.toString()}`);
    },
    enabled: filters?.fetchEnabled !== false, // Default to true unless explicitly blocked
    staleTime: 1000 * 60, // 1 minute
  });
}

export function useStudentDetails(id: string | number) {
  return useQuery({
    queryKey: ["/api/v1/examcell/students", id],
    queryFn: () => authFetch(`/api/v1/examcell/students/${id}`),
    enabled: !!id,
  });
}

