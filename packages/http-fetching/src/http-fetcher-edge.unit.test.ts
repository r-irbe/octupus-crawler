// Validates T-FETCH-035, T-FETCH-036, F-07 (review finding)
// REQ-FETCH-023, REQ-FETCH-024, REQ-FETCH-019 (timeout)

import { describe, it, expect } from 'vitest';
import { Readable } from 'node:stream';
import { httpFetch } from './http-fetcher.js';
import type { HttpClient, FetcherConfig } from './http-fetcher.js';
import type { SsrfValidationResult } from '@ipf/ssrf-guard/ssrf-types';

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

function passAllValidator(): (_url: URL) => Promise<SsrfValidationResult | null> {
  return () => Promise.resolve(null);
}

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

    const validator = (): Promise<SsrfValidationResult | null> => Promise.resolve({
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

    const validator = (): Promise<SsrfValidationResult | null> => Promise.resolve({
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

// --- HTTP errors ---

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

// --- Timeout (F-07 review finding) ---

describe('httpFetch timeout', () => {
  it('returns timeout error when client exceeds timeoutMs', async () => {
    const slowClient: HttpClient = {
      request: (_url, opts) =>
        new Promise((_resolve, reject) => {
          opts.signal?.addEventListener('abort', () => {
            reject(new DOMException('signal timed out', 'TimeoutError'));
          });
        }),
    };

    const config = { ...BASE_CONFIG, timeoutMs: 50 };
    const result = await httpFetch('https://slow.com/', slowClient, config, passAllValidator());
    expect(result.isErr()).toBe(true);
    if (result.isErr()) {
      expect(result.error.kind).toBe('timeout');
      if (result.error.kind === 'timeout') {
        expect(result.error.timeoutMs).toBe(50);
      }
    }
  });
});
