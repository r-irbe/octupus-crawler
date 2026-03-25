// JobConsumer — job queue consumption contract
// Implements: T-ARCH-009, REQ-ARCH-002, REQ-ARCH-009

import type { Disposable } from './disposable.js';

export interface JobConsumer extends Disposable {
  start(): Promise<void>;
  close(timeout?: number): Promise<void>;
}
