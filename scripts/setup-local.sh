#!/bin/bash
# scripts/setup-local.sh — Create k3d cluster with local registry
# Implements: REQ-K8E-001, REQ-K8E-002, REQ-K8E-003, REQ-K8E-006
# Design: docs/specs/k8s-e2e/design.md §3.1

set -euo pipefail

CLUSTER_NAME="${K3D_CLUSTER_NAME:-ipf-local}"
REGISTRY_NAME="${K3D_REGISTRY_NAME:-ipf-registry.localhost}"
REGISTRY_PORT="${K3D_REGISTRY_PORT:-5111}"
SERVERS="${K3D_SERVERS:-1}"
AGENTS="${K3D_AGENTS:-2}"

echo "=== IPF Local Kubernetes Setup ==="

# Prerequisite check
for cmd in k3d kubectl docker; do
  if ! command -v "$cmd" &>/dev/null; then
    echo "ERROR: $cmd is required but not installed." >&2
    exit 1
  fi
done

# Idempotent: delete existing cluster if present (REQ-K8E-003)
if k3d cluster list 2>/dev/null | grep -q "$CLUSTER_NAME"; then
  echo "Cluster $CLUSTER_NAME exists — deleting for clean state..."
  k3d cluster delete "$CLUSTER_NAME"
fi

# Create registry if not exists (REQ-K8E-002)
if ! k3d registry list 2>/dev/null | grep -q "$REGISTRY_NAME"; then
  echo "Creating local registry k3d-${REGISTRY_NAME}:${REGISTRY_PORT}..."
  k3d registry create "$REGISTRY_NAME" --port "$REGISTRY_PORT"
fi

# Create cluster (REQ-K8E-001)
echo "Creating k3d cluster: $CLUSTER_NAME (${SERVERS} server, ${AGENTS} agents)..."
k3d cluster create "$CLUSTER_NAME" \
  --servers "$SERVERS" \
  --agents "$AGENTS" \
  --registry-use "k3d-${REGISTRY_NAME}:${REGISTRY_PORT}" \
  --port "8080:80@loadbalancer" \
  --port "8443:443@loadbalancer" \
  --k3s-arg "--disable=traefik@server:0" \
  --wait

# Wait for nodes (REQ-K8E-006)
echo "Waiting for nodes to be Ready..."
kubectl wait --for=condition=Ready node --all --timeout=60s

echo ""
echo "=== Cluster Ready ==="
kubectl cluster-info
kubectl get nodes -o wide
echo ""
echo "Registry: k3d-${REGISTRY_NAME}:${REGISTRY_PORT}"
echo "To teardown: scripts/teardown-local.sh"
