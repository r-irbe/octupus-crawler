// Fetch hardening — redirect limiting, body size enforcement, cumulative timeout
// Implements: T-SEC-009 (redirect limit), T-SEC-010 (body size limit),
//             T-SEC-011 (cumulative timeout), T-SEC-012 (per-redirect SSRF hook)
// REQ-SEC-004, REQ-SEC-008, REQ-SEC-009, REQ-SEC-010

import { ok, err, type Result } from 'neverthrow';
import type { SsrfValidationResult, SsrfConfig, SsrfMetrics } from './ssrf-types.js';
import type { DnsResolver } from './ssrf-validator.js';
import { validateUrl } from './ssrf-validator.js';

// --- Configuration ---

export type FetchHardeningConfig = {
  readonly maxRedirects: number;
  readonly maxResponseBytes: number;
  readonly timeoutMs: number;
};

export const DEFAULT_FETCH_HARDENING_CONFIG: FetchHardeningConfig = {
  maxRedirects: 5,
  maxResponseBytes: 10 * 1024 * 1024, // 10 MiB
  timeoutMs: 30_000,
};

// --- Error types ---

export type FetchHardeningError =
  | { readonly _tag: 'too_many_redirects'; readonly count: number; readonly limit: number }
  | { readonly _tag: 'body_too_large'; readonly bytes: number; readonly limit: number }
  | { readonly _tag: 'timeout'; readonly elapsedMs: number; readonly limit: number }
  | { readonly _tag: 'ssrf_blocked'; readonly reason: string; readonly url: string }
  | { readonly _tag: 'fetch_error'; readonly message: string; readonly cause?: unknown };

// --- Redirect tracker ---

export type RedirectTracker = {
  readonly count: number;
  readonly canRedirect: boolean;
  follow(): Result<RedirectTracker, FetchHardeningError>;
};

/** Create a redirect tracker with a configurable limit. REQ-SEC-008 */
export function createRedirectTracker(maxRedirects: number): RedirectTracker {
  return buildTracker(0, maxRedirects);
}

function buildTracker(count: number, limit: number): RedirectTracker {
  return {
    count,
    canRedirect: count < limit,
    follow(): Result<RedirectTracker, FetchHardeningError> {
      const next = count + 1;
      if (next > limit) {
        return err({ _tag: 'too_many_redirects', count: next, limit });
      }
      return ok(buildTracker(next, limit));
    },
  };
}

// --- Body size limiter (TransformStream) ---

/**
 * Create a TransformStream that enforces a byte size limit on the response body.
 * REQ-SEC-009: Streaming byte counter; destroys stream at limit.
 */
export function createBodySizeLimiter(
  maxBytes: number,
): TransformStream<Uint8Array, Uint8Array> {
  let bytesRead = 0;

  return new TransformStream<Uint8Array, Uint8Array>({
    transform(chunk, controller): void {
      bytesRead += chunk.byteLength;
      if (bytesRead > maxBytes) {
        controller.error(
          Object.freeze({
            _tag: 'body_too_large' as const,
            bytes: bytesRead,
            limit: maxBytes,
          }),
        );
        return;
      }
      controller.enqueue(chunk);
    },
  });
}

/**
 * Pre-flight check: reject immediately if Content-Length exceeds limit.
 * REQ-FETCH-015 per design.md §6.
 */
export function checkContentLength(
  headerValue: string | null | undefined,
  maxBytes: number,
): Result<void, FetchHardeningError> {
  if (headerValue == null) {
    return ok(undefined);
  }
  const length = Number(headerValue);
  if (Number.isNaN(length)) {
    return ok(undefined);
  }
  if (length > maxBytes) {
    return err({ _tag: 'body_too_large', bytes: length, limit: maxBytes });
  }
  return ok(undefined);
}

// --- Cumulative timeout ---

/**
 * Create an AbortSignal that fires after the cumulative timeout.
 * REQ-SEC-010: Cumulative across entire redirect chain.
 * Returns the signal and a cleanup function to clear the timer.
 */
export function createCumulativeTimeout(
  timeoutMs: number,
): { signal: AbortSignal; cleanup: () => void } {
  const controller = new AbortController();
  const timer = setTimeout(() => { controller.abort(); }, timeoutMs);
  return {
    signal: controller.signal,
    cleanup(): void { clearTimeout(timer); },
  };
}

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
      response = await fetchFn(
        currentUrl.href.replace(currentUrl.hostname, lastPinnedIp),
        { redirect: 'manual', signal, headers: { Host: lastOriginalHost } },
      );
    } catch (cause: unknown) {
      const isAbort = cause instanceof DOMException && cause.name === 'AbortError';
      return isAbort
        ? err({ _tag: 'timeout' as const, elapsedMs: config.timeoutMs, limit: config.timeoutMs })
        : err({ _tag: 'fetch_error' as const, message: 'Fetch failed', cause });
    }

    // Not a redirect — return the response
    if (!isRedirect(response.status)) {
      // Check Content-Length pre-flight
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

    const validated = redirectValidation.value;
    if (validated._tag !== 'allowed') {
      return err({ _tag: 'ssrf_blocked', reason: 'unknown', url: currentUrl.href });
    }
    lastPinnedIp = validated.pinnedIp;
    lastOriginalHost = validated.originalHost;
  }
}

function isRedirect(status: number): boolean {
  return status === 301 || status === 302 || status === 303 || status === 307 || status === 308;
}
