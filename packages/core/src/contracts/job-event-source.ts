// JobEventSource — job lifecycle event contract
// Implements: T-ARCH-010, REQ-ARCH-002, REQ-ARCH-009

import type { Disposable } from './disposable.js';

export interface JobEventSource extends Disposable {
  onCompleted(handler: (jobId: string) => void): void;
  onFailed(handler: (jobId: string, error: unknown) => void): void;
  onStalled(handler: (jobId: string) => void): void;
}
