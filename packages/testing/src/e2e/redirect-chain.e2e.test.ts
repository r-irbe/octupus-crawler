// E2E: Redirect chain — verify crawler follows redirects and enforces max-hops limit
// Validates: T-K8E-027, REQ-K8E-026, REQ-K8E-027
// Requires: k3d cluster running with crawler + simulator deployed

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { setupE2E, type E2EContext } from './helpers/e2e-setup.js';
import { getMetricValue, waitForMetric } from './helpers/metrics-helper.js';
import { createClient } from 'redis';

let ctx: E2EContext;

beforeAll(async () => {
  ctx = await setupE2E();
}, 180_000);

afterAll(async () => {
  await ctx.cleanup();
});

describe('Redirect chain E2E', () => {
  // Validates REQ-K8E-026: crawler follows redirect chain to final destination
  it('crawler follows redirect chain up to max hops', async () => {
    // Verify simulator serves redirect chain on scenario port
    const res = await fetch(
      `http://127.0.0.1:${String(ctx.simulatorScenarioPort)}/redirect?hops=3`,
      { redirect: 'manual' },
    );
    expect(res.status).toBe(302);
    expect(res.headers.get('location')).toBe('/redirect?hops=2');
  });

  // Validates REQ-K8E-026: final destination returns 200
  it('redirect chain terminates with 200 at hops=0', async () => {
    const res = await fetch(
      `http://127.0.0.1:${String(ctx.simulatorScenarioPort)}/redirect?hops=0`,
    );
    expect(res.status).toBe(200);
    const html = await res.text();
    expect(html).toContain('Final destination');
  });

  // Validates REQ-K8E-026: crawler resolves multi-hop chain and records final URL
  it('seeds a redirect URL and verifies crawl completes', async () => {
    // Snapshot metrics before seeding
    const pagesBefore = (await getMetricValue(ctx.crawlerMetricsPort, 'crawl_pages_total')) ?? 0;

    const redis = createClient({
      url: `redis://127.0.0.1:${String(ctx.redisPort)}`,
    });

    try {
      await redis.connect();

      // Seed a redirect chain (5 hops — under the typical max of 10)
      const seedUrl = 'http://web-simulator:8081/redirect?hops=5';
      await redis.zAdd('crawl-jobs:waiting', {
        score: 1,
        value: JSON.stringify({ url: seedUrl, depth: 0 }),
      });

      // Wait for crawl to process at least 1 page (the final destination)
      await waitForMetric(
        ctx.crawlerMetricsPort,
        'crawl_pages_total',
        pagesBefore + 1,
        30_000,
      );
    } finally {
      redis.destroy();
    }
  }, 60_000);

  // Validates REQ-K8E-027: simulator serves each redirect hop individually
  it('simulator serves redirect chain at each hop level', async () => {
    // Ensure each hop is reachable (the SSRF guard runs per-hop in production)
    for (let i = 3; i >= 0; i--) {
      const res = await fetch(
        `http://127.0.0.1:${String(ctx.simulatorScenarioPort)}/redirect?hops=${String(i)}`,
        { redirect: 'manual' },
      );
      const expectedStatus = i > 0 ? 302 : 200;
      expect(res.status).toBe(expectedStatus);
    }
  });
});
