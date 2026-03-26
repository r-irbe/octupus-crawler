// Validates T-FETCH-019 to 021, T-FETCH-024, T-FETCH-034 to 036
// REQ-FETCH-004 to 008, REQ-FETCH-019, REQ-FETCH-022 to 024

import { describe, it, expect } from 'vitest';
import { Readable } from 'node:stream';
import { httpFetch } from './http-fetcher.js';
import type { HttpClient, FetcherConfig } from './http-fetcher.js';
import type { SsrfValidationResult } from '@ipf/ssrf-guard/ssrf-types';
import type { FetchMetrics } from './fetch-types.js';

// --- Test helpers ---

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
  return {
    request: (url: string) => Promise.resolve(handler(url)),
  };
}

function passAllValidator(): (_url: URL) => Promise<SsrfValidationResult | null> {
  return () => Promise.resolve(null);
}

function spyMetrics(): FetchMetrics & {
  calls: { fn: string; args: unknown[] }[];
} {
  const calls: { fn: string; args: unknown[] }[] = [];
  return {
    calls,
    recordFetch: (...args: unknown[]) => { calls.push({ fn: 'recordFetch', args }); },
    recordDuration: (...args: unknown[]) => { calls.push({ fn: 'recordDuration', args }); },
    recordRedirect: (...args: unknown[]) => { calls.push({ fn: 'recordRedirect', args }); },
    recordBodyBytes: (...args: unknown[]) => { calls.push({ fn: 'recordBodyBytes', args }); },
  };
}

// --- T-FETCH-019: Redirect chain ---

describe('httpFetch redirects', () => {
  it('follows redirect chain and records final URL', async () => {
    const client = makeClient((url) => {
      if (url === 'https://a.com/') {
        return { statusCode: 301, headers: { location: 'https://b.com/' }, body: bodyFrom('') };
      }
      return { statusCode: 200, headers: {}, body: bodyFrom('done') };
    });

    const result = await httpFetch('https://a.com/', client, BASE_CONFIG, passAllValidator());
    expect(result.isOk()).toBe(true);
    if (result.isOk()) {
      expect(result.value.finalUrl).toBe('https://b.com/');
      expect(result.value.body).toBe('done');
    }
  });

  it('returns too_many_redirects when limit exceeded', async () => {
    const client = makeClient(() => ({
      statusCode: 302,
      headers: { location: 'https://loop.com/' },
      body: bodyFrom(''),
    }));

    const config = { ...BASE_CONFIG, maxRedirects: 2 };
    const result = await httpFetch('https://loop.com/', client, config, passAllValidator());
    expect(result.isErr()).toBe(true);
    if (result.isErr()) {
      expect(result.error.kind).toBe('too_many_redirects');
    }
  });

  // T-FETCH-020: Relative Location resolution
  it('resolves relative Location headers', async () => {
    const client = makeClient((url) => {
      if (url === 'https://example.com/old') {
        return { statusCode: 301, headers: { location: '/new' }, body: bodyFrom('') };
      }
      return { statusCode: 200, headers: {}, body: bodyFrom('resolved') };
    });

    const result = await httpFetch('https://example.com/old', client, BASE_CONFIG, passAllValidator());
    expect(result.isOk()).toBe(true);
    if (result.isOk()) {
      expect(result.value.finalUrl).toBe('https://example.com/new');
    }
  });

  // T-FETCH-021: 3xx without Location
  it('returns http error for redirect without Location header', async () => {
    const client = makeClient(() => ({
      statusCode: 301,
      headers: {},
      body: bodyFrom(''),
    }));

    const result = await httpFetch('https://example.com/', client, BASE_CONFIG, passAllValidator());
    expect(result.isErr()).toBe(true);
    if (result.isErr()) {
      expect(result.error.kind).toBe('http');
    }
  });
});

// --- T-FETCH-024: Duration tracking ---

describe('httpFetch duration', () => {
  it('records durationMs in successful result', async () => {
    const client = makeClient(() => ({
      statusCode: 200,
      headers: {},
      body: bodyFrom('ok'),
    }));

    const result = await httpFetch('https://example.com/', client, BASE_CONFIG, passAllValidator());
    expect(result.isOk()).toBe(true);
    if (result.isOk()) {
      expect(result.value.durationMs).toBeGreaterThanOrEqual(0);
    }
  });
});

// --- T-FETCH-034: Metrics recording ---

describe('httpFetch metrics', () => {
  it('records success metrics on 200', async () => {
    const metrics = spyMetrics();
    const client = makeClient(() => ({
      statusCode: 200,
      headers: {},
      body: bodyFrom('data'),
    }));

    await httpFetch('https://example.com/', client, BASE_CONFIG, passAllValidator(), metrics);

    expect(metrics.calls.some((c) => c.fn === 'recordFetch' && c.args[0] === 'success')).toBe(true);
    expect(metrics.calls.some((c) => c.fn === 'recordDuration')).toBe(true);
    expect(metrics.calls.some((c) => c.fn === 'recordBodyBytes')).toBe(true);
  });

  it('records redirect metric on redirect hop', async () => {
    const metrics = spyMetrics();
    const client = makeClient((url) => {
      if (url === 'https://a.com/') {
        return { statusCode: 302, headers: { location: 'https://b.com/' }, body: bodyFrom('') };
      }
      return { statusCode: 200, headers: {}, body: bodyFrom('ok') };
    });

    await httpFetch('https://a.com/', client, BASE_CONFIG, passAllValidator(), metrics);

    expect(metrics.calls.some((c) => c.fn === 'recordRedirect')).toBe(true);
  });

  it('records error metrics on failure', async () => {
    const metrics = spyMetrics();
    const client = makeClient(() => ({
      statusCode: 500,
      headers: {},
      body: bodyFrom(''),
    }));

    await httpFetch('https://example.com/', client, BASE_CONFIG, passAllValidator(), metrics);

    expect(metrics.calls.some((c) => c.fn === 'recordFetch' && c.args[0] === 'error')).toBe(true);
  });
});

// --- T-FETCH-035: SSRF pinned IP — see http-fetcher-edge.unit.test.ts ---
// --- T-FETCH-036: Drain errors — see http-fetcher-edge.unit.test.ts ---
// --- Timeout — see http-fetcher-edge.unit.test.ts ---
