/**
 * E2E Metrics Helper — Parse Prometheus metrics and poll for expected values.
 *
 * Shared utility for E2E tests that need to verify crawler behavior via metrics.
 * @see REQ-K8E-040, REQ-K8E-042
 */

/** Fetch raw Prometheus metrics text from a metrics endpoint */
export async function fetchMetricsText(port: number): Promise<string> {
  const res = await fetch(`http://127.0.0.1:${String(port)}/metrics`);
  return res.text();
}

/** Parse Prometheus text format into a map (handles labeled metrics) */
export function parseMetrics(text: string): Map<string, number> {
  const metrics = new Map<string, number>();

  for (const line of text.split('\n')) {
    if (line.startsWith('#') || line.trim() === '') continue;
    const match = /^([a-zA-Z_:][a-zA-Z0-9_:]*)(?:\{[^}]*\})?\s+([0-9.eE+-]+)/m.exec(line);
    if (match !== null) {
      const name = match[1];
      const value = parseFloat(match[2] ?? '0');
      if (name !== undefined) {
        // Sum labeled variants into same metric name
        const existing = metrics.get(name) ?? 0;
        metrics.set(name, existing + value);
      }
    }
  }

  return metrics;
}

/** Get a single metric value, or undefined if not present */
export async function getMetricValue(
  port: number,
  metricName: string,
): Promise<number | undefined> {
  const text = await fetchMetricsText(port);
  const metrics = parseMetrics(text);
  return metrics.get(metricName);
}

/**
 * Poll metrics endpoint until a metric reaches the expected value or timeout.
 * Returns the final metric value.
 */
export async function waitForMetric(
  port: number,
  metricName: string,
  expectedValue: number,
  timeoutMs: number = 60_000,
): Promise<number> {
  const start = Date.now();

  while (Date.now() - start < timeoutMs) {
    const value = await getMetricValue(port, metricName);
    if (value !== undefined && value >= expectedValue) return value;
    await new Promise<void>((r) => { setTimeout(r, 2_000); });
  }

  // Final check and report
  const finalValue = await getMetricValue(port, metricName);
  throw new Error(
    `Metric ${metricName} did not reach ${String(expectedValue)} within ${String(timeoutMs)}ms (final: ${String(finalValue ?? 'absent')})`,
  );
}
