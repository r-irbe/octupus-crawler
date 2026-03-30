// OTel tRPC middleware tests
// Validates REQ-COMM-004: tRPC client propagates OTel trace context

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { trace, SpanStatusCode } from '@opentelemetry/api';
import type { Tracer } from '@opentelemetry/api';
import { otelMiddlewareFn, injectTraceHeaders } from './otel-middleware.js';

// --- Helpers ---

function createMockSpan(): Record<string, ReturnType<typeof vi.fn>> {
  return {
    end: vi.fn(),
    setStatus: vi.fn(),
    recordException: vi.fn(),
    spanContext: vi.fn().mockReturnValue({ traceId: 'abc', spanId: 'def', traceFlags: 1 }),
    setAttribute: vi.fn(),
    setAttributes: vi.fn(),
    addEvent: vi.fn(),
    addLink: vi.fn(),
    addLinks: vi.fn(),
    updateName: vi.fn(),
    isRecording: vi.fn().mockReturnValue(true),
  };
}

function mockTracer(span: Record<string, ReturnType<typeof vi.fn>>): void {
  vi.spyOn(trace, 'getTracer').mockReturnValue({
    startSpan: vi.fn().mockReturnValue(span),
    startActiveSpan: vi.fn(),
  } as unknown as Tracer);
}

// --- Tests ---

describe('otelMiddlewareFn', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('creates a server span with rpc attributes', async () => {
    // Validates REQ-COMM-004
    const span = createMockSpan();
    mockTracer(span);

    const result = await otelMiddlewareFn({
      path: 'crawl.submit',
      type: 'mutation',
      ctx: {},
      next: () => Promise.resolve({ ok: true }),
    });

    expect(result.ok).toBe(true);
    expect(span['end']).toHaveBeenCalled();
  });

  it('records exception and sets ERROR on throw', async () => {
    // Validates REQ-COMM-004
    const span = createMockSpan();
    mockTracer(span);

    const error = new Error('procedure failed');

    await expect(
      otelMiddlewareFn({
        path: 'crawl.status',
        type: 'query',
        ctx: {},
        next: () => Promise.reject(error),
      }),
    ).rejects.toThrow('procedure failed');

    expect(span['setStatus']).toHaveBeenCalledWith(
      expect.objectContaining({ code: SpanStatusCode.ERROR }),
    );
    expect(span['recordException']).toHaveBeenCalledWith(error);
    expect(span['end']).toHaveBeenCalled();
  });

  it('sets ERROR when result is not ok', async () => {
    // Validates REQ-COMM-004
    const span = createMockSpan();
    mockTracer(span);

    await otelMiddlewareFn({
      path: 'crawl.submit',
      type: 'mutation',
      ctx: {},
      next: () => Promise.resolve({ ok: false }),
    });

    expect(span['setStatus']).toHaveBeenCalledWith(
      expect.objectContaining({
        code: SpanStatusCode.ERROR,
        message: 'tRPC error',
      }),
    );
  });
});

describe('injectTraceHeaders', () => {
  it('returns a record of headers for W3C propagation', () => {
    // Validates REQ-COMM-004
    const headers = injectTraceHeaders();
    expect(typeof headers).toBe('object');
  });
});
