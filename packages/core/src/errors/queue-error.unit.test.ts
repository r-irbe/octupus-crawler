// Unit tests for QueueError factory
// Validates: T-TCH-006, REQ-TCH-007

import { describe, it, expect } from 'vitest';
import { createQueueError } from './queue-error.js';

describe('createQueueError', () => {
  // Validates REQ-TCH-007: error construction
  it('creates error with correct kind and operation', () => {
    const error = createQueueError({ operation: 'enqueue', cause: new Error('timeout') });
    expect(error.kind).toBe('queue_error');
    expect(error.operation).toBe('enqueue');
  });

  // Validates REQ-TCH-007: message format from Error cause
  it('formats message from Error cause', () => {
    const cause = new Error('connection refused');
    const error = createQueueError({ operation: 'dequeue', cause });
    expect(error.message).toBe('Queue error during dequeue: connection refused');
    expect(error.cause).toBe(cause);
  });

  // Validates REQ-TCH-007: message format from string cause
  it('formats message from string cause', () => {
    const error = createQueueError({ operation: 'close', cause: 'manual shutdown' });
    expect(error.message).toBe('Queue error during close: manual shutdown');
    expect(error.cause).toBe('manual shutdown');
  });

  // Validates REQ-TCH-007: message format from non-Error/non-string cause
  it('stringifies non-Error cause', () => {
    const error = createQueueError({ operation: 'addBulk', cause: 42 });
    expect(error.message).toBe('Queue error during addBulk: 42');
  });
});
