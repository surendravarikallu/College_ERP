import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { authFetch } from "./use-auth";

export function useFaculty() {
    return useQuery({
        queryKey: ["/api/v1/examcell/faculty"],
        queryFn: () => authFetch("/api/v1/examcell/faculty"),
    });
}

export function useCreateFaculty() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (data: { facultyName: string; department?: string; designation?: string }) =>
            authFetch("/api/v1/examcell/faculty", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) }),
        onSuccess: () => qc.invalidateQueries({ queryKey: ["/api/v1/examcell/faculty"] }),
    });
}

export function useUpdateFaculty() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: ({ id, ...data }: { id: number; facultyName?: string; department?: string; designation?: string }) =>
            authFetch(`/api/v1/examcell/faculty/${id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) }),
        onSuccess: () => qc.invalidateQueries({ queryKey: ["/api/v1/examcell/faculty"] }),
    });
}

export function useDeleteFaculty() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (id: number) =>
            authFetch(`/api/v1/examcell/faculty/${id}`, { method: "DELETE" }),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ["/api/v1/examcell/faculty"] });
            qc.invalidateQueries({ queryKey: ["/api/v1/examcell/faculty-mapping"] });
        },
    });
}

export function useFacultyMappings() {
    return useQuery({
        queryKey: ["/api/v1/examcell/faculty-mapping"],
        queryFn: () => authFetch("/api/v1/examcell/faculty-mapping"),
    });
}

export function useCreateFacultyMapping() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (data: { facultyId: number; subjectCode: string; semester: string; branch: string; academicYear: string; batch?: string; section?: string }) =>
            authFetch("/api/v1/examcell/faculty-mapping", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) }),
        onSuccess: () => qc.invalidateQueries({ queryKey: ["/api/v1/examcell/faculty-mapping"] }),
    });
}

export function useDeleteFacultyMapping() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (id: number) =>
            authFetch(`/api/v1/examcell/faculty-mapping/${id}`, { method: "DELETE" }),
        onSuccess: () => qc.invalidateQueries({ queryKey: ["/api/v1/examcell/faculty-mapping"] }),
    });
}

