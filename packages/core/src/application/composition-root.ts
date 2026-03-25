// Composition root — singleton factory with phased wiring and reverse cleanup
// Implements: T-ARCH-020, T-ARCH-026, T-ARCH-027, REQ-ARCH-006, REQ-ARCH-016, REQ-ARCH-017

import type { Disposable } from '../contracts/disposable.js';

export interface DisposableEntry extends Disposable {
  readonly name: string;
}

export interface CompositionRootConfig {
  readonly factories: ReadonlyArray<() => DisposableEntry>;
}

export interface CompositionRoot {
  readonly disposables: ReadonlyArray<DisposableEntry>;
  readonly shutdown: () => Promise<void>;
}

let initialized = false;

/**
 * Reset singleton state — for testing only.
 * @internal Do not call in production code.
 */
export function resetCompositionRoot(): void {
  initialized = false;
}

/**
 * Creates the composition root by executing factories in order.
 * Enforces singleton instantiation (REQ-ARCH-016).
 * On partial failure, cleans up already-initialized resources in reverse order (REQ-ARCH-017).
 */
export async function createCompositionRoot(config: CompositionRootConfig): Promise<CompositionRoot> {
  if (initialized) {
    throw new Error('Composition root already initialized — singleton violation (REQ-ARCH-016)');
  }
  initialized = true;

  const disposables: DisposableEntry[] = [];

  try {
    for (const factory of config.factories) {
      const entry = factory();
      disposables.push(entry);
    }
  } catch (error: unknown) {
    // REQ-ARCH-017: clean up already-initialized resources in reverse order
    // Await cleanup before re-throwing to ensure resources are released
    await cleanupReverse(disposables);
    // Reset singleton so the process can exit cleanly
    initialized = false;
    throw error;
  }

  let shutdownCalled = false;

  async function shutdown(): Promise<void> {
    if (shutdownCalled) {
      return;
    }
    shutdownCalled = true;
    await cleanupReverse(disposables);
  }

  return {
    disposables,
    shutdown,
  };
}

async function cleanupReverse(disposables: DisposableEntry[]): Promise<void> {
  for (let i = disposables.length - 1; i >= 0; i--) {
    const entry = disposables[i];
    if (entry) {
      try {
        await entry.close();
      } catch {
        // Swallow cleanup errors — don't mask original error (REQ-ARCH-017)
      }
    }
  }
}
