/**
 * K8s Helpers — kubectl utilities for E2E tests.
 *
 * Wraps kubectl commands for pod management, port forwarding,
 * and cluster verification.
 *
 * @see REQ-K8E-017, T-K8E-013
 */

import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import type { ChildProcess } from 'node:child_process';
import { spawn } from 'node:child_process';

const execFileAsync = promisify(execFile);

const NAMESPACE = 'ipf';
const KUBECTL_TIMEOUT = 30_000;

/** Run a kubectl command and return stdout */
export async function kubectl(args: ReadonlyArray<string>): Promise<string> {
  const { stdout } = await execFileAsync('kubectl', [...args], {
    timeout: KUBECTL_TIMEOUT,
  });
  return stdout.trim();
}

/** Wait for a pod to be ready */
export async function waitForPod(
  name: string,
  namespace: string = NAMESPACE,
  timeoutSeconds: number = 120,
): Promise<void> {
  await kubectl([
    'wait', '--for=condition=Ready', `pod/${name}`,
    '-n', namespace,
    `--timeout=${String(timeoutSeconds)}s`,
  ]);
}

/** Wait for a deployment to have available replicas */
export async function waitForDeployment(
  name: string,
  namespace: string = NAMESPACE,
  timeoutSeconds: number = 120,
): Promise<void> {
  await kubectl([
    'wait', '--for=condition=Available', `deployment/${name}`,
    '-n', namespace,
    `--timeout=${String(timeoutSeconds)}s`,
  ]);
}

/** Get pod name by label selector */
export async function getPodName(
  labelSelector: string,
  namespace: string = NAMESPACE,
): Promise<string> {
  const output = await kubectl([
    'get', 'pods', '-n', namespace,
    '-l', labelSelector,
    '-o', 'jsonpath={.items[0].metadata.name}',
  ]);
  if (output === '') {
    throw new Error(`No pod found with selector: ${labelSelector}`);
  }
  return output;
}

export type PortForwardHandle = {
  readonly localPort: number;
  readonly stop: () => void;
};

/** Start a kubectl port-forward, returns the local port and a stop function */
export function startPortForward(
  resource: string,
  remotePort: number,
  namespace: string = NAMESPACE,
): Promise<PortForwardHandle> {
  return new Promise<PortForwardHandle>((resolve, reject) => {
    // Use :0 to let kubectl pick a random local port
    const proc: ChildProcess = spawn('kubectl', [
      'port-forward', resource,
      `:${String(remotePort)}`,
      '-n', namespace,
    ]);

    let resolved = false;
    let outputBuffer = '';

    const onData = (data: Buffer): void => {
      outputBuffer += data.toString();
      // kubectl outputs "Forwarding from 127.0.0.1:XXXXX -> YYYYY"
      const match = /127\.0\.0\.1:(\d+)\s*->/.exec(outputBuffer);
      if (match !== null && !resolved) {
        resolved = true;
        const localPort = parseInt(match[1] ?? '0', 10);
        resolve({
          localPort,
          stop: (): void => {
            proc.kill('SIGTERM');
          },
        });
      }
    };

    proc.stdout?.on('data', onData);
    proc.stderr?.on('data', onData);

    proc.on('error', (err) => {
      if (!resolved) reject(err);
    });

    proc.on('exit', (code) => {
      if (!resolved) {
        reject(new Error(`port-forward exited with code ${String(code)}: ${outputBuffer}`));
      }
    });

    // Timeout after 15 seconds
    setTimeout(() => {
      if (!resolved) {
        proc.kill('SIGTERM');
        reject(new Error(`port-forward timeout for ${resource}:${String(remotePort)}`));
      }
    }, 15_000);
  });
}

/** Check if a k3d cluster exists and is running */
export async function isClusterReady(): Promise<boolean> {
  try {
    const output = await kubectl(['cluster-info']);
    return output.includes('is running');
  } catch {
    return false;
  }
}

/** Apply kustomize overlay */
export async function applyKustomize(
  overlayPath: string,
): Promise<void> {
  await kubectl(['apply', '-k', overlayPath]);
}

/** Delete kustomize overlay resources */
export async function deleteKustomize(
  overlayPath: string,
): Promise<void> {
  try {
    await kubectl(['delete', '-k', overlayPath, '--ignore-not-found']);
  } catch {
    // Ignore errors during cleanup
  }
}
