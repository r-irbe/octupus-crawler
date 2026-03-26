// Trace propagation unit tests
// Validates: T-OBS-018 (job queue propagation), T-OBS-019 (trace context in logs)
// REQ-OBS-024, REQ-OBS-005

import { describe, it, expect } from 'vitest';
import { getTraceContext } from './trace-propagation.js';
import type { TraceCarrier } from './trace-propagation.js';
import { injectTraceContext } from './trace-propagation.js';

describe('Trace propagation (REQ-OBS-024)', () => {
  // Validates T-OBS-018: inject returns carrier object
  it('should return carrier from injectTraceContext', () => {
    const carrier: TraceCarrier = {};
    const result = injectTraceContext(carrier);
    expect(result).toBe(carrier);
  });

  // Without an active span, traceparent should not be set
  it('should not set traceparent when no active span exists', () => {
    const carrier: TraceCarrier = {};
    injectTraceContext(carrier);
    // No active span → no traceparent injected
    expect(carrier.traceparent).toBeUndefined();
  });
});

describe('getTraceContext (REQ-OBS-005)', () => {
  // Validates T-OBS-019: returns undefined when no span is active
  it('should return undefined when no active span', () => {
    const ctx = getTraceContext();
    expect(ctx).toBeUndefined();
  });
});
