// API Gateway — application entry point
// MUST #9: import './otel' must be first when OTel SDK is configured
// TODO: Add `import './otel'` when @ipf/observability OTel SDK init is wired

import { createServer } from './server.js';

const PORT = Number(process.env['PORT'] ?? '3000');
const HOST = process.env['HOST'] ?? '0.0.0.0';

// Stub crawl service — replaced by real implementation when wired
const stubCrawlService = {
  submit: (input: {
    urls: string[];
    maxDepth: number;
    maxConcurrent: number;
    allowedDomains?: string[] | undefined;
    userAgent?: string | undefined;
  }): Promise<{ jobId: string; urlCount: number }> => Promise.resolve({
    jobId: crypto.randomUUID(),
    urlCount: input.urls.length,
  }),
  getStatus: (
    _jobId: string,
  ): Promise<undefined> => Promise.resolve(undefined),
} as const;

async function main(): Promise<void> {
  const app = await createServer({
    host: HOST,
    port: PORT,
    crawlService: stubCrawlService,
  });

  // MUST #10: Graceful shutdown — drain connections, flush telemetry (ADR-009)
  const shutdown = (): void => {
    void app.close().then(() => {
      process.exit(0);
    });
  };
  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);

  await app.listen({ host: HOST, port: PORT });
}

main().catch((error: unknown) => {
  console.error('Failed to start api-gateway:', error);
  process.exit(1);
});
