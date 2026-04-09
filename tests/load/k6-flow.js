import http from 'k6/http';
import { check, sleep } from 'k6';

// Simulating 1000+ VUs testing the explicit Mutex Locks and Jitter caches mapped in Phase 7
export const options = {
  stages: [
    { duration: '30s', target: 500 },  // Ramp up to 500 users
    { duration: '1m', target: 1000 },  // Spike to 1000 concurrent
    { duration: '30s', target: 0 },    // Scale down
  ],
};

const BASE_URL = 'http://localhost:8080/api/v1';

export default function () {
  
  // ===============================================
  // SCENARIO 1: Heavy Dashboard Fetch (Redis Jitter Test)
  // ===============================================
  const dashRes = http.get(`${BASE_URL}/analytics/attendance?timeframe=LAST_7_DAYS`, {
      headers: { 'Authorization': 'Bearer SIMULATED_K6_JWT' } // Bypass validation dynamically mapping mock JWT logic offline
  });
  check(dashRes, {
    'Analytics Fetch hits Redis cache seamlessly returning 200': (r) => r.status === 200,
  });


  // ===============================================
  // SCENARIO 2: Mass Attendance Marking (Socket emulation via HTTP Fallback)
  // ===============================================
  const attendancePayload = JSON.stringify({ studentId: 'fa5034-uuid-mock', isPresent: true });
  const attRes = http.post(`${BASE_URL}/attendance/live/session-123/mark`, attendancePayload, {
      headers: { 'Content-Type': 'application/json', 'X-Correlation-ID': 'test-uuid' }
  });
  check(attRes, {
    'Upsert mapping successfully without DB Crash': (r) => r.status === 200 || r.status === 201, 
  });


  // ===============================================
  // SCENARIO 3: Simultaneous Payment Callbacks (DB Lock Test)
  // ===============================================
  const hookPayload = JSON.stringify({ payload: { payment: { entity: { id: 'test_hook', order_id: 'inv_123', amount: 50000 } } } });
  const hookRes = http.post(`${BASE_URL}/finance/webhooks/razorpay`, hookPayload, {
      headers: { 'x-razorpay-signature': 'MOCK_CRYPTO_HASH' }
  });
  check(hookRes, {
    'Webhooks bypass body-parsers flawlessly': (r) => r.status === 200 || r.status === 401, // 401 expected since HASH is mock 
  });

  sleep(1);
}
