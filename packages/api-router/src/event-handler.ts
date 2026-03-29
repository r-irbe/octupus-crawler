// Unknown event version handling — skip + warn
// Implements: T-COMM-015 (REQ-COMM-014)

import { DomainEventSchema } from './domain-events.js';

export type EventHandlerLogger = {
  readonly warn: (msg: string, data?: Record<string, unknown>) => void;
};

export type EventHandleResult =
  | { readonly _tag: 'Handled'; readonly type: string }
  | { readonly _tag: 'Skipped'; readonly reason: string };

/**
 * Attempts to parse and validate a raw event.
 * REQ-COMM-014: Unknown event versions are skipped with a warning, never crash.
 */
export function parseEvent(
  raw: unknown,
  logger?: EventHandlerLogger,
): EventHandleResult {
  const result = DomainEventSchema.safeParse(raw);

  if (result.success) {
    return { _tag: 'Handled', type: result.data.type };
  }

  // Attempt to extract type/version for logging
  const asRecord = typeof raw === 'object' && raw !== null ? raw as Record<string, unknown> : {};
  const eventType = typeof asRecord['type'] === 'string' ? asRecord['type'] : 'unknown';
  const eventVersion = typeof asRecord['version'] === 'number' ? asRecord['version'] : 'unknown';

  const reason = `Unknown or invalid event: type=${eventType}, version=${String(eventVersion)}`;
  logger?.warn('Skipping unrecognized event', {
    type: eventType,
    version: eventVersion,
    errors: result.error.issues.map((i) => i.message),
  });

  return { _tag: 'Skipped', reason };
}

/**
 * Type guard: check if an event handle result was successfully handled.
 */
export function isHandled(result: EventHandleResult): result is { readonly _tag: 'Handled'; readonly type: string } {
  return result._tag === 'Handled';
}
