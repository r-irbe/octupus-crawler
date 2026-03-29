// Zod schemas for tRPC crawl procedures
// Implements: T-COMM-002 (REQ-COMM-002)

import { z } from 'zod';

// --- Crawl Submit ---

export const CrawlSubmitSchema = z.object({
  urls: z.array(z.string().url()).min(1).max(1000),
  maxDepth: z.number().int().min(0).max(100).default(3),
  maxConcurrent: z.number().int().min(1).max(100).default(10),
  allowedDomains: z.array(z.string()).optional(),
  userAgent: z.string().min(1).max(500).optional(),
});

export type CrawlSubmitInput = z.infer<typeof CrawlSubmitSchema>;

export const CrawlSubmitResponseSchema = z.object({
  jobId: z.string().min(1),
  urlCount: z.number().int().min(1),
  status: z.literal('queued'),
});

export type CrawlSubmitResponse = z.infer<typeof CrawlSubmitResponseSchema>;

// --- Crawl Status ---

export const CrawlStatusSchema = z.object({
  jobId: z.string().min(1),
});

export type CrawlStatusInput = z.infer<typeof CrawlStatusSchema>;

export const CrawlStatusEnum = z.enum([
  'queued',
  'running',
  'completed',
  'failed',
  'cancelled',
]);

export type CrawlStatus = z.infer<typeof CrawlStatusEnum>;

export const CrawlStatusResponseSchema = z.object({
  jobId: z.string().min(1),
  status: CrawlStatusEnum,
  urlsTotal: z.number().int().min(0),
  urlsCrawled: z.number().int().min(0),
  urlsFailed: z.number().int().min(0),
  startedAt: z.string().datetime().optional(),
  completedAt: z.string().datetime().optional(),
});

export type CrawlStatusResponse = z.infer<typeof CrawlStatusResponseSchema>;

// --- Health ---

export const HealthResponseSchema = z.object({
  status: z.enum(['ok', 'degraded', 'unhealthy']),
});

export type HealthResponse = z.infer<typeof HealthResponseSchema>;
