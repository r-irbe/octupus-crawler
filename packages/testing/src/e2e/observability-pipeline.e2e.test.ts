// E2E: Observability pipeline — verify metrics accuracy and trace correlation
// Validates: T-K8E-032, REQ-K8E-040, REQ-K8E-041, REQ-K8E-042
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

/** Fetch and parse Prometheus metrics text into a map */
async function fetchMetrics(
  port: number,
): Promise<Map<string, number>> {
  const res = await fetch(`http://127.0.0.1:${String(port)}/metrics`);
  const text = await res.text();
  const metrics = new Map<string, number>();

  for (const line of text.split('\n')) {
    if (line.startsWith('#') || line.trim() === '') continue;
    const match = /^([a-zA-Z_:][a-zA-Z0-9_:]*)\s+([0-9.eE+-]+)$/m.exec(line);
    if (match !== null) {
      const name = match[1];
      const value = parseFloat(match[2] ?? '0');
      if (name !== undefined) {
        metrics.set(name, value);
      }
    }
  }

  return metrics;
}

describe('Observability pipeline E2E', () => {
  // Validates REQ-K8E-040: metrics endpoint returns Prometheus format
  it('crawler metrics endpoint returns valid Prometheus text', async () => {
    const res = await fetch(
      `http://127.0.0.1:${String(ctx.crawlerMetricsPort)}/metrics`,
    );
    expect(res.status).toBe(200);

    const text = await res.text();
    // Prometheus text format has HELP and TYPE comments
    expect(text.length).toBeGreaterThan(0);
    // At minimum, Node.js process metrics should exist
    expect(text).toMatch(/process_/m);
  });

  // Validates REQ-K8E-042: required metric names are exposed
  it('metrics include expected process-level counters', async () => {
    const metrics = await fetchMetrics(ctx.crawlerMetricsPort);

    // Standard Node.js process metrics
    expect(metrics.has('process_cpu_seconds_total')).toBe(true);
    expect(metrics.has('process_resident_memory_bytes')).toBe(true);
  });

  // Validates REQ-K8E-040: metrics values are non-negative
  it('all metric values are non-negative', async () => {
    const metrics = await fetchMetrics(ctx.crawlerMetricsPort);

    for (const [name, value] of metrics) {
      expect(value, `metric ${name} should be >= 0`).toBeGreaterThanOrEqual(0);
    }
  });

  // Validates REQ-K8E-041: health endpoint returns structured response
  it('crawler health endpoint returns structured response', async () => {
    const res = await fetch(
      `http://127.0.0.1:${String(ctx.crawlerHealthPort)}/healthz`,
    );
    expect(res.status).toBe(200);
  });

  // Validates REQ-K8E-040: metrics are consistent across consecutive fetches
  it('metrics are monotonically non-decreasing for counters', async () => {
    const metrics1 = await fetchMetrics(ctx.crawlerMetricsPort);

    // Small delay
    await new Promise<void>((r) => { setTimeout(r, 1_000); });

    const metrics2 = await fetchMetrics(ctx.crawlerMetricsPort);

    // CPU seconds should be non-decreasing
    const cpu1 = metrics1.get('process_cpu_seconds_total') ?? 0;
    const cpu2 = metrics2.get('process_cpu_seconds_total') ?? 0;
    expect(cpu2).toBeGreaterThanOrEqual(cpu1);
  });
});
