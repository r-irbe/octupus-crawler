// Integration test for readiness probe HTTP responses during shutdown
// Validates: T-LIFE-045 → REQ-LIFE-029

import { describe, it, expect, afterEach } from 'vitest';
import type { Logger } from '@ipf/core/contracts/logger';
import { createReadinessProbe } from './readiness-probe.js';
import type { ReadinessProbeHandle } from './readiness-probe.js';

function silentLogger(): Logger {
  const noop = (): void => undefined;
  return {
    debug: noop, info: noop, warn: noop, error: noop, fatal: noop,
    child: () => silentLogger(),
  } as Logger;
}

describe('T-LIFE-045: readiness probe HTTP integration', () => {
  let probe: ReadinessProbeHandle | undefined;

  afterEach(async () => {
    if (probe) {
      await probe.close();
      probe = undefined;
    }
  });

  it('returns HTTP 200 on /readyz when healthy', async () => {
    probe = createReadinessProbe(0, silentLogger());
    const port = await probe.listening();

    const res = await fetch(`http://127.0.0.1:${String(port)}/readyz`);
    expect(res.status).toBe(200);

    const body = await res.json() as { status: string };
    expect(body.status).toBe('ok');
  });

  it('returns HTTP 503 on /readyz after setUnhealthy', async () => {
    probe = createReadinessProbe(0, silentLogger());
    const port = await probe.listening();

    probe.setUnhealthy();

    const res = await fetch(`http://127.0.0.1:${String(port)}/readyz`);
    expect(res.status).toBe(503);

    const body = await res.json() as { status: string };
    expect(body.status).toBe('shutting-down');
  });

  it('returns HTTP 200 on /health regardless of shutdown state', async () => {
    probe = createReadinessProbe(0, silentLogger());
    const port = await probe.listening();

    probe.setUnhealthy();

    const res = await fetch(`http://127.0.0.1:${String(port)}/health`);
    expect(res.status).toBe(200);

    const body = await res.json() as { status: string };
    expect(body.status).toBe('ok');
  });

  it('returns 404 for unknown routes', async () => {
    probe = createReadinessProbe(0, silentLogger());
    const port = await probe.listening();

    const res = await fetch(`http://127.0.0.1:${String(port)}/unknown`);
    expect(res.status).toBe(404);
  });
});
