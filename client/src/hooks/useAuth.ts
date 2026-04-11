import { useState, useCallback } from 'react';

export interface AuthUser {
  id: string;
  institutionId: string;
  role: string;
  profileId?: string;
  name?: string;
  email?: string;
}

interface AuthState {
  user: AuthUser | null;
  isAuthenticated: boolean;
  accessToken: string | null;
}

const TOKEN_KEY = 'erp_access_token';
const REFRESH_KEY = 'erp_refresh_token';
const USER_KEY = 'erp_user';

export function useAuth() {
  const [state, setState] = useState<AuthState>(() => {
    const token = localStorage.getItem(TOKEN_KEY);
    const storedUser = localStorage.getItem(USER_KEY);
    if (!token || !storedUser) return { user: null, isAuthenticated: false, accessToken: null };
    try {
      const decoded = JSON.parse(atob(token.split('.')[1]));
      if (decoded.exp * 1000 < Date.now()) {
        localStorage.removeItem(TOKEN_KEY);
        return { user: null, isAuthenticated: false, accessToken: null };
      }
      return { user: JSON.parse(storedUser), isAuthenticated: true, accessToken: token };
    } catch {
      return { user: null, isAuthenticated: false, accessToken: null };
    }
  });

  const login = useCallback((accessToken: string, refreshToken: string, user: AuthUser) => {
    localStorage.setItem(TOKEN_KEY, accessToken);
    localStorage.setItem(REFRESH_KEY, refreshToken);
    localStorage.setItem(USER_KEY, JSON.stringify(user));
    setState({ user, isAuthenticated: true, accessToken });
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(REFRESH_KEY);
    localStorage.removeItem(USER_KEY);
    setState({ user: null, isAuthenticated: false, accessToken: null });
  }, []);

  const updateTokens = useCallback((accessToken: string, refreshToken?: string) => {
    localStorage.setItem(TOKEN_KEY, accessToken);
    if (refreshToken) localStorage.setItem(REFRESH_KEY, refreshToken);
    setState(prev => ({ ...prev, accessToken }));
  }, []);

  return {
    ...state,
    login,
    logout,
    updateTokens,
    refreshToken: localStorage.getItem(REFRESH_KEY),
  };
}
