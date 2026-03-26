// Validates T-FETCH-023: All 9 error classification variants
// REQ-FETCH-018: Error mapper for every failure mode

import { describe, it, expect } from 'vitest';
import {
  classifyError,
  classifyHttpStatus,
  classifySsrfBlocked,
  classifyTooManyRedirects,
  classifyBodyTooLarge,
  classifyTimeout,
} from './error-classifier.js';

const URL = 'https://example.com/page';

describe('classifyError', () => {
  it('classifies AbortSignal timeout as timeout error', () => {
    const abort = new DOMException('signal timed out', 'TimeoutError');
    const result = classifyError(abort, URL);
    expect(result.kind).toBe('timeout');
  });

  it('classifies AbortError as timeout error', () => {
    const abort = new DOMException('aborted', 'AbortError');
    const result = classifyError(abort, URL);
    expect(result.kind).toBe('timeout');
  });

  it('classifies ECONNREFUSED as connection_refused', () => {
    const error = Object.assign(new Error('connect ECONNREFUSED'), { code: 'ECONNREFUSED' });
    const result = classifyError(error, URL);
    expect(result.kind).toBe('connection_refused');
    if (result.kind === 'connection_refused') {
      expect(result.host).toBe('example.com');
      expect(result.port).toBe(443);
    }
  });

  it('classifies SSL error codes as ssl_error', () => {
    const codes = [
      'UNABLE_TO_VERIFY_LEAF_SIGNATURE',
      'CERT_HAS_EXPIRED',
      'DEPTH_ZERO_SELF_SIGNED_CERT',
    ];
    for (const code of codes) {
      const error = Object.assign(new Error('ssl'), { code });
      const result = classifyError(error, URL);
      expect(result.kind).toBe('ssl_error');
      if (result.kind === 'ssl_error') {
        expect(result.code).toBe(code);
      }
    }
  });

  it('classifies DNS error codes as dns_resolution_failed', () => {
    const codes = ['ENOTFOUND', 'EAI_AGAIN', 'SERVFAIL', 'ENODATA'];
    for (const code of codes) {
      const error = Object.assign(new Error('dns'), { code });
      const result = classifyError(error, URL);
      expect(result.kind).toBe('dns_resolution_failed');
      if (result.kind === 'dns_resolution_failed') {
        expect(result.hostname).toBe('example.com');
      }
    }
  });

  it('classifies generic Error as network error', () => {
    const result = classifyError(new Error('EPIPE'), URL);
    expect(result.kind).toBe('network');
  });

  it('classifies non-Error thrown value as network error', () => {
    const result = classifyError('string thrown', URL);
    expect(result.kind).toBe('network');
  });
});

describe('classifyHttpStatus', () => {
  it('creates http error with status code', () => {
    const result = classifyHttpStatus(404, URL);
    expect(result.kind).toBe('http');
    if (result.kind === 'http') {
      expect(result.statusCode).toBe(404);
    }
  });
});

describe('classifySsrfBlocked', () => {
  it('creates ssrf_blocked error with reason', () => {
    const result = classifySsrfBlocked('private_ipv4', URL);
    expect(result.kind).toBe('ssrf_blocked');
    if (result.kind === 'ssrf_blocked') {
      expect(result.reason).toBe('private_ipv4');
    }
  });
});

describe('classifyTooManyRedirects', () => {
  it('creates too_many_redirects error with limit', () => {
    const result = classifyTooManyRedirects(10, URL);
    expect(result.kind).toBe('too_many_redirects');
    if (result.kind === 'too_many_redirects') {
      expect(result.maxRedirects).toBe(10);
    }
  });
});

describe('classifyBodyTooLarge', () => {
  it('creates body_too_large error with bytes', () => {
    const result = classifyBodyTooLarge(1024, 2048, URL);
    expect(result.kind).toBe('body_too_large');
    if (result.kind === 'body_too_large') {
      expect(result.maxBytes).toBe(1024);
      expect(result.actualBytes).toBe(2048);
    }
  });
});

describe('classifyTimeout', () => {
  it('returns timeout with timeoutMs for abort errors', () => {
    const abort = new DOMException('signal timed out', 'TimeoutError');
    const result = classifyTimeout(abort, URL, 5000);
    expect(result.kind).toBe('timeout');
    if (result.kind === 'timeout') {
      expect(result.timeoutMs).toBe(5000);
    }
  });

  it('delegates to classifyError for non-abort errors', () => {
    const error = Object.assign(new Error('broken'), { code: 'ECONNREFUSED' });
    const result = classifyTimeout(error, URL, 5000);
    expect(result.kind).toBe('connection_refused');
  });
});
