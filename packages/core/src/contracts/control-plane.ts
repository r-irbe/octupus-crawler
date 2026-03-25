// ControlPlane — crawl lifecycle management contract
// Implements: T-ARCH-012, REQ-ARCH-002, REQ-ARCH-009

import type { AsyncResult } from '../types/result.js';
import type { Disposable } from './disposable.js';
import type { QueueError } from './frontier.js';

export type CrawlState = 'idle' | 'running' | 'paused' | 'cancelled' | 'completed';

export type CrawlProgress = {
  readonly completed: number;
  readonly failed: number;
  readonly pending: number;
  readonly total: number;
};

export interface ControlPlane extends Disposable {
  getState(): AsyncResult<CrawlState, QueueError>;
  pause(): AsyncResult<void, QueueError>;
  resume(): AsyncResult<void, QueueError>;
  cancel(): AsyncResult<void, QueueError>;
  getProgress(): AsyncResult<CrawlProgress, QueueError>;
}
