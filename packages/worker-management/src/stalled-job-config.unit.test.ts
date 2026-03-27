// StalledJobConfig unit tests
// Validates: REQ-DIST-008 (stalled job detection config)
// Tasks: T-WORK-006

import { describe, it, expect } from 'vitest';
import { createStalledJobConfig } from './stalled-job-config.js';

describe('createStalledJobConfig', () => {
  it('creates default config with lockDuration = 2x checkInterval', () => {
    const config = createStalledJobConfig();
    expect(config.checkInterval).toBe(30_000);
    expect(config.lockDuration).toBe(60_000);
    expect(config.maxStalledCount).toBe(3);
  });

  it('accepts custom values respecting 2x invariant', () => {
    const config = createStalledJobConfig({
      checkInterval: 10_000,
      lockDuration: 25_000,
      maxStalledCount: 5,
    });
    expect(config.checkInterval).toBe(10_000);
    expect(config.lockDuration).toBe(25_000);
    expect(config.maxStalledCount).toBe(5);
  });

  it('auto-calculates lockDuration as 2x checkInterval when not provided', () => {
    const config = createStalledJobConfig({ checkInterval: 15_000 });
    expect(config.lockDuration).toBe(30_000);
  });

  it('throws when lockDuration < 2x checkInterval (REQ-DIST-008)', () => {
    expect(() =>
      createStalledJobConfig({ checkInterval: 10_000, lockDuration: 15_000 }),
    ).toThrow('lockDuration');
  });

  it('throws on non-positive checkInterval', () => {
    expect(() => createStalledJobConfig({ checkInterval: 0 })).toThrow('positive');
  });

  it('throws on maxStalledCount < 1', () => {
    expect(() => createStalledJobConfig({ maxStalledCount: 0 })).toThrow('>= 1');
  });
});
