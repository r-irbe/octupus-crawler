// tRPC router unit tests
// Validates: REQ-COMM-001 (type-safe RPC), REQ-COMM-002 (input validation), REQ-COMM-003 (auth middleware)

import { describe, it, expect } from 'vitest';
import { appRouter } from './router.js';
import { createContext, type CrawlService } from './trpc.js';

function createMockService(overrides?: Partial<CrawlService>): CrawlService {
  return {
    submit: overrides?.submit ?? ((input) =>
      Promise.resolve({
        jobId: 'job-123',
        urlCount: input.urls.length,
      })),
    getStatus: overrides?.getStatus ?? (() =>
      Promise.resolve({
        jobId: 'job-123',
        status: 'running',
        urlsTotal: 10,
        urlsCrawled: 5,
        urlsFailed: 0,
      })),
  };
}

const caller = (opts: { userId?: string; service?: CrawlService }): ReturnType<typeof appRouter.createCaller> =>
  appRouter.createCaller(createContext({
    userId: opts.userId,
    crawlService: opts.service ?? createMockService(),
  }));

describe('crawl.submit', () => {
  // Validates REQ-COMM-003: protected procedure rejects unauthenticated
  it('rejects unauthenticated requests', async () => {
    const c = caller({ service: createMockService() });
    await expect(
      c.crawl.submit({ urls: ['https://example.com'] }),
    ).rejects.toThrow('Authentication required');
  });

  // Validates REQ-COMM-001: authenticated submit succeeds
  it('accepts authenticated requests', async () => {
    const c = caller({ userId: 'user-1', service: createMockService() });
    const result = await c.crawl.submit({ urls: ['https://example.com'] });
    expect(result).toEqual({
      jobId: 'job-123',
      urlCount: 1,
      status: 'queued',
    });
  });

  // Validates REQ-COMM-002: Zod validates URL format
  it('rejects invalid URLs', async () => {
    const c = caller({ userId: 'user-1', service: createMockService() });
    await expect(
      c.crawl.submit({ urls: ['not-a-url'] }),
    ).rejects.toThrow();
  });

  // Validates REQ-COMM-002: empty URL array rejected
  it('rejects empty URL array', async () => {
    const c = caller({ userId: 'user-1', service: createMockService() });
    await expect(
      c.crawl.submit({ urls: [] }),
    ).rejects.toThrow();
  });

  // Validates REQ-COMM-002: applies defaults for optional fields
  it('applies default values for maxDepth and maxConcurrent', async () => {
    let capturedInput: Record<string, unknown> | undefined;
    const service = createMockService({
      submit: (input) => {
        capturedInput = input as unknown as Record<string, unknown>;
        return Promise.resolve({ jobId: 'job-456', urlCount: 1 });
      },
    });
    const c = caller({ userId: 'user-1', service });
    await c.crawl.submit({ urls: ['https://example.com'] });
    expect(capturedInput?.['maxDepth']).toBe(3);
    expect(capturedInput?.['maxConcurrent']).toBe(10);
  });
});

describe('crawl.status', () => {
  // Validates REQ-COMM-001: status query returns job info
  it('returns status for existing job', async () => {
    const c = caller({ service: createMockService() });
    const result = await c.crawl.status({ jobId: 'job-123' });
    expect(result.status).toBe('running');
    expect(result.urlsTotal).toBe(10);
  });

  // Validates REQ-COMM-001: throws NOT_FOUND for missing job
  it('throws NOT_FOUND for missing job', async () => {
    const service = createMockService({
      getStatus: () => Promise.resolve(undefined),
    });
    const c = caller({ service });
    await expect(
      c.crawl.status({ jobId: 'nonexistent' }),
    ).rejects.toThrow('not found');
  });

  // Validates REQ-COMM-001: public procedure allows unauthenticated access
  it('does not require authentication', async () => {
    const c = caller({ service: createMockService() });
    const result = await c.crawl.status({ jobId: 'job-123' });
    expect(result.jobId).toBe('job-123');
  });

  // Validates REQ-COMM-002: rejects empty jobId
  it('rejects empty jobId', async () => {
    const c = caller({ service: createMockService() });
    await expect(
      c.crawl.status({ jobId: '' }),
    ).rejects.toThrow();
  });
});

describe('health.check', () => {
  // Validates REQ-COMM-001: health endpoint returns ok
  it('returns ok status', async () => {
    const c = caller({ service: createMockService() });
    const result = await c.health.check();
    expect(result).toEqual({ status: 'ok' });
  });

  // Validates REQ-COMM-001: public procedure, no auth
  it('does not require authentication', async () => {
    const c = caller({ service: createMockService() });
    const result = await c.health.check();
    expect(result.status).toBe('ok');
  });
});
