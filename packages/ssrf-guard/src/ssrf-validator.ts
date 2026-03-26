// SSRF validator — DNS resolution + IP validation + pinning
// Implements: T-SEC-006 to 008, T-SEC-025 to 028
// REQ-SEC-003 to 007, REQ-SEC-016 to 019

import { ok, err, type Result } from 'neverthrow';
import { checkIp, isLiteralIp } from './ip-range-checker.js';
import type {
  SsrfValidationResult,
  SsrfConfig,
  SsrfMetrics,
  SsrfBlockReason,
} from './ssrf-types.js';
import { DEFAULT_SSRF_CONFIG, NULL_SSRF_METRICS } from './ssrf-types.js';

// --- DNS Resolver abstraction (for testability) ---

export type DnsResolver = {
  readonly resolve4: (hostname: string) => Promise<string[]>;
  readonly resolve6: (hostname: string) => Promise<string[]>;
};

// --- Error type ---

export type SsrfError = {
  readonly kind: 'ssrf_validation_error';
  readonly message: string;
  readonly cause?: unknown;
};

// --- Public API ---

/**
 * Validate a URL against SSRF blocked ranges.
 * Returns the validation result with a pinned IP for the Fetcher to connect to.
 *
 * REQ-SEC-018: Returns pinned IP to eliminate TOCTOU window.
 * REQ-SEC-016: Validates ALL resolved IPs, not just the first.
 */
export async function validateUrl(
  url: URL,
  resolver: DnsResolver,
  config: SsrfConfig = DEFAULT_SSRF_CONFIG,
  metrics: SsrfMetrics = NULL_SSRF_METRICS,
): Promise<Result<SsrfValidationResult, SsrfError>> {
  const host = url.hostname.replace(/^\[/, '').replace(/\]$/, '');

  // REQ-SEC-011: Only http/https allowed
  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    const reason: SsrfBlockReason = 'scheme_disallowed';
    metrics.recordCheck('blocked', reason);
    return ok({ _tag: 'blocked', originalHost: host, reason });
  }

  // REQ-SEC-005: Literal IP → direct check, skip DNS
  if (isLiteralIp(host)) {
    return validateLiteralIp(host, config, metrics);
  }

  // REQ-SEC-003: DNS resolution → validate resolved IPs
  return validateViaDns(host, resolver, config, metrics);
}

// --- Internal ---

function validateLiteralIp(
  host: string,
  config: SsrfConfig,
  metrics: SsrfMetrics,
): Result<SsrfValidationResult, SsrfError> {
  const result = checkIp(host);

  if (result.blocked) {
    // REQ-SEC-007: ALLOW_PRIVATE_IPS bypass
    if (config.allowPrivateIps) {
      metrics.recordCheck('allowed');
      return ok({ _tag: 'allowed', pinnedIp: host, originalHost: host });
    }
    metrics.recordCheck('blocked', result.reason);
    return ok({ _tag: 'blocked', originalHost: host, reason: result.reason });
  }

  metrics.recordCheck('allowed');
  return ok({ _tag: 'allowed', pinnedIp: host, originalHost: host });
}

async function validateViaDns(
  hostname: string,
  resolver: DnsResolver,
  config: SsrfConfig,
  metrics: SsrfMetrics,
): Promise<Result<SsrfValidationResult, SsrfError>> {
  const startTime = performance.now();

  let ips: string[];
  try {
    ips = await resolveWithTimeout(hostname, resolver, config.dnsTimeoutMs);
  } catch (cause: unknown) {
    const durationSec = (performance.now() - startTime) / 1000;
    metrics.recordDnsResolution(durationSec);

    // REQ-SEC-006 + REQ-SEC-017: DNS fail policy
    if (config.dnsFailPolicy === 'open') {
      metrics.recordCheck('dns_failed');
      return err({
        kind: 'ssrf_validation_error' as const,
        message: `DNS resolution failed for ${hostname}`,
        cause,
      });
    }

    const reason: SsrfBlockReason = isTimeoutError(cause) ? 'dns_timeout' : 'dns_failed';
    metrics.recordCheck('blocked', reason);
    return ok({ _tag: 'blocked', originalHost: hostname, reason });
  }

  const durationSec = (performance.now() - startTime) / 1000;
  metrics.recordDnsResolution(durationSec);

  if (ips.length === 0) {
    if (config.dnsFailPolicy === 'closed') {
      metrics.recordCheck('blocked', 'dns_failed');
      return ok({ _tag: 'blocked', originalHost: hostname, reason: 'dns_failed' });
    }
    metrics.recordCheck('dns_failed');
    return err({
      kind: 'ssrf_validation_error' as const,
      message: `DNS resolution returned no addresses for ${hostname}`,
    });
  }

  // REQ-SEC-016: Validate ALL resolved IPs — if ANY is blocked, block the request
  for (const ip of ips) {
    const result = checkIp(ip);
    if (result.blocked) {
      if (config.allowPrivateIps) {
        continue;
      }
      metrics.recordCheck('blocked', result.reason);
      return ok({ _tag: 'blocked', originalHost: hostname, reason: result.reason });
    }
  }

  // REQ-SEC-018: Return first IP as pinned IP for connection
  const pinnedIp = ips[0];
  if (!pinnedIp) {
    return err({
      kind: 'ssrf_validation_error' as const,
      message: `No valid IPs after DNS resolution for ${hostname}`,
    });
  }

  metrics.recordCheck('allowed');
  return ok({ _tag: 'allowed', pinnedIp, originalHost: hostname });
}

async function resolveWithTimeout(
  hostname: string,
  resolver: DnsResolver,
  timeoutMs: number,
): Promise<string[]> {
  const controller = new AbortController();
  const timer = setTimeout(() => { controller.abort(); }, timeoutMs);

  try {
    const resolve = Promise.all([
      resolver.resolve4(hostname).catch(() => [] as string[]),
      resolver.resolve6(hostname).catch(() => [] as string[]),
    ]);

    const result = await Promise.race([
      resolve,
      abortPromise(controller.signal),
    ]);

    return [...result[0], ...result[1]];
  } finally {
    clearTimeout(timer);
  }
}

function abortPromise(signal: AbortSignal): Promise<never> {
  return new Promise((_, reject) => {
    if (signal.aborted) {
      reject(new DnsTimeoutError());
      return;
    }
    signal.addEventListener('abort', () => { reject(new DnsTimeoutError()); }, {
      once: true,
    });
  });
}

class DnsTimeoutError extends Error {
  override readonly name = 'DnsTimeoutError' as const;
  constructor() {
    super('DNS resolution timed out');
  }
}

function isTimeoutError(cause: unknown): boolean {
  return cause instanceof DnsTimeoutError;
}
