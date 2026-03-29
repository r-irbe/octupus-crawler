// Policy composer — timeout → retry → circuit breaker
// Implements: T-RES-008 (REQ-RES-007, REQ-RES-018)

import { wrap, type IPolicy } from 'cockatiel';
import { createCircuitBreakerRegistry, type CircuitBreakerRegistry } from './circuit-breaker-registry.js';
import { createRetryPolicy } from './retry-policy.js';
import { createTimeoutPolicy } from './timeout-policy.js';
import type {
  ResilienceConfig,
  CircuitStateChangeHandler,
  RetryEventHandler,
  TimeoutEventHandler,
} from './resilience-types.js';

export type ResilienceEventHandlers = {
  readonly onCircuitStateChange?: CircuitStateChangeHandler;
  readonly onRetry?: RetryEventHandler;
  readonly onTimeout?: TimeoutEventHandler;
};

export type PolicyComposer = {
  /** Get a composed policy for a specific domain (timeout → retry → CB). */
  readonly getPolicy: (domain: string) => IPolicy;
  /** Access the underlying circuit breaker registry. */
  readonly registry: CircuitBreakerRegistry;
  /** Cleanup all resources. */
  readonly dispose: () => void;
};

/**
 * Creates a policy composer that produces per-domain resilience policies.
 * REQ-RES-018: Compose order is timeout → retry → circuit breaker.
 * REQ-RES-019: Factory returns composed policy for any crawl domain.
 */
export function createPolicyComposer(
  config: Partial<ResilienceConfig> = {},
  handlers: ResilienceEventHandlers = {},
): PolicyComposer {
  const registry = createCircuitBreakerRegistry(config, handlers.onCircuitStateChange);

  return {
    getPolicy(domain: string): IPolicy {
      const timeoutPolicy = createTimeoutPolicy('fetch', config, handlers.onTimeout, domain);
      const retryPolicy = createRetryPolicy(config, handlers.onRetry, domain);
      const breakerPolicy = registry.get(domain);
      // REQ-RES-018: timeout → retry → circuit breaker
      return wrap(timeoutPolicy, retryPolicy, breakerPolicy);
    },

    registry,

    dispose(): void {
      registry.clear();
    },
  };
}
