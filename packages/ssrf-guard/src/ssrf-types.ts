// SSRF types — discriminated unions and config for SSRF validation
// Implements: T-SEC-027, T-SEC-028, REQ-SEC-018, REQ-SEC-019

// --- SSRF Validation Result ---

export type SsrfValidationResult =
  | SsrfAllowed
  | SsrfBlocked;

type SsrfAllowed = {
  readonly _tag: 'allowed';
  readonly pinnedIp: string;
  readonly originalHost: string;
};

type SsrfBlocked = {
  readonly _tag: 'blocked';
  readonly originalHost: string;
  readonly reason: SsrfBlockReason;
};

// --- Block Reasons ---

export type SsrfBlockReason =
  | 'private_ipv4'
  | 'private_ipv6'
  | 'ipv4_mapped'
  | 'loopback'
  | 'link_local'
  | 'cgnat'
  | 'multicast'
  | 'broadcast'
  | 'unspecified'
  | 'scheme_disallowed'
  | 'dns_failed'
  | 'dns_timeout';

// --- DNS Fail Policy ---

export type DnsFailPolicy = 'open' | 'closed';

// --- Config ---

export type SsrfConfig = {
  readonly allowPrivateIps: boolean;
  readonly dnsFailPolicy: DnsFailPolicy;
  readonly dnsTimeoutMs: number;
};

export const DEFAULT_SSRF_CONFIG: SsrfConfig = {
  allowPrivateIps: false,
  dnsFailPolicy: 'open',
  dnsTimeoutMs: 5000,
};

// --- Metrics Port ---

export type SsrfCheckResult = 'allowed' | 'blocked' | 'dns_failed';

export type SsrfMetrics = {
  readonly recordCheck: (result: SsrfCheckResult, reason?: SsrfBlockReason) => void;
  readonly recordDnsResolution: (durationSeconds: number) => void;
};

export const NULL_SSRF_METRICS: SsrfMetrics = {
  recordCheck: (): void => { /* no-op */ },
  recordDnsResolution: (): void => { /* no-op */ },
};
