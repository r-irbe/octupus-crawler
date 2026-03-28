// Unit tests for consumer startup phase
// Validates: T-LIFE-009 → REQ-LIFE-006

import { describe, it, expect, vi } from 'vitest';
import { createConsumerPhase } from './consumer-phase.js';

describe('T-LIFE-009: consumer startup phase', () => {
  it('starts consumer during execute and closes on dispose', async () => {
    const consumer = {
      start: vi.fn<() => Promise<void>>().mockResolvedValue(undefined),
      close: vi.fn<() => Promise<void>>().mockResolvedValue(undefined),
    };

    const phase = createConsumerPhase(consumer);
    expect(phase.name).toBe('job-consumer');

    const disposable = await phase.execute();
    expect(consumer.start).toHaveBeenCalledOnce();

    await disposable.close();
    expect(consumer.close).toHaveBeenCalledOnce();
  });

  it('propagates start failure for fail-fast', async () => {
    const consumer = {
      start: vi.fn<() => Promise<void>>().mockRejectedValue(new Error('connection refused')),
      close: vi.fn<() => Promise<void>>().mockResolvedValue(undefined),
    };

    const phase = createConsumerPhase(consumer);
    await expect(phase.execute()).rejects.toThrow('connection refused');
  });
});
