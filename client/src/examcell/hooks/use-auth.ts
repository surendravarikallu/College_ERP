import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";

const EC_API_PREFIX = "/api/v1/examcell";

// Utility for authenticated fetch
export async function authFetch(url: string, options: RequestInit = {}) {
  let token = localStorage.getItem("ec_auth_token") || localStorage.getItem("erp_access_token");
  
  // Guard against stringified "null" or "undefined" from localStorage
  if (token === "null" || token === "undefined") token = null;

  const headers = new Headers(options.headers);

  if (token && token.trim() !== "") {
    headers.set("Authorization", `Bearer ${token}`);
  }

  if (!options.body || typeof options.body === 'string') {
    if (!headers.has("Content-Type")) {
      headers.set("Content-Type", "application/json");
    }
  }

  const res = await fetch(url, { ...options, headers });

  if (!res.ok) {
    if (res.status === 401) {
      localStorage.removeItem("ec_auth_token");
      if (!window.location.pathname.includes("/admin/examcell")) {
        // Already outside EC — don't redirect
      }
    }
    const errorData = await res.json().catch(() => ({ message: res.statusText }));
    throw new Error(errorData.message || "An error occurred");
  }

  return res.json();
}

export function useAuth() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: user, isLoading, error } = useQuery({
    queryKey: [`${EC_API_PREFIX}/auth/me`],
    queryFn: () => authFetch(`${EC_API_PREFIX}/auth/me`).then(res => res.user),
    retry: false,
    staleTime: Infinity,
  });

  const loginMutation = useMutation({
    mutationFn: async (credentials: { username: string; password: string }) => {
      const res = await fetch(`${EC_API_PREFIX}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(credentials),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({ message: "Login failed" }));
        throw new Error(errorData.message || "Invalid credentials");
      }

      return res.json();
    },
    onSuccess: (data) => {
      localStorage.setItem("ec_auth_token", data.token);
      queryClient.setQueryData([`${EC_API_PREFIX}/auth/me`], data.user);
      navigate("/admin/examcell");
    },
  });

  const logoutMutation = useMutation({
    mutationFn: async () => {
      await authFetch(`${EC_API_PREFIX}/auth/logout`, { method: "POST" }).catch(() => { });
    },
    onSettled: () => {
      localStorage.removeItem("ec_auth_token");
      queryClient.clear();
      navigate("/admin/examcell/login");
    },
  });

  return {
    user,
    isLoading,
    error,
    login: loginMutation.mutateAsync,
    logout: logoutMutation.mutate,
    isLoggingIn: loginMutation.isPending,
  };
}
