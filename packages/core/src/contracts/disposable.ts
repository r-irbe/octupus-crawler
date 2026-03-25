// Disposable — deterministic cleanup interface for stateful resources
// Implements: T-ARCH-028, REQ-ARCH-018, REQ-ARCH-009

export interface Disposable {
  close(): Promise<void>;
}
