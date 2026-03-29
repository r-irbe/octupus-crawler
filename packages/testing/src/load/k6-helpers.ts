/**
 * k6 Helpers — Utility functions for k6 load test scripts.
 *
 * Provides Redis URL seeding and metrics scraping for load tests.
 * These functions are designed for use inside k6 scripts.
 * @see T-PROD-013, design.md §4.1
 */

/**
 * Build a seed URL payload for the crawler API.
 * k6 scripts call this to generate URL seeding requests.
 */
export function buildSeedPayload(
  baseUrl: string,
  index: number,
  depth: number = 0,
): string {
  return JSON.stringify({
    url: `${baseUrl}/page-${String(index)}`,
    depth,
  });
}

/**
 * Build an array of seed URL payloads for bulk seeding.
 */
export function buildBulkSeedPayloads(
  baseUrl: string,
  count: number,
  depth: number = 0,
): ReadonlyArray<string> {
  const payloads: string[] = [];
  for (let i = 0; i < count; i++) {
    payloads.push(buildSeedPayload(baseUrl, i, depth));
  }
  return payloads;
}

/**
 * k6 threshold definitions matching our SLO targets.
 * Import into k6 scripts for consistent threshold configuration.
 */
export const K6_THRESHOLDS = {
  'http_req_duration{type:seed}': ['p(95)<5000'],
  'http_req_failed{type:seed}': ['rate<0.05'],
  'http_req_duration{type:metrics}': ['p(95)<2000'],
} as const;

/**
 * Parse a Prometheus metrics text response for a specific metric.
 * Used in k6 scripts to verify SLO compliance during load tests.
 */
export function extractMetricValue(
  metricsText: string,
  metricName: string,
): number | undefined {
  for (const line of metricsText.split('\n')) {
    if (line.startsWith('#') || line.trim() === '') continue;
    const pattern = new RegExp(
      `^${metricName}(?:\\{[^}]*\\})?\\s+([0-9.eE+-]+)`,
    );
    const match = pattern.exec(line);
    if (match !== null) {
      const value = parseFloat(match[1] ?? '0');
      return Number.isFinite(value) ? value : undefined;
    }
  }
  return undefined;
}
