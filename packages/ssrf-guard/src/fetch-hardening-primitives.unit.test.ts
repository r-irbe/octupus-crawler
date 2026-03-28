// Fetch hardening primitives unit tests
// Validates: REQ-SEC-008 (redirect limit), REQ-SEC-009 (body size limit),
// REQ-SEC-010 (cumulative timeout), REQ-SEC-004 (per-redirect SSRF)

import { describe, it, expect } from 'vitest';
import {
  createRedirectTracker,
  createBodySizeLimiter,
  checkContentLength,
  createCumulativeTimeout,
} from './fetch-hardening.js';
import { validateRedirectTarget } from './hardened-fetch.js';
import type { DnsResolver } from './ssrf-validator.js';
import { DEFAULT_SSRF_CONFIG, NULL_SSRF_METRICS } from './ssrf-types.js';

// --- Test helpers ---

function stubResolver(ipv4: string[] = [], ipv6: string[] = []): DnsResolver {
  return {
    resolve4: () => Promise.resolve(ipv4),
    resolve6: () => Promise.resolve(ipv6),
  };
}

// --- Redirect tracker tests ---

describe('createRedirectTracker', () => {
  // Validates REQ-SEC-008: Redirect limit enforcement
  it('starts at count 0', () => {
    const tracker = createRedirectTracker(5);
    expect(tracker.count).toBe(0);
    expect(tracker.canRedirect).toBe(true);
  });

  it('increments count on follow()', () => {
    const tracker = createRedirectTracker(5);
    const result = tracker.follow();
    expect(result.isOk()).toBe(true);
    if (result.isOk()) {
      expect(result.value.count).toBe(1);
    }
  });

  it('allows up to maxRedirects follows', () => {
    let tracker = createRedirectTracker(3);
    for (let i = 0; i < 3; i++) {
      const result = tracker.follow();
      expect(result.isOk()).toBe(true);
      if (result.isOk()) tracker = result.value;
    }
    expect(tracker.count).toBe(3);
  });

  it('returns error when exceeding limit', () => {
    let tracker = createRedirectTracker(2);
    for (let i = 0; i < 2; i++) {
      const result = tracker.follow();
      if (result.isOk()) tracker = result.value;
    }
    const result = tracker.follow();
    expect(result.isErr()).toBe(true);
    if (result.isErr()) {
      expect(result.error._tag).toBe('too_many_redirects');
      if (result.error._tag === 'too_many_redirects') {
        expect(result.error.count).toBe(3);
        expect(result.error.limit).toBe(2);
      }
    }
  });

  it('reports canRedirect=false at limit', () => {
    let tracker = createRedirectTracker(1);
    const result = tracker.follow();
    if (result.isOk()) tracker = result.value;
    expect(tracker.canRedirect).toBe(false);
  });
});

// --- Body size limiter tests ---

describe('createBodySizeLimiter', () => {
  // Validates REQ-SEC-009: Streaming byte counter
  it('passes chunks under the limit', async () => {
    const limiter = createBodySizeLimiter(100);
    const reader = new ReadableStream<Uint8Array>({
      start(controller): void {
        controller.enqueue(new Uint8Array(50));
        controller.close();
      },
    }).pipeThrough(limiter).getReader();

    const { value } = await reader.read();
    expect(value?.byteLength).toBe(50);
    const final = await reader.read();
    expect(final.done).toBe(true);
  });

  it('errors when exceeding limit', async () => {
    const limiter = createBodySizeLimiter(10);
    const reader = new ReadableStream<Uint8Array>({
      start(controller): void {
        controller.enqueue(new Uint8Array(20));
        controller.close();
      },
    }).pipeThrough(limiter).getReader();

    await expect(reader.read()).rejects.toMatchObject({
      _tag: 'body_too_large',
      bytes: 20,
      limit: 10,
    });
  });

  // Validates REQ-SEC-009: Streaming — multiple chunks
  it('tracks cumulative bytes across chunks', async () => {
    const limiter = createBodySizeLimiter(15);
    const reader = new ReadableStream<Uint8Array>({
      start(controller): void {
        controller.enqueue(new Uint8Array(8));
        controller.enqueue(new Uint8Array(8));
        controller.close();
      },
    }).pipeThrough(limiter).getReader();

    const first = await reader.read();
    expect(first.value?.byteLength).toBe(8);

    await expect(reader.read()).rejects.toMatchObject({
      _tag: 'body_too_large',
    });
  });
});

// --- Content-Length pre-flight tests ---

describe('checkContentLength', () => {
  it('returns ok when no Content-Length header', () => {
    expect(checkContentLength(null, 100).isOk()).toBe(true);
    expect(checkContentLength(undefined, 100).isOk()).toBe(true);
  });

  it('returns ok when Content-Length is within limit', () => {
    expect(checkContentLength('50', 100).isOk()).toBe(true);
  });

  it('returns error when Content-Length exceeds limit', () => {
    const result = checkContentLength('200', 100);
    expect(result.isErr()).toBe(true);
    if (result.isErr()) {
      expect(result.error._tag).toBe('body_too_large');
    }
  });

  it('returns ok for non-numeric Content-Length', () => {
    expect(checkContentLength('invalid', 100).isOk()).toBe(true);
  });
});

// --- Cumulative timeout tests ---

describe('createCumulativeTimeout', () => {
  // Validates REQ-SEC-010: Cumulative timeout via AbortSignal
  it('returns non-aborted signal initially', () => {
    const { signal, cleanup } = createCumulativeTimeout(1000);
    expect(signal.aborted).toBe(false);
    cleanup();
  });

  it('aborts signal after timeout', async () => {
    const { signal, cleanup } = createCumulativeTimeout(50);
    await new Promise((r) => { setTimeout(r, 100); });
    expect(signal.aborted).toBe(true);
    cleanup();
  });

  it('cleanup prevents abort', async () => {
    const { signal, cleanup } = createCumulativeTimeout(50);
    cleanup();
    await new Promise((r) => { setTimeout(r, 100); });
    expect(signal.aborted).toBe(false);
  });
});

// --- Per-redirect SSRF validation tests ---

describe('validateRedirectTarget', () => {
  // Validates REQ-SEC-004: Per-redirect SSRF validation
  it('allows redirect to public IP', async () => {
    const result = await validateRedirectTarget(
      new URL('http://example.com'),
      stubResolver(['93.184.216.34']),
      DEFAULT_SSRF_CONFIG,
      NULL_SSRF_METRICS,
    );
    expect(result.isOk()).toBe(true);
    if (result.isOk()) {
      expect(result.value._tag).toBe('allowed');
    }
  });

  it('blocks redirect to private IP', async () => {
    const result = await validateRedirectTarget(
      new URL('http://evil.com'),
      stubResolver(['192.168.1.1']),
      DEFAULT_SSRF_CONFIG,
      NULL_SSRF_METRICS,
    );
    expect(result.isErr()).toBe(true);
    if (result.isErr()) {
      expect(result.error._tag).toBe('ssrf_blocked');
    }
  });

  it('blocks redirect to loopback', async () => {
    const result = await validateRedirectTarget(
      new URL('http://127.0.0.1/admin'),
      stubResolver(),
      DEFAULT_SSRF_CONFIG,
      NULL_SSRF_METRICS,
    );
    expect(result.isErr()).toBe(true);
    if (result.isErr()) {
      expect(result.error._tag).toBe('ssrf_blocked');
    }
  });
});
