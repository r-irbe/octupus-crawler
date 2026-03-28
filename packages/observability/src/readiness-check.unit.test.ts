// Unit tests for enhanced readiness check
// Validates: T-OBS-030 → REQ-OBS-030

import { describe, it, expect, vi } from 'vitest';
import { createReadinessCheck } from './readiness-check.js';

describe('T-OBS-030: enhanced readiness check', () => {
  it('returns 200 when all configured components are healthy', async () => {
    const redis = { ping: vi.fn<() => Promise<string>>().mockResolvedValue('PONG') };
    const pg = { query: vi.fn<() => Promise<unknown>>().mockResolvedValue({ rows: [{ '?column?': 1 }] }) };

    const check = createReadinessCheck({ redis, pg });
    const result = await check();

    expect(result.status).toBe(200);
    expect(result.components).toEqual({ redis: 'ok', postgres: 'ok' });
  });

  it('returns 503 when Redis is unreachable', async () => {
    const redis = { ping: vi.fn<() => Promise<string>>().mockRejectedValue(new Error('ECONNREFUSED')) };

    const check = createReadinessCheck({ redis });
    const result = await check();

    expect(result.status).toBe(503);
    expect(result.components['redis']).toBe('unreachable');
  });

  it('returns 503 when PostgreSQL is unreachable', async () => {
    const redis = { ping: vi.fn<() => Promise<string>>().mockResolvedValue('PONG') };
    const pg = { query: vi.fn<() => Promise<unknown>>().mockRejectedValue(new Error('connection refused')) };

    const check = createReadinessCheck({ redis, pg });
    const result = await check();

    expect(result.status).toBe(503);
    expect(result.components['redis']).toBe('ok');
    expect(result.components['postgres']).toBe('unreachable');
  });

  it('returns 200 with no components when none configured', async () => {
    const check = createReadinessCheck({});
    const result = await check();

    expect(result.status).toBe(200);
    expect(result.components).toEqual({});
  });

  it('skips unconfigured components without failing', async () => {
    const redis = { ping: vi.fn<() => Promise<string>>().mockResolvedValue('PONG') };

    const check = createReadinessCheck({ redis });
    const result = await check();

    expect(result.status).toBe(200);
    expect(result.components).toEqual({ redis: 'ok' });
    expect(result.components['postgres']).toBeUndefined();
  });
});
