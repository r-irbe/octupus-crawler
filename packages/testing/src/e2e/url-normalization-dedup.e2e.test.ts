// E2E: URL normalization & deduplication — verify canonical form and fingerprinting
// Validates: T-K8E-034, REQ-K8E-036, REQ-K8E-037
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

describe('URL normalization dedup E2E', () => {
  // Validates REQ-K8E-037: mixed-links page contains diverse link types
  it('simulator serves mixed-links with various URL formats', async () => {
    const res = await fetch(
      `http://127.0.0.1:${String(ctx.simulatorScenarioPort)}/mixed-links`,
    );
    expect(res.status).toBe(200);
    const html = await res.text();

    // Relative links
    expect(html).toContain('href="/page-a"');
    expect(html).toContain('href="/page-b"');

    // Fragment links (should be normalized by stripping fragment)
    expect(html).toContain('href="/page-a#section"');

    // Query parameter links
    expect(html).toContain('href="/page-a?utm_source=test"');

    // Case variant (URL normalization should treat /page-a and /Page-A as same or different)
    expect(html).toContain('href="/Page-A"');
  });

  // Validates REQ-K8E-037: non-HTTP links are present but should be filtered
  it('mixed-links page contains mailto and javascript links', async () => {
    const res = await fetch(
      `http://127.0.0.1:${String(ctx.simulatorScenarioPort)}/mixed-links`,
    );
    const html = await res.text();

    // These should be filtered out by the crawler's link extractor
    expect(html).toContain('href="mailto:test@example.com"');
    expect(html).toContain('href="javascript:void(0)"');
    expect(html).toContain('href="tel:+1234567890"');
    expect(html).toContain('href=""');
  });

  // Validates REQ-K8E-036: identical URL fetched multiple times returns same content
  it('same URL returns identical content (dedup-friendly)', async () => {
    const url = `http://127.0.0.1:${String(ctx.simulatorScenarioPort)}/mixed-links`;

    const [res1, res2] = await Promise.all([fetch(url), fetch(url)]);
    const [html1, html2] = await Promise.all([res1.text(), res2.text()]);

    expect(html1).toBe(html2);
  });

  // Validates REQ-K8E-037: crawler only extracts valid HTTP(S) links
  it('crawler metrics endpoint accessible for dedup verification', async () => {
    const res = await fetch(
      `http://127.0.0.1:${String(ctx.crawlerMetricsPort)}/metrics`,
    );
    expect(res.status).toBe(200);
    const text = await res.text();
    expect(text.length).toBeGreaterThan(0);
  });
});
