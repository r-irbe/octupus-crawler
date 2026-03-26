// OTel tracing setup — configurable SDK with OTLP exporter
// Implements: T-OBS-016, T-OBS-017, T-OBS-019, T-OBS-021, T-OBS-027, T-OBS-028
// REQ-OBS-023..028

import { NodeSDK } from '@opentelemetry/sdk-node';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import {
  SimpleSpanProcessor,
  BatchSpanProcessor,
  ParentBasedSampler,
  TraceIdRatioBasedSampler,
} from '@opentelemetry/sdk-trace-base';
import type { SpanExporter, SpanProcessor, Sampler } from '@opentelemetry/sdk-trace-base';
import { UndiciInstrumentation } from '@opentelemetry/instrumentation-undici';
import { resourceFromAttributes } from '@opentelemetry/resources';
import {
  ATTR_SERVICE_NAME,
  ATTR_SERVICE_VERSION,
} from '@opentelemetry/semantic-conventions';
import type { Logger } from '@ipf/core/contracts/logger';

export interface TracerConfig {
  readonly serviceName: string;
  readonly serviceVersion?: string;
  readonly otlpEndpoint?: string;
  readonly exporter?: SpanExporter;
  readonly logger: Logger;
  readonly useBatchProcessor?: boolean;
  // T-OBS-027: REQ-OBS-027 — sampling configuration
  readonly samplingRate?: number;
  // T-OBS-028: REQ-OBS-028 — batch processor buffer config
  readonly batchConfig?: BatchProcessorConfig;
}

export interface BatchProcessorConfig {
  readonly maxQueueSize?: number;
  readonly maxExportBatchSize?: number;
  readonly scheduledDelayMillis?: number;
  readonly exportTimeoutMillis?: number;
}

const DEFAULT_SAMPLING_RATE = 0.1;
const DEFAULT_MAX_QUEUE_SIZE = 2048;

export interface TracerHandle {
  shutdown(): Promise<void>;
}

export function createTracer(config: TracerConfig): TracerHandle {
  const {
    serviceName,
    logger,
  } = config;

  const exporter = config.exporter ?? new OTLPTraceExporter({
    url: config.otlpEndpoint ?? 'http://localhost:4318/v1/traces',
  });

  // T-OBS-016: configurable resource attributes
  const attributes: Record<string, string> = {
    [ATTR_SERVICE_NAME]: serviceName,
  };
  if (config.serviceVersion !== undefined) {
    attributes[ATTR_SERVICE_VERSION] = config.serviceVersion;
  }
  const resource = resourceFromAttributes(attributes);

  // T-OBS-027: REQ-OBS-027 — parent-based sampling with configurable rate
  const samplingRate = config.samplingRate ?? DEFAULT_SAMPLING_RATE;
  const sampler: Sampler = new ParentBasedSampler({
    root: new TraceIdRatioBasedSampler(samplingRate),
  });

  // T-OBS-028: REQ-OBS-028 — configurable batch processor
  const spanProcessor: SpanProcessor = config.useBatchProcessor === true
    ? new BatchSpanProcessor(exporter, {
        maxQueueSize: config.batchConfig?.maxQueueSize ?? DEFAULT_MAX_QUEUE_SIZE,
        maxExportBatchSize: config.batchConfig?.maxExportBatchSize ?? 512,
        scheduledDelayMillis: config.batchConfig?.scheduledDelayMillis ?? 5000,
        exportTimeoutMillis: config.batchConfig?.exportTimeoutMillis ?? 30000,
      })
    : new SimpleSpanProcessor(exporter);

  // T-OBS-017: HTTP auto-instrumentation (undici)
  const sdk = new NodeSDK({
    resource,
    sampler,
    spanProcessors: [spanProcessor],
    instrumentations: [new UndiciInstrumentation()],
  });

  sdk.start();

  return {
    // T-OBS-021: Non-throwing shutdown (REQ-OBS-026)
    async shutdown(): Promise<void> {
      try {
        await sdk.shutdown();
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        logger.error('tracer shutdown failed', { error: message });
      }
    },
  };
}
