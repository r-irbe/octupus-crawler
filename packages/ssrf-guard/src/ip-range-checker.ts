// IP range checker — pure functions for SSRF IP validation
// Implements: T-SEC-001 to 005, REQ-SEC-001, REQ-SEC-002, REQ-SEC-005
// Closes: GAP-SEC-001 (IPv4-mapped IPv6), GAP-SEC-002 (CGNAT, multicast, broadcast)

import type { SsrfBlockReason } from './ssrf-types.js';

// --- IPv4 helpers (must be declared before BLOCKED_IPV4_RANGES) ---

const IPV4_RE = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/;

function isIpv4(address: string): boolean {
  return IPV4_RE.test(address);
}

function ipv4ToNumber(address: string): number {
  const m = IPV4_RE.exec(address);
  if (!m) return 0;
  const a = Number(m[1]);
  const b = Number(m[2]);
  const c = Number(m[3]);
  const d = Number(m[4]);
  return ((a << 24) | (b << 16) | (c << 8) | d) >>> 0;
}

// --- IPv4 CIDR Ranges (RFC 6890 + extensions) ---

type Ipv4Range = {
  readonly network: number;
  readonly mask: number;
  readonly reason: SsrfBlockReason;
};

function cidr(notation: string, reason: SsrfBlockReason): Ipv4Range {
  const [ip, bits] = notation.split('/') as [string, string];
  const network = ipv4ToNumber(ip);
  const mask = bits === '32'
    ? 0xFFFFFFFF
    : (~(0xFFFFFFFF >>> Number(bits))) >>> 0;
  return { network: (network & mask) >>> 0, mask, reason };
}

const BLOCKED_IPV4_RANGES: readonly Ipv4Range[] = [
  cidr('10.0.0.0/8', 'private_ipv4'),
  cidr('172.16.0.0/12', 'private_ipv4'),
  cidr('192.168.0.0/16', 'private_ipv4'),
  cidr('127.0.0.0/8', 'loopback'),
  cidr('169.254.0.0/16', 'link_local'),
  cidr('0.0.0.0/8', 'unspecified'),
  cidr('100.64.0.0/10', 'cgnat'),
  cidr('224.0.0.0/4', 'multicast'),
  cidr('255.255.255.255/32', 'broadcast'),
];

// --- IPv6 blocked ranges ---

type Ipv6Range = {
  readonly address: string;
  readonly prefixLen: number;
  readonly reason: SsrfBlockReason;
};

const BLOCKED_IPV6_RANGES: readonly Ipv6Range[] = [
  { address: '::1', prefixLen: 128, reason: 'loopback' },
  { address: '::', prefixLen: 128, reason: 'unspecified' },
  { address: 'fc00::', prefixLen: 7, reason: 'private_ipv6' },
  { address: 'fe80::', prefixLen: 10, reason: 'link_local' },
];

// --- Public API ---

export type IpCheckResult =
  | { readonly blocked: false }
  | { readonly blocked: true; readonly reason: SsrfBlockReason };

/** Check an IP address (IPv4 or IPv6) against all blocked ranges. */
export function checkIp(address: string): IpCheckResult {
  const normalized = normalizeIpv4Mapped(address);

  if (isIpv4(normalized)) {
    return checkIpv4(normalized);
  }

  return checkIpv6(normalized);
}

/** Returns true if the given string looks like a literal IP (v4 or v6). */
export function isLiteralIp(host: string): boolean {
  return isIpv4(host) || isIpv6Address(host);
}

// --- IPv4 range check ---

function checkIpv4(address: string): IpCheckResult {
  const num = ipv4ToNumber(address);
  for (const range of BLOCKED_IPV4_RANGES) {
    if (((num & range.mask) >>> 0) === range.network) {
      return { blocked: true, reason: range.reason };
    }
  }
  return { blocked: false };
}

// --- IPv6 ---

const IPV4_MAPPED_RE = /^::ffff:(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})$/i;

function normalizeIpv4Mapped(address: string): string {
  const match = IPV4_MAPPED_RE.exec(address);
  if (match?.[1]) {
    return match[1];
  }
  return address;
}

function isIpv6Address(address: string): boolean {
  return address.includes(':');
}

function checkIpv6(address: string): IpCheckResult {
  const expanded = expandIpv6(address.toLowerCase());

  for (const range of BLOCKED_IPV6_RANGES) {
    const rangeExpanded = expandIpv6(range.address);
    if (ipv6MatchesPrefix(expanded, rangeExpanded, range.prefixLen)) {
      return { blocked: true, reason: range.reason };
    }
  }

  return { blocked: false };
}

function expandIpv6(address: string): string {
  // Strip brackets if present (e.g., from URL parsing)
  const addr = address.startsWith('[')
    ? address.slice(1, address.indexOf(']'))
    : address;

  // Handle :: by splitting into left/right halves
  if (addr.includes('::')) {
    const [left, right] = addr.split('::') as [string, string];
    const leftParts = left === '' ? [] : left.split(':');
    const rightParts = right === '' ? [] : right.split(':');
    const missing = 8 - leftParts.length - rightParts.length;
    const middle = Array.from({ length: missing }, () => '0000');
    const all = [
      ...leftParts.map((p) => p.padStart(4, '0')),
      ...middle,
      ...rightParts.map((p) => p.padStart(4, '0')),
    ];
    return all.join(':');
  }

  return addr.split(':').map((p) => p.padStart(4, '0')).join(':');
}

function ipv6MatchesPrefix(
  address: string,
  network: string,
  prefixLen: number,
): boolean {
  const addrBytes = ipv6ToBytes(address);
  const netBytes = ipv6ToBytes(network);

  let remaining = prefixLen;
  for (let i = 0; i < 16 && remaining > 0; i++) {
    const addrByte = addrBytes[i] ?? 0;
    const netByte = netBytes[i] ?? 0;

    if (remaining >= 8) {
      if (addrByte !== netByte) return false;
      remaining -= 8;
    } else {
      const mask = (0xFF << (8 - remaining)) & 0xFF;
      if ((addrByte & mask) !== (netByte & mask)) return false;
      remaining = 0;
    }
  }

  return true;
}

function ipv6ToBytes(expanded: string): number[] {
  const groups = expanded.split(':');
  const bytes: number[] = [];
  for (const group of groups) {
    const val = parseInt(group, 16);
    bytes.push((val >> 8) & 0xFF);
    bytes.push(val & 0xFF);
  }
  return bytes;
}
