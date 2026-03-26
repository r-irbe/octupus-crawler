// Job queue trace propagation — W3C traceparent inject/extract
// Implements: T-OBS-018, REQ-OBS-024, REQ-OBS-029

import {
  context,
  trace,
  propagation,
  SpanKind,
} from '@opentelemetry/api';
import type { Span, SpanContext } from '@opentelemetry/api';

export interface TraceCarrier {
  traceparent?: string;
}

/**
 * Inject current trace context into a carrier object (for enqueue).
 * Returns the carrier with traceparent set if a span is active.
 */
export function injectTraceContext(carrier: TraceCarrier): TraceCarrier {
  propagation.inject(context.active(), carrier);
  return carrier;
}

/**
 * Extract parent trace context from carrier and create a child span.
 * Returns the span and a cleanup function to end it.
 */
export function extractAndStartSpan(
  carrier: TraceCarrier,
  spanName: string,
): { span: Span; end: () => void } {
  const parentContext = propagation.extract(context.active(), carrier);
  const tracer = trace.getTracer('ipf-job-queue');
  const span = tracer.startSpan(
    spanName,
    { kind: SpanKind.CONSUMER },
    parentContext,
  );

  return {
    span,
    end(): void {
      span.end();
    },
  };
}

/**
 * Get the current span's trace context for correlation in logs.
 * Returns undefined if no active span.
 */
export function getTraceContext(): { traceId: string; spanId: string } | undefined {
  const span = trace.getActiveSpan();
  if (span === undefined) {
    return undefined;
  }
  const ctx: SpanContext = span.spanContext();
  return {
    traceId: ctx.traceId,
    spanId: ctx.spanId,
  };
}
