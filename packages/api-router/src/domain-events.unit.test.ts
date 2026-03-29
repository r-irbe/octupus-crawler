// Domain event unit tests
// Validates: REQ-COMM-010 (versioned domain events), REQ-COMM-010 (Zod runtime validation)

import { describe, it, expect } from 'vitest';
import {
  DomainEventSchema,
  EventEnvelopeSchema,
  createCrawlCompletedEvent,
  createCrawlFailedEvent,
  createURLDiscoveredEvent,
  createContentStoredEvent,
} from './domain-events.js';

describe('domain event constructors', () => {
  // Validates REQ-COMM-010: CrawlCompleted event
  it('creates CrawlCompleted with version 1', () => {
    const event = createCrawlCompletedEvent({
      jobId: 'job-1',
      url: 'https://example.com',
      statusCode: 200,
      contentLength: 1024,
      fetchDurationMs: 150,
    });
    expect(event.type).toBe('CrawlCompleted');
    expect(event.version).toBe(1);
    if (event.type === 'CrawlCompleted') {
      expect(event.payload.statusCode).toBe(200);
    }
  });

  // Validates REQ-COMM-010: CrawlFailed event
  it('creates CrawlFailed with version 1', () => {
    const event = createCrawlFailedEvent({
      jobId: 'job-1',
      url: 'https://example.com',
      errorKind: 'Timeout',
      message: 'Request timed out',
      attempt: 3,
    });
    expect(event.type).toBe('CrawlFailed');
    expect(event.version).toBe(1);
    if (event.type === 'CrawlFailed') {
      expect(event.payload.attempt).toBe(3);
    }
  });

  // Validates REQ-COMM-010: URLDiscovered event
  it('creates URLDiscovered with version 1', () => {
    const event = createURLDiscoveredEvent({
      sourceUrl: 'https://example.com',
      discoveredUrl: 'https://example.com/page',
      depth: 2,
    });
    expect(event.type).toBe('URLDiscovered');
    expect(event.version).toBe(1);
    if (event.type === 'URLDiscovered') {
      expect(event.payload.depth).toBe(2);
    }
  });

  // Validates REQ-COMM-010: ContentStored event
  it('creates ContentStored with version 1', () => {
    const event = createContentStoredEvent({
      jobId: 'job-1',
      url: 'https://example.com',
      storageKey: 's3://bucket/key',
      contentType: 'text/html',
      sizeBytes: 4096,
    });
    expect(event.type).toBe('ContentStored');
    expect(event.version).toBe(1);
    if (event.type === 'ContentStored') {
      expect(event.payload.sizeBytes).toBe(4096);
    }
  });
});

describe('DomainEventSchema', () => {
  // Validates REQ-COMM-010: accepts valid CrawlCompleted
  it('parses valid CrawlCompleted event', () => {
    const result = DomainEventSchema.safeParse({
      type: 'CrawlCompleted',
      version: 1,
      payload: {
        jobId: 'j1',
        url: 'https://example.com',
        statusCode: 200,
        contentLength: 100,
        fetchDurationMs: 50,
      },
    });
    expect(result.success).toBe(true);
  });

  // Validates REQ-COMM-010: rejects unknown type
  it('rejects unknown event type', () => {
    const result = DomainEventSchema.safeParse({
      type: 'UnknownEvent',
      version: 1,
      payload: {},
    });
    expect(result.success).toBe(false);
  });

  // Validates REQ-COMM-010: rejects wrong version
  it('rejects wrong version number', () => {
    const result = DomainEventSchema.safeParse({
      type: 'CrawlCompleted',
      version: 2,
      payload: {
        jobId: 'j1',
        url: 'https://example.com',
        statusCode: 200,
        contentLength: 100,
        fetchDurationMs: 50,
      },
    });
    expect(result.success).toBe(false);
  });

  // Validates REQ-COMM-010: rejects invalid payload
  it('rejects CrawlCompleted with missing payload fields', () => {
    const result = DomainEventSchema.safeParse({
      type: 'CrawlCompleted',
      version: 1,
      payload: { jobId: 'j1' },
    });
    expect(result.success).toBe(false);
  });
});

describe('EventEnvelopeSchema', () => {
  // Validates REQ-COMM-010: envelope wraps valid event
  it('parses valid envelope', () => {
    const result = EventEnvelopeSchema.safeParse({
      id: 'evt-1',
      timestamp: '2025-01-15T10:00:00Z',
      source: 'worker-1',
      event: {
        type: 'CrawlCompleted',
        version: 1,
        payload: {
          jobId: 'j1',
          url: 'https://example.com',
          statusCode: 200,
          contentLength: 100,
          fetchDurationMs: 50,
        },
      },
    });
    expect(result.success).toBe(true);
  });

  // Validates REQ-COMM-010: rejects envelope with missing id
  it('rejects envelope with missing id', () => {
    const result = EventEnvelopeSchema.safeParse({
      timestamp: '2025-01-15T10:00:00Z',
      source: 'worker-1',
      event: {
        type: 'CrawlCompleted',
        version: 1,
        payload: {
          jobId: 'j1',
          url: 'https://example.com',
          statusCode: 200,
          contentLength: 100,
          fetchDurationMs: 50,
        },
      },
    });
    expect(result.success).toBe(false);
  });
});
