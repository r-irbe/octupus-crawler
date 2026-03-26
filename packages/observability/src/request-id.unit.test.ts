// Request ID generation unit tests
// Validates: T-OBS-004, REQ-OBS-006

import { describe, it, expect } from 'vitest';
import { generateRequestId } from './request-id.js';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

describe('generateRequestId', () => {
  // Validates REQ-OBS-006: unique request IDs for HTTP correlation
  it('should return a valid UUID', () => {
    const id = generateRequestId();
    expect(id).toMatch(UUID_REGEX);
  });

  it('should generate unique IDs on each call', () => {
    const ids = new Set(Array.from({ length: 100 }, () => generateRequestId()));
    expect(ids.size).toBe(100);
  });
});
