// In-memory span exporter unit tests
// Validates: T-OBS-020, REQ-OBS-025

import { describe, it, expect } from 'vitest';
import { InMemorySpanExporter } from './in-memory-exporter.js';

describe('InMemorySpanExporter re-export (REQ-OBS-025)', () => {
  it('should be importable and constructable', () => {
    const exporter = new InMemorySpanExporter();
    expect(exporter).toBeDefined();
    expect(typeof exporter.getFinishedSpans).toBe('function');
    expect(typeof exporter.reset).toBe('function');
    expect(typeof exporter.shutdown).toBe('function');
    expect(typeof exporter.export).toBe('function');
  });

  it('should start with empty spans', () => {
    const exporter = new InMemorySpanExporter();
    expect(exporter.getFinishedSpans()).toHaveLength(0);
  });
});
