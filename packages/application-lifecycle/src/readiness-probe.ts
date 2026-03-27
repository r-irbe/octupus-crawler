// Readiness probe — HTTP endpoint returning health status
// Implements: T-LIFE-039, REQ-LIFE-029

import { createServer } from 'node:http';
import type { Logger } from '@ipf/core/contracts/logger';
import type { Disposable } from '@ipf/core/contracts/disposable';
import type { ReadinessProbe } from './graceful-shutdown.js';

export type ReadinessProbeHandle = ReadinessProbe & Disposable & {
  readonly isHealthy: () => boolean;
};

export function createReadinessProbe(port: number, logger: Logger): ReadinessProbeHandle {
  let healthy = true;
  function setUnhealthy(): void {
    healthy = false;
    logger.info('Readiness probe set to unhealthy');
  }

  function isHealthy(): boolean {
    return healthy;
  }

  const server = createServer((req, res) => {
    if (req.url === '/readyz') {
      const status = healthy ? 200 : 503;
      res.writeHead(status, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ status: healthy ? 'ok' : 'shutting-down' }));
      return;
    }
    if (req.url === '/health') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ status: 'ok' }));
      return;
    }
    res.writeHead(404);
    res.end();
  });

  server.on('error', (err: NodeJS.ErrnoException) => {
    logger.fatal('Readiness probe failed to start', { port, error: err.message, code: err.code });
  });

  server.listen(port, () => {
    logger.info('Readiness probe listening', { port });
  });

  async function close(): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      server.close((err) => {
        if (err) {
          reject(err);
        } else {
          resolve();
        }
      });
    });
  }

  return { setUnhealthy, isHealthy, close };
}
