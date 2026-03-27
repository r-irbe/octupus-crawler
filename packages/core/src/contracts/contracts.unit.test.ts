// Validates REQ-ARCH-002: Contract interfaces — pure type boundary (zero runtime code)
// Validates REQ-ARCH-009: Stateful contracts provide deterministic cleanup
// Validates REQ-ARCH-010: I/O-bound contracts use async, CPU-bound use sync
import { describe, it, expect } from 'vitest';
import { ok } from 'neverthrow';
import type { Frontier, FrontierEntry, FrontierSize } from './frontier.js';
import type { Fetcher, FetchConfig, FetchResult } from './fetcher.js';
import type { Logger } from './logger.js';
import type { CrawlMetrics } from './crawl-metrics.js';
import type { JobConsumer } from './job-consumer.js';
import type { JobEventSource } from './job-event-source.js';
import type { LinkExtractor } from './link-extractor.js';
import type { ControlPlane, CrawlState, CrawlProgress } from './control-plane.js';
import type { CrawlUrl } from '../domain/crawl-url.js';

// Validates REQ-ARCH-002, REQ-ARCH-009: Frontier — async, disposable
describe('Frontier contract', () => {
  it('can be implemented with enqueue, size, close', async () => {
    const frontier: Frontier = {
      enqueue: (_entries: FrontierEntry[]) => Promise.resolve(ok(1)),
      size: () => Promise.resolve(ok({ pending: 0, active: 0, total: 0 } satisfies FrontierSize)),
      close: () => Promise.resolve(),
    };
    const enqueueResult = await frontier.enqueue([]);
    expect(enqueueResult.isOk()).toBe(true);
    const sizeResult = await frontier.size();
    expect(sizeResult.isOk()).toBe(true);
  });
});

// Validates REQ-ARCH-002, REQ-ARCH-010: Fetcher — async with typed error
describe('Fetcher contract', () => {
  it('can be implemented with fetch returning Result', async () => {
    const fetcher: Fetcher = {
      fetch: (_url: CrawlUrl, _config: FetchConfig) =>
        Promise.resolve(ok({ statusCode: 200, body: '<html/>', headers: {}, url: 'https://example.com' } satisfies FetchResult)),
    };
    const result = await fetcher.fetch(
      { _brand: 'CrawlUrl', raw: 'u', normalized: 'u', domain: 'd' } as CrawlUrl,
      { timeoutMs: 5000, maxRedirects: 5, maxBodyBytes: 1_000_000 },
    );
    expect(result.isOk()).toBe(true);
  });
});

// Validates REQ-ARCH-002, REQ-ARCH-010: Logger — synchronous
describe('Logger contract', () => {
  it('can be implemented with 5 levels and child', () => {
    const logs: string[] = [];
    const logger: Logger = {
      debug: (msg: string) => { logs.push(msg); },
      info: (msg: string) => { logs.push(msg); },
      warn: (msg: string) => { logs.push(msg); },
      error: (msg: string) => { logs.push(msg); },
      fatal: (msg: string) => { logs.push(msg); },
      child: (_bindings: Record<string, unknown>) => logger,
    };
    logger.info('test');
    expect(logs).toContain('test');
  });
});

// Validates REQ-ARCH-002, REQ-ARCH-010: CrawlMetrics — synchronous
describe('CrawlMetrics contract', () => {
  it('can be implemented with all metric methods', () => {
    const metrics: CrawlMetrics = {
      recordFetch: (_status: string, _errorKind?: string) => {},
      recordFetchDuration: (_seconds: number) => {},
      recordUrlsDiscovered: (_count: number) => {},
      setFrontierSize: (_size: number) => {},
      setStalledJobs: (_count: number) => {},
      setActiveJobs: (_count: number) => {},
      setWorkerUtilization: (_ratio: number) => {},
      incrementCoordinatorRestarts: () => {},
    };
    metrics.recordFetch('200');
    metrics.recordFetchDuration(0.5);
    metrics.recordUrlsDiscovered(10);
    expect(true).toBe(true);
  });
});

// Validates REQ-ARCH-002, REQ-ARCH-009: JobConsumer — async, disposable
describe('JobConsumer contract', () => {
  it('can be implemented with start and close', async () => {
    let started = false;
    const consumer: JobConsumer = {
      start: () => { started = true; return Promise.resolve(); },
      close: (_timeout?: number) => Promise.resolve(),
    };
    await consumer.start();
    expect(started).toBe(true);
    await consumer.close();
  });
});

// Validates REQ-ARCH-002, REQ-ARCH-009: JobEventSource — event-driven, disposable
describe('JobEventSource contract', () => {
  it('can be implemented with event handlers and close', () => {
    const handlers: string[] = [];
    const source: JobEventSource = {
      onActive: (handler) => { handlers.push('active'); handler('job-0'); },
      onCompleted: (handler) => { handlers.push('completed'); handler('job-1'); },
      onFailed: (handler) => { handlers.push('failed'); handler('job-2', new Error('e')); },
      onStalled: (handler) => { handlers.push('stalled'); handler('job-3'); },
      close: () => Promise.resolve(),
    };
    source.onCompleted(() => {});
    expect(handlers).toContain('completed');
  });
});

// Validates REQ-ARCH-002, REQ-ARCH-010: LinkExtractor — synchronous
describe('LinkExtractor contract', () => {
  it('can be implemented with synchronous extract', () => {
    const extractor: LinkExtractor = {
      extract: (_html: string, _baseUrl: string) => ['https://example.com/a', 'https://example.com/b'],
    };
    const links = extractor.extract('<html/>', 'https://example.com');
    expect(links).toHaveLength(2);
  });
});

// Validates REQ-ARCH-002, REQ-ARCH-009: ControlPlane — async, disposable
describe('ControlPlane contract', () => {
  it('can be implemented with state management methods', async () => {
    const plane: ControlPlane = {
      getState: () => Promise.resolve(ok('running' as CrawlState)),
      pause: () => Promise.resolve(ok(undefined)),
      resume: () => Promise.resolve(ok(undefined)),
      cancel: () => Promise.resolve(ok(undefined)),
      getProgress: () => Promise.resolve(ok({ completed: 10, failed: 1, pending: 5, total: 16 } satisfies CrawlProgress)),
      close: () => Promise.resolve(),
    };
    const state = await plane.getState();
    expect(state.isOk()).toBe(true);
    const progress = await plane.getProgress();
    expect(progress.isOk()).toBe(true);
  });
});
