// SSRF validator unit tests
// Validates: REQ-SEC-003 (DNS resolution), REQ-SEC-005 (literal IP),
// REQ-SEC-006 (DNS fail policy), REQ-SEC-007 (ALLOW_PRIVATE_IPS bypass),
// REQ-SEC-011 (scheme check), REQ-SEC-016 (multi-IP DNS validation),
// REQ-SEC-018/019 (pinned IP + coordination)

import { describe, it, expect } from 'vitest';
import { validateUrl, type DnsResolver } from './ssrf-validator.js';
import type { SsrfConfig, SsrfMetrics } from './ssrf-types.js';
import { DEFAULT_SSRF_CONFIG } from './ssrf-types.js';

// --- Test helpers ---

function stubResolver(ipv4: string[] = [], ipv6: string[] = []): DnsResolver {
  return {
    resolve4: () => Promise.resolve(ipv4),
    resolve6: () => Promise.resolve(ipv6),
  };
}

function failingResolver(error: Error = new Error('ENOTFOUND')): DnsResolver {
  return {
    resolve4: () => Promise.reject(error),
    resolve6: () => Promise.reject(error),
  };
}

function trackingMetrics(): SsrfMetrics & { calls: Array<{ method: string; args: unknown[] }> } {
  const calls: Array<{ method: string; args: unknown[] }> = [];
  return {
    calls,
    recordCheck: (result, reason) => { calls.push({ method: 'recordCheck', args: [result, reason] }); },
    recordDnsResolution: (duration) => { calls.push({ method: 'recordDnsResolution', args: [duration] }); },
  };
}

// --- Tests ---

describe('validateUrl — scheme check', () => {
  // Validates REQ-SEC-011: Only http/https allowed
  it('blocks non-http schemes', async () => {
    const result = await validateUrl(
      new URL('ftp://example.com/file'),
      stubResolver(),
    );
    expect(result.isOk()).toBe(true);
    if (result.isOk()) {
      expect(result.value._tag).toBe('blocked');
      if (result.value._tag === 'blocked') {
        expect(result.value.reason).toBe('scheme_disallowed');
      }
    }
  });

  it('allows http URLs', async () => {
    const result = await validateUrl(
      new URL('http://example.com'),
      stubResolver(['93.184.216.34']),
    );
    expect(result.isOk()).toBe(true);
    if (result.isOk()) {
      expect(result.value._tag).toBe('allowed');
    }
  });

  it('allows https URLs', async () => {
    const result = await validateUrl(
      new URL('https://example.com'),
      stubResolver(['93.184.216.34']),
    );
    expect(result.isOk()).toBe(true);
    if (result.isOk()) {
      expect(result.value._tag).toBe('allowed');
    }
  });
});

describe('validateUrl — literal IP', () => {
  // Validates REQ-SEC-005: Literal IP → direct check, skip DNS
  it('blocks literal private IPv4', async () => {
    const result = await validateUrl(
      new URL('http://10.0.0.1/path'),
      stubResolver(), // should not be called
    );
    expect(result.isOk()).toBe(true);
    if (result.isOk()) {
      expect(result.value._tag).toBe('blocked');
      if (result.value._tag === 'blocked') {
        expect(result.value.reason).toBe('private_ipv4');
      }
    }
  });

  it('allows literal public IPv4', async () => {
    const result = await validateUrl(
      new URL('http://8.8.8.8/'),
      stubResolver(),
    );
    expect(result.isOk()).toBe(true);
    if (result.isOk()) {
      expect(result.value._tag).toBe('allowed');
      if (result.value._tag === 'allowed') {
        expect(result.value.pinnedIp).toBe('8.8.8.8');
      }
    }
  });
});

describe('validateUrl — DNS resolution', () => {
  // Validates REQ-SEC-003: DNS resolve → validate resolved IPs
  it('allows URL resolving to public IP', async () => {
    const result = await validateUrl(
      new URL('https://example.com'),
      stubResolver(['93.184.216.34']),
    );
    expect(result.isOk()).toBe(true);
    if (result.isOk()) {
      expect(result.value._tag).toBe('allowed');
      if (result.value._tag === 'allowed') {
        expect(result.value.pinnedIp).toBe('93.184.216.34');
        expect(result.value.originalHost).toBe('example.com');
      }
    }
  });

  it('blocks URL resolving to private IP', async () => {
    const result = await validateUrl(
      new URL('https://evil.com'),
      stubResolver(['192.168.1.1']),
    );
    expect(result.isOk()).toBe(true);
    if (result.isOk()) {
      expect(result.value._tag).toBe('blocked');
      if (result.value._tag === 'blocked') {
        expect(result.value.reason).toBe('private_ipv4');
      }
    }
  });

  // Validates REQ-SEC-016: Validate ALL resolved IPs
  it('blocks when any resolved IP is private (mixed IPs)', async () => {
    const result = await validateUrl(
      new URL('https://dual-stack.com'),
      stubResolver(['93.184.216.34', '10.0.0.1']),
    );
    expect(result.isOk()).toBe(true);
    if (result.isOk()) {
      expect(result.value._tag).toBe('blocked');
      if (result.value._tag === 'blocked') {
        expect(result.value.reason).toBe('private_ipv4');
      }
    }
  });
});

describe('validateUrl — DNS fail policy', () => {
  // Validates REQ-SEC-006: DNS fail-open
  it('returns error on DNS failure with fail-open policy', async () => {
    const config: SsrfConfig = { ...DEFAULT_SSRF_CONFIG, dnsFailPolicy: 'open' };
    const result = await validateUrl(
      new URL('https://nonexistent.invalid'),
      failingResolver(),
      config,
    );
    expect(result.isErr()).toBe(true);
    if (result.isErr()) {
      expect(result.error.kind).toBe('ssrf_validation_error');
    }
  });

  it('blocks on DNS failure with fail-closed policy', async () => {
    const config: SsrfConfig = { ...DEFAULT_SSRF_CONFIG, dnsFailPolicy: 'closed' };
    const result = await validateUrl(
      new URL('https://nonexistent.invalid'),
      failingResolver(),
      config,
    );
    expect(result.isOk()).toBe(true);
    if (result.isOk()) {
      expect(result.value._tag).toBe('blocked');
      if (result.value._tag === 'blocked') {
        expect(result.value.reason).toBe('dns_failed');
      }
    }
  });
});

describe('validateUrl — ALLOW_PRIVATE_IPS', () => {
  // Validates REQ-SEC-007: Bypass SSRF blocking when enabled
  it('allows private IP when ALLOW_PRIVATE_IPS is true', async () => {
    const config: SsrfConfig = { ...DEFAULT_SSRF_CONFIG, allowPrivateIps: true };
    const result = await validateUrl(
      new URL('http://10.0.0.1/'),
      stubResolver(),
      config,
    );
    expect(result.isOk()).toBe(true);
    if (result.isOk()) {
      expect(result.value._tag).toBe('allowed');
      if (result.value._tag === 'allowed') {
        expect(result.value.pinnedIp).toBe('10.0.0.1');
      }
    }
  });

  it('allows DNS-resolved private IP when ALLOW_PRIVATE_IPS is true', async () => {
    const config: SsrfConfig = { ...DEFAULT_SSRF_CONFIG, allowPrivateIps: true };
    const result = await validateUrl(
      new URL('https://internal.corp'),
      stubResolver(['192.168.1.1']),
      config,
    );
    expect(result.isOk()).toBe(true);
    if (result.isOk()) {
      expect(result.value._tag).toBe('allowed');
    }
  });
});

describe('validateUrl — metrics', () => {
  // Validates REQ-SEC-014: ssrf_checks_total recorded
  it('records allowed check metric', async () => {
    const metrics = trackingMetrics();
    await validateUrl(
      new URL('https://example.com'),
      stubResolver(['1.2.3.4']),
      DEFAULT_SSRF_CONFIG,
      metrics,
    );
    const checkCall = metrics.calls.find((c) => c.method === 'recordCheck');
    expect(checkCall).toBeDefined();
    expect(checkCall?.args[0]).toBe('allowed');
  });

  it('records blocked check metric with reason', async () => {
    const metrics = trackingMetrics();
    await validateUrl(
      new URL('http://127.0.0.1/'),
      stubResolver(),
      DEFAULT_SSRF_CONFIG,
      metrics,
    );
    const checkCall = metrics.calls.find((c) => c.method === 'recordCheck');
    expect(checkCall).toBeDefined();
    expect(checkCall?.args[0]).toBe('blocked');
    expect(checkCall?.args[1]).toBe('loopback');
  });

  // Validates REQ-SEC-015: DNS resolution histogram
  it('records DNS resolution duration', async () => {
    const metrics = trackingMetrics();
    await validateUrl(
      new URL('https://example.com'),
      stubResolver(['1.2.3.4']),
      DEFAULT_SSRF_CONFIG,
      metrics,
    );
    const dnsCall = metrics.calls.find((c) => c.method === 'recordDnsResolution');
    expect(dnsCall).toBeDefined();
    expect(typeof dnsCall?.args[0]).toBe('number');
  });
});

describe('validateUrl — pinned IP', () => {
  // Validates REQ-SEC-018: Returns pinned IP
  it('returns first resolved IP as pinnedIp', async () => {
    const result = await validateUrl(
      new URL('https://example.com'),
      stubResolver(['93.184.216.34', '93.184.216.35']),
    );
    expect(result.isOk()).toBe(true);
    if (result.isOk() && result.value._tag === 'allowed') {
      expect(result.value.pinnedIp).toBe('93.184.216.34');
    }
  });

  // Validates REQ-SEC-019: Returns originalHost for Host header
  it('returns originalHost for Host header setting', async () => {
    const result = await validateUrl(
      new URL('https://example.com/page'),
      stubResolver(['93.184.216.34']),
    );
    expect(result.isOk()).toBe(true);
    if (result.isOk() && result.value._tag === 'allowed') {
      expect(result.value.originalHost).toBe('example.com');
    }
  });
});
