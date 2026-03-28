// State-store connection config — Zod-validated connection string parsing
// Implements: T-COORD-012, REQ-DIST-021

import { z } from 'zod/v4';

// REQ-DIST-021: host, port, password, username (ACL), database/namespace, TLS
export const StateStoreConnectionSchema = z.object({
  host: z.string().min(1).default('localhost'),
  port: z.number().int().positive().max(65535).default(6379),
  password: z.string().optional(),
  username: z.string().optional(),
  database: z.number().int().nonnegative().max(15).default(0),
  tls: z.boolean().default(false),
});

export type StateStoreConnection = z.infer<typeof StateStoreConnectionSchema>;

/** Build a Redis connection URL from validated config. */
export function buildConnectionUrl(config: StateStoreConnection): string {
  const scheme = config.tls ? 'rediss' : 'redis';
  const auth = buildAuthPart(config);
  const db = config.database > 0 ? `/${String(config.database)}` : '';
  return `${scheme}://${auth}${config.host}:${String(config.port)}${db}`;
}

/** Parse a Redis URL into validated StateStoreConnection. */
export function parseConnectionUrl(url: string): StateStoreConnection {
  const parsed = new URL(url);

  if (parsed.protocol !== 'redis:' && parsed.protocol !== 'rediss:') {
    throw new Error(`Invalid Redis URL protocol: ${parsed.protocol} (expected redis: or rediss:)`);
  }

  const tls = parsed.protocol === 'rediss:';
  const port = parsed.port !== '' ? Number(parsed.port) : 6379;
  const database = parsed.pathname.length > 1
    ? Number(parsed.pathname.slice(1))
    : 0;

  return StateStoreConnectionSchema.parse({
    host: parsed.hostname,
    port,
    password: parsed.password !== '' ? decodeURIComponent(parsed.password) : undefined,
    username: parsed.username !== '' ? decodeURIComponent(parsed.username) : undefined,
    database: Number.isNaN(database) ? 0 : database,
    tls,
  });
}

// --- Helpers ---

function buildAuthPart(config: StateStoreConnection): string {
  if (config.username !== undefined && config.password !== undefined) {
    return `${encodeURIComponent(config.username)}:${encodeURIComponent(config.password)}@`;
  }
  if (config.password !== undefined) {
    return `:${encodeURIComponent(config.password)}@`;
  }
  return '';
}
