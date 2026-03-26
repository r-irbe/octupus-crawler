// Frontier configuration unit tests
// Validates: REQ-DIST-003 (retry), REQ-DIST-005 (retention), REQ-DIST-006 (queue name)

import { describe, it, expect } from 'vitest';
import {
  FRONTIER_QUEUE_NAME,
  DEFAULT_RETRY_CONFIG,
  DEFAULT_RETENTION_CONFIG,
  DEFAULT_FRONTIER_CONFIG,
} from './frontier-config.js';

describe('FRONTIER_QUEUE_NAME', () => {
  // Validates REQ-DIST-006: single shared queue name
  it('is crawl-jobs', () => {
    expect(FRONTIER_QUEUE_NAME).toBe('crawl-jobs');
  });
});

describe('DEFAULT_RETRY_CONFIG', () => {
  // Validates REQ-DIST-003: 3 retry attempts
  it('has 3 attempts', () => {
    expect(DEFAULT_RETRY_CONFIG.attempts).toBe(3);
  });

  // Validates REQ-DIST-003: exponential backoff
  it('uses exponential backoff', () => {
    expect(DEFAULT_RETRY_CONFIG.backoffType).toBe('exponential');
  });

  // Validates REQ-DIST-003: 1s base delay
  it('has 1000ms base delay', () => {
    expect(DEFAULT_RETRY_CONFIG.backoffDelay).toBe(1000);
  });
});

describe('DEFAULT_RETENTION_CONFIG', () => {
  // Validates REQ-DIST-005: completed job limit
  it('retains 10,000 completed jobs', () => {
    expect(DEFAULT_RETENTION_CONFIG.completedLimit).toBe(10_000);
  });

  // Validates REQ-DIST-005: failed job limit
  it('retains 5,000 failed jobs', () => {
    expect(DEFAULT_RETENTION_CONFIG.failedLimit).toBe(5_000);
  });
});

describe('DEFAULT_FRONTIER_CONFIG', () => {
  // Validates: composite config has both retry and retention
  it('includes retry configuration', () => {
    expect(DEFAULT_FRONTIER_CONFIG.retry).toStrictEqual(DEFAULT_RETRY_CONFIG);
  });

  it('includes retention configuration', () => {
    expect(DEFAULT_FRONTIER_CONFIG.retention).toStrictEqual(DEFAULT_RETENTION_CONFIG);
  });
});
