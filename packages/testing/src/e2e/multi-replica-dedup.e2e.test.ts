// E2E: Multi-replica deduplication — 2 replicas, verify no duplicate URL processing
// Validates: T-K8E-019, REQ-K8E-022
// Requires: k3d cluster running with crawler deployed

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { setupE2E, type E2EContext } from './helpers/e2e-setup.js';
import {
  scaleDeployment,
  waitForReadyReplicas,
} from './helpers/chaos-helpers.js';
import { fetchMetricsText, parseMetrics } from './helpers/metrics-helper.js';
import { createClient } from 'redis';

let ctx: E2EContext;

beforeAll(async () => {
  ctx = await setupE2E();
  // Scale to 2 replicas for dedup testing
  await scaleDeployment('crawler-worker', 2);
  await waitForReadyReplicas('crawler-worker', 2, 60_000);
}, 180_000);

afterAll(async () => {
  // Reset to 1 replica
  await scaleDeployment('crawler-worker', 1);
  await waitForReadyReplicas('crawler-worker', 1, 60_000);
  await ctx.cleanup();
});

describe('Multi-replica dedup E2E', () => {
  // Validates REQ-K8E-022: 2 replicas process URLs without duplicates
  it('same URL seeded once is processed exactly once with 2 replicas', async () => {
    // Capture baseline metrics
    const beforeText = await fetchMetricsText(ctx.crawlerMetricsPort);
    const beforeMetrics = parseMetrics(beforeText);
    const pagesBefore = beforeMetrics.get('crawl_pages_total') ?? 0;

    // Seed a single URL via Redis
    const redis = createClient({
      url: `redis://127.0.0.1:${String(ctx.redisPort)}`,
    });

    try {
      await redis.connect();

      // Seed the same URL once — only one worker should process it
      const seedUrl = `http://web-simulator:8080/burst-links?count=1`;
      await redis.lPush('crawl:seed', JSON.stringify({
        url: seedUrl,
        depth: 0,
      }));

      // Poll until processing completes (pages increase) or timeout
      const POLL_INTERVAL_MS = 1_000;
      const POLL_TIMEOUT_MS = 30_000;
      let pagesAfter = pagesBefore;
      const deadline = Date.now() + POLL_TIMEOUT_MS;

      while (Date.now() < deadline) {
        await new Promise<void>((r) => { setTimeout(r, POLL_INTERVAL_MS); });
        const pollText = await fetchMetricsText(ctx.crawlerMetricsPort);
        const pollMetrics = parseMetrics(pollText);
        pagesAfter = pollMetrics.get('crawl_pages_total') ?? 0;
        if (pagesAfter > pagesBefore) break;
      }

      // With dedup, the increment should be exactly the seeded page (+ discovered links)
      // Not doubled: each URL processed exactly once across both replicas
      // burst-links?count=1 returns 1 page with 1 link → max 2 pages processed
      const increment = pagesAfter - pagesBefore;
      expect(increment).toBeGreaterThanOrEqual(1);
      expect(increment).toBeLessThanOrEqual(2);
    } finally {
      redis.destroy();
    }
  }, 60_000);

  // Validates REQ-K8E-022: both replicas are healthy and processing
  it('both replicas report healthy status', async () => {
    const replicas = await waitForReadyReplicas('crawler-worker', 2, 10_000)
      .then(() => true)
      .catch(() => false);
    expect(replicas).toBe(true);

    // Verify metrics endpoint is accessible (at least one replica responds)
    const metricsText = await fetchMetricsText(ctx.crawlerMetricsPort);
    expect(metricsText.length).toBeGreaterThan(0);
  }, 30_000);
});
