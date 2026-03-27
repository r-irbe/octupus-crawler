// Unit tests for backoff controller
// Validates REQ-DIST-015

import { describe, it, expect } from 'vitest';
import type { Logger } from '@ipf/core/contracts/logger';
import { createBackoffController, DEFAULT_BACKOFF_CONFIG } from './backoff-controller.js';
import type { BackoffConfig } from './backoff-controller.js';

function recLogger(): Logger {
  const noop = (): void => undefined;
  return {
    debug: noop, info: noop, warn: noop, error: noop, fatal: noop,
    child: () => recLogger(),
  } as Logger;
}

describe('BackoffController', () => {
  // REQ-DIST-015: exponential backoff in skipped ticks
  it('applies exponential backoff on store errors', () => {
    const logger = recLogger();
    const backoff = createBackoffController(DEFAULT_BACKOFF_CONFIG, logger);

    backoff.onStoreError(new Error('connection lost'));
    expect(backoff.consecutiveFailures()).toBe(1);
    // 2^0 = 1 skip tick
    expect(backoff.shouldSkipTick()).toBe(true);
    expect(backoff.shouldSkipTick()).toBe(false);

    backoff.onStoreError(new Error('connection lost'));
    // 2^1 = 2 skip ticks
    expect(backoff.shouldSkipTick()).toBe(true);
    expect(backoff.shouldSkipTick()).toBe(true);
    expect(backoff.shouldSkipTick()).toBe(false);
  });

  it('caps skip ticks at maxSkipTicks', () => {
    const logger = recLogger();
    const config: BackoffConfig = { maxConsecutiveFailures: 100, maxSkipTicks: 4 };
    const backoff = createBackoffController(config, logger);

    // 7 failures → 2^6 = 64, capped at 4
    for (let i = 0; i < 7; i++) {
      backoff.onStoreError(new Error('fail'));
    }
    let skipped = 0;
    while (backoff.shouldSkipTick()) skipped++;
    expect(skipped).toBe(4);
  });

  // REQ-DIST-015: abort after configurable consecutive failure threshold
  it('aborts after maxConsecutiveFailures', () => {
    const logger = recLogger();
    const config: BackoffConfig = { maxConsecutiveFailures: 3, maxSkipTicks: 32 };
    const backoff = createBackoffController(config, logger);

    backoff.onStoreError(new Error('1'));
    backoff.onStoreError(new Error('2'));
    expect(backoff.isAborted()).toBe(false);

    backoff.onStoreError(new Error('3'));
    expect(backoff.isAborted()).toBe(true);
    expect(backoff.consecutiveFailures()).toBe(3);
  });

  it('resets on store success', () => {
    const logger = recLogger();
    const backoff = createBackoffController(DEFAULT_BACKOFF_CONFIG, logger);

    backoff.onStoreError(new Error('fail'));
    backoff.onStoreError(new Error('fail'));
    expect(backoff.consecutiveFailures()).toBe(2);

    backoff.onStoreSuccess();
    expect(backoff.consecutiveFailures()).toBe(0);
    expect(backoff.shouldSkipTick()).toBe(false);
  });

  it('ignores errors after abort', () => {
    const logger = recLogger();
    const config: BackoffConfig = { maxConsecutiveFailures: 2, maxSkipTicks: 32 };
    const backoff = createBackoffController(config, logger);

    backoff.onStoreError(new Error('1'));
    backoff.onStoreError(new Error('2'));
    expect(backoff.isAborted()).toBe(true);

    backoff.onStoreError(new Error('3'));
    // failures count stayed at 2 — ignored after abort
    expect(backoff.consecutiveFailures()).toBe(2);
  });

  // REQ-DIST-015: non-Error values handled in backoff
  it('handles non-Error values as store errors', () => {
    const logger = recLogger();
    const backoff = createBackoffController(DEFAULT_BACKOFF_CONFIG, logger);
    backoff.onStoreError('string error');
    expect(backoff.consecutiveFailures()).toBe(1);
    backoff.onStoreError(42);
    expect(backoff.consecutiveFailures()).toBe(2);
  });
});
