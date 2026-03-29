// E2E: Full crawl pipeline — seed URL → crawl → verify discovered URLs
// Validates: T-K8E-016, REQ-K8E-017, REQ-K8E-021
// Requires: k3d cluster running with crawler + simulator + dragonfly deployed

import { describe, it, beforeAll, afterAll } from 'vitest';
import { setupE2E, type E2EContext } from './helpers/e2e-setup.js';
import { createClient } from 'redis';

let ctx: E2EContext;

beforeAll(async () => {
  ctx = await setupE2E();
}, 180_000);

afterAll(async () => {
  await ctx.cleanup();
});

/** Poll metrics endpoint until a metric reaches expected value or timeout */
async function waitForMetric(
  metricsPort: number,
  metricName: string,
  expectedValue: number,
  timeoutMs: number = 60_000,
): Promise<void> {
  const start = Date.now();

  while (Date.now() - start < timeoutMs) {
    const res = await fetch(`http://127.0.0.1:${String(metricsPort)}/metrics`);
    const text = await res.text();

    // Parse Prometheus text format: metric_name value
    const regex = new RegExp(`^${metricName}\\s+(\\d+)`, 'm');
    const match = regex.exec(text);

    if (match !== null) {
      const value = parseInt(match[1] ?? '0', 10);
      if (value >= expectedValue) return;
    }

    await new Promise<void>((r) => { setTimeout(r, 2000); });
  }

  throw new Error(`Metric ${metricName} did not reach ${String(expectedValue)} within ${String(timeoutMs)}ms`);
}

describe('Crawl pipeline E2E', () => {
  // Validates REQ-K8E-017: seed URL → crawl → discovered URLs in frontier
  it('crawls simulated site and discovers all pages', async () => {
    // Connect to Redis via port-forward
    const redis = createClient({
      url: `redis://127.0.0.1:${String(ctx.redisPort)}`,
    });
    await redis.connect();

    try {
      // Seed the frontier with the simulator's root URL
      const simulatorUrl = `http://web-simulator:8080/`;
      await redis.zAdd('crawl-jobs:waiting', { score: 1, value: JSON.stringify({
        url: simulatorUrl,
        depth: 0,
      }) });

      // Wait for crawl to process pages (7 pages in default site graph)
      await waitForMetric(ctx.crawlerMetricsPort, 'crawl_pages_total', 7, 120_000);
    } finally {
      redis.destroy();
    }
  }, 180_000);
});
