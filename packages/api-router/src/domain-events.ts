// Domain event types — versioned discriminated union
// Implements: T-COMM-010 (REQ-COMM-010)
// NOTE: Domain events live here temporarily. When multiple packages need them,
// extract to packages/core/ (Tier 3 change — requires multi-package plan).

import { z } from 'zod';

// --- Payload Schemas ---

export const CrawlCompletedPayloadSchema = z.object({
  jobId: z.string().min(1),
  url: z.string().url(),
  statusCode: z.number().int().min(100).max(599),
  contentLength: z.number().int().min(0),
  fetchDurationMs: z.number().int().min(0),
});

export type CrawlCompletedPayload = z.infer<typeof CrawlCompletedPayloadSchema>;

export const CrawlFailedPayloadSchema = z.object({
  jobId: z.string().min(1),
  url: z.string().url(),
  errorKind: z.string().min(1),
  message: z.string(),
  attempt: z.number().int().min(1),
});

export type CrawlFailedPayload = z.infer<typeof CrawlFailedPayloadSchema>;

export const URLDiscoveredPayloadSchema = z.object({
  sourceUrl: z.string().url(),
  discoveredUrl: z.string().url(),
  depth: z.number().int().min(0),
});

export type URLDiscoveredPayload = z.infer<typeof URLDiscoveredPayloadSchema>;

export const ContentStoredPayloadSchema = z.object({
  jobId: z.string().min(1),
  url: z.string().url(),
  storageKey: z.string().min(1),
  contentType: z.string().min(1),
  sizeBytes: z.number().int().min(0),
});

export type ContentStoredPayload = z.infer<typeof ContentStoredPayloadSchema>;

// --- Domain Event Union (derived from Zod schema — single source of truth) ---

// --- Zod Schema for DomainEvent (runtime validation) ---

export const DomainEventSchema = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('CrawlCompleted'),
    version: z.literal(1),
    payload: CrawlCompletedPayloadSchema,
  }),
  z.object({
    type: z.literal('CrawlFailed'),
    version: z.literal(1),
    payload: CrawlFailedPayloadSchema,
  }),
  z.object({
    type: z.literal('URLDiscovered'),
    version: z.literal(1),
    payload: URLDiscoveredPayloadSchema,
  }),
  z.object({
    type: z.literal('ContentStored'),
    version: z.literal(1),
    payload: ContentStoredPayloadSchema,
  }),
]);

/** Derived from DomainEventSchema — always in sync. */
export type DomainEvent = z.infer<typeof DomainEventSchema>;

export type DomainEventType = DomainEvent['type'];

// --- Event Envelope (with metadata for transport) ---

export const EventEnvelopeSchema = z.object({
  id: z.string().min(1),
  timestamp: z.string().datetime(),
  source: z.string().min(1),
  event: DomainEventSchema,
});

export type EventEnvelope = z.infer<typeof EventEnvelopeSchema>;

// --- Constructor functions ---

export function createCrawlCompletedEvent(payload: CrawlCompletedPayload): DomainEvent {
  return { type: 'CrawlCompleted', version: 1, payload };
}

export function createCrawlFailedEvent(payload: CrawlFailedPayload): DomainEvent {
  return { type: 'CrawlFailed', version: 1, payload };
}

export function createURLDiscoveredEvent(payload: URLDiscoveredPayload): DomainEvent {
  return { type: 'URLDiscovered', version: 1, payload };
}

export function createContentStoredEvent(payload: ContentStoredPayload): DomainEvent {
  return { type: 'ContentStored', version: 1, payload };
}
