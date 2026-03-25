// Validates REQ-ARCH-018: Disposable interface with close(): Promise<void>
// Validates REQ-ARCH-009: Stateful contracts provide deterministic cleanup
import { describe, it, expect } from 'vitest';
import type { Disposable } from './disposable.js';

describe('Disposable interface', () => {
  it('can be implemented with a close method', async () => {
    let closed = false;
    const disposable: Disposable = {
      close: (): Promise<void> => {
        closed = true;
        return Promise.resolve();
      },
    };
    await disposable.close();
    expect(closed).toBe(true);
  });

  it('close returns a Promise', () => {
    const disposable: Disposable = {
      close: (): Promise<void> => Promise.resolve(),
    };
    const result = disposable.close();
    expect(result).toBeInstanceOf(Promise);
  });
});
