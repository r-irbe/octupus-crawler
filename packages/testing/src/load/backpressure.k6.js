/**
 * k6 Backpressure Test — Burst 10,000 URLs, monitor queue depth and memory.
 *
 * Validates that the system handles burst load without OOM or data loss.
 * Run with: k6 run --out json=results.json packages/testing/src/load/backpressure.k6.js
 *
 * @see REQ-PROD-010, REQ-PROD-011, REQ-PROD-013, T-PROD-015
 */

// k6 runtime — not Node.js. Imports are k6 built-ins.
import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Counter } from 'k6/metrics';

// Custom metrics
const seedErrors = new Rate('seed_errors');
const totalSeeded = new Counter('total_seeded');

// Environment variables
const API_URL = __ENV.API_URL || 'http://localhost:3000';
const SIMULATOR_URL = __ENV.SIMULATOR_URL || 'http://web-simulator:8080';

export const options = {
  scenarios: {
    burst_load: {
      executor: 'shared-iterations',
      vus: 50,
      iterations: 10000,
      maxDuration: '5m',
    },
  },
  thresholds: {
    // All 10k seeds should complete without excessive errors
    'seed_errors': ['rate<0.05'],
    'total_seeded': ['count>=9500'], // Allow 5% failure
    'http_req_duration{type:seed}': ['p(95)<10000'], // Relaxed for burst
  },
};

export default function () {
  const payload = JSON.stringify({
    url: `${SIMULATOR_URL}/burst-page-${__ITER}`,
    depth: 0,
  });

  const params = {
    headers: { 'Content-Type': 'application/json' },
    tags: { type: 'seed' },
  };

  const res = http.post(`${API_URL}/api/seed`, payload, params);

  const success = check(res, {
    'seed accepted (2xx)': (r) => r.status >= 200 && r.status < 300,
  });

  if (success) {
    totalSeeded.add(1);
  } else {
    seedErrors.add(1);
  }

  // No sleep — maximize burst pressure
}

/**
 * After the burst, k6 reports these metrics:
 * - total_seeded: should be >= 9500 (95% of 10k)
 * - seed_errors: should be < 5%
 * - http_req_duration p95: should be < 10s even under burst
 *
 * External verification (post-k6):
 * - Queue depth should be monotonically increasing during burst
 * - Worker RSS should stay under 512MB
 * - No OOM kills (check: kubectl get events)
 */
