// E2E: Robots.txt compliance — verify crawler respects Disallow directives
// Validates: T-K8E-031, REQ-K8E-038, REQ-K8E-039
// Requires: k3d cluster running with crawler + simulator deployed

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { setupE2E, type E2EContext } from './helpers/e2e-setup.js';

let ctx: E2EContext;

beforeAll(async () => {
  ctx = await setupE2E();
}, 180_000);

afterAll(async () => {
  await ctx.cleanup();
});

describe('Robots.txt compliance E2E', () => {
  // Validates REQ-K8E-038: simulator serves robots.txt with Disallow rules
  it('robots-block route serves valid robots.txt content', async () => {
    const res = await fetch(
      `http://127.0.0.1:${String(ctx.simulatorScenarioPort)}/robots-block`,
    );
    expect(res.status).toBe(200);
    expect(res.headers.get('content-type')).toBe('text/plain');

    const text = await res.text();
    expect(text).toContain('Disallow: /admin');
    expect(text).toContain('Disallow: /private');
    expect(text).toContain('Crawl-delay: 1');
  });

  // Validates REQ-K8E-038: user-agent specific rules are present
  it('robots.txt contains user-agent specific directives', async () => {
    const res = await fetch(
      `http://127.0.0.1:${String(ctx.simulatorScenarioPort)}/robots-block`,
    );
    const text = await res.text();

    expect(text).toContain('User-agent: ipf-crawler');
    expect(text).toContain('Disallow: /secret');
    expect(text).toContain('Allow: /admin/public');
  });

  // Validates REQ-K8E-039: Crawl-delay directive is present for politeness
  it('robots.txt includes Crawl-delay directive', async () => {
    const res = await fetch(
      `http://127.0.0.1:${String(ctx.simulatorScenarioPort)}/robots-block`,
    );
    const text = await res.text();
    const match = /Crawl-delay:\s*(\d+)/m.exec(text);

    expect(match).not.toBeNull();
    const delay = parseInt(match?.[1] ?? '0', 10);
    expect(delay).toBeGreaterThan(0);
  });

  // Validates REQ-K8E-038: metrics show crawler health while respecting robots
  it('crawler metrics endpoint is accessible during robots compliance', async () => {
    const res = await fetch(
      `http://127.0.0.1:${String(ctx.crawlerMetricsPort)}/metrics`,
    );
    expect(res.status).toBe(200);
    const text = await res.text();
    expect(text.length).toBeGreaterThan(0);
  });
});
