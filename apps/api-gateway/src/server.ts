// API Gateway — Fastify server with tRPC router
// Implements: T-COMM-005 (REQ-COMM-001)
// Pattern: Fastify + tRPC adapter (ADR-011, ADR-017)

import Fastify from 'fastify';
import type { FastifyInstance, FastifyRequest } from 'fastify';
import { fastifyTRPCPlugin } from '@trpc/server/adapters/fastify';
import { appRouter } from '@ipf/api-router/router';
import type { CrawlService } from '@ipf/api-router/trpc';
import { createContext } from '@ipf/api-router/trpc';

export type ServerOptions = {
  readonly host: string;
  readonly port: number;
  readonly crawlService: CrawlService;
  readonly logLevel?: string;
};

/** Create and configure the Fastify server with tRPC mounted at /api/v1/trpc. */
export async function createServer(opts: ServerOptions): Promise<FastifyInstance> {
  const app = Fastify({
    logger: {
      level: opts.logLevel ?? 'info',
    },
  });

  // Health check — outside tRPC for k8s liveness/readiness probes
  app.get('/health', () => Promise.resolve({ status: 'ok' }));

  // tRPC handler mounted at /api/v1/trpc (REQ-COMM-001, REQ-COMM-007)
  await app.register(fastifyTRPCPlugin, {
    prefix: '/api/v1/trpc',
    trpcOptions: {
      router: appRouter,
      createContext: ({ req }: { req: FastifyRequest }) =>
        createContext({
          userId: extractUserId(req.headers),
          crawlService: opts.crawlService,
        }),
    },
  });

  return app;
}

/** Extract user ID from request headers (placeholder for real auth). */
function extractUserId(
  headers: FastifyRequest['headers'],
): string | undefined {
  const auth = headers['x-user-id'];
  if (typeof auth === 'string' && auth.length > 0) {
    return auth;
  }
  return undefined;
}
