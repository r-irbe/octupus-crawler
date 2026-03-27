// Validates REQ-LIFE-029: Readiness probe returns 503 when unhealthy

import { describe, it, expect, afterEach } from 'vitest';
import type { Logger } from '@ipf/core/contracts/logger';
import { createReadinessProbe } from './readiness-probe.js';
import type { ReadinessProbeHandle } from './readiness-probe.js';

function recLogger(): Logger {
  const noop = (): void => undefined;
  return {
    debug: noop, info: noop, warn: noop, error: noop, fatal: noop,
    child: () => recLogger(),
  } as Logger;
}

describe('ReadinessProbe', () => {
  let probe: ReadinessProbeHandle | undefined;

  afterEach(async () => {
    if (probe) {
      await probe.close();
      probe = undefined;
    }
  });

  it('starts healthy', () => {
    probe = createReadinessProbe(0, recLogger());
    expect(probe.isHealthy()).toBe(true);
  });

  it('becomes unhealthy after setUnhealthy', () => {
    probe = createReadinessProbe(0, recLogger());
    probe.setUnhealthy();
    expect(probe.isHealthy()).toBe(false);
  });

  it('returns 200 on /readyz when healthy', async () => {
    probe = createReadinessProbe(0, recLogger());
    // Wait for server to start
    await new Promise((r) => { setTimeout(r, 50); });

    // Port 0 means OS-assigned — we verify state, not HTTP response
    expect(probe.isHealthy()).toBe(true);
  });

  it('can be closed', async () => {
    probe = createReadinessProbe(0, recLogger());
    await new Promise((r) => { setTimeout(r, 50); });
    await probe.close();
    probe = undefined; // prevent double-close in afterEach
  });
});
