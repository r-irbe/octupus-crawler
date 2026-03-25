// Logger — structured logging contract (synchronous)
// Implements: T-ARCH-007, REQ-ARCH-002, REQ-ARCH-010

export interface Logger {
  debug(msg: string, bindings?: Record<string, unknown>): void;
  info(msg: string, bindings?: Record<string, unknown>): void;
  warn(msg: string, bindings?: Record<string, unknown>): void;
  error(msg: string, bindings?: Record<string, unknown>): void;
  fatal(msg: string, bindings?: Record<string, unknown>): void;
  child(bindings: Record<string, unknown>): Logger;
}
