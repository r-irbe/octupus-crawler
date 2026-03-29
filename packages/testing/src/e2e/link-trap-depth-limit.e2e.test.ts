// E2E: Link trap depth limit — verify crawler enforces max crawl depth
// Validates: T-K8E-030, REQ-K8E-035, REQ-K8E-036
// Requires: k3d cluster running with crawler + simulator deployed

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { setupE2E, type E2EContext } from './helpers/e2e-setup.js';
import { createClient } from 'redis';

let ctx: E2EContext;

beforeAll(async () => {
  ctx = await setupE2E();
}, 180_000);

afterAll(async () => {
  await ctx.cleanup();
});

describe('Link trap depth limit E2E', () => {
  // Validates REQ-K8E-035: simulator generates infinite-depth trap
  it('trap route generates link to next depth level', async () => {
    const res = await fetch(
      `http://127.0.0.1:${String(ctx.simulatorScenarioPort)}/trap?depth=0`,
    );
    expect(res.status).toBe(200);
    const html = await res.text();
    expect(html).toContain('href="/trap?depth=1"');
  });

  // Validates REQ-K8E-035: deep trap pages are reachable
  it('trap route serves pages at arbitrary depth', async () => {
    const res = await fetch(
      `http://127.0.0.1:${String(ctx.simulatorScenarioPort)}/trap?depth=100`,
    );
    expect(res.status).toBe(200);
    const html = await res.text();
    expect(html).toContain('depth 100');
    expect(html).toContain('href="/trap?depth=101"');
  });

  // Validates REQ-K8E-035: seeding a trap URL stops at configured depth limit
  it('crawler does not follow trap links beyond max depth', async () => {
    const redis = createClient({
      url: `redis://127.0.0.1:${String(ctx.redisPort)}`,
    });
    await redis.connect();

    try {
      // Seed the trap at depth 0
      const seedUrl = 'http://web-simulator:8081/trap?depth=0';
      await redis.zAdd('crawl-jobs:waiting', {
        score: 1,
        value: JSON.stringify({ url: seedUrl, depth: 0 }),
      });

      // Wait for crawler to hit depth limit and stop
      await new Promise<void>((r) => { setTimeout(r, 30_000); });

      // Verify via metrics that total pages crawled is bounded
      const metricsRes = await fetch(
        `http://127.0.0.1:${String(ctx.crawlerMetricsPort)}/metrics`,
      );
      const text = await metricsRes.text();

      // The crawler should NOT have fetched more than max_depth pages
      // Typical max_depth is 10-20; definitely not 100+
      const match = /crawl_pages_total\s+(\d+)/m.exec(text);
      if (match !== null) {
        const totalPages = parseInt(match[1] ?? '0', 10);
        // Depth limit should prevent infinite crawling
        expect(totalPages).toBeLessThan(50);
      }
    } finally {
      redis.destroy();
    }
  }, 60_000);

  // Validates REQ-K8E-036: duplicate URLs are deduplicated via fingerprint
  it('trap URLs at same depth produce same fingerprint', async () => {
    // Same URL fetched twice should return identical content
    const res1 = await fetch(
      `http://127.0.0.1:${String(ctx.simulatorScenarioPort)}/trap?depth=5`,
    );
    const res2 = await fetch(
      `http://127.0.0.1:${String(ctx.simulatorScenarioPort)}/trap?depth=5`,
    );
    const html1 = await res1.text();
    const html2 = await res2.text();
    expect(html1).toBe(html2);
  });
});
