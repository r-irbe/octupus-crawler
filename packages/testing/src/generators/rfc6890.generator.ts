/**
 * RFC 6890 Reserved IP Range Generator
 *
 * fast-check arbitrary for all RFC 6890 reserved IP ranges.
 * Used in SSRF property tests to verify URL validation blocks reserved addresses.
 *
 * @see GAP-SEC-001, GAP-SEC-002
 * @see REQ-AGENT-100, REQ-AGENT-102
 */

import { fc } from '@fast-check/vitest';

/** RFC 6890 reserved IPv4 ranges */
const RFC_6890_RANGES = [
  { prefix: '0', desc: 'This host on this network' },
  { prefix: '10', desc: 'Private-Use (RFC 1918)' },
  { prefix: '100.64', desc: 'Shared Address Space (CGNAT)' },
  { prefix: '127', desc: 'Loopback' },
  { prefix: '169.254', desc: 'Link-Local' },
  { prefix: '172.16', desc: 'Private-Use (RFC 1918)' },
  { prefix: '192.0.0', desc: 'IETF Protocol Assignments' },
  { prefix: '192.0.2', desc: 'Documentation (TEST-NET-1)' },
  { prefix: '192.168', desc: 'Private-Use (RFC 1918)' },
  { prefix: '198.18', desc: 'Benchmarking' },
  { prefix: '198.51.100', desc: 'Documentation (TEST-NET-2)' },
  { prefix: '203.0.113', desc: 'Documentation (TEST-NET-3)' },
  { prefix: '240', desc: 'Reserved for Future Use' },
  { prefix: '255.255.255.255', desc: 'Limited Broadcast' },
] as const;

/** Generate a random octet (0-255) */
const arbOctet = fc.integer({ min: 0, max: 255 });

/** Generate an IP in a specific reserved range */
function arbIPInRange(prefix: string): fc.Arbitrary<string> {
  const parts = prefix.split('.');
  const remaining = 4 - parts.length;
  if (remaining === 0) return fc.constant(prefix);
  return fc.tuple(...Array.from({ length: remaining }, () => arbOctet)).map(
    (octets) => `${prefix}.${octets.join('.')}`,
  );
}

/** Arbitrary for any RFC 6890 reserved IPv4 address */
export const arbReservedIPv4 = fc.oneof(
  ...RFC_6890_RANGES.map((range) => arbIPInRange(range.prefix)),
);

/** IPv4-mapped IPv6 addresses (::ffff:x.x.x.x) */
export const arbIPv4MappedIPv6 = arbReservedIPv4.map(
  (ip) => `::ffff:${ip}`,
);

/** Arbitrary for reserved IPs in both IPv4 and IPv4-mapped IPv6 format */
export const arbReservedIP = fc.oneof(arbReservedIPv4, arbIPv4MappedIPv6);

/** Arbitrary for RFC 6890 reserved IP with range metadata */
export const arbReservedIPWithMeta = fc.oneof(
  ...RFC_6890_RANGES.map((range) =>
    arbIPInRange(range.prefix).map((ip) => ({
      ip,
      range: range.prefix,
      description: range.desc,
    })),
  ),
);
