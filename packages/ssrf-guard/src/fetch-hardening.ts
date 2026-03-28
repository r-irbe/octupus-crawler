// Fetch hardening primitives — types, config, redirect tracker, body limiter, timeout
// Implements: T-SEC-009 (redirect limit), T-SEC-010 (body size limit),
//             T-SEC-011 (cumulative timeout)
// REQ-SEC-008, REQ-SEC-009, REQ-SEC-010

import { ok, err, type Result } from 'neverthrow';

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

/** Check abort state without TypeScript narrowing interference. */
export function isAborted(signal: AbortSignal): boolean {
  return signal.aborted;
}

// --- Helpers ---

export function isRedirect(status: number): boolean {
  return status === 301 || status === 302 || status === 303 || status === 307 || status === 308;
}
