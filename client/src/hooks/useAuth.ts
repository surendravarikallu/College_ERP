import { useMemo } from 'react';

export interface AuthUser {
  id: string;
  institutionId: string;
  role: string;
  profileId?: string;
}

export function useAuth(): { user: AuthUser | null; isAuthenticated: boolean } {
  return useMemo(() => {
    const token = localStorage.getItem('erp_access_token');
    if (!token) return { user: null, isAuthenticated: false };

    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      return {
        user: {
          id: payload.id,
          institutionId: payload.institutionId,
          role: payload.role,
          profileId: payload.profileId,
        },
        isAuthenticated: true,
      };
    } catch {
      return { user: null, isAuthenticated: false };
    }
  }, []);
}
