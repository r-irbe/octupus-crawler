// Hardened fetch orchestrator — SSRF-validated redirect following
// Implements: T-SEC-012 (per-redirect SSRF hook), REQ-SEC-004
// Uses primitives from fetch-hardening.ts

import { ok, err, type Result } from 'neverthrow';
import type { SsrfValidationResult, SsrfConfig, SsrfMetrics } from './ssrf-types.js';
import type { DnsResolver } from './ssrf-validator.js';
import { validateUrl } from './ssrf-validator.js';
import {
  createRedirectTracker,
  createCumulativeTimeout,
  checkContentLength,
  isAborted,
  isRedirect,
  type FetchHardeningConfig,
  type FetchHardeningError,
} from './fetch-hardening.js';
import { DEFAULT_FETCH_HARDENING_CONFIG } from './fetch-hardening.js';

// --- Per-redirect SSRF validation hook ---

/**
 * Validate a redirect destination URL through the SSRF guard.
 * REQ-SEC-004: Every redirect hop is validated, not just the initial URL.
 */
export async function validateRedirectTarget(
  redirectUrl: URL,
  resolver: DnsResolver,
  ssrfConfig: SsrfConfig,
  metrics: SsrfMetrics,
): Promise<Result<SsrfValidationResult, FetchHardeningError>> {
  const ssrfResult = await validateUrl(redirectUrl, resolver, ssrfConfig, metrics);

  if (ssrfResult.isErr()) {
    return err({
      _tag: 'fetch_error',
      message: ssrfResult.error.message,
      cause: ssrfResult.error.cause,
    });
  }

  const validation = ssrfResult.value;
  if (validation._tag === 'blocked') {
    return err({
      _tag: 'ssrf_blocked',
      reason: validation.reason,
      url: redirectUrl.href,
    });
  }

  return ok(validation);
}

// --- Hardened fetch orchestrator ---

export type FetchFn = (
  url: string,
  init: RequestInit,
) => Promise<Response>;

export type HardenedFetchResult = {
  readonly response: Response;
  readonly pinnedIp: string;
  readonly originalHost: string;
  readonly redirectCount: number;
};

/**
 * Perform a hardened fetch with SSRF validation on every redirect,
 * redirect counting, body size enforcement, and cumulative timeout.
 */
export async function hardenedFetch(
  initialUrl: URL,
  resolver: DnsResolver,
  fetchFn: FetchFn,
  ssrfConfig: SsrfConfig,
  hardeningConfig: FetchHardeningConfig = DEFAULT_FETCH_HARDENING_CONFIG,
  metrics: SsrfMetrics,
): Promise<Result<HardenedFetchResult, FetchHardeningError>> {
  const { signal, cleanup } = createCumulativeTimeout(hardeningConfig.timeoutMs);

  try {
    return await executeHardenedFetch(
      initialUrl, resolver, fetchFn, ssrfConfig, hardeningConfig, metrics, signal,
    );
  } finally {
    cleanup();
  }
}

async function executeHardenedFetch(
  initialUrl: URL,
  resolver: DnsResolver,
  fetchFn: FetchFn,
  ssrfConfig: SsrfConfig,
  config: FetchHardeningConfig,
  metrics: SsrfMetrics,
  signal: AbortSignal,
): Promise<Result<HardenedFetchResult, FetchHardeningError>> {
  let tracker = createRedirectTracker(config.maxRedirects);
  let currentUrl = initialUrl;
  let lastPinnedIp = '';
  let lastOriginalHost = '';

  // Validate initial URL
  const initialValidation = await validateRedirectTarget(currentUrl, resolver, ssrfConfig, metrics);
  if (initialValidation.isErr()) return err(initialValidation.error);

  const initial = initialValidation.value;
  if (initial._tag !== 'allowed') {
    return err({ _tag: 'ssrf_blocked', reason: 'unknown', url: currentUrl.href });
  }
  lastPinnedIp = initial.pinnedIp;
  lastOriginalHost = initial.originalHost;

  // Follow redirects manually
  for (;;) {
    if (signal.aborted) {
      return err({ _tag: 'timeout', elapsedMs: config.timeoutMs, limit: config.timeoutMs });
    }

    let response: Response;
    try {
      // F-001 fix: Use URL API for hostname substitution (handles IPv6 brackets)
      const fetchUrl = new URL(currentUrl.href);
      fetchUrl.hostname = lastPinnedIp;
      response = await fetchFn(
        fetchUrl.href,
        { redirect: 'manual', signal, headers: { Host: lastOriginalHost } },
      );
    } catch (cause: unknown) {
      const isAbortErr = cause instanceof DOMException && cause.name === 'AbortError';
      return isAbortErr
        ? err({ _tag: 'timeout' as const, elapsedMs: config.timeoutMs, limit: config.timeoutMs })
        : err({ _tag: 'fetch_error' as const, message: 'Fetch failed', cause });
    }

    // Not a redirect — return the response
    if (!isRedirect(response.status)) {
      const clCheck = checkContentLength(
        response.headers.get('content-length'),
        config.maxResponseBytes,
      );
      if (clCheck.isErr()) return err(clCheck.error);

      return ok({
        response,
        pinnedIp: lastPinnedIp,
        originalHost: lastOriginalHost,
        redirectCount: tracker.count,
      });
    }

    // It's a redirect — track it
    const followResult = tracker.follow();
    if (followResult.isErr()) return err(followResult.error);
    tracker = followResult.value;

    // F-003 fix: Cancel unconsumed redirect body to prevent connection pool leaks
    await response.body?.cancel();

    // Get redirect location
    const location = response.headers.get('location');
    if (!location) {
      return err({ _tag: 'fetch_error', message: 'Redirect with no Location header' });
    }

    // Resolve relative redirects
    currentUrl = new URL(location, currentUrl);

    // REQ-SEC-004: Validate redirect destination through SSRF guard
    const redirectValidation = await validateRedirectTarget(
      currentUrl, resolver, ssrfConfig, metrics,
    );
    if (redirectValidation.isErr()) return err(redirectValidation.error);

    // F-002 fix: Check abort after DNS-heavy validation (REQ-SEC-010 cumulative)
    if (isAborted(signal)) {
      return err({ _tag: 'timeout', elapsedMs: config.timeoutMs, limit: config.timeoutMs });
    }

    const validated = redirectValidation.value;
    if (validated._tag !== 'allowed') {
      return err({ _tag: 'ssrf_blocked', reason: 'unknown', url: currentUrl.href });
    }
    lastPinnedIp = validated.pinnedIp;
    lastOriginalHost = validated.originalHost;
  }
}
