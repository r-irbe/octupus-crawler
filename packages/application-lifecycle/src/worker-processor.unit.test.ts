// Validates REQ-LIFE-025: Job payload validated at runtime
// Validates REQ-LIFE-026: queue_error re-thrown for retry
// Validates REQ-LIFE-027: Metrics recorded for success and failure

import { describe, it, expect } from 'vitest';
import { ok, err } from 'neverthrow';
import type { Logger } from '@ipf/core/contracts/logger';
import type { CrawlMetrics } from '@ipf/core/contracts/crawl-metrics';
import type { CrawlError } from '@ipf/core/errors/crawl-error';
import { createWorkerProcessor } from './worker-processor.js';
import type { WorkerProcessorDeps, PipelineExecutor } from './worker-processor.js';

function recLogger(): Logger {
  const noop = (): void => undefined;
  return {
    debug: noop, info: noop, warn: noop, error: noop, fatal: noop,
    child: () => recLogger(),
  } as Logger;
}

function recMetrics(): CrawlMetrics & { fetchCalls: { status: string; kind?: string }[] } {
  const fetchCalls: { status: string; kind?: string }[] = [];
  return {
    fetchCalls,
    recordFetch: (status: string, kind?: string): void => {
      if (kind !== undefined) {
        fetchCalls.push({ status, kind });
      } else {
        fetchCalls.push({ status });
      }
    },
    recordFetchDuration: (): void => undefined,
    recordUrlsDiscovered: (): void => undefined,
    setFrontierSize: (): void => undefined,
    setStalledJobs: (): void => undefined,
    setActiveJobs: (): void => undefined,
    setWorkerUtilization: (): void => undefined,
    incrementCoordinatorRestarts: (): void => undefined,
  };
}

function buildDeps(executor: PipelineExecutor): WorkerProcessorDeps & { metrics: ReturnType<typeof recMetrics> } {
  const metrics = recMetrics();
  return {
    logger: recLogger(),
    metrics,
    executePipeline: executor,
  };
}

describe('WorkerProcessor', () => {
  describe('payload validation (REQ-LIFE-025)', () => {
    it('rejects invalid payload', async () => {
      const deps = buildDeps(() => Promise.resolve(ok({ discoveredCount: 0 })));
      const processor = createWorkerProcessor(deps);

      const result = await processor.processJob({ notUrl: true });
      expect(result._tag).toBe('ValidationError');
    });

    it('rejects missing url', async () => {
      const deps = buildDeps(() => Promise.resolve(ok({ discoveredCount: 0 })));
      const processor = createWorkerProcessor(deps);

      const result = await processor.processJob({ depth: 1 });
      expect(result._tag).toBe('ValidationError');
    });
  });

  describe('successful processing (REQ-LIFE-027)', () => {
    it('returns Success and records fetch metric', async () => {
      const deps = buildDeps(() => Promise.resolve(ok({ discoveredCount: 5 })));
      const processor = createWorkerProcessor(deps);

      const result = await processor.processJob({ url: 'https://a.com', depth: 0 });
      expect(result._tag).toBe('Success');
      if (result._tag === 'Success') {
        expect(result.discoveredCount).toBe(5);
      }
      expect(deps.metrics.fetchCalls).toStrictEqual([{ status: 'success' }]);
    });
  });

  describe('queue_error (REQ-LIFE-026)', () => {
    it('returns QueueError for queue_error kind', async () => {
      const queueError: CrawlError = {
        kind: 'queue_error',
        operation: 'enqueue',
        cause: 'fail',
        message: 'Queue error',
      };
      const deps = buildDeps(() => Promise.resolve(err(queueError)));
      const processor = createWorkerProcessor(deps);

      const result = await processor.processJob({ url: 'https://a.com', depth: 0 });
      expect(result._tag).toBe('QueueError');
      expect(deps.metrics.fetchCalls).toStrictEqual([{ status: 'error', kind: 'queue_error' }]);
    });
  });

  describe('pipeline error (REQ-LIFE-027)', () => {
    it('returns PipelineError and records failure metric', async () => {
      const fetchErr: CrawlError = {
        kind: 'timeout',
        url: 'https://a.com',
        timeoutMs: 30000,
        message: 'Timeout',
      };
      const deps = buildDeps(() => Promise.resolve(err(fetchErr)));
      const processor = createWorkerProcessor(deps);

      const result = await processor.processJob({ url: 'https://a.com', depth: 0 });
      expect(result._tag).toBe('PipelineError');
      expect(deps.metrics.fetchCalls).toStrictEqual([{ status: 'error', kind: 'timeout' }]);
    });
  });
});
