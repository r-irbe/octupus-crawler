// Degraded mode metrics — unit tests
// Validates REQ-RES-015, REQ-RES-004

import { describe, it, expect, vi } from 'vitest';
import { CircuitState } from 'cockatiel';
import { createDegradedModeMetrics } from './degraded-mode-metrics.js';

describe('createDegradedModeMetrics', () => {
  it('emits degraded_mode_total metric on degraded mode', () => {
    const incrementCounter = vi.fn();
    const metrics = createDegradedModeMetrics({ incrementCounter, recordGauge: vi.fn() });
    metrics.onDegradedMode('a.com', new Error('down'));
    expect(incrementCounter).toHaveBeenCalledWith('degraded_mode_total', { domain: 'a.com' });
  });

  it('logs warning on degraded mode', () => {
    const warn = vi.fn();
    const metrics = createDegradedModeMetrics(undefined, { info: vi.fn(), warn, debug: vi.fn() });
    metrics.onDegradedMode('a.com', new Error('down'));
    expect(warn).toHaveBeenCalledWith('Degraded mode activated', {
      domain: 'a.com',
      error: 'down',
    });
  });

  it('emits circuit breaker state metric', () => {
    const incrementCounter = vi.fn();
    const metrics = createDegradedModeMetrics({ incrementCounter, recordGauge: vi.fn() });
    metrics.onCircuitStateChange('a.com', CircuitState.Open);
    expect(incrementCounter).toHaveBeenCalled();
  });

  it('logs warn for circuit open, info for other states', () => {
    const warn = vi.fn();
    const info = vi.fn();
    const metrics = createDegradedModeMetrics(undefined, { info, warn, debug: vi.fn() });
    metrics.onCircuitStateChange('a.com', CircuitState.Open);
    expect(warn).toHaveBeenCalled();
    metrics.onCircuitStateChange('a.com', CircuitState.Closed);
    expect(info).toHaveBeenCalled();
  });

  it('emits retry metric', () => {
    const incrementCounter = vi.fn();
    const metrics = createDegradedModeMetrics({ incrementCounter, recordGauge: vi.fn() });
    metrics.onRetry('a.com', 2, 1000);
    expect(incrementCounter).toHaveBeenCalledWith('retry_attempt_total', {
      domain: 'a.com',
      attempt: '2',
    });
  });

  it('emits timeout metric', () => {
    const incrementCounter = vi.fn();
    const metrics = createDegradedModeMetrics({ incrementCounter, recordGauge: vi.fn() });
    metrics.onTimeout('a.com', 30000);
    expect(incrementCounter).toHaveBeenCalledWith('timeout_fired_total', { domain: 'a.com' });
  });

  it('handles missing sinks gracefully', () => {
    const metrics = createDegradedModeMetrics();
    // Should not throw with no sinks
    expect(() => { metrics.onDegradedMode('a.com', new Error('x')); }).not.toThrow();
    expect(() => { metrics.onCircuitStateChange('a.com', CircuitState.Open); }).not.toThrow();
    expect(() => { metrics.onRetry('a.com', 1, 100); }).not.toThrow();
    expect(() => { metrics.onTimeout('a.com', 5000); }).not.toThrow();
  });
});
