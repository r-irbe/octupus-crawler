// Validates REQ-ARCH-012: Discriminated unions keyed by `kind` field — FetchError (9 variants)
// Validates REQ-ARCH-013: Typed error constructor functions enforce correct fields at compile time
import { describe, it, expect } from 'vitest';
import type { FetchError } from './fetch-error.js';
import {
  createTimeoutError,
  createNetworkError,
  createHttpError,
  createSsrfBlockedError,
  createTooManyRedirectsError,
  createBodyTooLargeError,
  createDnsResolutionFailedError,
  createSslError,
  createConnectionRefusedError,
} from './fetch-error.js';

describe('FetchError constructors', () => {
  // Validates REQ-ARCH-013: typed constructors enforce correct fields
  it('creates a timeout error', () => {
    const err = createTimeoutError({ url: 'https://example.com', timeoutMs: 5000 });
    expect(err.kind).toBe('timeout');
    expect(err.url).toBe('https://example.com');
    expect(err.timeoutMs).toBe(5000);
    expect(err.message).toContain('timeout');
  });

  it('creates a network error', () => {
    const cause = new Error('ECONNRESET');
    const err = createNetworkError({ url: 'https://example.com', cause });
    expect(err.kind).toBe('network');
    expect(err.url).toBe('https://example.com');
    expect(err.cause).toBe(cause);
    expect(err.message).toContain('network');
  });

  it('creates an http error', () => {
    const err = createHttpError({ url: 'https://example.com', statusCode: 503 });
    expect(err.kind).toBe('http');
    expect(err.url).toBe('https://example.com');
    expect(err.statusCode).toBe(503);
    expect(err.message).toContain('503');
  });

  it('creates an ssrf_blocked error', () => {
    const err = createSsrfBlockedError({ url: 'http://169.254.169.254', reason: 'link-local' });
    expect(err.kind).toBe('ssrf_blocked');
    expect(err.url).toBe('http://169.254.169.254');
    expect(err.reason).toBe('link-local');
    expect(err.message).toContain('SSRF');
  });

  it('creates a too_many_redirects error', () => {
    const err = createTooManyRedirectsError({ url: 'https://example.com', maxRedirects: 10 });
    expect(err.kind).toBe('too_many_redirects');
    expect(err.url).toBe('https://example.com');
    expect(err.maxRedirects).toBe(10);
    expect(err.message).toContain('redirect');
  });

  it('creates a body_too_large error', () => {
    const err = createBodyTooLargeError({
      url: 'https://example.com',
      maxBytes: 1_048_576,
      actualBytes: 2_000_000,
    });
    expect(err.kind).toBe('body_too_large');
    expect(err.url).toBe('https://example.com');
    expect(err.maxBytes).toBe(1_048_576);
    expect(err.actualBytes).toBe(2_000_000);
    expect(err.message).toContain('large');
  });

  it('creates a dns_resolution_failed error', () => {
    const err = createDnsResolutionFailedError({ url: 'https://nonexistent.invalid', hostname: 'nonexistent.invalid' });
    expect(err.kind).toBe('dns_resolution_failed');
    expect(err.url).toBe('https://nonexistent.invalid');
    expect(err.hostname).toBe('nonexistent.invalid');
    expect(err.message).toContain('DNS');
  });

  it('creates an ssl_error', () => {
    const err = createSslError({ url: 'https://expired.example.com', code: 'CERT_HAS_EXPIRED' });
    expect(err.kind).toBe('ssl_error');
    expect(err.url).toBe('https://expired.example.com');
    expect(err.code).toBe('CERT_HAS_EXPIRED');
    expect(err.message).toContain('SSL');
  });

  it('creates a connection_refused error', () => {
    const err = createConnectionRefusedError({ url: 'https://example.com:9999', host: 'example.com', port: 9999 });
    expect(err.kind).toBe('connection_refused');
    expect(err.url).toBe('https://example.com:9999');
    expect(err.host).toBe('example.com');
    expect(err.port).toBe(9999);
    expect(err.message).toContain('refused');
  });
});

// Validates REQ-ARCH-012: discriminated union with `kind` field enables exhaustive narrowing
describe('FetchError kind narrowing', () => {
  it('covers all 9 variants exhaustively', () => {
    const errors: FetchError[] = [
      createTimeoutError({ url: 'u', timeoutMs: 1 }),
      createNetworkError({ url: 'u', cause: new Error('e') }),
      createHttpError({ url: 'u', statusCode: 500 }),
      createSsrfBlockedError({ url: 'u', reason: 'r' }),
      createTooManyRedirectsError({ url: 'u', maxRedirects: 5 }),
      createBodyTooLargeError({ url: 'u', maxBytes: 1, actualBytes: 2 }),
      createDnsResolutionFailedError({ url: 'u', hostname: 'h' }),
      createSslError({ url: 'u', code: 'c' }),
      createConnectionRefusedError({ url: 'u', host: 'h', port: 80 }),
    ];

    const kinds = errors.map((e) => e.kind);
    expect(kinds).toEqual([
      'timeout',
      'network',
      'http',
      'ssrf_blocked',
      'too_many_redirects',
      'body_too_large',
      'dns_resolution_failed',
      'ssl_error',
      'connection_refused',
    ]);
  });

  it('narrows to specific variant via kind switch', () => {
    const errors: FetchError[] = [createHttpError({ url: 'https://example.com', statusCode: 404 })];
    const err = errors[0];
    // Type narrowing: err is FetchError | undefined (noUncheckedIndexedAccess)
    expect(err).toBeDefined();
    if (err?.kind === 'http') {
      expect(err.statusCode).toBe(404);
    } else {
      expect.unreachable('Expected http kind');
    }
  });
});
