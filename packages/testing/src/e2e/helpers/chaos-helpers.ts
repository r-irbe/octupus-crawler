/**
 * Chaos Helpers — kubectl wrappers for chaos testing operations.
 *
 * Provides pod kill, replica scaling, network partition, and status queries.
 * @see T-PROD-001, design.md §3.4
 */

import { kubectl } from './k8s-helpers.js';

const NAMESPACE = 'ipf';

/** Force-delete a pod by name. */
export async function killPod(
  name: string,
  namespace: string = NAMESPACE,
): Promise<void> {
  await kubectl([
    'delete', 'pod', name,
    '-n', namespace,
    '--force', '--grace-period=0',
  ]);
}

/** Get all pod names matching a label selector. */
export async function getPodNames(
  labelSelector: string,
  namespace: string = NAMESPACE,
): Promise<ReadonlyArray<string>> {
  const output = await kubectl([
    'get', 'pods', '-n', namespace,
    '-l', labelSelector,
    '-o', 'jsonpath={.items[*].metadata.name}',
  ]);
  if (output === '') return [];
  return output.split(/\s+/);
}

/** Get the count of ready replicas for a deployment. */
export async function getReadyReplicas(
  deploymentName: string,
  namespace: string = NAMESPACE,
): Promise<number> {
  const output = await kubectl([
    'get', 'deployment', deploymentName,
    '-n', namespace,
    '-o', 'jsonpath={.status.readyReplicas}',
  ]);
  const count = parseInt(output, 10);
  return Number.isFinite(count) ? count : 0;
}

/** Scale a deployment to the specified replica count. */
export async function scaleDeployment(
  deploymentName: string,
  replicas: number,
  namespace: string = NAMESPACE,
): Promise<void> {
  await kubectl([
    'scale', `deployment/${deploymentName}`,
    `--replicas=${String(replicas)}`,
    '-n', namespace,
  ]);
}

/** Apply a NetworkPolicy from a YAML file path. */
export async function applyNetworkPolicy(
  policyPath: string,
): Promise<void> {
  await kubectl(['apply', '-f', policyPath]);
}

/** Delete a NetworkPolicy by name. */
export async function deleteNetworkPolicy(
  name: string,
  namespace: string = NAMESPACE,
): Promise<void> {
  await kubectl([
    'delete', 'networkpolicy', name,
    '-n', namespace,
    '--ignore-not-found',
  ]);
}

/**
 * Wait until a deployment reaches the expected ready replica count.
 * Polls every 2 seconds until timeout.
 */
export async function waitForReadyReplicas(
  deploymentName: string,
  expectedReplicas: number,
  timeoutMs: number = 60_000,
  namespace: string = NAMESPACE,
): Promise<void> {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const ready = await getReadyReplicas(deploymentName, namespace);
    if (ready >= expectedReplicas) return;
    await new Promise<void>((r) => { setTimeout(r, 2_000); });
  }
  const finalCount = await getReadyReplicas(deploymentName, namespace);
  throw new Error(
    `Deployment ${deploymentName} did not reach ${String(expectedReplicas)} ready replicas within ${String(timeoutMs)}ms (final: ${String(finalCount)})`,
  );
}
