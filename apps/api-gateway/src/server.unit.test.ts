// Unit tests for API Gateway server — tRPC wiring + health check
// Validates: REQ-COMM-001 (tRPC type-safe RPC)
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { createServer } from './server.js';
import type { CrawlService } from '@ipf/api-router/trpc';

const stubCrawlService: CrawlService = {
  submit: (input) => Promise.resolve({
    jobId: 'test-job-123',
    urlCount: input.urls.length,
  }),
  getStatus: (jobId) => {
    if (jobId === 'test-job-123') {
      return Promise.resolve({
        jobId: 'test-job-123',
        status: 'queued' as const,
        urlsTotal: 2,
        urlsCrawled: 0,
        urlsFailed: 0,
      });
    }
    return Promise.resolve(undefined);
  },
};

describe('api-gateway server', () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = await createServer({
      host: '127.0.0.1',
      port: 0,
      crawlService: stubCrawlService,
      logLevel: 'silent',
    });
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
  });

  // Validates REQ-COMM-001: tRPC routes are accessible via HTTP
  it('health check returns ok', async () => {
    const res = await app.inject({ method: 'GET', url: '/health' });
    expect(res.statusCode).toBe(200);
    const body: unknown = JSON.parse(res.payload);
    expect(body).toEqual({ status: 'ok' });
  });

  // Validates REQ-COMM-001: tRPC health.check procedure accessible via Fastify
  it('tRPC health.check returns ok', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/trpc/health.check',
    });
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.payload) as { result: { data: unknown } };
    expect(body.result.data).toEqual({ status: 'ok' });
  });

  // Validates REQ-COMM-001: tRPC crawl.status query works
  it('tRPC crawl.status returns job status', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/trpc/crawl.status?input=%7B%22jobId%22%3A%22test-job-123%22%7D',
    });
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.payload) as {
      result: { data: { jobId: string; status: string } };
    };
    expect(body.result.data.jobId).toBe('test-job-123');
    expect(body.result.data.status).toBe('queued');
  });

  // Validates REQ-COMM-003: protected procedures require auth
  it('tRPC crawl.submit rejects unauthenticated requests', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/trpc/crawl.submit',
      headers: { 'content-type': 'application/json' },
      payload: JSON.stringify({
        urls: ['https://example.com'],
      }),
    });
    expect(res.statusCode).toBe(401);
  });

  // Validates REQ-COMM-001 + REQ-COMM-003: authenticated submit succeeds
  it('tRPC crawl.submit succeeds with auth header', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/trpc/crawl.submit',
      headers: {
        'content-type': 'application/json',
        'x-user-id': 'user-001',
      },
      payload: JSON.stringify({
        urls: ['https://example.com', 'https://example.org'],
      }),
    });
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.payload) as {
      result: { data: { jobId: string; urlCount: number; status: string } };
    };
    expect(body.result.data.jobId).toBe('test-job-123');
    expect(body.result.data.urlCount).toBe(2);
    expect(body.result.data.status).toBe('queued');
  });

  // Validates REQ-COMM-001: crawl.status returns NOT_FOUND for unknown job
  it('tRPC crawl.status returns NOT_FOUND for nonexistent job', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/trpc/crawl.status?input=%7B%22jobId%22%3A%22nonexistent%22%7D',
    });
    const body = JSON.parse(res.payload) as { error: { data: { code: string } } };
    expect(body.error.data.code).toBe('NOT_FOUND');
  });

  // Validates REQ-COMM-001: tRPC mount path uses /api/v1/ prefix
  it('tRPC is mounted under /api/v1/trpc prefix', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/trpc/health.check',
    });
    expect(res.statusCode).toBe(200);

    // Non-prefixed path should 404
    const res2 = await app.inject({
      method: 'GET',
      url: '/trpc/health.check',
    });
    expect(res2.statusCode).toBe(404);
  });
});
