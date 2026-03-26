// HTTP Fetcher — main fetch with redirect loop, SSRF, metrics
// Implements: T-FETCH-005 to 011, T-FETCH-017, T-FETCH-025 to 031

import type { Readable } from 'node:stream';
import { ok, err, type Result } from 'neverthrow';
import type { AsyncResult } from '@ipf/core/types/result';
import type { FetchError } from '@ipf/core/errors/fetch-error';
import type { FetchMetrics } from './fetch-types.js';
import { NULL_FETCH_METRICS } from './fetch-types.js';
import {
  classifyError,
  classifyBodyTooLarge,
  classifyTooManyRedirects,
  classifySsrfBlocked,
  classifyHttpStatus,
} from './error-classifier.js';
import { checkContentLength, readBodyStream, drainBody } from './stream-processor.js';

// --- Types ---

/** Injectable HTTP client (REQ-FETCH-003) */
export type HttpClient = {
  readonly request: (url: string, opts: HttpRequestOptions) => Promise<HttpResponse>;
};

export type HttpRequestOptions = {
  readonly method: string;
  readonly headers: Record<string, string>;
  readonly signal?: AbortSignal;
  readonly maxRedirections?: number;
};

export type HttpResponse = {
  readonly statusCode: number;
  readonly headers: Record<string, string | string[] | undefined>;
  readonly body: Readable;
};

/** SSRF validator — returns allowed (with pinned IP) or blocked */
export type SsrfValidator = (url: URL) => Promise<SsrfCheckResult>;
export type SsrfCheckResult =
  | { readonly _tag: 'allowed'; readonly pinnedIp: string; readonly originalHost: string }
  | { readonly _tag: 'blocked'; readonly reason: string }
  | null;

export type FetcherConfig = {
  readonly userAgent: string;
  readonly timeoutMs: number;
  readonly maxRedirects: number;
  readonly maxBodyBytes: number;
};

export type FetchResultData = {
  readonly statusCode: number;
  readonly body: string;
  readonly headers: Record<string, string>;
  readonly requestedUrl: string;
  readonly finalUrl: string;
  readonly durationMs: number;
  readonly bodyBytes: number;
};

const REDIRECT_CODES = new Set([301, 302, 303, 307, 308]);

// --- Fetcher ---

export async function httpFetch(
  url: string,
  client: HttpClient,
  config: FetcherConfig,
  ssrfValidator: SsrfValidator,
  metrics: FetchMetrics = NULL_FETCH_METRICS,
): AsyncResult<FetchResultData, FetchError> {
  const startMs = performance.now();
  let currentUrl = url;
  let redirectCount = 0;

  try {
    const signal = AbortSignal.timeout(config.timeoutMs);

    for (;;) {
      // SSRF validation per hop (REQ-FETCH-007)
      const ssrf = await ssrfValidator(new URL(currentUrl));

      if (ssrf !== null && ssrf._tag === 'blocked') {
        return fail(classifySsrfBlocked(ssrf.reason, url), startMs, metrics);
      }

      // Build request headers (REQ-FETCH-002, REQ-FETCH-023)
      const headers: Record<string, string> = { 'User-Agent': config.userAgent };
      let targetUrl = currentUrl;

      if (ssrf !== null) {
        // Pinned IP + Host header (REQ-FETCH-023)
        headers['Host'] = ssrf.originalHost;
        const target = new URL(currentUrl);
        target.hostname = ssrf.pinnedIp;
        targetUrl = target.toString();
      }

      const res = await client.request(targetUrl, {
        method: 'GET',
        headers,
        signal,
        maxRedirections: 0,
      });

      // Handle redirects (REQ-FETCH-004)
      if (REDIRECT_CODES.has(res.statusCode)) {
        redirectCount++;
        metrics.recordRedirect();

        if (redirectCount > config.maxRedirects) {
          await safeDrain(res.body);
          return fail(classifyTooManyRedirects(config.maxRedirects, url), startMs, metrics);
        }

        const location = getHeader(res.headers, 'location');
        if (location === undefined) {
          await safeDrain(res.body);
          return fail(classifyHttpStatus(res.statusCode, url), startMs, metrics);
        }

        currentUrl = new URL(location, currentUrl).toString();
        await safeDrain(res.body);
        continue;
      }

      // Non-2xx → HTTP error
      if (res.statusCode < 200 || res.statusCode >= 300) {
        await safeDrain(res.body);
        return fail(classifyHttpStatus(res.statusCode, url), startMs, metrics);
      }

      return await readResponse(res, url, currentUrl, startMs, config, metrics);
    }
  } catch (cause: unknown) {
    return fail(classifyError(cause, url), startMs, metrics);
  }
}

// --- Body processing ---

async function readResponse(
  res: HttpResponse,
  requestedUrl: string,
  finalUrl: string,
  startMs: number,
  config: FetcherConfig,
  metrics: FetchMetrics,
): AsyncResult<FetchResultData, FetchError> {
  const clCheck = checkContentLength(res.headers, config.maxBodyBytes);
  if (clCheck.exceeded) {
    res.body.destroy();
    return fail(
      classifyBodyTooLarge(config.maxBodyBytes, clCheck.contentLength ?? 0, requestedUrl),
      startMs,
      metrics,
    );
  }

  const stream = await readBodyStream(res.body, config.maxBodyBytes);

  if ('kind' in stream) {
    if (stream.kind === 'body_too_large') {
      return fail(
        classifyBodyTooLarge(config.maxBodyBytes, stream.byteCount, requestedUrl),
        startMs,
        metrics,
      );
    }
    return fail(classifyError(stream.cause, requestedUrl), startMs, metrics);
  }

  const durationMs = performance.now() - startMs;
  metrics.recordFetch('success');
  metrics.recordDuration(durationMs / 1000);
  metrics.recordBodyBytes(stream.byteCount);

  return ok({
    statusCode: res.statusCode,
    body: stream.body,
    headers: flattenHeaders(res.headers),
    requestedUrl,
    finalUrl,
    durationMs,
    bodyBytes: stream.byteCount,
  });
}

// --- Helpers ---

function fail(
  error: FetchError,
  startMs: number,
  metrics: FetchMetrics,
): Result<never, FetchError> {
  metrics.recordFetch('error', error.kind);
  metrics.recordDuration((performance.now() - startMs) / 1000);
  return err(error);
}

async function safeDrain(body: Readable): Promise<void> {
  try {
    await drainBody(body);
  } catch {
    // Swallow drain errors — REQ-FETCH-024
  }
}

function getHeader(
  headers: Record<string, string | string[] | undefined>,
  name: string,
): string | undefined {
  const val = headers[name];
  if (typeof val === 'string') return val;
  if (Array.isArray(val)) return val[0];
  return undefined;
}

function flattenHeaders(
  headers: Record<string, string | string[] | undefined>,
): Record<string, string> {
  const result: Record<string, string> = {};
  for (const [key, value] of Object.entries(headers)) {
    if (typeof value === 'string') {
      result[key] = value;
    } else if (Array.isArray(value) && value.length > 0) {
      const first = value[0];
      if (first !== undefined) {
        result[key] = first;
      }
    }
  }
  return result;
}
