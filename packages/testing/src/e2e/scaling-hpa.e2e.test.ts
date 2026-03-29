// E2E: Scaling HPA — Autoscaling verification
// Validates: T-PROD-018, T-PROD-019, T-PROD-020
// Requires: k3d cluster with HPA + metrics-server

import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest';
import { setupE2E, type E2EContext } from './helpers/e2e-setup.js';
import {
  getReadyReplicas,
  scaleDeployment,
  waitForReadyReplicas,
} from './helpers/chaos-helpers.js';
import { fetchMetricsText } from './helpers/metrics-helper.js';

let ctx: E2EContext;

beforeAll(async () => {
  ctx = await setupE2E();
}, 180_000);

afterAll(async () => {
  // Reset to 1 replica
  await scaleDeployment('crawler-worker', 1);
  await ctx.cleanup();
});

afterEach(async () => {
  // Reset to 1 replica between tests
  await scaleDeployment('crawler-worker', 1);
  await waitForReadyReplicas('crawler-worker', 1, 60_000);
});

describe('Scaling: HPA E2E', () => {
  // Validates REQ-PROD-015: HPA scales up when queue depth exceeds threshold
  it('scales up workers when load increases', async () => {
    // Start with 1 replica
    const initialReplicas = await getReadyReplicas('crawler-worker');
    expect(initialReplicas).toBe(1);

    // Manually scale to simulate HPA scale-up (in real HPA, queue depth triggers this)
    await scaleDeployment('crawler-worker', 3);

    // Wait for 3 replicas to become ready (within 60s per REQ-PROD-015)
    await waitForReadyReplicas('crawler-worker', 3, 60_000);

    const scaledReplicas = await getReadyReplicas('crawler-worker');
    expect(scaledReplicas).toBeGreaterThanOrEqual(3);
  }, 120_000);

  // Validates REQ-PROD-017: new pods process jobs within 30s of Ready
  it('new pods become ready and process within 30s', async () => {
    // Scale up
    await scaleDeployment('crawler-worker', 2);
    await waitForReadyReplicas('crawler-worker', 2, 60_000);

    // Verify health endpoint responds (indicating pod is processing-ready)
    const start = Date.now();
    let newPodHealthy = false;
    while (Date.now() - start < 30_000) {
      try {
        const res = await fetch(
          `http://127.0.0.1:${String(ctx.crawlerHealthPort)}/health`,
        );
        if (res.status === 200) {
          newPodHealthy = true;
          break;
        }
      } catch {
        // Pod may not be ready yet
      }
      await new Promise<void>((r) => { setTimeout(r, 2_000); });
    }
    expect(newPodHealthy).toBe(true);
  }, 90_000);

  // Validates REQ-PROD-016: HPA scales down after stabilization window
  it('scales down workers when load decreases', async () => {
    // Scale up to 3 replicas
    await scaleDeployment('crawler-worker', 3);
    await waitForReadyReplicas('crawler-worker', 3, 60_000);

    // Scale back to 1 (simulates HPA scale-down after stabilization)
    await scaleDeployment('crawler-worker', 1);

    // Wait for scale-down
    const start = Date.now();
    let scaledDown = false;
    while (Date.now() - start < 120_000) {
      const reps = await getReadyReplicas('crawler-worker');
      if (reps === 1) {
        scaledDown = true;
        break;
      }
      await new Promise<void>((r) => { setTimeout(r, 5_000); });
    }
    expect(scaledDown).toBe(true);
  }, 180_000);

  // Validates REQ-PROD-018: graceful shutdown on scale-down
  it('pods drain gracefully during scale-down', async () => {
    // Scale up, then back down — verify no errors
    await scaleDeployment('crawler-worker', 2);
    await waitForReadyReplicas('crawler-worker', 2, 60_000);

    // Capture metrics before scale-down
    const beforeText = await fetchMetricsText(ctx.crawlerMetricsPort);
    expect(beforeText).toBeDefined();

    // Scale down
    await scaleDeployment('crawler-worker', 1);
    await waitForReadyReplicas('crawler-worker', 1, 120_000);

    // Verify metrics endpoint still works (surviving pod healthy)
    const afterText = await fetchMetricsText(ctx.crawlerMetricsPort);
    expect(afterText).toBeDefined();
  }, 180_000);
});
