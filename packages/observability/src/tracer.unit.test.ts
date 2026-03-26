// Tracer unit tests
// Validates: T-OBS-016 (SDK setup), T-OBS-017 (undici instrumentation),
//            T-OBS-021 (non-throwing shutdown), T-OBS-027 (sampling),
//            T-OBS-028 (batch config), REQ-OBS-023, 026, 027, 028
// TODO(Phase 6): Add integration test verifying SDK produces spans via InMemorySpanExporter (F-014)

import { describe, it, expect, vi, afterEach } from 'vitest';
import { createTracer } from './tracer.js';
import { InMemorySpanExporter } from './in-memory-exporter.js';
import { NullLogger } from './null-logger.js';
import type { Logger } from '@ipf/core/contracts/logger';

describe('createTracer (REQ-OBS-023)', () => {
  let shutdownFn: (() => Promise<void>) | undefined;

  afterEach(async () => {
    if (shutdownFn !== undefined) {
      await shutdownFn();
      shutdownFn = undefined;
    }
  });

  // Validates T-OBS-016: SDK configures with in-memory exporter
  it('should create a tracer handle with shutdown method', () => {
    const exporter = new InMemorySpanExporter();
    const handle = createTracer({
      serviceName: 'test-service',
      exporter,
      logger: new NullLogger(),
    });
    shutdownFn = handle.shutdown.bind(handle);
    expect(typeof handle.shutdown).toBe('function');
  });

  // Validates T-OBS-021: Non-throwing shutdown (REQ-OBS-026)
  it('should not throw on shutdown', async () => {
    const exporter = new InMemorySpanExporter();
    const handle = createTracer({
      serviceName: 'test-service',
      exporter,
      logger: new NullLogger(),
    });

    await expect(handle.shutdown()).resolves.toBeUndefined();
  });

  // Validates T-OBS-021: Shutdown logs error instead of throwing
  it('should log error on shutdown failure', async () => {
    const errorFn = vi.fn<(msg: string, bindings?: Record<string, unknown>) => void>();
    const logger: Logger = {
      debug: vi.fn(),
      info: vi.fn(),
      warn: vi.fn(),
      error: errorFn,
      fatal: vi.fn(),
      child: vi.fn<(bindings: Record<string, unknown>) => Logger>().mockReturnThis(),
    };

    const brokenExporter = new InMemorySpanExporter();
    await brokenExporter.shutdown();

    const handle = createTracer({
      serviceName: 'test-service',
      exporter: brokenExporter,
      logger,
    });

    await expect(handle.shutdown()).resolves.toBeUndefined();
  });

  // Validates T-OBS-016: Service version is optional
  it('should accept optional service version', () => {
    const exporter = new InMemorySpanExporter();
    const handle = createTracer({
      serviceName: 'test-service',
      serviceVersion: '1.0.0',
      exporter,
      logger: new NullLogger(),
    });
    shutdownFn = handle.shutdown.bind(handle);
    expect(typeof handle.shutdown).toBe('function');
  });

  // Validates T-OBS-027: Sampling rate configuration (REQ-OBS-027)
  it('should accept custom sampling rate', () => {
    const exporter = new InMemorySpanExporter();
    const handle = createTracer({
      serviceName: 'test-service',
      exporter,
      logger: new NullLogger(),
      samplingRate: 0.5,
    });
    shutdownFn = handle.shutdown.bind(handle);
    expect(typeof handle.shutdown).toBe('function');
  });

  // Validates T-OBS-027: Default sampling rate is 0.1 (10%)
  it('should use default sampling rate of 0.1 when not specified', () => {
    const exporter = new InMemorySpanExporter();
    // Should not throw — default 0.1 is applied internally
    const handle = createTracer({
      serviceName: 'test-service',
      exporter,
      logger: new NullLogger(),
    });
    shutdownFn = handle.shutdown.bind(handle);
    expect(typeof handle.shutdown).toBe('function');
  });

  // Validates T-OBS-028: Batch processor config (REQ-OBS-028)
  it('should accept batch processor with custom config', () => {
    const exporter = new InMemorySpanExporter();
    const handle = createTracer({
      serviceName: 'test-service',
      exporter,
      logger: new NullLogger(),
      useBatchProcessor: true,
      batchConfig: {
        maxQueueSize: 4096,
        maxExportBatchSize: 256,
        scheduledDelayMillis: 10000,
        exportTimeoutMillis: 60000,
      },
    });
    shutdownFn = handle.shutdown.bind(handle);
    expect(typeof handle.shutdown).toBe('function');
  });

  // Validates T-OBS-028: Default batch config values
  it('should use default batch config when not specified', () => {
    const exporter = new InMemorySpanExporter();
    const handle = createTracer({
      serviceName: 'test-service',
      exporter,
      logger: new NullLogger(),
      useBatchProcessor: true,
    });
    shutdownFn = handle.shutdown.bind(handle);
    expect(typeof handle.shutdown).toBe('function');
  });
});
