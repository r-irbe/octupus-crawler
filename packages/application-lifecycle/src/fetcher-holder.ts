// Fetcher holder — create once, reuse across all jobs
// Implements: T-LIFE-031, REQ-LIFE-028

import type { Fetcher } from '@ipf/core/contracts/fetcher';
import type { Disposable } from '@ipf/core/contracts/disposable';
import type { StartupPhase } from './startup-orchestrator.js';

export type FetcherFactory = () => Fetcher & Disposable;

/**
 * REQ-LIFE-028: Create a startup phase that initializes the fetcher once.
 * The fetcher is reused across all job invocations, preserving politeness chains.
 */
export function createFetcherPhase(
  factory: FetcherFactory,
): { phase: StartupPhase; getFetcher: () => Fetcher | undefined } {
  let fetcher: (Fetcher & Disposable) | undefined;

  const phase: StartupPhase = {
    name: 'fetcher',
    execute: (): Promise<Disposable> => {
      fetcher = factory();
      return Promise.resolve(fetcher);
    },
  };

  return {
    phase,
    getFetcher: (): Fetcher | undefined => fetcher,
  };
}
