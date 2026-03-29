// main.ts — IPF Crawler composition root
// Implements: REQ-LIFE-001 to REQ-LIFE-032, T-LIFE-018
// Design: docs/specs/application-lifecycle/design.md §1

import { ok } from 'neverthrow';
import { loadConfig } from '@ipf/config/load-config';
import { createPinoLogger } from '@ipf/observability/pino-logger';
import { createTracer } from '@ipf/observability/tracer';
import { createMetricsServer } from '@ipf/observability/metrics-server';
import { createPromMetrics } from '@ipf/observability/prom-metrics';
import { parseRedisUrl, QueueConfigSchema } from '@ipf/job-queue/connection-config';
import { createBullMQQueueBackend } from '@ipf/job-queue/bullmq-queue-backend';
import { createBullMQJobConsumer } from '@ipf/job-queue/bullmq-job-consumer';
import { createFrontierAdapter } from '@ipf/url-frontier/frontier-adapter';
import { parseCrawlUrl } from '@ipf/crawl-pipeline/crawl-url-factory';
import type { Disposable } from '@ipf/core/contracts/disposable';
import {
  validateConfig,
  validateSeeds,
  executeStartupSequence,
} from './startup-orchestrator.js';
import type { StartupPhase } from './startup-orchestrator.js';
import {
  createShutdownOrchestrator,
  DEFAULT_SHUTDOWN_CONFIG,
} from './graceful-shutdown.js';
import type { TeardownEntry } from './graceful-shutdown.js';
import { registerProcessHandlers, safeMain } from './process-handlers.js';
import type { ShutdownFn } from './process-handlers.js';
import { signalReason } from './shutdown-reason.js';
import { createReadinessProbe } from './readiness-probe.js';
import { seedFrontier, parseSeedUrls } from './seed-frontier.js';
import { createWorkerProcessor } from './worker-processor.js';

// REQ-LIFE-001: Bootstrap logger for pre-startup failures
const bootstrapLogger = createPinoLogger({
  level: 'info',
  initialBindings: { phase: 'bootstrap' },
});

// Late-bound shutdown (set after orchestrator is created)
let shutdown: ShutdownFn = async (_reason) => {};

void safeMain(
  async (): Promise<void> => {
    // --- Phase 1: Config validation (REQ-LIFE-001, REQ-LIFE-002) ---
    const config = validateConfig(loadConfig, process.env, bootstrapLogger);
    const seeds = parseSeedUrls(config.SEED_URLS);
    validateSeeds(seeds, bootstrapLogger);

    const workerId = config.WORKER_ID ?? `worker-${String(process.pid)}`;

    // --- Phase 2: Observability (REQ-LIFE-003 to 005) ---
    const logger = createPinoLogger({
      level: config.LOG_LEVEL,
      initialBindings: { workerId, service: config.SERVICE_NAME },
    });

    const tracer = createTracer({
      serviceName: config.SERVICE_NAME,
      otlpEndpoint: config.OTEL_EXPORTER_OTLP_ENDPOINT,
      logger,
    });

    const { metrics, registry } = createPromMetrics();
    const metricsServer = createMetricsServer({ registry });

    // --- Phase 3: Readiness probe (REQ-LIFE-029) ---
    const readinessProbe = createReadinessProbe(config.HEALTH_PORT, logger);

    // --- Phase 4: Infrastructure (REQ-LIFE-032) ---
    const connection = parseRedisUrl(config.REDIS_URL);
    const queueConfig = QueueConfigSchema.parse({
      concurrency: config.CRAWL_MAX_CONCURRENT_FETCHES,
    });
    const queueBackend = createBullMQQueueBackend({
      connection,
      config: queueConfig,
    });
    const frontier = createFrontierAdapter({ backend: queueBackend });

    // --- Phase 5: Worker processor (REQ-LIFE-025 to 028) ---
    const workerProcessor = createWorkerProcessor({
      logger,
      metrics,
      executePipeline: (payload) => {
        // TODO(T-LIFE-031): Wire crawl pipeline (http-fetcher, SSRF, link extractor)
        logger.info('Job received', { url: payload.url, depth: payload.depth });
        return Promise.resolve(ok({ discoveredCount: 0 }));
      },
    });

    // --- Phase 6: Job consumer (REQ-LIFE-006) ---
    const jobConsumer = createBullMQJobConsumer({
      connection,
      config: queueConfig,
      processor: async (job) => {
        const result = await workerProcessor.processJob(job.data);
        if (result._tag === 'QueueError') {
          throw new Error(result.error.message);
        }
      },
    });

    // --- Phase 7: Startup sequence (REQ-LIFE-033, 034) ---
    const metricsPhase: StartupPhase = {
      name: 'metrics-server',
      execute: (): Promise<Disposable> =>
        new Promise((resolvePhase, rejectPhase) => {
          metricsServer.listen(config.METRICS_PORT, () => {
            logger.info('Metrics server listening', { port: config.METRICS_PORT });
            resolvePhase({
              close: (): Promise<void> =>
                new Promise<void>((resolveClose, rejectClose) => {
                  metricsServer.close((closeErr) => {
                    if (closeErr) { rejectClose(closeErr instanceof Error ? closeErr : new Error(String(closeErr))); }
                    else { resolveClose(); }
                  });
                }),
            });
          });
          metricsServer.on('error', rejectPhase);
        }),
    };

    const probePhase: StartupPhase = {
      name: 'readiness-probe',
      async execute(): Promise<Disposable> {
        await readinessProbe.listening();
        return readinessProbe;
      },
    };

    const consumerPhase: StartupPhase = {
      name: 'job-consumer',
      async execute(): Promise<Disposable> {
        await jobConsumer.start();
        return { close: (): Promise<void> => jobConsumer.close() };
      },
    };

    const startupResult = await executeStartupSequence(
      [metricsPhase, probePhase, consumerPhase],
      logger,
    );

    // --- Phase 8: Shutdown orchestrator (REQ-LIFE-018 to 024) ---
    const teardownEntries: TeardownEntry[] = [
      ...startupResult.resources.map((r) => ({
        name: r.name,
        resource: r.resource,
      })),
      { name: 'tracer', resource: { close: (): Promise<void> => tracer.shutdown() } },
      { name: 'frontier', resource: { close: (): Promise<void> => frontier.close() } },
    ];

    const orchestrator = createShutdownOrchestrator({
      config: DEFAULT_SHUTDOWN_CONFIG,
      logger,
      drain: jobConsumer,
      teardownEntries,
      readinessProbe,
    });
    shutdown = orchestrator.execute;

    // --- Phase 9: Signal handlers (REQ-LIFE-013 to 017) ---
    registerProcessHandlers({
      logger,
      shutdown,
      exit: (code): void => {
        process.exit(code);
      },
    });
    process.on('SIGTERM', () => {
      void shutdown(signalReason('SIGTERM'));
    });
    process.on('SIGINT', () => {
      void shutdown(signalReason('SIGINT'));
    });

    // --- Phase 10: Seed frontier (REQ-LIFE-007 to 010) ---
    await seedFrontier(seeds, {
      frontier,
      logger,
      metrics,
      parseCrawlUrl,
    });

    logger.info('IPF Crawler started', { workerId, seedCount: seeds.length });
    // Process stays alive via Redis connection + HTTP servers
  },
  {
    logger: bootstrapLogger,
    shutdown: (reason) => shutdown(reason),
    exit: (code): void => {
      process.exit(code);
    },
  },
);
