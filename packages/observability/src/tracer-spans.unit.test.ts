// Span capture tests — separate file for OTel global state isolation
// Validates: F-014 (span capture integration), T-OBS-032 (batch flush on shutdown)
// REQ-OBS-023, REQ-OBS-028

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { trace } from '@opentelemetry/api';
import { createTracer } from './tracer.js';
import type { TracerHandle } from './tracer.js';
import { InMemorySpanExporter } from './in-memory-exporter.js';
import { NullLogger } from './null-logger.js';

// F-014: Verify SDK produces spans captured by InMemorySpanExporter
// Uses samplingRate: 1.0 per F-017 (avoid sampling-induced flakiness)
describe('span capture (F-014, REQ-OBS-023)', () => {
  let handle: TracerHandle | undefined;

  // OTel global provider is a singleton — must disable before re-registering
  beforeEach(() => {
    trace.disable();
  });

  afterEach(async () => {
    if (handle !== undefined) {
      await handle.shutdown();
      handle = undefined;
    }
  });

  it('should capture spans via SimpleSpanProcessor', async () => {
    const exporter = new InMemorySpanExporter();
    handle = createTracer({
      serviceName: 'span-capture-test',
      exporter,
      logger: new NullLogger(),
      samplingRate: 1.0,
    });

    const tracer = trace.getTracer('span-capture-test');
    const span = tracer.startSpan('test-operation');
    span.end();

    // Flush to ensure all spans are exported
    await handle.forceFlush();

    const finished = exporter.getFinishedSpans();
    expect(finished.length).toBeGreaterThanOrEqual(1);
    const captured = finished.find((s) => s.name === 'test-operation');
    expect(captured).toBeDefined();
  });

  // T-OBS-032: Verify batch processor flushes spans via forceFlush (REQ-OBS-028)
  it('should flush batched spans via forceFlush', async () => {
    const exporter = new InMemorySpanExporter();
    handle = createTracer({
      serviceName: 'batch-flush-test',
      exporter,
      logger: new NullLogger(),
      samplingRate: 1.0,
      useBatchProcessor: true,
      batchConfig: {
        // Long delay so spans won't auto-flush during test
        scheduledDelayMillis: 60000,
      },
    });

    const tracer = trace.getTracer('batch-flush-test');
    const span = tracer.startSpan('batched-operation');
    span.end();

    // forceFlush drains BatchSpanProcessor queue without clearing exporter
    await handle.forceFlush();

    const finished = exporter.getFinishedSpans();
    expect(finished.length).toBeGreaterThanOrEqual(1);
    const captured = finished.find((s) => s.name === 'batched-operation');
    expect(captured).toBeDefined();
  });
});
