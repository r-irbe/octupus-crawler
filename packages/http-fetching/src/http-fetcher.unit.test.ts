// Validates T-FETCH-019 to 021, T-FETCH-024, T-FETCH-034 to 036
// REQ-FETCH-004 to 008, REQ-FETCH-019, REQ-FETCH-022 to 024

import { describe, it, expect } from 'vitest';
import { Readable } from 'node:stream';
import { httpFetch } from './http-fetcher.js';
import type { HttpClient, FetcherConfig, SsrfCheckResult } from './http-fetcher.js';
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

function passAllValidator(): (_url: URL) => Promise<SsrfCheckResult> {
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

// --- T-FETCH-035: SSRF pinned IP ---

describe('httpFetch SSRF integration', () => {
  it('uses pinned IP and sets Host header', async () => {
    let capturedUrl = '';
    let capturedHeaders: Record<string, string> = {};

    const client: HttpClient = {
      request: (url, opts) => {
        capturedUrl = url;
        capturedHeaders = opts.headers;
        return Promise.resolve({ statusCode: 200, headers: {}, body: bodyFrom('ok') });
      },
    };

    const validator = (): Promise<SsrfCheckResult> => Promise.resolve({
      _tag: 'allowed' as const,
      pinnedIp: '93.184.216.34',
      originalHost: 'example.com',
    });

    await httpFetch('https://example.com/', client, BASE_CONFIG, validator);

    expect(capturedUrl).toContain('93.184.216.34');
    expect(capturedHeaders['Host']).toBe('example.com');
  });

  it('returns ssrf_blocked when SSRF validator blocks', async () => {
    const client = makeClient(() => ({
      statusCode: 200,
      headers: {},
      body: bodyFrom('ok'),
    }));

    const validator = (): Promise<SsrfCheckResult> => Promise.resolve({
      _tag: 'blocked' as const,
      originalHost: 'evil.com',
      reason: 'private_ipv4',
    });

    const result = await httpFetch('https://evil.com/', client, BASE_CONFIG, validator);
    expect(result.isErr()).toBe(true);
    if (result.isErr()) {
      expect(result.error.kind).toBe('ssrf_blocked');
    }
  });
});

// --- T-FETCH-036: Drain error handling ---

describe('httpFetch drain errors', () => {
  it('handles drain errors during redirect without crashing', async () => {
    let requestCount = 0;
    const client: HttpClient = {
      request: () => {
        requestCount++;
        if (requestCount === 1) {
          return Promise.resolve({
            statusCode: 301,
            headers: { location: 'https://b.com/' },
            body: new Readable({
              read(): void { this.destroy(new Error('drain fail')); },
            }),
          });
        }
        return Promise.resolve({ statusCode: 200, headers: {}, body: bodyFrom('ok') });
      },
    };

    const result = await httpFetch('https://a.com/', client, BASE_CONFIG, passAllValidator());
    expect(result.isOk()).toBe(true);
  });
});

// --- Non-2xx errors ---

describe('httpFetch HTTP errors', () => {
  it('returns http error for 4xx', async () => {
    const client = makeClient(() => ({
      statusCode: 404,
      headers: {},
      body: bodyFrom('not found'),
    }));

    const result = await httpFetch('https://example.com/', client, BASE_CONFIG, passAllValidator());
    expect(result.isErr()).toBe(true);
    if (result.isErr()) {
      expect(result.error.kind).toBe('http');
    }
  });

  it('returns body_too_large when Content-Length exceeds limit', async () => {
    const config = { ...BASE_CONFIG, maxBodyBytes: 100 };
    const client = makeClient(() => ({
      statusCode: 200,
      headers: { 'content-length': '999999' },
      body: bodyFrom('big'),
    }));

    const result = await httpFetch('https://example.com/', client, config, passAllValidator());
    expect(result.isErr()).toBe(true);
    if (result.isErr()) {
      expect(result.error.kind).toBe('body_too_large');
    }
  });
});
