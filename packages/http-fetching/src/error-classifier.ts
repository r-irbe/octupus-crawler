// Error Classifier — map raw exceptions to FetchError discriminated union
// Implements: T-FETCH-016, REQ-FETCH-018

import type { FetchError } from '@ipf/core/errors/fetch-error';
import {
  createTimeoutError,
  createNetworkError,
  createHttpError,
  createSsrfBlockedError,
  createTooManyRedirectsError,
  createBodyTooLargeError,
  createDnsResolutionFailedError,
  createSslError,
  createConnectionRefusedError,
} from '@ipf/core/errors/fetch-error';

// --- Error codes for classification ---

const SSL_ERROR_CODES = new Set([
  'UNABLE_TO_VERIFY_LEAF_SIGNATURE',
  'CERT_HAS_EXPIRED',
  'DEPTH_ZERO_SELF_SIGNED_CERT',
  'SELF_SIGNED_CERT_IN_CHAIN',
  'ERR_TLS_CERT_ALTNAME_INVALID',
  'ERR_SSL_WRONG_VERSION_NUMBER',
  'CERT_NOT_YET_VALID',
]);

const DNS_ERROR_CODES = new Set([
  'ENOTFOUND',
  'EAI_AGAIN',
  'SERVFAIL',
  'ENODATA',
]);

// --- Classifier ---

export function classifyError(cause: unknown, url: string): FetchError {
  if (isAbortError(cause)) {
    return classifyAbortError(cause, url);
  }

  if (cause instanceof Error) {
    const code = getErrorCode(cause);

    if (code === 'ECONNREFUSED') {
      const { host, port } = parseHostPort(url);
      return createConnectionRefusedError({ url, host, port });
    }

    if (code !== undefined && SSL_ERROR_CODES.has(code)) {
      return createSslError({ url, code });
    }

    if (code !== undefined && DNS_ERROR_CODES.has(code)) {
      return createDnsResolutionFailedError({ url, hostname: extractHostname(url) });
    }

    // Generic network error fallback
    return createNetworkError({ url, cause });
  }

  // Non-Error thrown — wrap it
  return createNetworkError({
    url,
    cause: new Error(String(cause)),
  });
}

/** Create an HTTP error for non-2xx, non-redirect status codes */
export function classifyHttpStatus(statusCode: number, url: string): FetchError {
  return createHttpError({ url, statusCode });
}

/** Create SSRF blocked error */
export function classifySsrfBlocked(reason: string, url: string): FetchError {
  return createSsrfBlockedError({ url, reason });
}

/** Create too-many-redirects error */
export function classifyTooManyRedirects(maxRedirects: number, url: string): FetchError {
  return createTooManyRedirectsError({ url, maxRedirects });
}

/** Create body-too-large error */
export function classifyBodyTooLarge(maxBytes: number, actualBytes: number, url: string): FetchError {
  return createBodyTooLargeError({ url, maxBytes, actualBytes });
}

// --- Internal helpers ---

function isAbortError(cause: unknown): cause is DOMException | Error {
  if (cause instanceof DOMException && cause.name === 'AbortError') {
    return true;
  }
  if (cause instanceof DOMException && cause.name === 'TimeoutError') {
    return true;
  }
  if (cause instanceof Error && cause.name === 'AbortError') {
    return true;
  }
  return false;
}

function classifyAbortError(cause: DOMException | Error, url: string): FetchError {
  // AbortSignal.timeout() throws TimeoutError in modern Node.js
  if (cause instanceof DOMException && cause.name === 'TimeoutError') {
    return createTimeoutError({ url, timeoutMs: 0 });
  }
  return createTimeoutError({ url, timeoutMs: 0 });
}

function getErrorCode(err: Error): string | undefined {
  // Node.js errors have a 'code' property
  return (err as Error & { code?: string }).code;
}

function extractHostname(url: string): string {
  try {
    return new URL(url).hostname;
  } catch {
    return url;
  }
}

function parseHostPort(url: string): { host: string; port: number } {
  try {
    const parsed = new URL(url);
    const defaultPort = parsed.protocol === 'https:' ? 443 : 80;
    return {
      host: parsed.hostname,
      port: parsed.port ? Number(parsed.port) : defaultPort,
    };
  } catch {
    return { host: url, port: 0 };
  }
}
