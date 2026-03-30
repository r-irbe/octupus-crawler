// PostgreSQL Testcontainer helper with deterministic cleanup
// Implements: REQ-DATA-023, REQ-TEST-005 — real PostgreSQL via Testcontainers

import { GenericContainer, type StartedTestContainer } from 'testcontainers';

export type PostgresContainerConfig = {
  readonly image: string;
  readonly port: number;
  readonly startupTimeout: number;
  readonly database: string;
  readonly user: string;
  readonly password: string;
};

const DEFAULT_CONFIG: PostgresContainerConfig = {
  image: 'postgres:16-alpine',
  port: 5432,
  startupTimeout: 30_000,
  database: 'test_db',
  user: 'test',
  password: 'test',
};

export type PostgresConnectionInfo = {
  readonly host: string;
  readonly port: number;
  readonly database: string;
  readonly user: string;
  readonly password: string;
  readonly connectionString: string;
};

export type ManagedPostgresContainer = {
  readonly connection: PostgresConnectionInfo;
  readonly stop: () => Promise<void>;
};

export async function startPostgresContainer(
  config?: Partial<PostgresContainerConfig>,
): Promise<ManagedPostgresContainer> {
  const merged = { ...DEFAULT_CONFIG, ...config };

  const container: StartedTestContainer = await new GenericContainer(merged.image)
    .withExposedPorts(merged.port)
    .withStartupTimeout(merged.startupTimeout)
    .withEnvironment({
      POSTGRES_DB: merged.database,
      POSTGRES_USER: merged.user,
      POSTGRES_PASSWORD: merged.password,
    })
    .start();

  const host = container.getHost();
  const mappedPort = container.getMappedPort(merged.port);

  let stopped = false;

  return {
    connection: {
      host,
      port: mappedPort,
      database: merged.database,
      user: merged.user,
      password: merged.password,
      connectionString: `postgresql://${merged.user}:${merged.password}@${host}:${String(mappedPort)}/${merged.database}`,
    },
    async stop(): Promise<void> {
      if (stopped) return;
      stopped = true;
      await container.stop();
    },
  };
}
