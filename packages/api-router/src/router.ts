// tRPC app router — crawl + health procedures
// Implements: T-COMM-001 (REQ-COMM-001)

import { TRPCError } from '@trpc/server';
import { router, publicProcedure, protectedProcedure } from './trpc.js';
import {
  CrawlSubmitSchema,
  CrawlStatusSchema,
  HealthResponseSchema,
} from './schemas.js';

export const appRouter = router({
  crawl: router({
    /** Submit URLs for crawling. Protected — requires auth. */
    submit: protectedProcedure
      .input(CrawlSubmitSchema)
      .mutation(async ({ ctx, input }) => {
        const result = await ctx.crawlService.submit(input);
        return {
          jobId: result.jobId,
          urlCount: result.urlCount,
          status: 'queued' as const,
        };
      }),

    /** Query crawl job status. Public — no auth required. */
    status: publicProcedure
      .input(CrawlStatusSchema)
      .query(async ({ ctx, input }) => {
        const status = await ctx.crawlService.getStatus(input.jobId);
        if (!status) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: `Job ${input.jobId} not found`,
          });
        }
        return status;
      }),
  }),

  health: router({
    /** Health check endpoint. */
    check: publicProcedure
      .output(HealthResponseSchema)
      .query(() => ({ status: 'ok' as const })),
  }),
});

/** Type-safe router type for client inference. */
export type AppRouter = typeof appRouter;
