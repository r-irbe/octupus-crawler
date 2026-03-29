#!/bin/bash
# scripts/teardown-local.sh — Delete k3d cluster and registry
# Implements: REQ-K8E-004
# Design: docs/specs/k8s-e2e/design.md §3.2

set -euo pipefail

CLUSTER_NAME="${K3D_CLUSTER_NAME:-ipf-local}"
REGISTRY_NAME="${K3D_REGISTRY_NAME:-ipf-registry.localhost}"

echo "=== IPF Local Kubernetes Teardown ==="

k3d cluster delete "$CLUSTER_NAME" 2>/dev/null || true
k3d registry delete "k3d-${REGISTRY_NAME}" 2>/dev/null || true

echo "Cleanup complete."
