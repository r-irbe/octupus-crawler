// Event handler unit tests — skip + warn for unknown events
// Validates: REQ-COMM-014 (unknown version skip), REQ-COMM-015 (event handler type guard)

import { describe, it, expect, vi } from 'vitest';
import { parseEvent, isHandled, type EventHandlerLogger } from './event-handler.js';

const VALID_EVENT = {
  type: 'CrawlCompleted',
  version: 1,
  payload: {
    jobId: 'j1',
    url: 'https://example.com',
    statusCode: 200,
    contentLength: 1024,
    fetchDurationMs: 150,
  },
} as const;

describe('parseEvent', () => {
  // Validates REQ-COMM-014: valid events are handled
  it('returns Handled for valid CrawlCompleted', () => {
    const result = parseEvent(VALID_EVENT);
    expect(result._tag).toBe('Handled');
    if (isHandled(result)) {
      expect(result.type).toBe('CrawlCompleted');
    }
  });

  // Validates REQ-COMM-014: unknown type is skipped
  it('returns Skipped for unknown event type', () => {
    const result = parseEvent({
      type: 'UnknownEvent',
      version: 1,
      payload: {},
    });
    expect(result._tag).toBe('Skipped');
  });

  // Validates REQ-COMM-014: unknown version is skipped
  it('returns Skipped for unknown version', () => {
    const result = parseEvent({
      type: 'CrawlCompleted',
      version: 99,
      payload: {
        jobId: 'j1',
        url: 'https://example.com',
        statusCode: 200,
        contentLength: 1024,
        fetchDurationMs: 150,
      },
    });
    expect(result._tag).toBe('Skipped');
  });

  // Validates REQ-COMM-014: null input is skipped (not crash)
  it('returns Skipped for null input', () => {
    const result = parseEvent(null);
    expect(result._tag).toBe('Skipped');
  });

  // Validates REQ-COMM-014: undefined input is skipped (not crash)
  it('returns Skipped for undefined input', () => {
    const result = parseEvent(undefined);
    expect(result._tag).toBe('Skipped');
  });

  // Validates REQ-COMM-014: logger.warn called for skipped events
  it('calls logger.warn for skipped events', () => {
    const logger: EventHandlerLogger = { warn: vi.fn() };
    parseEvent({ type: 'BadEvent', version: 2, payload: {} }, logger);
    expect(logger.warn).toHaveBeenCalledWith(
      'Skipping unrecognized event',
      expect.objectContaining({ type: 'BadEvent', version: 2 }),
    );
  });

  // Validates REQ-COMM-014: logger not called for valid events
  it('does not call logger for valid events', () => {
    const logger: EventHandlerLogger = { warn: vi.fn() };
    parseEvent(VALID_EVENT, logger);
    expect(logger.warn).not.toHaveBeenCalled();
  });

  // Validates REQ-COMM-014: extracts type/version from non-object
  it('handles non-object raw input gracefully', () => {
    const result = parseEvent('string-input');
    expect(result._tag).toBe('Skipped');
  });
});

describe('isHandled', () => {
  // Validates REQ-COMM-015: type guard narrows correctly
  it('returns true for Handled result', () => {
    const result = parseEvent(VALID_EVENT);
    expect(isHandled(result)).toBe(true);
  });

  it('returns false for Skipped result', () => {
    const result = parseEvent({ type: 'Bad', version: 0 });
    expect(isHandled(result)).toBe(false);
  });
});
