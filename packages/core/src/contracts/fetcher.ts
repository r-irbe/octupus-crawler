// Fetcher — HTTP fetch contract with typed error channel
// Implements: T-ARCH-006, REQ-ARCH-002, REQ-ARCH-010

import type { AsyncResult } from '../types/result.js';
import type { CrawlUrl } from '../domain/crawl-url.js';
import type { FetchError } from '../errors/fetch-error.js';

export type FetchConfig = {
  readonly timeoutMs: number;
  readonly maxRedirects: number;
  readonly maxBodyBytes: number;
};

export type FetchResult = {
  readonly statusCode: number;
  readonly body: string;
  readonly headers: Record<string, string>;
  readonly url: string;
};

export interface Fetcher {
  fetch(url: CrawlUrl, config: FetchConfig): AsyncResult<FetchResult, FetchError>;
}
