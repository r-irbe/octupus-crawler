// PromMetrics unit tests
// Validates: T-OBS-006..011, T-OBS-022..024, REQ-OBS-008..017

import { describe, it, expect, beforeEach } from 'vitest';
import { createPromMetrics } from './prom-metrics.js';
import type { PromMetricsHandle } from './prom-metrics.js';

let handle: PromMetricsHandle;

beforeEach(() => {
  handle = createPromMetrics({ prefix: 'test_' });
});

async function getMetricValue(name: string): Promise<string> {
  const output = await handle.registry.metrics();
  const lines = output.split('\n');
  return lines.filter((l) => l.startsWith(name)).join('\n');
}

// Validates T-OBS-006: per-process registry isolation (REQ-OBS-017)
describe('Registry isolation (REQ-OBS-017)', () => {
  it('should create isolated registries per createPromMetrics call', async () => {
    const handle1 = createPromMetrics({ prefix: 'a_' });
    const handle2 = createPromMetrics({ prefix: 'b_' });

    handle1.metrics.recordFetch('success');
    handle2.metrics.recordFetch('error', 'timeout');

    const output1 = await handle1.registry.metrics();
    const output2 = await handle2.registry.metrics();

    expect(output1).toContain('a_fetches_total');
    expect(output1).not.toContain('b_fetches_total');
    expect(output2).toContain('b_fetches_total');
    expect(output2).not.toContain('a_fetches_total');
  });

  // Validates T-OBS-024: same metric name doesn't collide
  it('should not collide when two registries use the same metric names', () => {
    const handle1 = createPromMetrics();
    const handle2 = createPromMetrics();

    // Both use default (no prefix) — should not throw
    handle1.metrics.recordFetch('success');
    handle2.metrics.recordFetch('error', 'network');
  });
});

// Validates T-OBS-007: fetches_total counter (REQ-OBS-009)
describe('fetches_total (REQ-OBS-009)', () => {
  it('should increment fetches_total with status label', async () => {
    handle.metrics.recordFetch('success');
    handle.metrics.recordFetch('success');
    handle.metrics.recordFetch('error', 'timeout');

    const output = await getMetricValue('test_fetches_total');
    expect(output).toContain('status="success"');
    expect(output).toContain('status="error"');
  });

  it('should include error_kind label when provided', async () => {
    handle.metrics.recordFetch('error', 'timeout');
    const output = await getMetricValue('test_fetches_total');
    expect(output).toContain('error_kind="timeout"');
  });

  // G8-F-006: Verify error_kind label absent when not provided
  it('should not include error_kind label when omitted', async () => {
    handle.metrics.recordFetch('success');
    const output = await getMetricValue('test_fetches_total');
    const successLine = output.split('\n').find((l) => l.includes('status="success"'));
    expect(successLine).toBeDefined();
    expect(successLine).not.toContain('error_kind');
  });

  // G8-F-003: Status allowlist prevents label cardinality explosion
  it('should normalize unknown status to fallback', async () => {
    handle.metrics.recordFetch('arbitrary-value');
    const output = await getMetricValue('test_fetches_total');
    expect(output).toContain('status="unknown"');
    expect(output).not.toContain('status="arbitrary-value"');
  });
});

// Validates T-OBS-008: fetch_duration_seconds histogram (REQ-OBS-010)
describe('fetch_duration_seconds (REQ-OBS-010)', () => {
  it('should record positive durations', async () => {
    handle.metrics.recordFetchDuration(0.5);
    const output = await getMetricValue('test_fetch_duration_seconds');
    expect(output).toContain('test_fetch_duration_seconds_count 1');
  });

  it('should not record zero or negative durations', async () => {
    handle.metrics.recordFetchDuration(0);
    handle.metrics.recordFetchDuration(-1);
    const output = await getMetricValue('test_fetch_duration_seconds');
    expect(output).toContain('test_fetch_duration_seconds_count 0');
  });

  it('should use configurable buckets', () => {
    const custom = createPromMetrics({
      prefix: 'custom_',
      durationBuckets: [0.1, 0.5, 1.0],
    });
    // Should not throw — buckets are used internally
    custom.metrics.recordFetchDuration(0.3);
  });
});

// Validates T-OBS-009: urls_discovered_total counter (REQ-OBS-011)
describe('urls_discovered_total (REQ-OBS-011)', () => {
  it('should increment by count when count > 0', async () => {
    handle.metrics.recordUrlsDiscovered(5);
    handle.metrics.recordUrlsDiscovered(3);
    const output = await getMetricValue('test_urls_discovered_total');
    expect(output).toContain('test_urls_discovered_total 8');
  });

  it('should not increment when count is 0', async () => {
    handle.metrics.recordUrlsDiscovered(0);
    const output = await getMetricValue('test_urls_discovered_total');
    expect(output).toContain('test_urls_discovered_total 0');
  });

  it('should not increment when count is negative', async () => {
    handle.metrics.recordUrlsDiscovered(-5);
    const output = await getMetricValue('test_urls_discovered_total');
    expect(output).toContain('test_urls_discovered_total 0');
  });
});

// Validates T-OBS-010: gauges (REQ-OBS-012, 014, 015)
describe('Gauges (REQ-OBS-012, 014, 015)', () => {
  it('should set frontier_size gauge', async () => {
    handle.metrics.setFrontierSize(1000);
    const output = await getMetricValue('test_frontier_size');
    expect(output).toContain('test_frontier_size 1000');
  });

  it('should set active_jobs gauge', async () => {
    handle.metrics.setActiveJobs(5);
    const output = await getMetricValue('test_active_jobs');
    expect(output).toContain('test_active_jobs 5');
  });

  it('should set worker_utilization_ratio gauge', async () => {
    handle.metrics.setWorkerUtilization(0.75);
    const output = await getMetricValue('test_worker_utilization_ratio');
    expect(output).toContain('test_worker_utilization_ratio 0.75');
  });

  it('should allow gauge updates (overwrite)', async () => {
    handle.metrics.setFrontierSize(100);
    handle.metrics.setFrontierSize(200);
    const output = await getMetricValue('test_frontier_size');
    expect(output).toContain('test_frontier_size 200');
  });
});

// Validates T-OBS-011: counters (REQ-OBS-013, 016)
describe('Counters (REQ-OBS-013, 016)', () => {
  it('should increment stalled_jobs_total', async () => {
    handle.metrics.setStalledJobs(3);
    const output = await getMetricValue('test_stalled_jobs_total');
    expect(output).toContain('test_stalled_jobs_total 3');
  });

  it('should increment coordinator_restarts_total', async () => {
    handle.metrics.incrementCoordinatorRestarts();
    handle.metrics.incrementCoordinatorRestarts();
    const output = await getMetricValue('test_coordinator_restarts_total');
    expect(output).toContain('test_coordinator_restarts_total 2');
  });
});

// Validates T-OBS-008: CrawlMetrics contract compliance
describe('CrawlMetrics contract compliance (REQ-OBS-008)', () => {
  it('should expose all 8 metric operations', () => {
    const { metrics } = handle;
    expect(typeof metrics.recordFetch).toBe('function');
    expect(typeof metrics.recordFetchDuration).toBe('function');
    expect(typeof metrics.recordUrlsDiscovered).toBe('function');
    expect(typeof metrics.setFrontierSize).toBe('function');
    expect(typeof metrics.setStalledJobs).toBe('function');
    expect(typeof metrics.setActiveJobs).toBe('function');
    expect(typeof metrics.setWorkerUtilization).toBe('function');
    expect(typeof metrics.incrementCoordinatorRestarts).toBe('function');
  });
});
