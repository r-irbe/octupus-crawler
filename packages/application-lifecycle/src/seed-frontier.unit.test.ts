// Validates REQ-LIFE-007: Invalid seed URL skipped with warning
// Validates REQ-LIFE-008: Valid seeds enqueued at depth 0
// Validates REQ-LIFE-009: Enqueue failures logged
// Validates REQ-LIFE-010: Frontier size metric recorded after seeding

import { describe, it, expect } from 'vitest';
import type { Result } from 'neverthrow';
import { ok, err } from 'neverthrow';
import type { Frontier, FrontierEntry, FrontierSize } from '@ipf/core/contracts/frontier';
import type { QueueError } from '@ipf/core/errors/queue-error';
import type { Logger } from '@ipf/core/contracts/logger';
import type { CrawlMetrics } from '@ipf/core/contracts/crawl-metrics';
import type { CrawlUrl } from '@ipf/core/domain/crawl-url';
import type { UrlError } from '@ipf/core/errors/url-error';
import type { AsyncResult } from '@ipf/core/types/result';
import { seedFrontier, parseSeedUrls } from './seed-frontier.js';
import type { SeedDeps } from './seed-frontier.js';

function recLogger(): Logger & { calls: { method: string; msg: string }[] } {
  const calls: { method: string; msg: string }[] = [];
  const make = (method: string) =>
    (msg: string): void => { calls.push({ method, msg }); };
  return {
    calls,
    debug: make('debug'), info: make('info'), warn: make('warn'),
    error: make('error'), fatal: make('fatal'),
    child: () => recLogger(),
  } as Logger & { calls: { method: string; msg: string }[] };
}

function stubMetrics(): CrawlMetrics & { frontierSize: number | undefined } {
  const state = { frontierSize: undefined as number | undefined };
  return {
    get frontierSize(): number | undefined { return state.frontierSize; },
    recordFetch: (): void => undefined,
    recordFetchDuration: (): void => undefined,
    recordUrlsDiscovered: (): void => undefined,
    setFrontierSize: (n: number): void => { state.frontierSize = n; },
    setStalledJobs: (): void => undefined,
    setActiveJobs: (): void => undefined,
    setWorkerUtilization: (): void => undefined,
    incrementCoordinatorRestarts: (): void => undefined,
  };
}

function stubFrontier(
  enqueueReturn: number | QueueError = 2,
  sizeReturn: FrontierSize = { pending: 2, active: 0, total: 2 },
): Frontier & { enqueued: FrontierEntry[][] } {
  const enqueued: FrontierEntry[][] = [];
  return {
    enqueued,
    enqueue: (entries: FrontierEntry[]): AsyncResult<number, QueueError> => {
      enqueued.push(entries);
      if (typeof enqueueReturn === 'number') {
        return Promise.resolve(ok(enqueueReturn));
      }
      return Promise.resolve(err(enqueueReturn));
    },
    size: (): AsyncResult<FrontierSize, QueueError> => Promise.resolve(ok(sizeReturn)),
    close: (): Promise<void> => Promise.resolve(),
  };
}

function stubParser(validUrls: Set<string>): (raw: string) => Result<CrawlUrl, UrlError> {
  return (raw: string) => {
    if (validUrls.has(raw)) {
      return ok({
        _brand: 'CrawlUrl' as const,
        raw,
        normalized: raw,
        domain: new URL(raw).hostname,
      });
    }
    return err({ kind: 'invalid_url' as const, raw, reason: 'bad', message: `Invalid: ${raw}` });
  };
}

function buildDeps(overrides: Partial<SeedDeps> = {}): SeedDeps {
  return {
    frontier: stubFrontier(),
    logger: recLogger(),
    metrics: stubMetrics(),
    parseCrawlUrl: stubParser(new Set(['https://a.com', 'https://b.com'])),
    ...overrides,
  };
}

describe('seedFrontier', () => {
  it('enqueues valid seeds at depth 0 (REQ-LIFE-008)', async () => {
    const frontier = stubFrontier();
    const deps = buildDeps({ frontier });
    await seedFrontier(['https://a.com', 'https://b.com'], deps);

    expect(frontier.enqueued).toHaveLength(1);
    const entries = frontier.enqueued[0];
    expect(entries).toBeDefined();
    expect(entries).toHaveLength(2);
    expect(entries?.[0]?.depth).toBe(0);
    expect(entries?.[1]?.depth).toBe(0);
  });

  it('skips invalid seeds with warning (REQ-LIFE-007)', async () => {
    const logger = recLogger();
    const deps = buildDeps({ logger });
    await seedFrontier(['https://a.com', 'bad-url', 'https://b.com'], deps);

    const warnCalls = logger.calls.filter((c) => c.method === 'warn');
    expect(warnCalls.some((c) => c.msg === 'Invalid seed URL, skipping')).toBe(true);
  });

  it('logs enqueue failure (REQ-LIFE-009)', async () => {
    const queueErr: QueueError = { kind: 'queue_error', operation: 'enqueue', cause: 'fail', message: 'Queue error during enqueue: fail' };
    const frontier = stubFrontier(queueErr);
    const logger = recLogger();
    const deps = buildDeps({ frontier, logger });
    await seedFrontier(['https://a.com'], deps);

    const errorCalls = logger.calls.filter((c) => c.method === 'error');
    expect(errorCalls.some((c) => c.msg === 'Seed enqueue failed')).toBe(true);
  });

  it('records frontier size metric after seeding (REQ-LIFE-010)', async () => {
    const metrics = stubMetrics();
    const deps = buildDeps({ metrics });
    await seedFrontier(['https://a.com'], deps);

    expect(metrics.frontierSize).toBe(2);
  });

  it('handles all-invalid seeds gracefully', async () => {
    const frontier = stubFrontier();
    const logger = recLogger();
    const deps = buildDeps({ frontier, logger });
    await seedFrontier(['bad1', 'bad2'], deps);

    expect(frontier.enqueued).toHaveLength(0);
    const warnCalls = logger.calls.filter((c) => c.method === 'warn');
    expect(warnCalls.some((c) => c.msg === 'No valid seed URLs to enqueue')).toBe(true);
  });
});

describe('parseSeedUrls', () => {
  it('splits comma-separated URLs', () => {
    expect(parseSeedUrls('https://a.com, https://b.com')).toStrictEqual(['https://a.com', 'https://b.com']);
  });

  it('handles empty string', () => {
    expect(parseSeedUrls('')).toStrictEqual([]);
  });

  it('trims whitespace', () => {
    expect(parseSeedUrls('  https://a.com , https://b.com  ')).toStrictEqual(['https://a.com', 'https://b.com']);
  });
});
