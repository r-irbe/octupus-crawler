/**
 * SSRF Payload Generator
 *
 * fast-check arbitrary for SSRF attack vectors: redirect chains,
 * IPv4-mapped IPv6, URL encoding bypass, scheme abuse.
 *
 * @see REQ-AGENT-100
 */

import { fc } from '@fast-check/vitest';
import { arbReservedIPv4, arbIPv4MappedIPv6 } from './rfc6890.generator';

/** URL-encoded representations of reserved IPs */
export const arbURLEncodedReservedIP = arbReservedIPv4.map((ip: string) =>
  ip
    .split('.')
    .map((octet: string) => `%${parseInt(octet, 10).toString(16).padStart(2, '0')}`)
    .join('.'),
);

/** Decimal IP representation (e.g., 127.0.0.1 = 2130706433) */
export const arbDecimalIP = arbReservedIPv4.map((ip: string) => {
  const parts = ip.split('.').map(Number);
  const decimal = ((parts[0]! << 24) | (parts[1]! << 16) | (parts[2]! << 8) | parts[3]!) >>> 0;
  return `http://${decimal}/`;
});

/** Octal IP representation */
export const arbOctalIP = arbReservedIPv4.map((ip: string) =>
  `http://${ip
    .split('.')
    .map((o: string) => `0${parseInt(o, 10).toString(8)}`)
    .join('.')}/`,
);

/** Mixed SSRF payloads combining various bypass techniques */
export const arbSSRFPayload = fc.oneof(
  // Direct reserved IP
  arbReservedIPv4.map((ip: string) => `http://${ip}/`),
  // IPv4-mapped IPv6
  arbIPv4MappedIPv6.map((ip: string) => `http://[${ip}]/`),
  // Decimal encoding
  arbDecimalIP,
  // Octal encoding
  arbOctalIP,
  // URL-encoded
  arbURLEncodedReservedIP.map((ip: string) => `http://${ip}/`),
  // @ bypass (user@host)
  arbReservedIPv4.map((ip: string) => `http://public.example.com@${ip}/`),
  // DNS rebinding via zero TTL
  fc.constant('http://0.0.0.0/'),
  // Bracketed IPv6 localhost
  fc.constant('http://[::1]/'),
  fc.constant('http://[0:0:0:0:0:0:0:1]/'),
);
