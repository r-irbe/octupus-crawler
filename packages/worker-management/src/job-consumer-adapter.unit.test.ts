// JobConsumerAdapter unit tests
// Validates: REQ-DIST-007 (concurrency), REQ-DIST-009 (event ordering),
//            REQ-DIST-010 (start guard), REQ-DIST-011 (utilization tracking)
// Tasks: T-WORK-008

import { describe, it, expect, vi } from 'vitest';
import type { JobConsumer } from '@ipf/core/contracts/job-consumer';
import type { JobEventSource } from '@ipf/core/contracts/job-event-source';
import type { CrawlMetrics } from '@ipf/core/contracts/crawl-metrics';
import { JobConsumerAdapter } from './job-consumer-adapter.js';
import { createStalledJobConfig } from './stalled-job-config.js';

type Handler = (jobId: string) => void;
type ErrorHandler = (jobId: string, error: unknown) => void;

function createMockEventSource(): JobEventSource & {
  _handlers: { active: Handler[]; completed: Handler[]; failed: ErrorHandler[]; stalled: Handler[] };
  fireActive: (id: string) => void;
  fireCompleted: (id: string) => void;
  fireFailed: (id: string, err: unknown) => void;
  fireStalled: (id: string) => void;
} {
  const handlers = {
    active: [] as Handler[],
    completed: [] as Handler[],
    failed: [] as ErrorHandler[],
    stalled: [] as Handler[],
  };
  return {
    _handlers: handlers,
    onActive(h: Handler): void { handlers.active.push(h); },
    onCompleted(h: Handler): void { handlers.completed.push(h); },
    onFailed(h: ErrorHandler): void { handlers.failed.push(h); },
    onStalled(h: Handler): void { handlers.stalled.push(h); },
    fireActive(id: string): void { handlers.active.forEach((h) => { h(id); }); },
    fireCompleted(id: string): void { handlers.completed.forEach((h) => { h(id); }); },
    fireFailed(id: string, err: unknown): void { handlers.failed.forEach((h) => { h(id, err); }); },
    fireStalled(id: string): void { handlers.stalled.forEach((h) => { h(id); }); },
    async close(): Promise<void> { /* noop */ },
  };
}

function createMockConsumer(): JobConsumer & { started: boolean } {
  return {
    started: false,
    start(): Promise<void> { this.started = true; return Promise.resolve(); },
    close(): Promise<void> { this.started = false; return Promise.resolve(); },
  };
}

function createMockMetrics(): CrawlMetrics {
  return {
    recordFetch: vi.fn(),
    recordFetchDuration: vi.fn(),
    recordUrlsDiscovered: vi.fn(),
    setFrontierSize: vi.fn(),
    setStalledJobs: vi.fn(),
    setActiveJobs: vi.fn(),
    setWorkerUtilization: vi.fn(),
    incrementCoordinatorRestarts: vi.fn(),
  };
}

function createAdapter(): {
  adapter: JobConsumerAdapter;
  events: ReturnType<typeof createMockEventSource>;
  consumer: ReturnType<typeof createMockConsumer>;
  metrics: CrawlMetrics;
} {
  const events = createMockEventSource();
  const consumer = createMockConsumer();
  const metrics = createMockMetrics();
  const adapter = new JobConsumerAdapter({
    consumer,
    events,
    metrics,
    maxConcurrency: 4,
    stalledConfig: createStalledJobConfig(),
  });
  return { adapter, events, consumer, metrics };
}

describe('JobConsumerAdapter', () => {
  // T-WORK-008: start guard
  describe('start guard (REQ-DIST-010)', () => {
    it('starts successfully on first call', async () => {
      const { adapter, consumer } = createAdapter();
      await adapter.start();
      expect(adapter.state).toBe('started');
      expect(consumer.started).toBe(true);
    });

    it('throws on second start call', async () => {
      const { adapter } = createAdapter();
      await adapter.start();
      await expect(adapter.start()).rejects.toThrow('already started');
    });

    it('throws when starting after close', async () => {
      const { adapter } = createAdapter();
      await adapter.start();
      await adapter.close();
      await expect(adapter.start()).rejects.toThrow('closed');
    });
  });

  // T-WORK-005: event listeners registered before start
  describe('event registration (REQ-DIST-009)', () => {
    it('registers all event handlers in constructor before start', () => {
      const { events } = createAdapter();
      expect(events._handlers.active.length).toBe(1);
      expect(events._handlers.completed.length).toBe(1);
      expect(events._handlers.failed.length).toBe(1);
      expect(events._handlers.stalled.length).toBe(1);
    });
  });

  // T-WORK-002: lifecycle events wired to tracker
  describe('utilization tracking (REQ-DIST-011)', () => {
    it('increments tracker on active event', () => {
      const { adapter, events } = createAdapter();
      events.fireActive('job-1');
      expect(adapter.tracker.activeJobs).toBe(1);
    });

    it('decrements tracker on completed event', () => {
      const { adapter, events } = createAdapter();
      events.fireActive('job-1');
      events.fireCompleted('job-1');
      expect(adapter.tracker.activeJobs).toBe(0);
      expect(adapter.processedTotal).toBe(1);
    });

    it('decrements tracker on failed event', () => {
      const { adapter, events } = createAdapter();
      events.fireActive('job-1');
      events.fireFailed('job-1', new Error('boom'));
      expect(adapter.tracker.activeJobs).toBe(0);
      expect(adapter.failedTotal).toBe(1);
    });

    it('decrements tracker on stalled event', () => {
      const { adapter, events } = createAdapter();
      events.fireActive('job-1');
      events.fireStalled('job-1');
      expect(adapter.tracker.activeJobs).toBe(0);
      expect(adapter.stalledTotal).toBe(1);
    });

    it('pushes metrics on each event', () => {
      const { events, metrics } = createAdapter();
      events.fireActive('job-1');
      expect(metrics.setActiveJobs).toHaveBeenCalledWith(1);
      expect(metrics.setWorkerUtilization).toHaveBeenCalledWith(0.25);
    });
  });

  describe('close', () => {
    it('closes consumer and events', async () => {
      const { adapter } = createAdapter();
      await adapter.start();
      await adapter.close();
      expect(adapter.state).toBe('closed');
    });

    it('is idempotent', async () => {
      const { adapter } = createAdapter();
      await adapter.start();
      await adapter.close();
      await adapter.close(); // no throw
      expect(adapter.state).toBe('closed');
    });
  });
});
