// Redis Testcontainer helper with deterministic cleanup (REQ-TEST-024)
// Implements: T-TEST-024, REQ-TEST-005, REQ-TEST-006

import { GenericContainer, type StartedTestContainer } from 'testcontainers';

/** Configuration for the Redis test container. */
export type RedisContainerConfig = {
  readonly image: string;
  readonly port: number;
  readonly startupTimeout: number;
};

const DEFAULT_CONFIG: RedisContainerConfig = {
  image: 'redis:7-alpine',
  port: 6379,
  startupTimeout: 15_000,
};

/** Connection info returned after container starts. */
export type RedisConnectionInfo = {
  readonly host: string;
  readonly port: number;
  readonly url: string;
};

/** A started Redis container with connection info and cleanup. */
export type ManagedRedisContainer = {
  readonly connection: RedisConnectionInfo;
  readonly stop: () => Promise<void>;
};

/**
 * Start a Redis container for integration tests.
 *
 * Returns connection info and a deterministic `stop()` function.
 * Use in `beforeAll` / `afterAll` hooks.
 *
 * REQ-TEST-024: Deterministic cleanup — stop() is idempotent.
 */
export async function startRedisContainer(
  config?: Partial<RedisContainerConfig>,
): Promise<ManagedRedisContainer> {
  const merged = { ...DEFAULT_CONFIG, ...config };

  const container: StartedTestContainer = await new GenericContainer(merged.image)
    .withExposedPorts(merged.port)
    .withStartupTimeout(merged.startupTimeout)
    .start();

  const host = container.getHost();
  const mappedPort = container.getMappedPort(merged.port);

  let stopped = false;

  return {
    connection: {
      host,
      port: mappedPort,
      url: `redis://${host}:${String(mappedPort)}`,
    },
    async stop(): Promise<void> {
      if (stopped) return;
      stopped = true;
      await container.stop();
    },
  };
}
