// Unit tests for NormalizedUrl brand type
// Validates: T-TCH-007, REQ-TCH-008

import { describe, it, expect } from 'vitest';
import { brandNormalizedUrl, type NormalizedUrl } from './normalized-url.js';

describe('brandNormalizedUrl', () => {
  // Validates REQ-TCH-008: brand construction
  it('returns the same string value', () => {
    const url = 'https://example.com/page';
    const branded: NormalizedUrl = brandNormalizedUrl(url);
    expect(branded).toBe(url);
  });

  // Validates REQ-TCH-008: can be used as string
  it('branded value is usable as a string', () => {
    const branded = brandNormalizedUrl('https://example.com');
    expect(branded.startsWith('https://')).toBe(true);
    expect(branded.length).toBeGreaterThan(0);
  });

  // Validates REQ-TCH-008: different inputs produce different brands
  it('different URLs produce different branded values', () => {
    const a = brandNormalizedUrl('https://a.com');
    const b = brandNormalizedUrl('https://b.com');
    expect(a).not.toBe(b);
  });
});
