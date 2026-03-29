// E2E: Health probes in K8s
// Validates: T-K8E-015, REQ-K8E-020
// Requires: k3d cluster running with crawler deployed

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { setupE2E, type E2EContext } from './helpers/e2e-setup.js';

let ctx: E2EContext;

beforeAll(async () => {
  ctx = await setupE2E();
}, 180_000); // 3 min for cluster setup + deploy

afterAll(async () => {
  await ctx.cleanup();
});

describe('Health probes in K8s', () => {
  // Validates REQ-K8E-020: /health returns 200
  it('liveness probe returns 200', async () => {
    const res = await fetch(`http://127.0.0.1:${String(ctx.crawlerHealthPort)}/health`);
    expect(res.status).toBe(200);
    const body = await res.json() as Record<string, unknown>;
    expect(body).toHaveProperty('status', 'ok');
  });

  // Validates REQ-K8E-020: /readyz returns 200
  it('readiness probe returns 200', async () => {
    const res = await fetch(`http://127.0.0.1:${String(ctx.crawlerHealthPort)}/readyz`);
    expect(res.status).toBe(200);
    const body = await res.json() as Record<string, unknown>;
    expect(body).toHaveProperty('status', 'ok');
  });

  // Validates REQ-K8E-020: metrics endpoint available
  it('metrics endpoint returns Prometheus text', async () => {
    const res = await fetch(`http://127.0.0.1:${String(ctx.crawlerMetricsPort)}/metrics`);
    expect(res.status).toBe(200);
    const text = await res.text();
    expect(text).toContain('# HELP');
  });

  // Validates REQ-K8E-020: web simulator is reachable
  it('web simulator serves pages', async () => {
    const res = await fetch(`http://127.0.0.1:${String(ctx.simulatorPort)}/`);
    expect(res.status).toBe(200);
    const html = await res.text();
    expect(html).toContain('Home');
  });
});
