// Readiness probe — HTTP endpoint returning health status
// Implements: T-LIFE-039, REQ-LIFE-029

import { createServer } from 'node:http';
import type { AddressInfo } from 'node:net';
import type { Logger } from '@ipf/core/contracts/logger';
import type { Disposable } from '@ipf/core/contracts/disposable';
import type { ReadinessProbe } from './graceful-shutdown.js';

export type ReadinessProbeHandle = ReadinessProbe & Disposable & {
  readonly isHealthy: () => boolean;
  readonly listening: () => Promise<number>;
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

  const ready = new Promise<number>((resolve, reject) => {
    const bindTimeout = setTimeout(() => {
      reject(new Error(`Readiness probe failed to bind on port ${String(port)} within 5s`));
    }, 5_000);
    server.listen(port, () => {
      clearTimeout(bindTimeout);
      const addr = server.address() as AddressInfo;
      logger.info('Readiness probe listening', { port: addr.port });
      resolve(addr.port);
    });
  });

  function listening(): Promise<number> {
    return ready;
  }

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

  return { setUnhealthy, isHealthy, listening, close };
}
