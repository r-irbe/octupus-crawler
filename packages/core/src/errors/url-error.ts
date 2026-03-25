// UrlError — 3-variant discriminated union keyed by `kind`
// Implements: REQ-ARCH-012, REQ-ARCH-013

// --- Variant types ---

type InvalidUrlError = {
  readonly kind: 'invalid_url';
  readonly raw: string;
  readonly reason: string;
  readonly message: string;
};

type DisallowedSchemeError = {
  readonly kind: 'disallowed_scheme';
  readonly raw: string;
  readonly scheme: string;
  readonly message: string;
};

type EmptyUrlError = {
  readonly kind: 'empty_url';
  readonly message: string;
};

// --- Union type ---

export type UrlError =
  | InvalidUrlError
  | DisallowedSchemeError
  | EmptyUrlError;

// --- Constructors ---

export function createInvalidUrlError(p: { raw: string; reason: string }): InvalidUrlError {
  return { kind: 'invalid_url', raw: p.raw, reason: p.reason, message: `invalid URL "${p.raw}": ${p.reason}` };
}

export function createDisallowedSchemeError(p: { raw: string; scheme: string }): DisallowedSchemeError {
  return { kind: 'disallowed_scheme', raw: p.raw, scheme: p.scheme, message: `Disallowed scheme "${p.scheme}" in ${p.raw}` };
}

export function createEmptyUrlError(): EmptyUrlError {
  return { kind: 'empty_url', message: 'URL is empty' };
}
