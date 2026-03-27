// Startup orchestrator — sequential initialization with fail-fast
// Implements: T-LIFE-004 to 009, T-LIFE-043, T-LIFE-044
// REQ-LIFE-001 to 006, REQ-LIFE-033, REQ-LIFE-034

import type { Result } from 'neverthrow';
import type { Logger } from '@ipf/core/contracts/logger';
import type { Config } from '@ipf/config/config-schema';
import type { Disposable } from '@ipf/core/contracts/disposable';

export type StartupPhase = {
  readonly name: string;
  readonly execute: () => Promise<Disposable>;
};

export type StartupResult = {
  readonly resources: ReadonlyArray<{ name: string; resource: Disposable }>;
};

// REQ-LIFE-001: Config validation gate
export function validateConfig(
  loadConfig: (env: Record<string, string | undefined>) => Result<Config, unknown>,
  env: Record<string, string | undefined>,
  logger: Logger,
): Config {
  const result = loadConfig(env);
  if (result.isErr()) {
    logger.fatal('Configuration validation failed', { error: String(result.error) });
    throw new StartupError('config', String(result.error));
  }
  return result.value;
}

// REQ-LIFE-002: Seed URL validation
export function validateSeeds(seeds: readonly string[], logger: Logger): void {
  if (seeds.length === 0) {
    logger.fatal('No seed URLs provided');
    throw new StartupError('seeds', 'SEED_URLS is empty');
  }
}

// REQ-LIFE-033, REQ-LIFE-034: Sequential startup with fail-fast and reverse cleanup
export async function executeStartupSequence(
  phases: readonly StartupPhase[],
  logger: Logger,
): Promise<StartupResult> {
  const resources: { name: string; resource: Disposable }[] = [];

  for (const phase of phases) {
    logger.info('Starting phase', { phase: phase.name });
    try {
      const resource = await phase.execute();
      resources.push({ name: phase.name, resource });
    } catch (err: unknown) {
      logger.fatal('Startup phase failed, cleaning up', {
        phase: phase.name,
        error: err instanceof Error ? err.message : String(err),
      });
      // REQ-LIFE-034: reverse cleanup of already-initialized resources
      await cleanupReverse(resources, logger);
      throw new StartupError(phase.name, err instanceof Error ? err.message : String(err));
    }
  }

  logger.info('All startup phases completed', { count: resources.length });
  return { resources };
}

async function cleanupReverse(
  resources: readonly { name: string; resource: Disposable }[],
  logger: Logger,
): Promise<void> {
  for (let i = resources.length - 1; i >= 0; i--) {
    const entry = resources[i];
    if (entry) {
      try {
        await entry.resource.close();
        logger.info('Cleaned up resource', { resource: entry.name });
      } catch (cleanupErr: unknown) {
        logger.error('Cleanup failed', {
          resource: entry.name,
          error: cleanupErr instanceof Error ? cleanupErr.message : String(cleanupErr),
        });
      }
    }
  }
}

export class StartupError extends Error {
  constructor(
    readonly phase: string,
    readonly detail: string,
  ) {
    super(`Startup failed at phase '${phase}': ${detail}`);
    this.name = 'StartupError';
  }
}
