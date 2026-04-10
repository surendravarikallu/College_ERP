import axios from 'axios';

// Reverted to relative bounds: LAN Firewall typically blocks native 8091. 
// Uses active host pipeline correctly binding Vite 8090 explicitly across Sockets natively without cross-origin trips
export const apiClient = axios.create({
  baseURL: '/api/v1',
  headers: { 'Content-Type': 'application/json' },
  withCredentials: true 
});

// 1. Request Interceptor mapping standard JWT Access Tokens explicitly securing boundaries
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('erp_access_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  // Safely generate tracing ID natively supporting HTTP LAN contexts where crypto.randomUUID is blocked
  const generateId = () => crypto?.randomUUID ? crypto.randomUUID() : `fallback-${Date.now()}-${Math.random().toString(36).substring(2)}`;
  config.headers['x-correlation-id'] = generateId(); 
  return config;
});

// 2. Automated Token Refresh pipeline catching native 401s intercepting failing UI requests
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      try {
        const refreshToken = localStorage.getItem('erp_refresh_token');
        if (!refreshToken) throw new Error('Refresh voided');

        // Bypasses Interceptor strictly preventing infinite 401 loop crashes
        const { data } = await axios.post('/api/v1/auth/refresh', { token: refreshToken });
        
        localStorage.setItem('erp_access_token', data.accessToken);
        originalRequest.headers.Authorization = `Bearer ${data.accessToken}`;
        
        return apiClient(originalRequest); // Retry naturally masking the UI crash identically
      } catch (err) {
        localStorage.removeItem('erp_access_token');
        localStorage.removeItem('erp_refresh_token');
        window.location.href = '/login'; // Force boundary re-evaluations
      }
    }
    return Promise.reject(error);
  }
);
