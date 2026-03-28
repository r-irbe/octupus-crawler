// Enhanced readiness check — verify infrastructure connectivity
// Implements: T-OBS-030, REQ-OBS-030

import type { ReadinessResult } from './metrics-server.js';

export type RedisClient = {
  ping(): Promise<string>;
};

export type PgClient = {
  query(sql: string): Promise<unknown>;
};

export type ReadinessCheckDeps = {
  readonly redis?: RedisClient;
  readonly pg?: PgClient;
};

/**
 * REQ-OBS-030: /readyz shall verify:
 * (a) Redis/Dragonfly connectivity (ping)
 * (b) PostgreSQL connectivity (SELECT 1)
 * (c) OTel Collector reachability (optional, non-blocking)
 *
 * If any required check fails, returns 503 with failing component identified.
 * Components not configured are skipped (not counted as failures).
 */
export function createReadinessCheck(deps: ReadinessCheckDeps): () => Promise<ReadinessResult> {
  return async (): Promise<ReadinessResult> => {
    const components: Record<string, string> = {};
    let allHealthy = true;

    // (a) Redis ping
    if (deps.redis) {
      try {
        await deps.redis.ping();
        components['redis'] = 'ok';
      } catch {
        components['redis'] = 'unreachable';
        allHealthy = false;
      }
    }

    // (b) PostgreSQL SELECT 1
    if (deps.pg) {
      try {
        await deps.pg.query('SELECT 1');
        components['postgres'] = 'ok';
      } catch {
        components['postgres'] = 'unreachable';
        allHealthy = false;
      }
    }

    return {
      status: allHealthy ? 200 : 503,
      components,
    };
  };
}
