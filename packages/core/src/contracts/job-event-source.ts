// JobEventSource — job lifecycle event contract
// Implements: T-ARCH-010, REQ-ARCH-002, REQ-ARCH-009, REQ-DIST-011

import type { Disposable } from './disposable.js';

export interface JobEventSource extends Disposable {
  onActive(handler: (jobId: string) => void): void;
  onCompleted(handler: (jobId: string) => void): void;
  onFailed(handler: (jobId: string, error: unknown) => void): void;
  onStalled(handler: (jobId: string) => void): void;
}
