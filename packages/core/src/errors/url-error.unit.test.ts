// Validates REQ-ARCH-012: Discriminated unions keyed by `kind` field — UrlError (3 variants)
// Validates REQ-ARCH-013: Typed error constructor functions enforce correct fields at compile time
import { describe, it, expect } from 'vitest';
import type { UrlError } from './url-error.js';
import {
  createInvalidUrlError,
  createDisallowedSchemeError,
  createEmptyUrlError,
} from './url-error.js';

describe('UrlError constructors', () => {
  // Validates REQ-ARCH-013: typed constructors enforce correct fields
  it('creates an invalid_url error', () => {
    const err = createInvalidUrlError({ raw: 'not a url', reason: 'malformed syntax' });
    expect(err.kind).toBe('invalid_url');
    expect(err.raw).toBe('not a url');
    expect(err.reason).toBe('malformed syntax');
    expect(err.message).toContain('invalid');
  });

  it('creates a disallowed_scheme error', () => {
    const err = createDisallowedSchemeError({ raw: 'ftp://files.example.com', scheme: 'ftp' });
    expect(err.kind).toBe('disallowed_scheme');
    expect(err.raw).toBe('ftp://files.example.com');
    expect(err.scheme).toBe('ftp');
    expect(err.message).toContain('scheme');
  });

  it('creates an empty_url error', () => {
    const err = createEmptyUrlError();
    expect(err.kind).toBe('empty_url');
    expect(err.message).toContain('empty');
  });
});

// Validates REQ-ARCH-012: discriminated union with `kind` field enables exhaustive narrowing
describe('UrlError kind narrowing', () => {
  it('covers all 3 variants exhaustively', () => {
    const errors: UrlError[] = [
      createInvalidUrlError({ raw: 'bad', reason: 'r' }),
      createDisallowedSchemeError({ raw: 'ftp://x', scheme: 'ftp' }),
      createEmptyUrlError(),
    ];

    const kinds = errors.map((e) => e.kind);
    expect(kinds).toEqual(['invalid_url', 'disallowed_scheme', 'empty_url']);
  });

  it('narrows to specific variant via kind switch', () => {
    const errors: UrlError[] = [createDisallowedSchemeError({ raw: 'ftp://x', scheme: 'ftp' })];
    const err = errors[0];
    // Type narrowing: err is UrlError | undefined (noUncheckedIndexedAccess)
    expect(err).toBeDefined();
    if (err?.kind === 'disallowed_scheme') {
      expect(err.scheme).toBe('ftp');
    } else {
      expect.unreachable('Expected disallowed_scheme kind');
    }
  });
});
