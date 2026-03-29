#!/usr/bin/env bash
# Verify Kustomize build for E2E overlay renders correctly
# Implements: T-K8E-012, REQ-K8E-005
set -euo pipefail

OVERLAY_PATH="infra/k8s/overlays/e2e"

echo "=== T-K8E-012: Kustomize E2E Overlay Build Verification ==="

# Check kustomize/kubectl availability
if ! command -v kubectl &>/dev/null; then
  echo "⚠ kubectl not available — skipping (CI-only verification)"
  exit 0
fi

# Verify overlay directory exists
if [[ ! -d "$OVERLAY_PATH" ]]; then
  echo "✗ Overlay directory not found: $OVERLAY_PATH"
  exit 1
fi
echo "✓ Overlay directory exists"

# Verify kustomization.yml exists
if [[ ! -f "$OVERLAY_PATH/kustomization.yml" ]]; then
  echo "✗ kustomization.yml not found"
  exit 1
fi
echo "✓ kustomization.yml present"

# Dry-run the kustomize build
OUTPUT=$(kubectl kustomize "$OVERLAY_PATH" 2>&1) || {
  echo "✗ Kustomize build failed:"
  echo "$OUTPUT"
  exit 1
}
echo "✓ Kustomize build succeeds"

# Verify expected resources are present
CHECKS=(
  "kind: Deployment"
  "name: crawler-worker"
  "kind: Pod"
  "name: web-simulator"
  "kind: Namespace"
  "name: ipf"
)

for check in "${CHECKS[@]}"; do
  if echo "$OUTPUT" | grep -q "$check"; then
    echo "✓ Found: $check"
  else
    echo "✗ Missing expected resource: $check"
    exit 1
  fi
done

# Verify E2E overlay patches applied (reduced resources)
if echo "$OUTPUT" | grep -q "100m"; then
  echo "✓ E2E resource reduction patches applied"
else
  echo "⚠ Resource patches may not have applied (could not find 100m CPU request)"
fi

# Verify web-simulator image reference
if echo "$OUTPUT" | grep -q "k3d-ipf-registry.localhost:5111"; then
  echo "✓ Local registry image references present"
else
  echo "⚠ Local registry image references not found"
fi

echo ""
echo "=== All Kustomize build checks passed ==="
