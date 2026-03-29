/**
 * k6 Throughput Test — Sustained load at 100 URL/s for 60s.
 *
 * Validates that the crawler can sustain throughput with acceptable latency.
 * Run with: k6 run --out json=results.json packages/testing/src/load/throughput.k6.js
 *
 * @see REQ-PROD-009, REQ-PROD-012, T-PROD-014
 */

// k6 runtime — not Node.js. Imports are k6 built-ins.
import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend } from 'k6/metrics';

// Custom metrics
const seedErrors = new Rate('seed_errors');
const seedDuration = new Trend('seed_duration', true);

// Environment variables (set via k6 -e flag)
const API_URL = __ENV.API_URL || 'http://localhost:3000';
const SIMULATOR_URL = __ENV.SIMULATOR_URL || 'http://web-simulator:8080';

export const options = {
  scenarios: {
    sustained_load: {
      executor: 'constant-arrival-rate',
      rate: 100,
      timeUnit: '1s',
      duration: '60s',
      preAllocatedVUs: 50,
      maxVUs: 200,
    },
  },
  thresholds: {
    // SLO: p95 < 5s, error rate < 5%
    'http_req_duration{type:seed}': ['p(95)<5000'],
    'http_req_failed{type:seed}': ['rate<0.05'],
    'seed_errors': ['rate<0.05'],
    'seed_duration': ['p(95)<5000'],
  },
};

export default function () {
  const payload = JSON.stringify({
    url: `${SIMULATOR_URL}/page-${__ITER}`,
    depth: 0,
  });

  const params = {
    headers: { 'Content-Type': 'application/json' },
    tags: { type: 'seed' },
  };

  const start = Date.now();
  const res = http.post(`${API_URL}/api/seed`, payload, params);
  const duration = Date.now() - start;

  seedDuration.add(duration);

  const success = check(res, {
    'seed accepted (2xx)': (r) => r.status >= 200 && r.status < 300,
  });

  if (!success) {
    seedErrors.add(1);
  }

  // Minimal sleep to avoid overwhelming the API
  sleep(0.01);
}
