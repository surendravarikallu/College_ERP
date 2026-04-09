import { useState, useEffect, useCallback } from 'react';
import { apiClient } from '../api/client';

interface FetchState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

export function useDashboardData<T>(endpoint: string, defaultValue: T): FetchState<T> {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetch = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await apiClient.get(endpoint);
      setData(response.data?.data ?? response.data ?? defaultValue);
    } catch (err: any) {
      // If API returns 404 or no data, use defaults gracefully
      setData(defaultValue);
      if (err.response?.status !== 404) {
        setError(err.response?.data?.error || 'Failed to fetch data');
      }
    } finally {
      setLoading(false);
    }
  }, [endpoint]);

  useEffect(() => { fetch(); }, [fetch]);

  return { data, loading, error, refetch: fetch };
}
