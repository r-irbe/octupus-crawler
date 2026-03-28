// Property tests for SSRF validator DNS resolution
// Validates: REQ-SEC-016 (multi-IP DNS — no false negatives)
// Property for REQ-SEC-016: When ANY resolved IP is private, the request is blocked

import { describe, expect } from 'vitest';
import { fc, test as fcTest } from '@fast-check/vitest';
import { validateUrl, type DnsResolver } from './ssrf-validator.js';
import { DEFAULT_SSRF_CONFIG, NULL_SSRF_METRICS } from './ssrf-types.js';

// --- Generators ---

const arbOctet = fc.integer({ min: 0, max: 255 });

const arbPublicIPv4 = fc.tuple(arbOctet, arbOctet, arbOctet, arbOctet)
  .filter(([a, b]) => {
    if (a === 0) return false;
    if (a === 10) return false;
    if (a === 127) return false;
    if (a === 169 && b === 254) return false;
    if (a === 172 && b >= 16 && b <= 31) return false;
    if (a === 192 && b === 168) return false;
    if (a === 100 && b >= 64 && b <= 127) return false;
    if (a >= 224) return false;
    return true;
  })
  .map(([a, b, c, d]) => `${String(a)}.${String(b)}.${String(c)}.${String(d)}`);

const arbPrivateIPv4 = fc.oneof(
  fc.tuple(fc.constant(10), arbOctet, arbOctet, arbOctet)
    .map(([a, b, c, d]) => `${String(a)}.${String(b)}.${String(c)}.${String(d)}`),
  fc.tuple(fc.constant(192), fc.constant(168), arbOctet, arbOctet)
    .map(([a, b, c, d]) => `${String(a)}.${String(b)}.${String(c)}.${String(d)}`),
  fc.tuple(fc.constant(172), fc.integer({ min: 16, max: 31 }), arbOctet, arbOctet)
    .map(([a, b, c, d]) => `${String(a)}.${String(b)}.${String(c)}.${String(d)}`),
  fc.tuple(fc.constant(127), arbOctet, arbOctet, arbOctet)
    .map(([a, b, c, d]) => `${String(a)}.${String(b)}.${String(c)}.${String(d)}`),
);

function stubResolver(ipv4: string[]): DnsResolver {
  return {
    resolve4: () => Promise.resolve(ipv4),
    resolve6: () => Promise.resolve([]),
  };
}

// --- Property tests ---

// Property for REQ-SEC-016: Multi-IP DNS validation — no false negatives
describe('property: multi-IP DNS validation', () => {
  fcTest.prop([arbPublicIPv4, arbPrivateIPv4])(
    'blocks when public + private IPs are mixed in DNS response',
    async (publicIp, privateIp) => {
      const resolver = stubResolver([publicIp, privateIp]);
      const result = await validateUrl(
        new URL('https://mixed.example.com'),
        resolver,
        DEFAULT_SSRF_CONFIG,
        NULL_SSRF_METRICS,
      );
      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value._tag).toBe('blocked');
      }
    },
  );

  fcTest.prop([arbPrivateIPv4, arbPublicIPv4])(
    'blocks when private appears before public in DNS response',
    async (privateIp, publicIp) => {
      const resolver = stubResolver([privateIp, publicIp]);
      const result = await validateUrl(
        new URL('https://reverse.example.com'),
        resolver,
        DEFAULT_SSRF_CONFIG,
        NULL_SSRF_METRICS,
      );
      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value._tag).toBe('blocked');
      }
    },
  );

  fcTest.prop([arbPublicIPv4, arbPublicIPv4])(
    'allows when all DNS-resolved IPs are public',
    async (ip1, ip2) => {
      const resolver = stubResolver([ip1, ip2]);
      const result = await validateUrl(
        new URL('https://public.example.com'),
        resolver,
        DEFAULT_SSRF_CONFIG,
        NULL_SSRF_METRICS,
      );
      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value._tag).toBe('allowed');
      }
    },
  );
});
