/**
 * DNS Rebinding Generator
 *
 * fast-check arbitrary for TOCTOU payloads and DNS rebinding sequences.
 * Tests that URL validation pins DNS resolution and re-validates after resolve.
 *
 * @see GAP-SEC-003, GAP-SEC-004
 * @see REQ-AGENT-100
 */

import { fc } from '@fast-check/vitest';
import { arbReservedIPv4 } from './rfc6890.generator';

/** Domains that could resolve to different IPs on subsequent lookups */
export const arbRebindingDomain = fc.oneof(
  fc.constant('rebind.network'),
  fc.constant('1u.ms'),
  fc.hexaString({ minLength: 8, maxLength: 8 }).map(
    (hex: string) => `${hex}.rebind.it`,
  ),
);

/** TOCTOU payload: a domain paired with a safe IP (first resolve) and reserved IP (second resolve) */
export const arbTOCTOUPayload = fc.record({
  domain: arbRebindingDomain,
  firstResolve: fc.ipV4(), // public IP on first lookup
  secondResolve: arbReservedIPv4, // reserved IP on rebind
  ttl: fc.integer({ min: 0, max: 5 }), // low TTL to enable rebinding
});

/** Redirect chain that starts public but redirects to a reserved IP */
export const arbRedirectChain = fc.tuple(
  fc.webUrl(),
  fc.integer({ min: 1, max: 5 }),
  arbReservedIPv4,
).map(([startUrl, hops, targetIP]: [string, number, string]) => ({
  startUrl,
  hops,
  finalTarget: `http://${targetIP}/`,
  description: `Redirect chain: ${hops} hops from ${startUrl} to reserved ${targetIP}`,
}));

/** Scheme abuse payloads */
export const arbSchemeAbuse = fc.oneof(
  fc.constant('file:///etc/passwd'),
  fc.constant('gopher://127.0.0.1:25/'),
  fc.constant('dict://127.0.0.1:11211/'),
  arbReservedIPv4.map((ip: string) => `http://${ip}:6379/`),
  arbReservedIPv4.map((ip: string) => `https://${ip}:5432/`),
);
