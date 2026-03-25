// FetchError — 9-variant discriminated union keyed by `kind`
// Implements: REQ-ARCH-012, REQ-ARCH-013

import { stripUrlCredentials } from './strip-url-credentials.js';

// --- Variant types ---

type TimeoutError = {
  readonly kind: 'timeout';
  readonly url: string;
  readonly timeoutMs: number;
  readonly message: string;
};

type NetworkError = {
  readonly kind: 'network';
  readonly url: string;
  readonly cause: Error;
  readonly message: string;
};

type HttpError = {
  readonly kind: 'http';
  readonly url: string;
  readonly statusCode: number;
  readonly message: string;
};

type SsrfBlockedError = {
  readonly kind: 'ssrf_blocked';
  readonly url: string;
  readonly reason: string;
  readonly message: string;
};

type TooManyRedirectsError = {
  readonly kind: 'too_many_redirects';
  readonly url: string;
  readonly maxRedirects: number;
  readonly message: string;
};

type BodyTooLargeError = {
  readonly kind: 'body_too_large';
  readonly url: string;
  readonly maxBytes: number;
  readonly actualBytes: number;
  readonly message: string;
};

type DnsResolutionFailedError = {
  readonly kind: 'dns_resolution_failed';
  readonly url: string;
  readonly hostname: string;
  readonly message: string;
};

type SslError = {
  readonly kind: 'ssl_error';
  readonly url: string;
  readonly code: string;
  readonly message: string;
};

type ConnectionRefusedError = {
  readonly kind: 'connection_refused';
  readonly url: string;
  readonly host: string;
  readonly port: number;
  readonly message: string;
};

// --- Union type ---

export type FetchError =
  | TimeoutError
  | NetworkError
  | HttpError
  | SsrfBlockedError
  | TooManyRedirectsError
  | BodyTooLargeError
  | DnsResolutionFailedError
  | SslError
  | ConnectionRefusedError;

// --- Constructors ---

export function createTimeoutError(p: { url: string; timeoutMs: number }): TimeoutError {
  const safeUrl = stripUrlCredentials(p.url);
  return { kind: 'timeout', url: p.url, timeoutMs: p.timeoutMs, message: `Fetch timeout after ${String(p.timeoutMs)}ms for ${safeUrl}` };
}

export function createNetworkError(p: { url: string; cause: Error }): NetworkError {
  const safeUrl = stripUrlCredentials(p.url);
  return { kind: 'network', url: p.url, cause: p.cause, message: `network error fetching ${safeUrl}: ${p.cause.message}` };
}

export function createHttpError(p: { url: string; statusCode: number }): HttpError {
  const safeUrl = stripUrlCredentials(p.url);
  return { kind: 'http', url: p.url, statusCode: p.statusCode, message: `HTTP ${String(p.statusCode)} fetching ${safeUrl}` };
}

export function createSsrfBlockedError(p: { url: string; reason: string }): SsrfBlockedError {
  const safeUrl = stripUrlCredentials(p.url);
  return { kind: 'ssrf_blocked', url: p.url, reason: p.reason, message: `SSRF blocked for ${safeUrl}: ${p.reason}` };
}

export function createTooManyRedirectsError(p: { url: string; maxRedirects: number }): TooManyRedirectsError {
  const safeUrl = stripUrlCredentials(p.url);
  return { kind: 'too_many_redirects', url: p.url, maxRedirects: p.maxRedirects, message: `Too many redirects (max ${String(p.maxRedirects)}) for ${safeUrl}` };
}

export function createBodyTooLargeError(p: { url: string; maxBytes: number; actualBytes: number }): BodyTooLargeError {
  const safeUrl = stripUrlCredentials(p.url);
  return { kind: 'body_too_large', url: p.url, maxBytes: p.maxBytes, actualBytes: p.actualBytes, message: `Body too large (${String(p.actualBytes)} > ${String(p.maxBytes)}) for ${safeUrl}` };
}

export function createDnsResolutionFailedError(p: { url: string; hostname: string }): DnsResolutionFailedError {
  return { kind: 'dns_resolution_failed', url: p.url, hostname: p.hostname, message: `DNS resolution failed for ${p.hostname}` };
}

export function createSslError(p: { url: string; code: string }): SslError {
  const safeUrl = stripUrlCredentials(p.url);
  return { kind: 'ssl_error', url: p.url, code: p.code, message: `SSL error (${p.code}) for ${safeUrl}` };
}

export function createConnectionRefusedError(p: { url: string; host: string; port: number }): ConnectionRefusedError {
  return { kind: 'connection_refused', url: p.url, host: p.host, port: p.port, message: `Connection refused to ${p.host}:${String(p.port)}` };
}
