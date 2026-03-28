// Integration test for sequential startup ordering with fail-fast + reverse cleanup
// Validates: T-LIFE-049 → REQ-LIFE-033, REQ-LIFE-034

import { describe, it, expect } from 'vitest';
import type { Logger } from '@ipf/core/contracts/logger';
import type { Disposable } from '@ipf/core/contracts/disposable';
import type { StartupPhase } from './startup-orchestrator.js';
import { executeStartupSequence, StartupError } from './startup-orchestrator.js';
import { createConsumerPhase } from './consumer-phase.js';

function silentLogger(): Logger {
  const noop = (): void => undefined;
  return {
    debug: noop, info: noop, warn: noop, error: noop, fatal: noop,
    child: () => silentLogger(),
  } as Logger;
}

describe('T-LIFE-049: sequential startup ordering', () => {
  it('initializes phases in declared order', async () => {
    const order: string[] = [];

    const phases: StartupPhase[] = [
      {
        name: 'phase-a',
        execute: (): Promise<Disposable> => {
          order.push('phase-a');
          return Promise.resolve({ close: (): Promise<void> => Promise.resolve() });
        },
      },
      {
        name: 'phase-b',
        execute: (): Promise<Disposable> => {
          order.push('phase-b');
          return Promise.resolve({ close: (): Promise<void> => Promise.resolve() });
        },
      },
      {
        name: 'phase-c',
        execute: (): Promise<Disposable> => {
          order.push('phase-c');
          return Promise.resolve({ close: (): Promise<void> => Promise.resolve() });
        },
      },
    ];

    const result = await executeStartupSequence(phases, silentLogger());
    expect(order).toEqual(['phase-a', 'phase-b', 'phase-c']);
    expect(result.resources).toHaveLength(3);

    for (const r of [...result.resources].reverse()) {
      await r.resource.close();
    }
  });

  it('cleans up already-initialized phases in reverse order on failure', async () => {
    const cleanupOrder: string[] = [];

    const phases: StartupPhase[] = [
      {
        name: 'phase-a',
        execute: (): Promise<Disposable> => Promise.resolve({
          close: (): Promise<void> => { cleanupOrder.push('phase-a'); return Promise.resolve(); },
        }),
      },
      {
        name: 'phase-b',
        execute: (): Promise<Disposable> => Promise.resolve({
          close: (): Promise<void> => { cleanupOrder.push('phase-b'); return Promise.resolve(); },
        }),
      },
      {
        name: 'phase-c-fails',
        execute: (): Promise<Disposable> => Promise.reject(new Error('phase-c boom')),
      },
    ];

    await expect(executeStartupSequence(phases, silentLogger()))
      .rejects
      .toThrow(StartupError);

    // Resources cleaned in reverse: phase-b first, then phase-a
    expect(cleanupOrder).toEqual(['phase-b', 'phase-a']);
  });

  it('integrates with createConsumerPhase adapter', async () => {
    const events: string[] = [];

    const consumer = {
      start: (): Promise<void> => { events.push('consumer-started'); return Promise.resolve(); },
      close: (): Promise<void> => { events.push('consumer-closed'); return Promise.resolve(); },
    };

    const phases: StartupPhase[] = [
      {
        name: 'infra-setup',
        execute: (): Promise<Disposable> => {
          events.push('infra-setup');
          return Promise.resolve({ close: (): Promise<void> => { events.push('infra-closed'); return Promise.resolve(); } });
        },
      },
      createConsumerPhase(consumer),
    ];

    const result = await executeStartupSequence(phases, silentLogger());

    // Infra is initialized before consumer
    expect(events).toEqual(['infra-setup', 'consumer-started']);

    // Cleanup
    for (const r of [...result.resources].reverse()) {
      await r.resource.close();
    }

    expect(events).toContain('consumer-closed');
  });
});
