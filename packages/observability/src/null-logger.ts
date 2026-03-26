// NullLogger — no-op Logger implementation for tests
// Implements: T-OBS-005, REQ-OBS-007

import type { Logger } from '@ipf/core/contracts/logger';

export class NullLogger implements Logger {
  debug(_msg: string, _bindings?: Record<string, unknown>): void {
    // no-op
  }

  info(_msg: string, _bindings?: Record<string, unknown>): void {
    // no-op
  }

  warn(_msg: string, _bindings?: Record<string, unknown>): void {
    // no-op
  }

  error(_msg: string, _bindings?: Record<string, unknown>): void {
    // no-op
  }

  fatal(_msg: string, _bindings?: Record<string, unknown>): void {
    // no-op
  }

  child(_bindings: Record<string, unknown>): Logger {
    return this;
  }
}
