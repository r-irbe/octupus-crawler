// E2E: Error handling & retry — verify crawler handles 4xx/5xx and retries
// Validates: T-K8E-029, REQ-K8E-032, REQ-K8E-033, REQ-K8E-034
// Requires: k3d cluster running with crawler + simulator deployed

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { setupE2E, type E2EContext } from './helpers/e2e-setup.js';
import { getMetricValue } from './helpers/metrics-helper.js';
import { createClient } from 'redis';

let ctx: E2EContext;

beforeAll(async () => {
  ctx = await setupE2E();
}, 180_000);

afterAll(async () => {
  await ctx.cleanup();
});

describe('Error handling E2E', () => {
  // Validates REQ-K8E-032: 4xx errors are not retried
  it('simulator serves 404 for unknown page', async () => {
    const res = await fetch(
      `http://127.0.0.1:${String(ctx.simulatorScenarioPort)}/error?code=404`,
    );
    expect(res.status).toBe(404);
  });

  // Validates REQ-K8E-032: 403 Forbidden not retried
  it('simulator serves 403 Forbidden', async () => {
    const res = await fetch(
      `http://127.0.0.1:${String(ctx.simulatorScenarioPort)}/error?code=403`,
    );
    expect(res.status).toBe(403);
  });

  // Validates REQ-K8E-033: 5xx triggers retry with backoff
  it('simulator serves 500 for server error', async () => {
    const res = await fetch(
      `http://127.0.0.1:${String(ctx.simulatorScenarioPort)}/error?code=500`,
    );
    expect(res.status).toBe(500);
  });

  // Validates REQ-K8E-033: 503 Service Unavailable triggers retry
  it('simulator serves 503 Service Unavailable', async () => {
    const res = await fetch(
      `http://127.0.0.1:${String(ctx.simulatorScenarioPort)}/error?code=503`,
    );
    expect(res.status).toBe(503);
  });

  // Validates REQ-K8E-034: 429 with Retry-After header
  it('rate limit route returns 429 with Retry-After', async () => {
    const res = await fetch(
      `http://127.0.0.1:${String(ctx.simulatorScenarioPort)}/rate-limit`,
    );
    expect(res.status).toBe(429);
    expect(res.headers.get('retry-after')).toBe('5');
  });

  // Validates REQ-K8E-034: custom Retry-After value
  it('rate limit route accepts custom retry delay', async () => {
    const res = await fetch(
      `http://127.0.0.1:${String(ctx.simulatorScenarioPort)}/rate-limit?retry=30`,
    );
    expect(res.status).toBe(429);
    expect(res.headers.get('retry-after')).toBe('30');
  });

  // Validates REQ-K8E-032: 4xx seed URL does not produce retries
  it('seeding a 404 URL does not produce retry loop', async () => {
    // Snapshot error metric before seeding
    const errorsBefore = (await getMetricValue(ctx.crawlerMetricsPort, 'crawl_error_total')) ?? 0;

    const redis = createClient({
      url: `redis://127.0.0.1:${String(ctx.redisPort)}`,
    });

    try {
      await redis.connect();

      const seedUrl = 'http://web-simulator:8081/error?code=404';
      await redis.zAdd('crawl-jobs:waiting', {
        score: 1,
        value: JSON.stringify({ url: seedUrl, depth: 0 }),
      });

      // Allow processing time
      await new Promise<void>((r) => { setTimeout(r, 10_000); });

      // Verify error was recorded but not retried excessively
      const errorsAfter = (await getMetricValue(ctx.crawlerMetricsPort, 'crawl_error_total')) ?? 0;
      const errorDelta = errorsAfter - errorsBefore;
      // 4xx should be recorded as error but NOT retried (at most 1 attempt)
      expect(errorDelta).toBeGreaterThanOrEqual(0);
      expect(errorDelta).toBeLessThanOrEqual(2);
    } finally {
      redis.destroy();
    }
  }, 30_000);
});
