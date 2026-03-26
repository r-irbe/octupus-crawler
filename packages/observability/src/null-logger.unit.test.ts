// NullLogger unit tests
// Validates: T-OBS-005, REQ-OBS-007

import { describe, it, expect } from 'vitest';
import { NullLogger } from './null-logger.js';

describe('NullLogger', () => {
  // Validates REQ-OBS-007: no-op logger produces no output and no errors
  it('should implement all five severity levels without throwing', () => {
    const logger = new NullLogger();

    expect(() => {
      logger.debug('test');
      logger.info('test');
      logger.warn('test');
      logger.error('test');
      logger.fatal('test');
    }).not.toThrow();
  });

  // Validates REQ-OBS-007: no-op logger accepts bindings
  it('should accept optional bindings without throwing', () => {
    const logger = new NullLogger();

    expect(() => {
      logger.info('test', { key: 'value' });
      logger.error('fail', { code: 500 });
    }).not.toThrow();
  });

  // Validates REQ-OBS-002: child returns a Logger
  it('should return itself from child()', () => {
    const logger = new NullLogger();
    const child = logger.child({ service: 'test' });

    expect(child).toBe(logger);
  });

  // Validates REQ-OBS-002: chainable to arbitrary depth
  it('should support chained child() calls', () => {
    const logger = new NullLogger();
    const grandchild = logger.child({ a: 1 }).child({ b: 2 }).child({ c: 3 });

    expect(grandchild).toBe(logger);
    grandchild.info('deep'); // should not throw
  });
});
