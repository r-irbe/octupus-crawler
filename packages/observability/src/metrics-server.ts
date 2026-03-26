// Metrics HTTP server — built-in Node.js HTTP server
// Implements: T-OBS-013, T-OBS-014, T-OBS-015, REQ-OBS-019..022

import { createServer } from 'node:http';
import type { Server, IncomingMessage, ServerResponse } from 'node:http';
import type { Registry } from 'prom-client';

export interface ReadinessResult {
  readonly status: number;
  readonly components: Record<string, string>;
}

export interface MetricsServerConfig {
  readonly registry: Registry;
  readonly readinessCheck?: () => Promise<ReadinessResult>;
}

function defaultReadiness(): Promise<ReadinessResult> {
  return Promise.resolve({
    status: 200,
    components: { self: 'ok' },
  });
}

function sendJson(res: ServerResponse, statusCode: number, body: unknown): void {
  const payload = JSON.stringify(body);
  res.writeHead(statusCode, {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(payload),
  });
  res.end(payload);
}

export function createMetricsServer(config: MetricsServerConfig): Server {
  const { registry, readinessCheck } = config;
  const check = readinessCheck ?? defaultReadiness;

  return createServer((req: IncomingMessage, res: ServerResponse): void => {
    if (req.method !== 'GET') {
      sendJson(res, 404, { error: 'Not Found' });
      return;
    }

    const url = req.url ?? '/';

    if (url === '/metrics') {
      registry.metrics()
        .then((metrics: string) => {
          const contentType = registry.contentType;
          res.writeHead(200, {
            'Content-Type': contentType,
            'Content-Length': Buffer.byteLength(metrics),
          });
          res.end(metrics);
        })
        .catch((): void => {
          // REQ-OBS-022: Never leak internal details
          sendJson(res, 500, { error: 'Internal Server Error' });
        });
      return;
    }

    if (url === '/health') {
      sendJson(res, 200, {
        status: 'ok',
        timestamp: new Date().toISOString(),
      });
      return;
    }

    if (url === '/readyz') {
      check()
        .then((result: ReadinessResult): void => {
          sendJson(res, result.status, result);
        })
        .catch((): void => {
          // REQ-OBS-022: Never leak internal details
          sendJson(res, 500, { error: 'Internal Server Error' });
        });
      return;
    }

    // REQ-OBS-022: Unknown paths → 404
    sendJson(res, 404, { error: 'Not Found' });
  });
}
