// Validates REQ-RES-001: Resilience error types follow discriminated union pattern
import { describe, it, expect } from 'vitest';
import {
  createCircuitOpenError,
  createTimeoutResilienceError,
  createBulkheadRejectedError,
  createRetriesExhaustedError,
  DEFAULT_RESILIENCE_CONFIG,
} from './resilience-types.js';

describe('Resilience error constructors', () => {
  it('creates CircuitOpen error', () => {
    const err = createCircuitOpenError('fail.com');
    expect(err._tag).toBe('CircuitOpen');
    expect(err.domain).toBe('fail.com');
    expect(err.message).toContain('fail.com');
  });

  it('creates Timeout error', () => {
    const err = createTimeoutResilienceError('slow.com', 5000);
    expect(err._tag).toBe('Timeout');
    expect(err.domain).toBe('slow.com');
    if (err._tag === 'Timeout') {
      expect(err.durationMs).toBe(5000);
    }
  });

  it('creates BulkheadRejected error', () => {
    const err = createBulkheadRejectedError('busy.com');
    expect(err._tag).toBe('BulkheadRejected');
    expect(err.domain).toBe('busy.com');
  });

  it('creates RetriesExhausted error', () => {
    const err = createRetriesExhaustedError('down.com', 3);
    expect(err._tag).toBe('RetriesExhausted');
    if (err._tag === 'RetriesExhausted') {
      expect(err.attempts).toBe(3);
    }
  });
});

describe('DEFAULT_RESILIENCE_CONFIG', () => {
  it('has expected defaults', () => {
    expect(DEFAULT_RESILIENCE_CONFIG.circuitBreakerThreshold).toBe(5);
    expect(DEFAULT_RESILIENCE_CONFIG.circuitBreakerHalfOpenAfterMs).toBe(30_000);
    expect(DEFAULT_RESILIENCE_CONFIG.retryMaxAttempts).toBe(3);
    expect(DEFAULT_RESILIENCE_CONFIG.retryInitialDelayMs).toBe(1_000);
    expect(DEFAULT_RESILIENCE_CONFIG.retryMaxDelayMs).toBe(30_000);
    expect(DEFAULT_RESILIENCE_CONFIG.timeoutFetchMs).toBe(30_000);
    expect(DEFAULT_RESILIENCE_CONFIG.timeoutDbMs).toBe(10_000);
    expect(DEFAULT_RESILIENCE_CONFIG.timeoutRedisMs).toBe(5_000);
    expect(DEFAULT_RESILIENCE_CONFIG.bulkheadMaxConcurrentPerDomain).toBe(2);
    expect(DEFAULT_RESILIENCE_CONFIG.circuitBreakerMaxDomains).toBe(10_000);
  });
});
