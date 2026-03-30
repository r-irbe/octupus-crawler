// Validates T-RES-017 (REQ-RES-001, REQ-RES-018, REQ-RES-019)
// Resilient fetcher: rate limit pre-check + cockatiel policy wrapping

import { describe, it, expect, vi } from 'vitest';
import { Readable } from 'node:stream';
import { resilientFetch, type FetchPolicyPort } from './resilient-fetcher.js';
import type { HttpClient, FetcherConfig } from './http-fetcher.js';

const BASE_CONFIG: FetcherConfig = {
  userAgent: 'test-bot/1.0',
  timeoutMs: 5_000,
  maxRedirects: 5,
  maxBodyBytes: 1_048_576,
};

function bodyFrom(text: string): Readable {
  return Readable.from([Buffer.from(text, 'utf-8')]);
}

function makeClient(
  handler: (url: string) => { statusCode: number; headers: Record<string, string>; body: Readable },
): HttpClient {
  return { request: (url: string) => Promise.resolve(handler(url)) };
}

function passAllValidator(): (_url: URL) => Promise<null> {
  return () => Promise.resolve(null);
}

function makePolicy(overrides: Partial<FetchPolicyPort> = {}): FetchPolicyPort {
  return {
    checkRateLimit: vi.fn(() => true),
    getPolicy: vi.fn(() => ({
      execute: <T>(fn: () => Promise<T>): Promise<T> => fn(),
    })),
    ...overrides,
  };
}

describe('resilientFetch', () => {
  it('returns rate_limited error when token bucket rejects', async () => {
    // Validates REQ-RES-019: per-domain rate limiting
    const policy = makePolicy({ checkRateLimit: vi.fn(() => false) });
    const client = makeClient(() => ({
      statusCode: 200,
      headers: { 'content-type': 'text/html' },
      body: bodyFrom('ok'),
    }));

    const result = await resilientFetch(
      'https://example.com/page',
      'example.com',
      client,
      BASE_CONFIG,
      passAllValidator(),
      policy,
    );

    expect(result.isErr()).toBe(true);
    if (result.isErr()) {
      expect(result.error.kind).toBe('rate_limited');
      if (result.error.kind === 'rate_limited') {
        expect(result.error.domain).toBe('example.com');
      }
    }
    expect(policy.checkRateLimit).toHaveBeenCalledWith('example.com');
  });

  it('executes fetch through policy when rate limit passes', async () => {
    // Validates REQ-RES-018: policies composed via cockatiel wrap()
    let executeCalled = false;
    const policy: FetchPolicyPort = {
      checkRateLimit: vi.fn(() => true),
      getPolicy: () => ({
        execute: <T>(fn: () => Promise<T>): Promise<T> => { executeCalled = true; return fn(); },
      }),
    };
    const client = makeClient(() => ({
      statusCode: 200,
      headers: { 'content-type': 'text/html' },
      body: bodyFrom('<html>hello</html>'),
    }));

    const result = await resilientFetch(
      'https://example.com/',
      'example.com',
      client,
      BASE_CONFIG,
      passAllValidator(),
      policy,
    );

    expect(result.isOk()).toBe(true);
    if (result.isOk()) {
      expect(result.value.statusCode).toBe(200);
    }
    expect(executeCalled).toBe(true);
  });

  it('catches cockatiel policy errors as network errors', async () => {
    // Validates REQ-RES-001: resilience wrapping converts policy failures
    const policy: FetchPolicyPort = {
      checkRateLimit: () => true,
      getPolicy: () => ({
        execute: (): never => { throw new Error('BrokenCircuitError'); },
      }),
    };
    const client = makeClient(() => ({
      statusCode: 200,
      headers: {},
      body: bodyFrom('ok'),
    }));

    const result = await resilientFetch(
      'https://example.com/',
      'example.com',
      client,
      BASE_CONFIG,
      passAllValidator(),
      policy,
    );

    expect(result.isErr()).toBe(true);
    if (result.isErr()) {
      expect(result.error.kind).toBe('network');
      expect(result.error.message).toContain('Resilience policy rejected');
    }
  });

  it('passes through httpFetch errors from within policy', async () => {
    // Validates that inner fetch errors propagate correctly
    const policy = makePolicy();
    const client = makeClient(() => {
      throw new Error('ECONNREFUSED');
    });

    const result = await resilientFetch(
      'https://example.com/',
      'example.com',
      client,
      BASE_CONFIG,
      passAllValidator(),
      policy,
    );

    expect(result.isErr()).toBe(true);
    if (result.isErr()) {
      expect(result.error.kind).toBe('network');
    }
  });
});
