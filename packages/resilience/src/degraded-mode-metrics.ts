// Degraded mode metrics and structured logging callbacks
// Implements: T-RES-013 (REQ-RES-015)

import { CircuitState } from 'cockatiel';

const CIRCUIT_STATE_NAMES: Record<CircuitState, string> = {
  [CircuitState.Closed]: 'closed',
  [CircuitState.Open]: 'open',
  [CircuitState.HalfOpen]: 'half_open',
  [CircuitState.Isolated]: 'isolated',
};

export type DegradedModeMetrics = {
  /** Called when a dependency enters degraded mode (fallback served). */
  readonly onDegradedMode: (domain: string, error: unknown) => void;
  /** Called when circuit breaker state changes. */
  readonly onCircuitStateChange: (domain: string, state: CircuitState) => void;
  /** Called on retry attempt. */
  readonly onRetry: (domain: string, attempt: number, delay: number) => void;
  /** Called when timeout fires. */
  readonly onTimeout: (domain: string, durationMs: number) => void;
};

export type MetricsSink = {
  readonly incrementCounter: (name: string, labels?: Record<string, string>) => void;
  readonly recordGauge: (name: string, value: number, labels?: Record<string, string>) => void;
};

export type LogSink = {
  readonly info: (msg: string, data?: Record<string, unknown>) => void;
  readonly warn: (msg: string, data?: Record<string, unknown>) => void;
  readonly debug: (msg: string, data?: Record<string, unknown>) => void;
};

/**
 * Creates degraded mode metrics/logging handlers.
 * REQ-RES-015: Emit DegradedMode metric and structured log on degraded mode.
 * REQ-RES-004: Emit metrics on circuit breaker transitions.
 * Warning: `domain` label has high cardinality (10K+). The consuming
 * Prometheus adapter should aggregate or allowlist to prevent cardinality explosion.
 */
export function createDegradedModeMetrics(
  metricsSink?: MetricsSink,
  logSink?: LogSink,
): DegradedModeMetrics {
  return {
    onDegradedMode(domain: string, error: unknown): void {
      metricsSink?.incrementCounter('degraded_mode_total', { domain });
      const errorMessage = error instanceof Error ? error.message : String(error);
      logSink?.warn('Degraded mode activated', { domain, error: errorMessage });
    },

    onCircuitStateChange(domain: string, state: CircuitState): void {
      const stateStr = CIRCUIT_STATE_NAMES[state];
      metricsSink?.incrementCounter(`circuit_breaker_${stateStr}`, { domain });
      if (state === CircuitState.Open) {
        logSink?.warn('Circuit breaker state change', { domain, state: stateStr });
      } else {
        logSink?.info('Circuit breaker state change', { domain, state: stateStr });
      }
    },

    onRetry(domain: string, attempt: number, delay: number): void {
      metricsSink?.incrementCounter('retry_attempt_total', {
        domain,
        attempt: String(attempt),
      });
      logSink?.debug('Retry attempt', { domain, attempt, delay });
    },

    onTimeout(domain: string, durationMs: number): void {
      metricsSink?.incrementCounter('timeout_fired_total', { domain });
      logSink?.warn('Timeout fired', { domain, durationMs });
    },
  };
}
