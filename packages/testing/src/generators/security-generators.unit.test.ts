// Security property generator verification tests
// Validates: T-AGENT-108 (REQ-AGENT-100, REQ-AGENT-102)
// Verifies RFC 6890 generators produce valid fast-check arbitraries

import { describe, it, expect } from 'vitest';
import { fc } from '@fast-check/vitest';
import {
  arbReservedIPv4,
  arbIPv4MappedIPv6,
  arbReservedIP,
  arbReservedIPWithMeta,
} from './rfc6890.generator.js';
import {
  arbSSRFPayload,
  arbDecimalIP,
  arbOctalIP,
  arbURLEncodedReservedIP,
} from './ssrf-payload.generator.js';
import {
  arbTOCTOUPayload,
  arbRedirectChain,
  arbSchemeAbuse,
  arbRebindingDomain,
} from './dns-rebinding.generator.js';

const IPV4_PATTERN = /^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/;
const IPV4_MAPPED_V6_PATTERN = /^::ffff:\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/;

function isValidOctet(s: string): boolean {
  const n = parseInt(s, 10);
  return n >= 0 && n <= 255;
}

function isValidIPv4(ip: string): boolean {
  if (!IPV4_PATTERN.test(ip)) return false;
  return ip.split('.').every(isValidOctet);
}

// --- RFC 6890 Generator Tests ---

describe('RFC 6890 Generators (T-AGENT-108)', () => {
  it('arbReservedIPv4 produces valid IPv4 addresses', () => {
    fc.assert(
      fc.property(arbReservedIPv4, (ip) => {
        expect(isValidIPv4(ip)).toBe(true);
      }),
      { numRuns: 200 },
    );
  });

  it('arbReservedIPv4 produces only reserved ranges', () => {
    const reservedPrefixes = [
      '0.', '10.', '100.64.', '127.', '169.254.', '172.16.',
      '192.0.0.', '192.0.2.', '192.168.', '198.18.',
      '198.51.100.', '203.0.113.', '240.', '255.255.255.255',
    ];
    fc.assert(
      fc.property(arbReservedIPv4, (ip) => {
        const matchesReserved = reservedPrefixes.some((p) => ip.startsWith(p));
        expect(matchesReserved).toBe(true);
      }),
      { numRuns: 500 },
    );
  });

  it('arbIPv4MappedIPv6 produces ::ffff: prefixed addresses', () => {
    fc.assert(
      fc.property(arbIPv4MappedIPv6, (ip) => {
        expect(IPV4_MAPPED_V6_PATTERN.test(ip)).toBe(true);
      }),
      { numRuns: 100 },
    );
  });

  it('arbReservedIP covers both IPv4 and IPv4-mapped IPv6', () => {
    let hasV4 = false;
    let hasV6 = false;
    fc.assert(
      fc.property(arbReservedIP, (ip) => {
        if (ip.startsWith('::ffff:')) hasV6 = true;
        else hasV4 = true;
      }),
      { numRuns: 200 },
    );
    expect(hasV4).toBe(true);
    expect(hasV6).toBe(true);
  });

  it('arbReservedIPWithMeta includes range metadata', () => {
    fc.assert(
      fc.property(arbReservedIPWithMeta, (entry) => {
        expect(typeof entry.ip).toBe('string');
        expect(typeof entry.range).toBe('string');
        expect(typeof entry.description).toBe('string');
        expect(entry.ip.startsWith(entry.range)).toBe(true);
      }),
      { numRuns: 100 },
    );
  });
});

// --- SSRF Payload Generator Tests ---

describe('SSRF Payload Generators (T-AGENT-108)', () => {
  it('arbSSRFPayload produces valid URLs or payloads', () => {
    fc.assert(
      fc.property(arbSSRFPayload, (payload) => {
        expect(typeof payload).toBe('string');
        expect(payload.length).toBeGreaterThan(0);
      }),
      { numRuns: 200 },
    );
  });

  it('arbDecimalIP produces http://decimal/ URLs', () => {
    fc.assert(
      fc.property(arbDecimalIP, (url) => {
        expect(url).toMatch(/^http:\/\/\d+\/$/);
      }),
      { numRuns: 50 },
    );
  });

  it('arbOctalIP produces octal-encoded URLs', () => {
    fc.assert(
      fc.property(arbOctalIP, (url) => {
        expect(url).toMatch(/^http:\/\/0\d+\.0\d+\.0\d+\.0\d+\/$/);
      }),
      { numRuns: 50 },
    );
  });

  it('arbURLEncodedReservedIP produces percent-encoded IPs', () => {
    fc.assert(
      fc.property(arbURLEncodedReservedIP, (encoded) => {
        expect(encoded).toContain('%');
      }),
      { numRuns: 50 },
    );
  });
});

// --- DNS Rebinding Generator Tests ---

describe('DNS Rebinding Generators (T-AGENT-108)', () => {
  it('arbRebindingDomain produces valid domain strings', () => {
    fc.assert(
      fc.property(arbRebindingDomain, (domain) => {
        expect(typeof domain).toBe('string');
        expect(domain.length).toBeGreaterThan(0);
        expect(domain).toContain('.');
      }),
      { numRuns: 50 },
    );
  });

  it('arbTOCTOUPayload has required fields with valid types', () => {
    fc.assert(
      fc.property(arbTOCTOUPayload, (payload) => {
        expect(typeof payload.domain).toBe('string');
        expect(typeof payload.firstResolve).toBe('string');
        expect(isValidIPv4(payload.secondResolve)).toBe(true);
        expect(payload.ttl).toBeGreaterThanOrEqual(0);
        expect(payload.ttl).toBeLessThanOrEqual(5);
      }),
      { numRuns: 50 },
    );
  });

  it('arbRedirectChain produces valid redirect metadata', () => {
    fc.assert(
      fc.property(arbRedirectChain, (chain) => {
        expect(typeof chain.startUrl).toBe('string');
        expect(chain.hops).toBeGreaterThanOrEqual(1);
        expect(chain.hops).toBeLessThanOrEqual(5);
        expect(chain.finalTarget).toMatch(/^http:\/\/\d/);
        expect(typeof chain.description).toBe('string');
      }),
      { numRuns: 50 },
    );
  });

  it('arbSchemeAbuse produces non-HTTP(S) scheme payloads', () => {
    let hasNonHttp = false;
    fc.assert(
      fc.property(arbSchemeAbuse, (payload) => {
        expect(typeof payload).toBe('string');
        if (payload.startsWith('file:') || payload.startsWith('gopher:') || payload.startsWith('dict:')) {
          hasNonHttp = true;
        }
      }),
      { numRuns: 100 },
    );
    expect(hasNonHttp).toBe(true);
  });
});
