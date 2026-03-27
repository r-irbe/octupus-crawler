// Worker processor — job payload validation and pipeline execution
// Implements: T-LIFE-028 to 031, REQ-LIFE-025 to 028

import type { Result } from 'neverthrow';
import type { Logger } from '@ipf/core/contracts/logger';
import type { CrawlMetrics } from '@ipf/core/contracts/crawl-metrics';
import type { CrawlError } from '@ipf/core/errors/crawl-error';
import { z } from 'zod/v4';

// REQ-LIFE-025: Zod schema for job payload validation
export const JobPayloadSchema = z.object({
  url: z.string().min(1),
  depth: z.coerce.number().int().min(0),
});

export type JobPayload = z.infer<typeof JobPayloadSchema>;

export type PipelineExecutor = (
  payload: JobPayload,
) => Promise<Result<{ discoveredCount: number }, CrawlError>>;

export type WorkerProcessorDeps = {
  readonly logger: Logger;
  readonly metrics: CrawlMetrics;
  readonly executePipeline: PipelineExecutor;
};

export type ProcessJobResult =
  | { readonly _tag: 'Success'; readonly discoveredCount: number }
  | { readonly _tag: 'ValidationError'; readonly message: string }
  | { readonly _tag: 'QueueError'; readonly error: CrawlError }
  | { readonly _tag: 'PipelineError'; readonly error: CrawlError };

export function createWorkerProcessor(deps: WorkerProcessorDeps): {
  processJob: (rawPayload: unknown) => Promise<ProcessJobResult>;
} {
  async function processJob(rawPayload: unknown): Promise<ProcessJobResult> {
    // REQ-LIFE-025: validate payload at runtime
    const parsed = JobPayloadSchema.safeParse(rawPayload);
    if (!parsed.success) {
      const message = parsed.error.message;
      deps.logger.error('Invalid job payload', { error: message });
      return { _tag: 'ValidationError', message };
    }

    const payload = parsed.data;
    deps.logger.debug('Processing job', { url: payload.url, depth: payload.depth });

    const result = await deps.executePipeline(payload);

    if (result.isOk()) {
      // REQ-LIFE-027: record success metrics
      deps.metrics.recordFetch('success');
      return { _tag: 'Success', discoveredCount: result.value.discoveredCount };
    }

    const error = result.error;

    // REQ-LIFE-026: re-throw queue_error for queue retry
    if (error.kind === 'queue_error') {
      deps.metrics.recordFetch('error', 'queue_error');
      return { _tag: 'QueueError', error };
    }

    // REQ-LIFE-027: record failure metrics
    deps.metrics.recordFetch('error', error.kind);
    return { _tag: 'PipelineError', error };
  }

  return { processJob };
}
