// Unit tests for API versioning — URL-prefix extraction + deprecation telemetry
// Validates: REQ-COMM-007
import { describe, it, expect } from 'vitest';
import {
  extractVersion,
  deprecationHeaders,
  CURRENT_VERSION,
  API_VERSIONS,
} from './api-versioning.js';

describe('extractVersion', () => {
  it('extracts v1 from /api/v1/crawl path', () => {
    const result = extractVersion('/api/v1/crawl');
    expect(result.isOk()).toBe(true);
    if (result.isOk()) {
      expect(result.value.version).toBe('v1');
      expect(result.value.deprecated).toBe(false);
      expect(result.value.remainingPath).toBe('/crawl');
    }
  });

  it('handles /api/v1/ with trailing slash only', () => {
    const result = extractVersion('/api/v1/');
    expect(result.isOk()).toBe(true);
    if (result.isOk()) {
      expect(result.value.version).toBe('v1');
      expect(result.value.remainingPath).toBe('/');
    }
  });

  it('handles /api/v1 without trailing slash', () => {
    const result = extractVersion('/api/v1');
    expect(result.isOk()).toBe(true);
    if (result.isOk()) {
      expect(result.value.version).toBe('v1');
      expect(result.value.remainingPath).toBe('/');
    }
  });

  it('returns MissingVersion for paths without /api/ prefix', () => {
    const result = extractVersion('/health');
    expect(result.isErr()).toBe(true);
    if (result.isErr()) {
      expect(result.error._tag).toBe('MissingVersion');
    }
  });

  it('returns UnsupportedVersion for unknown version', () => {
    const result = extractVersion('/api/v99/crawl');
    expect(result.isErr()).toBe(true);
    if (result.isErr()) {
      expect(result.error._tag).toBe('UnsupportedVersion');
      if (result.error._tag === 'UnsupportedVersion') {
        expect(result.error.requested).toBe('v99');
      }
    }
  });

  it('extracts deeply nested remaining path', () => {
    const result = extractVersion('/api/v1/crawl/123/status');
    expect(result.isOk()).toBe(true);
    if (result.isOk()) {
      expect(result.value.remainingPath).toBe('/crawl/123/status');
    }
  });
});

describe('deprecationHeaders', () => {
  it('returns empty headers for current version', () => {
    const headers = deprecationHeaders(CURRENT_VERSION);
    expect(Object.keys(headers)).toHaveLength(0);
  });
});

describe('API_VERSIONS', () => {
  it('includes v1', () => {
    expect(API_VERSIONS).toContain('v1');
  });

  it('CURRENT_VERSION is a valid version', () => {
    expect((API_VERSIONS as readonly string[]).includes(CURRENT_VERSION)).toBe(
      true,
    );
  });
});
