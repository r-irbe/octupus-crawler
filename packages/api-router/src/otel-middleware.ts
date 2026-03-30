// tRPC OTel middleware — trace propagation for internal RPC calls
// Implements: T-COMM-004 (REQ-COMM-004)
// Propagates W3C traceparent context across tRPC client/server boundaries.

import { context, trace, propagation, SpanKind, SpanStatusCode } from '@opentelemetry/api';
import type { Span } from '@opentelemetry/api';

const TRACER_NAME = 'ipf-api-router';

// --- Server-side middleware function ---

/**
 * OTel middleware function for tRPC.
 * Can be used with any tRPC instance: `t.procedure.use(otelMiddlewareFn)`
 *
 * Creates a server span per procedure call with W3C trace propagation.
 */
export function otelMiddlewareFn(opts: {
  readonly path: string;
  readonly type: string;
  readonly ctx: Record<string, unknown>;
  readonly next: () => Promise<{ ok: boolean }>;
}): Promise<{ ok: boolean }> {
  const tracer = trace.getTracer(TRACER_NAME);
  const parentContext = extractParentContext(opts.ctx);

  const span: Span = tracer.startSpan(
    `trpc.${opts.type}.${opts.path}`,
    {
      kind: SpanKind.SERVER,
      attributes: {
        'rpc.system': 'trpc',
        'rpc.method': opts.path,
        'rpc.service': 'ipf-api-router',
        'trpc.type': opts.type,
      },
    },
    parentContext,
  );

  return context.with(
    trace.setSpan(parentContext, span),
    async () => {
      try {
        const result = await opts.next();
        if (!result.ok) {
          span.setStatus({ code: SpanStatusCode.ERROR, message: 'tRPC error' });
        }
        return result;
      } catch (error: unknown) {
        span.setStatus({ code: SpanStatusCode.ERROR });
        if (error instanceof Error) {
          span.recordException(error);
        }
        throw error;
      } finally {
        span.end();
      }
    },
  );
}

// --- Client-side helpers ---

/**
 * Headers carrier for W3C trace propagation.
 * Inject into tRPC client headers before each request.
 */
export function injectTraceHeaders(): Record<string, string> {
  const carrier: Record<string, string> = {};
  propagation.inject(context.active(), carrier);
  return carrier;
}

// --- Internal ---

function extractParentContext(
  ctx: Record<string, unknown>,
): ReturnType<typeof propagation.extract> {
  const meta = ctx['meta'] as Record<string, string> | undefined;
  if (meta !== undefined) {
    return propagation.extract(context.active(), meta);
  }
  return context.active();
}
