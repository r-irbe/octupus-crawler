// Hardened fetch orchestrator tests
// Validates: REQ-SEC-004 (redirect chain SSRF), REQ-SEC-008 (too many redirects),
// REQ-SEC-009 (Content-Length pre-flight), T-SEC-018 (private IP mid-chain)

import { describe, it, expect } from 'vitest';
import {
  hardenedFetch,
  type FetchFn,
} from './hardened-fetch.js';
import type { FetchHardeningConfig } from './fetch-hardening.js';
import type { DnsResolver } from './ssrf-validator.js';
import { DEFAULT_SSRF_CONFIG, NULL_SSRF_METRICS } from './ssrf-types.js';

// --- Test helpers ---

function stubResolver(ipv4: string[] = [], ipv6: string[] = []): DnsResolver {
  return {
    resolve4: () => Promise.resolve(ipv4),
    resolve6: () => Promise.resolve(ipv6),
  };
}

function mockResponse(
  status: number,
  headers: Record<string, string> = {},
  body?: string,
): Response {
  const bodyInit = body ?? '';
  return new Response(bodyInit, { status, headers });
}

function redirectResponse(location: string, status = 302): Response {
  return new Response(null, { status, headers: { location } });
}

// --- Tests ---

describe('hardenedFetch', () => {
  const publicResolver = stubResolver(['93.184.216.34']);
  const config: FetchHardeningConfig = {
    maxRedirects: 3,
    maxResponseBytes: 1024,
    timeoutMs: 5000,
  };

  it('fetches a non-redirecting URL successfully', async () => {
    const fetchFn: FetchFn = () => Promise.resolve(mockResponse(200, {}, 'hello'));
    const result = await hardenedFetch(
      new URL('http://example.com'), publicResolver, fetchFn,
      DEFAULT_SSRF_CONFIG, config, NULL_SSRF_METRICS,
    );
    expect(result.isOk()).toBe(true);
    if (result.isOk()) {
      expect(result.value.response.status).toBe(200);
      expect(result.value.redirectCount).toBe(0);
    }
  });

  // Validates REQ-SEC-004: Redirect chain with SSRF check on each hop
  it('follows redirects with SSRF validation', async () => {
    let callCount = 0;
    const fetchFn: FetchFn = () => {
      callCount++;
      if (callCount === 1) return Promise.resolve(redirectResponse('http://example.com/page2'));
      return Promise.resolve(mockResponse(200, {}, 'final'));
    };
    const result = await hardenedFetch(
      new URL('http://example.com'), publicResolver, fetchFn,
      DEFAULT_SSRF_CONFIG, config, NULL_SSRF_METRICS,
    );
    expect(result.isOk()).toBe(true);
    if (result.isOk()) {
      expect(result.value.redirectCount).toBe(1);
      expect(result.value.response.status).toBe(200);
    }
  });

  // Validates REQ-SEC-008: Too many redirects
  it('errors on too many redirects', async () => {
    const fetchFn: FetchFn = () =>
      Promise.resolve(redirectResponse('http://example.com/next'));

    const result = await hardenedFetch(
      new URL('http://example.com'), publicResolver, fetchFn,
      DEFAULT_SSRF_CONFIG, { ...config, maxRedirects: 2 }, NULL_SSRF_METRICS,
    );
    expect(result.isErr()).toBe(true);
    if (result.isErr()) {
      expect(result.error._tag).toBe('too_many_redirects');
    }
  });

  // Validates REQ-SEC-004: Redirect to private IP is blocked (T-SEC-018 scenario)
  it('blocks redirect chain with private IP mid-chain', async () => {
    let callCount = 0;
    const mixedResolver: DnsResolver = {
      resolve4: () => {
        callCount++;
        if (callCount <= 1) return Promise.resolve(['93.184.216.34']);
        return Promise.resolve(['192.168.1.1']);
      },
      resolve6: () => Promise.resolve([]),
    };
    const fetchFn: FetchFn = () =>
      Promise.resolve(redirectResponse('http://internal.corp/admin'));

    const result = await hardenedFetch(
      new URL('http://example.com'), mixedResolver, fetchFn,
      DEFAULT_SSRF_CONFIG, config, NULL_SSRF_METRICS,
    );
    expect(result.isErr()).toBe(true);
    if (result.isErr()) {
      expect(result.error._tag).toBe('ssrf_blocked');
    }
  });

  // Validates REQ-SEC-009: Content-Length pre-flight rejection
  it('rejects response with Content-Length exceeding limit', async () => {
    const fetchFn: FetchFn = () =>
      Promise.resolve(mockResponse(200, { 'content-length': '2000' }, 'x'.repeat(2000)));

    const result = await hardenedFetch(
      new URL('http://example.com'), publicResolver, fetchFn,
      DEFAULT_SSRF_CONFIG, config, NULL_SSRF_METRICS,
    );
    expect(result.isErr()).toBe(true);
    if (result.isErr()) {
      expect(result.error._tag).toBe('body_too_large');
    }
  });

  // F-009: Validates REQ-SEC-011: Scheme-changing redirect blocked (http→ftp)
  it('blocks redirect to disallowed scheme', async () => {
    const fetchFn: FetchFn = () =>
      Promise.resolve(redirectResponse('ftp://internal.corp/secret'));

    const result = await hardenedFetch(
      new URL('http://example.com'), publicResolver, fetchFn,
      DEFAULT_SSRF_CONFIG, config, NULL_SSRF_METRICS,
    );
    expect(result.isErr()).toBe(true);
    if (result.isErr()) {
      expect(result.error._tag).toBe('ssrf_blocked');
    }
  });
});
