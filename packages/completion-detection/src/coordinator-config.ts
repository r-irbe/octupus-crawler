// Coordinator configuration — Zod schemas for completion detection settings
// Implements: T-COORD-001, T-COORD-006, T-COORD-007, T-COORD-012

import { z } from 'zod/v4';

export const CoordinatorConfigSchema = z.object({
  pollIntervalMs: z.number().int().positive().default(1_000),
  maxConsecutiveFailures: z.number().int().positive().default(25),
  maxSkipTicks: z.number().int().positive().default(32),
  leaseTtlMs: z.number().int().positive().default(30_000),
  leaseKey: z.string().min(1).default('coordinator:leader'),
  coordinatorId: z.string().min(1),
});

export type CoordinatorConfig = z.infer<typeof CoordinatorConfigSchema>;
