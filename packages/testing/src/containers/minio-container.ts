// MinIO (S3-compatible) Testcontainer helper with deterministic cleanup
// Implements: REQ-DATA-023, REQ-DATA-022 — real MinIO via Testcontainers

import { GenericContainer, type StartedTestContainer } from 'testcontainers';

export type MinioContainerConfig = {
  readonly image: string;
  readonly apiPort: number;
  readonly startupTimeout: number;
  readonly accessKey: string;
  readonly secretKey: string;
};

const DEFAULT_CONFIG: MinioContainerConfig = {
  image: 'minio/minio:latest',
  apiPort: 9000,
  startupTimeout: 30_000,
  accessKey: 'minioadmin',
  secretKey: 'minioadmin',
};

export type MinioConnectionInfo = {
  readonly host: string;
  readonly port: number;
  readonly endpoint: string;
  readonly accessKey: string;
  readonly secretKey: string;
};

export type ManagedMinioContainer = {
  readonly connection: MinioConnectionInfo;
  readonly stop: () => Promise<void>;
};

export async function startMinioContainer(
  config?: Partial<MinioContainerConfig>,
): Promise<ManagedMinioContainer> {
  const merged = { ...DEFAULT_CONFIG, ...config };

  const container: StartedTestContainer = await new GenericContainer(merged.image)
    .withExposedPorts(merged.apiPort)
    .withStartupTimeout(merged.startupTimeout)
    .withEnvironment({
      MINIO_ROOT_USER: merged.accessKey,
      MINIO_ROOT_PASSWORD: merged.secretKey,
    })
    .withCommand(['server', '/data'])
    .start();

  const host = container.getHost();
  const mappedPort = container.getMappedPort(merged.apiPort);

  let stopped = false;

  return {
    connection: {
      host,
      port: mappedPort,
      endpoint: `http://${host}:${String(mappedPort)}`,
      accessKey: merged.accessKey,
      secretKey: merged.secretKey,
    },
    async stop(): Promise<void> {
      if (stopped) return;
      stopped = true;
      await container.stop();
    },
  };
}
