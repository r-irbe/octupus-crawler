// IP range checker unit tests
// Validates: REQ-SEC-001 (IPv4 blocking), REQ-SEC-002 (IPv6 blocking),
// REQ-SEC-005 (literal IP detection), GAP-SEC-001 (IPv4-mapped IPv6),
// GAP-SEC-002 (CGNAT, multicast, broadcast)

import { describe, it, expect } from 'vitest';
import { checkIp, isLiteralIp } from './ip-range-checker.js';

describe('checkIp — IPv4 private ranges', () => {
  // Validates REQ-SEC-001: Block RFC 1918 Class A
  it('blocks 10.0.0.0/8', () => {
    expect(checkIp('10.0.0.1')).toEqual({ blocked: true, reason: 'private_ipv4' });
    expect(checkIp('10.255.255.255')).toEqual({ blocked: true, reason: 'private_ipv4' });
  });

  // Validates REQ-SEC-001: Block RFC 1918 Class B
  it('blocks 172.16.0.0/12', () => {
    expect(checkIp('172.16.0.1')).toEqual({ blocked: true, reason: 'private_ipv4' });
    expect(checkIp('172.31.255.255')).toEqual({ blocked: true, reason: 'private_ipv4' });
  });

  it('allows 172.32.0.1 (outside /12)', () => {
    expect(checkIp('172.32.0.1')).toEqual({ blocked: false });
  });

  // Validates REQ-SEC-001: Block RFC 1918 Class C
  it('blocks 192.168.0.0/16', () => {
    expect(checkIp('192.168.1.1')).toEqual({ blocked: true, reason: 'private_ipv4' });
  });

  // Validates REQ-SEC-001: Block loopback
  it('blocks 127.0.0.0/8', () => {
    expect(checkIp('127.0.0.1')).toEqual({ blocked: true, reason: 'loopback' });
    expect(checkIp('127.255.0.1')).toEqual({ blocked: true, reason: 'loopback' });
  });

  // Validates REQ-SEC-001: Block link-local
  it('blocks 169.254.0.0/16', () => {
    expect(checkIp('169.254.169.254')).toEqual({ blocked: true, reason: 'link_local' });
  });

  // Validates REQ-SEC-001: Block current network
  it('blocks 0.0.0.0/8', () => {
    expect(checkIp('0.0.0.0')).toEqual({ blocked: true, reason: 'unspecified' });
    expect(checkIp('0.255.0.1')).toEqual({ blocked: true, reason: 'unspecified' });
  });

  // Validates GAP-SEC-002: CGNAT
  it('blocks 100.64.0.0/10 (CGNAT)', () => {
    expect(checkIp('100.64.0.1')).toEqual({ blocked: true, reason: 'cgnat' });
    expect(checkIp('100.127.255.255')).toEqual({ blocked: true, reason: 'cgnat' });
  });

  it('allows 100.128.0.1 (outside CGNAT /10)', () => {
    expect(checkIp('100.128.0.1')).toEqual({ blocked: false });
  });

  // Validates GAP-SEC-002: Multicast
  it('blocks 224.0.0.0/4 (multicast)', () => {
    expect(checkIp('224.0.0.1')).toEqual({ blocked: true, reason: 'multicast' });
    expect(checkIp('239.255.255.255')).toEqual({ blocked: true, reason: 'multicast' });
  });

  // Validates GAP-SEC-002: Broadcast
  it('blocks 255.255.255.255 (broadcast)', () => {
    expect(checkIp('255.255.255.255')).toEqual({ blocked: true, reason: 'broadcast' });
  });

  // Public IPs should be allowed
  it('allows public IPs', () => {
    expect(checkIp('8.8.8.8')).toEqual({ blocked: false });
    expect(checkIp('93.184.216.34')).toEqual({ blocked: false });
    expect(checkIp('1.1.1.1')).toEqual({ blocked: false });
  });
});

describe('checkIp — IPv6', () => {
  // Validates REQ-SEC-002: Block IPv6 loopback
  it('blocks ::1 (loopback)', () => {
    expect(checkIp('::1')).toEqual({ blocked: true, reason: 'loopback' });
  });

  // Validates REQ-SEC-002: Block unspecified
  it('blocks :: (unspecified)', () => {
    expect(checkIp('::')).toEqual({ blocked: true, reason: 'unspecified' });
  });

  // Validates REQ-SEC-002: Block unique local (fc00::/7)
  it('blocks fc00::/7 (unique local)', () => {
    expect(checkIp('fc00::1')).toEqual({ blocked: true, reason: 'private_ipv6' });
    expect(checkIp('fd00::1')).toEqual({ blocked: true, reason: 'private_ipv6' });
  });

  // Validates REQ-SEC-002: Block link-local (fe80::/10)
  it('blocks fe80::/10 (link-local)', () => {
    expect(checkIp('fe80::1')).toEqual({ blocked: true, reason: 'link_local' });
  });

  it('allows public IPv6', () => {
    expect(checkIp('2001:db8::1')).toEqual({ blocked: false });
    expect(checkIp('2606:4700:4700::1111')).toEqual({ blocked: false });
  });
});

describe('checkIp — IPv4-mapped IPv6', () => {
  // Validates GAP-SEC-001: Normalize ::ffff:x.x.x.x to IPv4 before checking
  it('blocks ::ffff:127.0.0.1 (mapped loopback)', () => {
    expect(checkIp('::ffff:127.0.0.1')).toEqual({ blocked: true, reason: 'loopback' });
  });

  it('blocks ::ffff:10.0.0.1 (mapped private)', () => {
    expect(checkIp('::ffff:10.0.0.1')).toEqual({ blocked: true, reason: 'private_ipv4' });
  });

  it('blocks ::ffff:192.168.1.1 (mapped private)', () => {
    expect(checkIp('::ffff:192.168.1.1')).toEqual({ blocked: true, reason: 'private_ipv4' });
  });

  it('blocks ::FFFF:169.254.1.1 (case insensitive)', () => {
    expect(checkIp('::FFFF:169.254.1.1')).toEqual({ blocked: true, reason: 'link_local' });
  });

  it('allows ::ffff:8.8.8.8 (mapped public)', () => {
    expect(checkIp('::ffff:8.8.8.8')).toEqual({ blocked: false });
  });
});

describe('isLiteralIp', () => {
  // Validates REQ-SEC-005: Detect literal IPs
  it('detects IPv4 addresses', () => {
    expect(isLiteralIp('127.0.0.1')).toBe(true);
    expect(isLiteralIp('10.0.0.1')).toBe(true);
    expect(isLiteralIp('8.8.8.8')).toBe(true);
  });

  it('detects IPv6 addresses', () => {
    expect(isLiteralIp('::1')).toBe(true);
    expect(isLiteralIp('fe80::1')).toBe(true);
    expect(isLiteralIp('2001:db8::1')).toBe(true);
  });

  it('rejects domain names', () => {
    expect(isLiteralIp('example.com')).toBe(false);
    expect(isLiteralIp('localhost')).toBe(false);
  });
});
