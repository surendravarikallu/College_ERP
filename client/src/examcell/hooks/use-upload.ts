import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "../hooks/use-toast";

export function useUploadResults() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (formData: FormData) => {
      const token = localStorage.getItem("auth_token");
      const res = await fetch("/api/v1/examcell/upload/results", {
        method: "POST",
        headers: token ? { "Authorization": `Bearer ${token}` } : {},
        // DO NOT set Content-Type, browser sets it with boundary for FormData
        body: formData,
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({ message: "Upload failed" }));
        throw new Error(errorData.message || "Failed to upload results");
      }

      return res.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Upload Successful",
        description: `Successfully processed ${data.processed} records.`,
        variant: "default",
      });
      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: ["/api/v1/examcell/reports/analytics"] });
      queryClient.invalidateQueries({ queryKey: ["/api/v1/examcell/reports/backlogs"] });
      queryClient.invalidateQueries({ queryKey: ["/api/v1/examcell/students"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Upload Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });
}

export function useUploadPreview() {
  const { toast } = useToast();
  // We can just utilize a standard mutation for the preview API
  return useMutation({
    mutationFn: async (formData: FormData) => {
      const token = localStorage.getItem("auth_token");
      const res = await fetch("/api/v1/examcell/upload/preview", {
        method: "POST",
        headers: token ? { "Authorization": `Bearer ${token}` } : {},
        body: formData,
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({ message: "Preview failed" }));
        throw new Error(errorData.message || "Failed to generate preview");
      }

      return res.json();
    }
  });
}

export function useUploadStudents() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (formData: FormData) => {
      const token = localStorage.getItem("auth_token");
      const res = await fetch("/api/v1/examcell/upload/students", {
        method: "POST",
        headers: token ? { "Authorization": `Bearer ${token}` } : {},
        body: formData,
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({ message: "Upload failed" }));
        throw new Error(errorData.message || "Failed to upload students");
      }

      return res.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Students Master Data Synced",
        description: `Successfully processed ${data.processed} students.`,
        variant: "default",
      });
      // Invalidate relevant queries since student info changed
      queryClient.invalidateQueries({ queryKey: ["/api/v1/examcell/students"] });
      queryClient.invalidateQueries({ queryKey: ["/api/v1/examcell/reports/backlogs"] });
      queryClient.invalidateQueries({ queryKey: ["/api/v1/examcell/reports/cumulative-backlogs"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Student Sync Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });
}

