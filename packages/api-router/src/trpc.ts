// tRPC initialization — context, middleware, procedures
// Implements: T-COMM-001 (REQ-COMM-001), T-COMM-003 (REQ-COMM-003)

import { initTRPC, TRPCError } from '@trpc/server';
import type { CrawlStatus } from './schemas.js';

// --- Context ---

export type CrawlService = {
  readonly submit: (input: {
    urls: string[];
    maxDepth: number;
    maxConcurrent: number;
    allowedDomains?: string[] | undefined;
    userAgent?: string | undefined;
  }) => Promise<{ jobId: string; urlCount: number }>;
  readonly getStatus: (jobId: string) => Promise<{
    jobId: string;
    status: CrawlStatus;
    urlsTotal: number;
    urlsCrawled: number;
    urlsFailed: number;
    startedAt?: string | undefined;
    completedAt?: string | undefined;
  } | undefined>;
};

export type CreateContextOptions = {
  readonly userId?: string | undefined;
  readonly crawlService: CrawlService;
};

export type Context = {
  readonly userId: string | undefined;
  readonly crawlService: CrawlService;
};

export function createContext(opts: CreateContextOptions): Context {
  return {
    userId: opts.userId,
    crawlService: opts.crawlService,
  };
}

// --- tRPC init ---

const t = initTRPC.context<Context>().create();

export const router = t.router;
export const middleware = t.middleware;

// --- Procedures ---

/** Public procedure — no auth required (e.g., health checks, status queries). */
export const publicProcedure = t.procedure;

/**
 * Protected procedure — requires authenticated user.
 * REQ-COMM-003: Auth middleware rejects unauthenticated requests.
 */
const enforceAuth = middleware(({ ctx, next }) => {
  if (!ctx.userId) {
    throw new TRPCError({
      code: 'UNAUTHORIZED',
      message: 'Authentication required',
    });
  }
  return next({
    ctx: { ...ctx, userId: ctx.userId },
  });
});

export const protectedProcedure = t.procedure.use(enforceAuth);
