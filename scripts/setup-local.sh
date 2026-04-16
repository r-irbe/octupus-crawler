#!/usr/bin/env bash
# scripts/setup-local.sh — Create k3d cluster with local registry
# Implements: REQ-K8E-001, REQ-K8E-002, REQ-K8E-003, REQ-K8E-006
# Design: docs/specs/k8s-e2e/design.md §3.1

set -euo pipefail

CLUSTER_NAME="${K3D_CLUSTER_NAME:-ipf-local}"
REGISTRY_NAME="${K3D_REGISTRY_NAME:-ipf-registry.localhost}"
REGISTRY_PORT="${K3D_REGISTRY_PORT:-5111}"
SERVERS="${K3D_SERVERS:-1}"
AGENTS="${K3D_AGENTS:-2}"

START_TIME=$(date +%s)

echo ""
echo "╔══════════════════════════════════════════╗"
echo "║   IPF Local Kubernetes Setup             ║"
echo "╚══════════════════════════════════════════╝"
echo ""

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

# ── ArgoCD Installation (REQ-LTO-020) ───────────────
echo ""
echo "━━━ Installing ArgoCD ━━━"
kubectl create namespace argocd --dry-run=client -o yaml | kubectl apply -f -
kubectl apply -n argocd -f https://raw.githubusercontent.com/argoproj/argo-cd/v2.13.3/manifests/install.yaml
echo "Waiting for ArgoCD server..."
kubectl wait --for=condition=available deploy/argocd-server -n argocd --timeout=120s
echo "ArgoCD installed. UI: kubectl port-forward svc/argocd-server -n argocd 8443:443"
echo "Default password: kubectl -n argocd get secret argocd-initial-admin-secret -o jsonpath='{.data.password}' | base64 -d"

# ── Chaos Mesh Installation (REQ-LTO-024) ───────────
echo ""
echo "━━━ Installing Chaos Mesh ━━━"
if command -v helm &>/dev/null; then
  helm repo add chaos-mesh https://charts.chaos-mesh.org 2>/dev/null || true
  helm repo update chaos-mesh
  helm upgrade --install chaos-mesh chaos-mesh/chaos-mesh \
    --namespace chaos-mesh --create-namespace \
    --set chaosDaemon.runtime=containerd \
    --set chaosDaemon.socketPath=/run/k3s/containerd/containerd.sock \
    --wait --timeout=120s
  echo "Chaos Mesh installed. Dashboard: kubectl port-forward svc/chaos-dashboard -n chaos-mesh 2333:2333"
else
  echo "WARNING: helm not found — skipping Chaos Mesh install. Install helm to enable chaos testing."
fi

echo ""
echo "━━━ Cluster Ready ━━━"
kubectl cluster-info
kubectl get nodes -o wide
echo ""
echo "Registry: k3d-${REGISTRY_NAME}:${REGISTRY_PORT}"
echo ""

# ── Build & Push Images ─────────────────────────────
echo "━━━ Building & Pushing Images ━━━"
REGISTRY="k3d-${REGISTRY_NAME}:${REGISTRY_PORT}"

echo "Building mega-simulator..."
docker build -t "${REGISTRY}/ipf-mega-simulator:latest" \
  -f infra/docker/Dockerfile.mega-simulator . 2>/dev/null && \
  docker push "${REGISTRY}/ipf-mega-simulator:latest" && \
  echo "  mega-simulator pushed" || \
  echo "WARNING: mega-simulator build failed (non-critical)"

echo "Building web-simulator..."
docker build -t "${REGISTRY}/ipf-web-simulator:latest" \
  -f infra/docker/Dockerfile.web-simulator . 2>/dev/null && \
  docker push "${REGISTRY}/ipf-web-simulator:latest" && \
  echo "  web-simulator pushed" || \
  echo "WARNING: web-simulator build failed (non-critical)"

# ── Deploy Base + Monitoring ─────────────────────────
echo ""
echo "━━━ Deploying IPF Stack ━━━"
kubectl create namespace ipf --dry-run=client -o yaml | kubectl apply -f -
bash "$(dirname "$0")/create-dashboard-configmap.sh" || \
  echo "WARNING: dashboard configmap creation failed"
kubectl apply -k infra/k8s/overlays/dev/ 2>/dev/null || \
  echo "WARNING: kustomize apply failed — some resources may need image builds first"

END_TIME=$(date +%s)
DURATION=$((END_TIME - START_TIME))

echo ""
echo "╔══════════════════════════════════════════╗"
echo "║   Setup Complete (${DURATION}s)                  ║"
echo "╚══════════════════════════════════════════╝"
echo ""
echo "ArgoCD UI:     kubectl port-forward svc/argocd-server -n argocd 8443:443"
echo "Chaos Mesh:    kubectl port-forward svc/chaos-dashboard -n chaos-mesh 2333:2333"
echo "Grafana:       kubectl port-forward svc/grafana -n ipf 3000:3000"
echo "Jaeger:        kubectl port-forward svc/jaeger -n ipf 16686:16686"
echo "Prometheus:    kubectl port-forward svc/prometheus -n ipf 9091:9090"
echo "To teardown:   scripts/teardown-local.sh"
