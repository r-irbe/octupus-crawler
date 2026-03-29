// Cooperative timeout policy
// Implements: T-RES-007 (REQ-RES-008, REQ-RES-009)

import {
  timeout,
  TimeoutStrategy,
  type IPolicy,
} from 'cockatiel';
import type { ResilienceConfig, TimeoutEventHandler } from './resilience-types.js';
import { DEFAULT_RESILIENCE_CONFIG } from './resilience-types.js';

export type TimeoutTarget = 'fetch' | 'db' | 'redis';

/**
 * Creates a cooperative timeout policy.
 * REQ-RES-008: Configurable defaults (30s fetch, 10s DB, 5s Redis).
 * REQ-RES-009: Uses cooperative cancellation via AbortSignal.
 */
export function createTimeoutPolicy(
  target: TimeoutTarget,
  config: Partial<ResilienceConfig> = {},
  onTimeout?: TimeoutEventHandler,
  domain?: string,
): IPolicy {
  const durationMs = getTimeoutDuration(target, config);
  const policy = timeout(durationMs, TimeoutStrategy.Cooperative);

  if (onTimeout && domain) {
    policy.onTimeout(() => {
      onTimeout(domain, durationMs);
    });
  }

  return policy;
}

function getTimeoutDuration(target: TimeoutTarget, config: Partial<ResilienceConfig>): number {
  switch (target) {
    case 'fetch':
      return config.timeoutFetchMs ?? DEFAULT_RESILIENCE_CONFIG.timeoutFetchMs;
    case 'db':
      return config.timeoutDbMs ?? DEFAULT_RESILIENCE_CONFIG.timeoutDbMs;
    case 'redis':
      return config.timeoutRedisMs ?? DEFAULT_RESILIENCE_CONFIG.timeoutRedisMs;
  }
}
