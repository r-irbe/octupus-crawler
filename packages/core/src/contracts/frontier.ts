// Frontier — prioritized URL queue contract
// Implements: T-ARCH-005, REQ-ARCH-002, REQ-ARCH-009, REQ-ARCH-010

import type { AsyncResult } from '../types/result.js';
import type { Disposable } from './disposable.js';

export type FrontierEntry = {
  readonly url: string;
  readonly priority: number;
  readonly depth: number;
};

export type FrontierSize = {
  readonly pending: number;
  readonly active: number;
  readonly total: number;
};

export type QueueError = {
  readonly kind: 'queue_error';
  readonly operation: string;
  readonly cause: unknown;
  readonly message: string;
};

export interface Frontier extends Disposable {
  enqueue(entries: FrontierEntry[]): AsyncResult<number, QueueError>;
  size(): AsyncResult<FrontierSize, QueueError>;
}
