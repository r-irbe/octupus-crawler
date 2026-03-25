// QueueError — shared error type for queue/infrastructure operations
// Implements: REQ-ARCH-012, REQ-ARCH-013
// Extracted from frontier.ts and crawl-error.ts per G8 review finding A-1/A-2

export type QueueError = {
  readonly kind: 'queue_error';
  readonly operation: string;
  readonly cause: unknown;
  readonly message: string;
};

export function createQueueError(p: { operation: string; cause: unknown }): QueueError {
  const causeMsg = p.cause instanceof Error ? p.cause.message : String(p.cause);
  return { kind: 'queue_error', operation: p.operation, cause: p.cause, message: `Queue error during ${p.operation}: ${causeMsg}` };
}
