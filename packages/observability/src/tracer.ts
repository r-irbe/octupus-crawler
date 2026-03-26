// OTel tracing setup — configurable SDK with OTLP exporter
// Implements: T-OBS-016, T-OBS-017, T-OBS-019, T-OBS-021
// REQ-OBS-023, REQ-OBS-024, REQ-OBS-005, REQ-OBS-026

import { NodeSDK } from '@opentelemetry/sdk-node';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import {
  SimpleSpanProcessor,
  BatchSpanProcessor,
} from '@opentelemetry/sdk-trace-base';
import type { SpanExporter } from '@opentelemetry/sdk-trace-base';
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
}

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

  const spanProcessor = config.useBatchProcessor === true
    ? new BatchSpanProcessor(exporter)
    : new SimpleSpanProcessor(exporter);

  // T-OBS-017: HTTP auto-instrumentation (undici)
  const sdk = new NodeSDK({
    resource,
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
