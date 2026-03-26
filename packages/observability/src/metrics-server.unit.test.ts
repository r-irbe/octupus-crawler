// Metrics server unit tests
// Validates: T-OBS-013 (HTTP routes), T-OBS-014 (readiness), T-OBS-015 (404/500)
// REQ-OBS-019..022

import { describe, it, expect, afterEach } from 'vitest';
import { createMetricsServer } from './metrics-server.js';
import type { ReadinessResult } from './metrics-server.js';
import { createPromMetrics } from './prom-metrics.js';
import type { Server, AddressInfo } from 'node:net';

function getBaseUrl(srv: Server): string {
  const addr = srv.address() as AddressInfo;
  return `http://127.0.0.1:${String(addr.port)}`;
}

interface JsonBody {
  status?: string;
  timestamp?: string;
  error?: string;
  components?: Record<string, string>;
}

describe('MetricsServer', () => {
  let server: Server | undefined;

  afterEach(async () => {
    if (server !== undefined) {
      const s = server;
      server = undefined;
      await new Promise<void>((resolve) => {
        s.close(() => { resolve(); });
      });
    }
  });

  function startServer(
    readinessCheck?: () => Promise<ReadinessResult>,
  ): Promise<string> {
    const { registry } = createPromMetrics({ prefix: 'test_' });
    const config = readinessCheck !== undefined
      ? { registry, readinessCheck }
      : { registry };
    const srv = createMetricsServer(config);
    server = srv;
    return new Promise<string>((resolve) => {
      srv.listen(0, '127.0.0.1', () => {
        resolve(getBaseUrl(srv));
      });
    });
  }

  // Validates T-OBS-013: GET /metrics returns Prometheus exposition format (REQ-OBS-019)
  describe('GET /metrics (REQ-OBS-019)', () => {
    it('should return 200 with Prometheus exposition format', async () => {
      const base = await startServer();
      const res = await fetch(`${base}/metrics`);
      expect(res.status).toBe(200);
      const contentType = res.headers.get('content-type') ?? '';
      expect(contentType).toContain('text/plain');
      const body = await res.text();
      expect(typeof body).toBe('string');
    });
  });

  // Validates T-OBS-013: GET /health returns liveness status (REQ-OBS-020)
  describe('GET /health (REQ-OBS-020)', () => {
    it('should return 200 with status and timestamp', async () => {
      const base = await startServer();
      const res = await fetch(`${base}/health`);
      expect(res.status).toBe(200);
      const body = await res.json() as JsonBody;
      expect(body.status).toBe('ok');
      expect(body.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    });

    it('should return application/json content type', async () => {
      const base = await startServer();
      const res = await fetch(`${base}/health`);
      const contentType = res.headers.get('content-type') ?? '';
      expect(contentType).toContain('application/json');
    });
  });

  // Validates T-OBS-014: GET /readyz with injectable readiness check (REQ-OBS-021)
  describe('GET /readyz (REQ-OBS-021)', () => {
    it('should return 200 when readiness check passes', async () => {
      const check = (): Promise<ReadinessResult> => Promise.resolve({
        status: 200,
        components: { redis: 'ok', postgres: 'ok' },
      });
      const base = await startServer(check);
      const res = await fetch(`${base}/readyz`);
      expect(res.status).toBe(200);
      const body = await res.json() as JsonBody;
      expect(body.components?.['redis']).toBe('ok');
    });

    it('should return 503 when readiness check fails', async () => {
      const check = (): Promise<ReadinessResult> => Promise.resolve({
        status: 503,
        components: { redis: 'fail', postgres: 'ok' },
      });
      const base = await startServer(check);
      const res = await fetch(`${base}/readyz`);
      expect(res.status).toBe(503);
      const body = await res.json() as JsonBody;
      expect(body.components?.['redis']).toBe('fail');
    });

    it('should return 200 with default check when none provided', async () => {
      const base = await startServer();
      const res = await fetch(`${base}/readyz`);
      expect(res.status).toBe(200);
      const body = await res.json() as JsonBody;
      expect(body.status).toBeDefined();
    });
  });

  // Validates T-OBS-015: 404 for unknown paths (REQ-OBS-022)
  describe('Unknown paths (REQ-OBS-022)', () => {
    it('should return 404 for unknown paths', async () => {
      const base = await startServer();
      const res = await fetch(`${base}/unknown`);
      expect(res.status).toBe(404);
      const body = await res.json() as JsonBody;
      expect(body.error).toBe('Not Found');
    });

    it('should return 404 for POST to /metrics', async () => {
      const base = await startServer();
      const res = await fetch(`${base}/metrics`, { method: 'POST' });
      expect(res.status).toBe(404);
    });
  });

  // Validates T-OBS-015: 500 with generic error body (REQ-OBS-022)
  describe('Error handling (REQ-OBS-022)', () => {
    it('should return 500 with generic body when readiness check throws', async () => {
      const check = (): Promise<ReadinessResult> =>
        Promise.reject(new Error('Connection refused'));
      const base = await startServer(check);
      const res = await fetch(`${base}/readyz`);
      expect(res.status).toBe(500);
      const body = await res.json() as JsonBody;
      expect(body.error).toBe('Internal Server Error');
      // Must NOT leak internal error details
      const text = JSON.stringify(body);
      expect(text).not.toContain('Connection refused');
    });
  });
});
