// Job ID derivation unit tests
// Validates: REQ-DIST-001 (dedup via deterministic hash), REQ-DIST-008 (collision resistance)

import { describe, it, expect } from 'vitest';
import { deriveJobId } from './job-id.js';

describe('deriveJobId', () => {
  // Validates REQ-DIST-001: deterministic hash
  it('returns same ID for same URL', () => {
    const id1 = deriveJobId('https://example.com/page');
    const id2 = deriveJobId('https://example.com/page');
    expect(id1).toBe(id2);
  });

  // Validates REQ-DIST-001: unique IDs for different URLs
  it('returns different IDs for different URLs', () => {
    const id1 = deriveJobId('https://example.com/a');
    const id2 = deriveJobId('https://example.com/b');
    expect(id1).not.toBe(id2);
  });

  // Validates REQ-DIST-008: 128-bit = 32 hex chars
  it('returns a 32-character hex string', () => {
    const id = deriveJobId('https://example.com');
    expect(id).toHaveLength(32);
    expect(id).toMatch(/^[0-9a-f]{32}$/);
  });

  // Validates REQ-DIST-001: empty string produces valid hash
  it('handles empty string input', () => {
    const id = deriveJobId('');
    expect(id).toHaveLength(32);
    expect(id).toMatch(/^[0-9a-f]{32}$/);
  });

  // Validates REQ-DIST-008: different inputs produce different truncated hashes
  it('produces distinct hashes for similar URLs', () => {
    const urls = [
      'https://example.com/page1',
      'https://example.com/page2',
      'https://example.com/page3',
      'https://example.com/page4',
      'https://example.com/page5',
    ];
    const ids = new Set(urls.map(deriveJobId));
    expect(ids.size).toBe(urls.length);
  });

  // Validates REQ-DIST-001: special characters are handled
  it('handles URLs with special characters', () => {
    const id = deriveJobId('https://example.com/path?q=hello%20world&lang=en');
    expect(id).toHaveLength(32);
    expect(id).toMatch(/^[0-9a-f]{32}$/);
  });

  // Validates REQ-DIST-001: unicode URLs produce valid hash
  it('handles unicode URLs', () => {
    const id = deriveJobId('https://example.com/путь/к/странице');
    expect(id).toHaveLength(32);
    expect(id).toMatch(/^[0-9a-f]{32}$/);
  });
});
