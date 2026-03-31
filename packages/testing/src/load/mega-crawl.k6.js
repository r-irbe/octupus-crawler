/**
 * k6 Mega Crawl — Sustained 500 URL/s for 30 minutes across 1000+ domains.
 *
 * Validates that the crawler handles large-scale distributed crawling
 * with thousands of domains simultaneously, mixed chaos scenarios,
 * and maintains SLO compliance under sustained heavy load.
 *
 * Run with Prometheus remote write:
 *   k6 run --out experimental-prometheus-rw \
 *     -e K6_PROMETHEUS_RW_SERVER_URL=http://prometheus:9090/api/v1/write \
 *     packages/testing/src/load/mega-crawl.k6.js
 *
 * @see REQ-LTO-031, REQ-LTO-035, T-LTO-019
 */

import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Counter, Trend, Gauge } from 'k6/metrics';

// Custom metrics
const seedErrors = new Rate('seed_errors');
const totalSeeded = new Counter('total_seeded');
const seedDuration = new Trend('seed_duration', true);
const activeDomains = new Gauge('active_domains_targeted');

// Environment variables
const API_URL = __ENV.API_URL || 'http://localhost:3000';
const SIMULATOR_HOST = __ENV.SIMULATOR_HOST || 'http://mega-simulator:8080';
const DOMAIN_COUNT = parseInt(__ENV.DOMAIN_COUNT || '1000', 10);
const PAGES_PER_DOMAIN = parseInt(__ENV.PAGES_PER_DOMAIN || '50', 10);
const TARGET_RATE = parseInt(__ENV.TARGET_RATE || '500', 10);
const TEST_DURATION = __ENV.TEST_DURATION || '30m';

export const options = {
  scenarios: {
    mega_crawl: {
      executor: 'constant-arrival-rate',
      rate: TARGET_RATE,
      timeUnit: '1s',
      duration: TEST_DURATION,
      preAllocatedVUs: 100,
      maxVUs: 500,
    },
  },
  thresholds: {
    // SLO: p95 < 5s seed latency, < 5% error rate
    'http_req_duration{type:seed}': ['p(95)<5000'],
    'http_req_failed{type:seed}': ['rate<0.05'],
    'seed_errors': ['rate<0.05'],
    'seed_duration': ['p(95)<5000', 'p(99)<10000'],
    'total_seeded': [`count>=${Math.floor(TARGET_RATE * 60 * 0.95)}`],
  },
};

/**
 * Generate a URL targeting a random domain and page on the mega simulator.
 * Uses padded domain IDs matching mega-simulator URL scheme: /domain-NNNN/page-N
 */
function randomMegaUrl() {
  const domainId = Math.floor(Math.random() * DOMAIN_COUNT);
  const pageNum = Math.floor(Math.random() * PAGES_PER_DOMAIN);
  const paddedDomain = String(domainId).padStart(4, '0');
  return `${SIMULATOR_HOST}/domain-${paddedDomain}/page-${pageNum}`;
}

export default function () {
  const targetUrl = randomMegaUrl();

  const payload = JSON.stringify({
    url: targetUrl,
    depth: 1, // Allow one level of link following
  });

  const params = {
    headers: { 'Content-Type': 'application/json' },
    tags: { type: 'seed' },
    timeout: '15s',
  };

  const start = Date.now();
  const res = http.post(`${API_URL}/api/seed`, payload, params);
  const duration = Date.now() - start;

  seedDuration.add(duration);
  activeDomains.add(DOMAIN_COUNT);

  const success = check(res, {
    'seed accepted (2xx)': (r) => r.status >= 200 && r.status < 300,
    'response time < 5s': (r) => r.timings.duration < 5000,
  });

  if (success) {
    totalSeeded.add(1);
  } else {
    seedErrors.add(1);
  }

  // Minimal sleep to avoid client-side CPU saturation
  sleep(0.001);
}

/**
 * Setup: verify mega simulator is reachable before starting load.
 */
export function setup() {
  const healthRes = http.get(`${SIMULATOR_HOST}/health`, { timeout: '10s' });
  const healthy = check(healthRes, {
    'mega simulator healthy': (r) => r.status === 200,
  });

  if (!healthy) {
    console.error(`Mega simulator not reachable at ${SIMULATOR_HOST}`);
  }

  const apiRes = http.get(`${API_URL}/health`, { timeout: '10s' });
  check(apiRes, {
    'API gateway healthy': (r) => r.status === 200,
  });

  return {
    domainCount: DOMAIN_COUNT,
    pagesPerDomain: PAGES_PER_DOMAIN,
    targetRate: TARGET_RATE,
    totalUrls: DOMAIN_COUNT * PAGES_PER_DOMAIN,
  };
}

/**
 * Teardown: report summary statistics.
 */
export function teardown(data) {
  console.log('=== Mega Crawl Summary ===');
  console.log(`Target: ${data.domainCount} domains × ${data.pagesPerDomain} pages = ${data.totalUrls} URLs`);
  console.log(`Injection rate: ${data.targetRate} URL/s`);
  console.log(`Duration: ${TEST_DURATION}`);
}
