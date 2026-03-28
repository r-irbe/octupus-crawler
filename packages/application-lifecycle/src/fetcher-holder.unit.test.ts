// Unit tests for fetcher holder
// Validates: T-LIFE-031, REQ-LIFE-028

import { describe, it, expect } from 'vitest';
import { createFetcherPhase } from './fetcher-holder.js';
import type { Fetcher, FetchConfig, FetchResult } from '@ipf/core/contracts/fetcher';
import type { Disposable } from '@ipf/core/contracts/disposable';
import type { CrawlUrl } from '@ipf/core/domain/crawl-url';
import type { AsyncResult } from '@ipf/core/types/result';
import type { FetchError } from '@ipf/core/errors/fetch-error';
import { ok } from 'neverthrow';

function stubFetcher(): Fetcher & Disposable {
  return {
    fetch: (_url: CrawlUrl, _config: FetchConfig): AsyncResult<FetchResult, FetchError> =>
      Promise.resolve(ok({ statusCode: 200, body: '', headers: {}, url: '' })),
    close: (): Promise<void> => Promise.resolve(),
  };
}

describe('createFetcherPhase', () => {
  // Validates REQ-LIFE-028: fetcher is undefined before phase executes
  it('returns undefined fetcher before execution', () => {
    const { getFetcher } = createFetcherPhase(stubFetcher);
    expect(getFetcher()).toBeUndefined();
  });

  // Validates REQ-LIFE-028: fetcher created once by startup phase
  it('creates fetcher when phase executes', async () => {
    const { phase, getFetcher } = createFetcherPhase(stubFetcher);
    await phase.execute();
    expect(getFetcher()).toBeDefined();
  });

  // Validates REQ-LIFE-028: same instance reused
  it('returns the same fetcher instance on repeated calls', async () => {
    const { phase, getFetcher } = createFetcherPhase(stubFetcher);
    await phase.execute();
    const first = getFetcher();
    const second = getFetcher();
    expect(first).toBe(second);
  });

  // Validates REQ-LIFE-028: phase is named
  it('has name "fetcher"', () => {
    const { phase } = createFetcherPhase(stubFetcher);
    expect(phase.name).toBe('fetcher');
  });
});
