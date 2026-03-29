// Integration test: Metrics endpoint scraping
// Validates: T-TEST-016, REQ-TEST-008
// Verifies the metrics HTTP server exposes Prometheus-compatible metrics

import { describe, it, expect, afterAll } from 'vitest';
import { createMetricsServer } from '@ipf/observability/metrics-server';
import { createPromMetrics } from '@ipf/observability/prom-metrics';
import type { Server } from 'node:http';

describe('Metrics endpoint scraping', () => {
  let server: Server | undefined;
  let port: number;
  const { metrics, registry } = createPromMetrics({ prefix: 'test_' });

  afterAll(async () => {
    if (server !== undefined) {
      const s = server;
      await new Promise<void>((resolve) => {
        s.close(() => { resolve(); });
      });
    }
  });

  async function startServer(): Promise<number> {
    const s = createMetricsServer({ registry });
    server = s;
    return new Promise<number>((resolve) => {
      s.listen(0, () => {
        const addr = s.address();
        if (addr !== null && typeof addr === 'object') {
          resolve(addr.port);
        }
      });
    });
  }

  it('exposes Prometheus text format on /metrics', async () => {
    port = await startServer();

    // Record some metrics to ensure they appear
    metrics.recordFetch('success');
    metrics.recordFetchDuration(0.5);
    metrics.recordUrlsDiscovered(3);
    metrics.setFrontierSize(10);

    const response = await fetch(`http://localhost:${String(port)}/metrics`);
    expect(response.status).toBe(200);

    const contentType = response.headers.get('content-type') ?? '';
    expect(contentType).toContain('text/plain');

    const body = await response.text();

    // Validates REQ-OBS-009: fetches_total counter present
    expect(body).toContain('test_fetches_total');
    // Validates REQ-OBS-010: fetch_duration_seconds histogram present
    expect(body).toContain('test_fetch_duration_seconds');
    // Validates REQ-OBS-011: urls_discovered_total counter present
    expect(body).toContain('test_urls_discovered_total');
    // Validates REQ-OBS-012: frontier_size gauge present
    expect(body).toContain('test_frontier_size');
  });

  it('returns 200 on /health', async () => {
    const response = await fetch(`http://localhost:${String(port)}/health`);
    expect(response.status).toBe(200);
    const body: unknown = await response.json();
    expect(body).toEqual(expect.objectContaining({ status: 'ok' }));
  });

  it('returns 200 on /readyz with default check', async () => {
    const response = await fetch(`http://localhost:${String(port)}/readyz`);
    expect(response.status).toBe(200);
    const body: unknown = await response.json();
    expect(body).toEqual(expect.objectContaining({ status: 200 }));
  });

  it('returns 404 on unknown paths', async () => {
    const response = await fetch(`http://localhost:${String(port)}/unknown`);
    expect(response.status).toBe(404);
  });
});
