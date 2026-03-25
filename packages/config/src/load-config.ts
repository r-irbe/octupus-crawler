// loadConfig — returns Result<Config, ConfigError>, never throws
// Implements: T-ARCH-014, REQ-ARCH-014

import { ok, err, type Result } from 'neverthrow';
import { ConfigSchema, type Config } from './config-schema.js';

export type ConfigError = {
  readonly kind: 'config_validation';
  readonly message: string;
  readonly issues: ReadonlyArray<{ path: string; message: string }>;
};

export function loadConfig(env: Record<string, string | undefined>): Result<Config, ConfigError> {
  const result = ConfigSchema.safeParse(env);

  if (result.success) {
    return ok(result.data);
  }

  const issues = result.error.issues.map((issue) => ({
    path: issue.path.join('.'),
    message: issue.message,
  }));

  const message = issues
    .map((i) => `${i.path}: ${i.message}`)
    .join('; ');

  return err({
    kind: 'config_validation' as const,
    message: `Configuration validation failed: ${message}`,
    issues,
  });
}
