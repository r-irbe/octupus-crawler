// Property tests for SSRF IP range checking
// Validates: REQ-SEC-001 (all RFC 6890 reserved IPs blocked)
// Property for REQ-SEC-001: The system shall block all RFC 6890 reserved IPv4 ranges

import { describe, expect } from 'vitest';
import { fc, test as fcTest } from '@fast-check/vitest';
import { checkIp } from './ip-range-checker.js';

// Inline generators matching the pattern from packages/testing/src/generators/

const arbOctet = fc.integer({ min: 0, max: 255 });

function arbIPInRange(prefix: string): fc.Arbitrary<string> {
  const parts = prefix.split('.');
  const remaining = 4 - parts.length;
  if (remaining === 0) return fc.constant(prefix);
  return fc.tuple(...Array.from({ length: remaining }, () => arbOctet)).map(
    (octets) => `${prefix}.${octets.join('.')}`,
  );
}

const arbPublicIPv4 = fc.tuple(arbOctet, arbOctet, arbOctet, arbOctet)
  .filter(([a, b]) => {
    // Exclude all blocked ranges
    if (a === 0) return false;               // 0.0.0.0/8
    if (a === 10) return false;              // 10.0.0.0/8
    if (a === 127) return false;             // 127.0.0.0/8
    if (a === 169 && b === 254) return false; // 169.254.0.0/16
    if (a === 172 && b >= 16 && b <= 31) return false; // 172.16.0.0/12
    if (a === 192 && b === 168) return false; // 192.168.0.0/16
    if (a === 100 && b >= 64 && b <= 127) return false; // 100.64.0.0/10
    if (a >= 224) return false;              // 224.0.0.0/4 + broadcast + reserved
    return true;
  })
  .map(([a, b, c, d]) => `${String(a)}.${String(b)}.${String(c)}.${String(d)}`);

// Property for REQ-SEC-001: rejects all RFC 1918 private IPv4
describe('property: IPv4 range blocking', () => {
  fcTest.prop([arbIPInRange('10')])(
    'blocks all 10.0.0.0/8 addresses',
    (ip) => {
      expect(checkIp(ip).blocked).toBe(true);
    },
  );

  fcTest.prop([arbIPInRange('172.16')])(
    'blocks all 172.16.0.0/12 addresses (172.16.x.x)',
    (ip) => {
      expect(checkIp(ip).blocked).toBe(true);
    },
  );

  fcTest.prop([arbIPInRange('192.168')])(
    'blocks all 192.168.0.0/16 addresses',
    (ip) => {
      expect(checkIp(ip).blocked).toBe(true);
    },
  );

  fcTest.prop([arbIPInRange('127')])(
    'blocks all 127.0.0.0/8 addresses',
    (ip) => {
      expect(checkIp(ip).blocked).toBe(true);
    },
  );

  fcTest.prop([arbIPInRange('169.254')])(
    'blocks all 169.254.0.0/16 addresses',
    (ip) => {
      expect(checkIp(ip).blocked).toBe(true);
    },
  );

  fcTest.prop([arbIPInRange('100.64')])(
    'blocks all 100.64.0.0/10 addresses (CGNAT range sample)',
    (ip) => {
      expect(checkIp(ip).blocked).toBe(true);
    },
  );

  fcTest.prop([arbPublicIPv4])(
    'allows public IPv4 addresses',
    (ip) => {
      expect(checkIp(ip).blocked).toBe(false);
    },
  );
});

// Property for GAP-SEC-001: IPv4-mapped IPv6 normalized before check
describe('property: IPv4-mapped IPv6 normalization', () => {
  const arbMappedPrivate = arbIPInRange('10').map((ip) => `::ffff:${ip}`);

  fcTest.prop([arbMappedPrivate])(
    'blocks all ::ffff:10.x.x.x mapped addresses',
    (ip) => {
      expect(checkIp(ip).blocked).toBe(true);
    },
  );

  const arbMappedPublic = arbPublicIPv4.map((ip) => `::ffff:${ip}`);

  fcTest.prop([arbMappedPublic])(
    'allows ::ffff:public mapped addresses',
    (ip) => {
      expect(checkIp(ip).blocked).toBe(false);
    },
  );
});
