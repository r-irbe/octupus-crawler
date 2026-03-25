// Safe logging helper — redacts sensitive config fields before logging
// Implements: T-ARCH-032, Review finding S-1 (secret redaction)

const SENSITIVE_FIELDS: ReadonlySet<string> = new Set([
  'S3_ACCESS_KEY',
  'S3_SECRET_KEY',
  'DATABASE_URL',
  'REDIS_URL',
]);

const REDACTED = '[REDACTED]' as const;

/**
 * Returns a copy of the config object with sensitive fields redacted.
 * Safe to pass to logger.info() or similar.
 */
export function toSafeLog(config: Record<string, unknown>): Record<string, unknown> {
  const safe: Record<string, unknown> = {};
  for (const key of Object.keys(config)) {
    safe[key] = SENSITIVE_FIELDS.has(key) ? REDACTED : config[key];
  }
  return safe;
}

export { SENSITIVE_FIELDS, REDACTED };
