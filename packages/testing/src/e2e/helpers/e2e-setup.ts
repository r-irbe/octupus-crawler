/**
 * E2E Setup — Shared beforeAll/afterAll for K8s E2E tests.
 *
 * Verifies cluster is running, deploys manifests, sets up port forwards.
 * All E2E test files import this for consistent setup/teardown.
 *
 * @see REQ-K8E-017, T-K8E-014
 */

import {
  isClusterReady,
  applyKustomize,
  deleteKustomize,
  waitForDeployment,
  waitForPod,
  startPortForward,
  type PortForwardHandle,
} from './k8s-helpers.js';

const E2E_OVERLAY_PATH = 'infra/k8s/overlays/e2e';

export type E2EContext = {
  readonly crawlerMetricsPort: number;
  readonly crawlerHealthPort: number;
  readonly simulatorPort: number;
  readonly redisPort: number;
  readonly cleanup: () => Promise<void>;
};

/** Set up E2E environment: verify cluster, deploy, port-forward */
export async function setupE2E(): Promise<E2EContext> {
  // 1. Verify cluster is running
  const ready = await isClusterReady();
  if (!ready) {
    throw new Error(
      'k3d cluster is not running. Run: scripts/setup-local.sh',
    );
  }

  // 2. Apply E2E kustomize overlay
  await applyKustomize(E2E_OVERLAY_PATH);

  // 3. Wait for pods
  await waitForDeployment('crawler-worker');
  await waitForPod('web-simulator');

  // 4. Set up port forwards
  const forwards: PortForwardHandle[] = [];

  const crawlerMetrics = await startPortForward('deployment/crawler-worker', 9090);
  forwards.push(crawlerMetrics);

  const crawlerHealth = await startPortForward('deployment/crawler-worker', 8081);
  forwards.push(crawlerHealth);

  const simulator = await startPortForward('pod/web-simulator', 8080);
  forwards.push(simulator);

  const redis = await startPortForward('statefulset/dragonfly', 6379);
  forwards.push(redis);

  return {
    crawlerMetricsPort: crawlerMetrics.localPort,
    crawlerHealthPort: crawlerHealth.localPort,
    simulatorPort: simulator.localPort,
    redisPort: redis.localPort,
    cleanup: async (): Promise<void> => {
      // Stop port forwards
      for (const fwd of forwards) {
        fwd.stop();
      }
      // Delete E2E resources
      await deleteKustomize(E2E_OVERLAY_PATH);
    },
  };
}
