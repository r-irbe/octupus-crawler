// DNS timeout and fail-policy tests
// Validates: REQ-SEC-017 (DNS timeout with fail-policy integration)
// T-SEC-032: DNS timeout configurable, follows fail-policy

import { describe, it, expect } from 'vitest';
import { validateUrl, type DnsResolver } from './ssrf-validator.js';
import type { SsrfConfig } from './ssrf-types.js';
import { DEFAULT_SSRF_CONFIG, NULL_SSRF_METRICS } from './ssrf-types.js';

// --- Test helpers ---

/** Resolver that takes longer than the timeout to respond. */
function slowResolver(delayMs: number): DnsResolver {
  return {
    resolve4: () => new Promise((resolve) => {
      setTimeout(() => { resolve(['93.184.216.34']); }, delayMs);
    }),
    resolve6: () => new Promise((resolve) => {
      setTimeout(() => { resolve([]); }, delayMs);
    }),
  };
}

// --- Tests ---

describe('validateUrl — DNS timeout', () => {
  // Validates REQ-SEC-017: DNS timeout with fail-open
  it('returns error when DNS times out with fail-open policy', async () => {
    const config: SsrfConfig = {
      ...DEFAULT_SSRF_CONFIG,
      dnsTimeoutMs: 50, // Very short timeout
      dnsFailPolicy: 'open',
    };
    const result = await validateUrl(
      new URL('https://slow.example.com'),
      slowResolver(500), // Much slower than timeout
      config,
      NULL_SSRF_METRICS,
    );
    expect(result.isErr()).toBe(true);
    if (result.isErr()) {
      expect(result.error.kind).toBe('ssrf_validation_error');
    }
  });

  // Validates REQ-SEC-017: DNS timeout with fail-closed
  it('blocks when DNS times out with fail-closed policy', async () => {
    const config: SsrfConfig = {
      ...DEFAULT_SSRF_CONFIG,
      dnsTimeoutMs: 50,
      dnsFailPolicy: 'closed',
    };
    const result = await validateUrl(
      new URL('https://slow.example.com'),
      slowResolver(500),
      config,
      NULL_SSRF_METRICS,
    );
    expect(result.isOk()).toBe(true);
    if (result.isOk()) {
      expect(result.value._tag).toBe('blocked');
      if (result.value._tag === 'blocked') {
        expect(result.value.reason).toBe('dns_timeout');
      }
    }
  });

  // Validates REQ-SEC-017: Fast DNS resolution succeeds
  it('allows when DNS resolves within timeout', async () => {
    const config: SsrfConfig = {
      ...DEFAULT_SSRF_CONFIG,
      dnsTimeoutMs: 5000,
    };
    const fastResolver: DnsResolver = {
      resolve4: () => Promise.resolve(['93.184.216.34']),
      resolve6: () => Promise.resolve([]),
    };
    const result = await validateUrl(
      new URL('https://fast.example.com'),
      fastResolver,
      config,
      NULL_SSRF_METRICS,
    );
    expect(result.isOk()).toBe(true);
    if (result.isOk()) {
      expect(result.value._tag).toBe('allowed');
    }
  });
});
